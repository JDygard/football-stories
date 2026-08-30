// Viewport for the content-stacked timeline.
//
// SCROLL = NATIVE. Vertical scrolling is owned by a real DOM scroll container
// (Main renders `scrollRef` as overflow-y:auto with a spacer sized to the
// committed band's totalHeight; the SVG is a position:sticky overlay). The OS
// gives us momentum, rubber-band, velocity and ProMotion for free — we just
// read `scrollTop` on the scroll event (rAF-throttled) and redraw the visible
// slice. This replaces the old pointer-pan + JS-momentum loop, which WebKit
// fought (touch-action:none is ignored over SVG — see the iOS-scroll note).
//
// ZOOM stays custom (the OS can't do semantic-band zoom): pinch via Safari
// GestureEvents (iOS) and ctrl/⌘+wheel (trackpad pinch / desktop). Source of
// truth is `gestureH`, a desired apparent content height; `pickBand` commits
// the nearest band and `visualScale` cosmetically bridges the rest, anchored on
// the focal point (kept under the cursor across band switches via scrollTop).
//
// HORIZONTAL "follow the career off the edge" reveal also stays custom: with
// the container at touch-action:pan-y the browser owns vertical and hands us
// horizontal drags, which drive `railPan` (resisted, with a lock detent). No
// JS axis-lock fighting the scroller — the platform arbitrates.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildTimelineLayout } from "../components/visualization/buildTimelineLayout.js";
import { MOBILE_BANDS, MOBILE_ZOOM_BANDS } from "../components/visualization/detail.js";
import {
  MENU_SLIDE_COUNT,
  menuScrollExtent,
  slideOffset,
  IDLE_MS,
  slideTargetFor,
  trackSample,
  velocityOf,
} from "../menu/menuModel.js";
import { clamp, expSmooth, pickBand, visualScaleFor } from "./zoomMath.js";

// TWO lists, and the difference matters. The phone ladder stops at ERA_SUMMARY
// (DETAIL_BANDS' two coarse bands share zoom rung 1, so walking through both
// gave two consecutive "Eras" stops) — those are the bands that have LAYOUTS.
// The ladder the gesture walks has one more stop on the far end: the MENU rung,
// which has no layout at all because it draws no franchise (src/menu/). So
// `layouts` and `bandHeights` are no longer the same length, and every index
// into `layouts` is clamped to TIMELINE_N - 1.
const TIMELINE_N = MOBILE_BANDS.length;
const N = MOBILE_ZOOM_BANDS.length;
const MENU_INDEX = N - 1;
const TAP_SLOP = 5; // px of pointer travel before a press counts as a drag
// Horizontal reveal: a one-finger gesture locks to "h" only when it clearly
// beats vertical (AXIS_BIAS) — otherwise the browser scrolls. The rail opens to
// RAIL_MAX_REVEAL px (RAIL_RESIST drag-resistance); on release it's a detent —
// past RAIL_LOCK_AT it settles OPEN at RAIL_LOCK_POS (persists through scroll &
// taps) until pulled back under RAIL_LOCK_AT; short pulls spring back to 0.
const AXIS_BIAS = 1.4;
const RAIL_MAX_REVEAL = 115; // ~1/3 less reveal than before
const RAIL_LOCK_AT = 54;
const RAIL_LOCK_POS = 99;
const RAIL_RESIST = 0.6;
const RAIL_SPRING_TAU = 130; // ms
const WHEEL_STEP = 90; // accumulated ctrl-wheel deltaY that advances one band
const ANIM_DONE_PX = 0.5; // stop the zoom-settle ease within this of target
const ANIM_TAU = 55; // ms time constant for the zoom-settle ease
// Minimum height ratio between adjacent zoom rungs in GESTURE space. Must clear
// pickBand's e^(2*hyst) ≈ 1.271 reachability threshold with a little room; see
// the bandHeights note below for why the real heights don't always manage it.
const MIN_BAND_RATIO = 1.3;
// Menu rung: how long the scroller has to be quiet before the strip settles
// onto the nearest slide, and how close counts as already there.
const SETTLE_MS = 140;
const SETTLE_EPS = 1;

export default function useTimelineViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  // Extra scroll range for the pinned-ribbon stack, which pushes the timeline
  // down by its live height (staffRibbonModel.maxStackHeight).
  ribbonSlack = 0,
  height = 0,
  // The app OPENS on the menu rung — it is the start page, not a level you
  // have to go looking for.
  initialBandIndex = MENU_INDEX,
  focusYear = null,
  onFocusConsumed = null,
  showPlayoffs = true,
  // Curated Named Era rows, or null when the franchise has none authored / the
  // toggle is off. Only the two coarsest bands' layouts do anything with them.
  eras = null,
  // { [eraId]: px } — see buildTimelineLayout. Changing it rebuilds every
  // band's layout, which is why it is a stable memo in Main and not an inline
  // object literal.
  eraHeaderExtra = null,
}) {
  const [bandIndex, setBandIndex] = useState(initialBandIndex);
  // scrollY mirrors the scroll container's scrollTop (set from scroll events).
  const [scrollYState, setScrollY] = useState(0);
  // Horizontal rail reveal (px). Authoritative value is railPanRef.
  const [railPan, setRailPan] = useState(0);
  // Cosmetic vertical scale during a band transition, anchored at scaleAnchorY.
  const [visualScale, setVisualScale] = useState(1);
  const [scaleAnchorY, setScaleAnchorY] = useState(0);

  // The native scroll container (Main attaches this).
  const scrollRef = useRef(null);

  // Precompute every band's layout once; switching bands is a pure index change.
  // No longer a function of the viewport height: the zoom-3 pages used to be
  // padded to a full screen for snap paging, so layouts had to rebuild on every
  // resize (including the 48px the hide-on-scroll header takes with it). Pages
  // are content-height now, so nothing here depends on `height`.
  const layouts = useMemo(
    () =>
      MOBILE_BANDS.map((band) =>
        buildTimelineLayout({
          seasons,
          modules,
          moduleData,
          reserveByYear,
          detailBand: band,
          top: 0,
          showPlayoffs,
          eras,
          eraHeaderExtra,
        }),
      ),
    [seasons, modules, moduleData, reserveByYear, showPlayoffs, eras, eraHeaderExtra],
  );
  // Gesture-space heights: a SEPARATED-OUT copy of the band heights, each one
  // forced to at least MIN_BAND_RATIO times the next-less-detailed band.
  // Layouts still render their true heights; visualScale settles to 1 at rest
  // either way, so the correction is invisible outside a mid-gesture frame.
  //
  // Two distinct things wanted this, and only one of them is gone:
  //
  //   * Full-viewport season pages used to make zoom 3 TALLER than zoom 4 on a
  //     tall screen, inverting the ladder outright and leaving zoom 3 unstable
  //     (resting at its own height instantly re-committed zoom 4). Content-
  //     height pages removed that, so the ladder is at least ordered now.
  //
  //   * pickBand walks in log space with a hysteresis dead zone (hyst, ~0.12
  //     ln-units) around each geometric-mean boundary, so a rung is only
  //     REACHABLE if it is more than e^(2*hyst) ≈ 1.27x its neighbour. Zoom 4
  //     against zoom 3 sits right on that line naturally (~1.27x measured — a
  //     season page carries most of a game-row year's content, just laid out
  //     tighter), and under it zoom 4 simply cannot be pinched into. That has
  //     nothing to do with paging and did not go away with it.
  //
  // Hence the floor stays, but it is a reachability floor, not an ordering fix.
  // sims/mobile_layout.sim.mjs asserts both halves: raw heights ordered, and
  // every rung stable and reachable once corrected.
  const bandHeights = useMemo(() => {
    const out = layouts.map((l) => Math.max(1, l.totalHeight));
    // The MENU rung is exactly ONE SCREENFUL of apparent content — a slide, not
    // the whole strip. Its scroll extent is several screens (the slides), but
    // that is paging, not zoom, and feeding the strip's length in here would
    // put the menu somewhere up the middle of the ladder.
    out.push(Math.max(1, height || 640));
    for (let i = out.length - 2; i >= 0; i--) {
      out[i] = Math.max(out[i], out[i + 1] * MIN_BAND_RATIO);
    }
    return out;
  }, [layouts, height]);

  const menu = bandIndex === MENU_INDEX;
  // No layout for the menu rung; it keeps the coarsest one mounted underneath
  // so that leaving the menu lands back on a real band with a real scroll range.
  const layout = layouts[clamp(bandIndex, 0, TIMELINE_N - 1)];
  // scrollRange = the timeline plus room for the ribbon stack it hides behind —
  // or, at the menu rung, the slide strip the same scroller pages through.
  const scrollRange = menu ? menuScrollExtent(height) : layout.totalHeight + ribbonSlack;
  const maxScroll = Math.max(0, scrollRange - height);
  const scrollY = clamp(scrollYState, 0, maxScroll);

  // --- refs mirroring state for use inside rAF / event callbacks ---
  const bandIndexRef = useRef(bandIndex);
  bandIndexRef.current = bandIndex;
  const scrollYRef = useRef(scrollY);
  scrollYRef.current = scrollY;
  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;
  const heightRef = useRef(height);
  heightRef.current = height;
  const bandHeightsRef = useRef(bandHeights);
  bandHeightsRef.current = bandHeights;
  // Read from scroll/pointer callbacks, which must not close over a stale rung.
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const anchorYRef = useRef(0);

  const gestureHRef = useRef(bandHeights[initialBandIndex]);
  const zoomTargetRef = useRef(bandHeights[initialBandIndex]);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const targetBandRef = useRef(initialBandIndex);
  const wheelAccumRef = useRef(0);
  const pinchActiveRef = useRef(false);
  const d0Ref = useRef(1); // two-finger distance at pinch start
  const pinchStartHRef = useRef(bandHeights[initialBandIndex]); // gestureH at pinch start
  // Horizontal rail reveal refs.
  const railPanRef = useRef(0);
  const railRestRef = useRef(0);
  const railSpringRef = useRef(0);
  const lastRailTRef = useRef(0);
  // Scroll-event rAF throttle.
  const scrollRafRef = useRef(0);

  // ---- imperative scroll: write scrollTop, reflect into state ----
  const setScrollTop = useCallback((y) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, y); // browser clamps to scroll range
    const ny = el.scrollTop;
    scrollYRef.current = ny;
    setScrollY(ny);
  }, []);

  // ---- menu rung: settle onto the nearest slide -----------------------------
  //
  // The strip pages instagram-style, and the obvious way to get that is CSS
  // scroll-snap. It does not work here, and the reason is worth writing down:
  // this container carries a NON-PASSIVE wheel listener (it has to — the zoom
  // gesture must be able to preventDefault), which takes wheel scrolling off
  // the compositor. Main-thread scrolling with `scroll-snap-type: mandatory`
  // re-snaps after every individual delta, so each notch of a swipe was pulled
  // straight back to the slide it started on and the strip could not be paged
  // at all. Programmatic scrolling — which is how the desktop drag-pan moves
  // this same element — is re-snapped the same way, so a drag would have been
  // just as stuck.
  //
  // So the paging is ours: scroll freely, and when the scroller goes quiet with
  // no finger down, ease to the nearest slide.
  const settleTimerRef = useRef(0);
  const gesturingRef = useRef(false);
  // Trailing scrollTop samples, for the speed of a released swipe.
  //
  // Sampled from the SCROLL events, and the decision is made when scrolling
  // STOPS rather than when the pointer lifts. That is not a preference, it is
  // forced: Chromium fires `pointercancel` on a touch pointer the moment it
  // takes the gesture over for scrolling, so a pointerup/cancel handler runs at
  // the START of a swipe, when the strip has barely moved and its velocity is
  // nil. Deciding there turned every flick into "stay where you are" — the bug
  // that made this page unswipeable.
  const samplesRef = useRef([]);
  // The velocity the strip had when it was LAST ACTUALLY MOVING. By the time
  // the settle fires everything is at rest, so the live velocity is zero and
  // useless; this is the reading from the final scroll event before the stall.
  // It also self-corrects for platform momentum: if the browser coasted, that
  // last reading is the decayed tail and the projection adds almost nothing on
  // top of the distance already travelled; if it didn't, it is the full flick.
  const lastVRef = useRef(0);
  const lastSampleTRef = useRef(0);
  // Which slide the current scroll SEQUENCE started on.
  const gestureStartSlideRef = useRef(0);
  const scrollingRef = useRef(false);

  const scrollToSlide = useCallback(
    (i) => {
      const el = scrollRef.current;
      if (!el) return;
      const span = Math.max(1, heightRef.current);
      const y = slideOffset(clamp(i, 0, MENU_SLIDE_COUNT - 1), span);
      if (Math.abs(el.scrollTop - y) < SETTLE_EPS) return;
      if (el.scrollTo) el.scrollTo({ top: y, behavior: "smooth" });
      else setScrollTop(y);
    },
    [setScrollTop],
  );

  // Land the strip, judging the swipe on INTENT rather than on how far it
  // happened to get. Without the velocity term the strip only moved when a
  // drag crossed the halfway line — half a screen — and nobody swipes that way.
  const settleToSlide = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = slideTargetFor({
      scroll: el.scrollTop,
      span: Math.max(1, heightRef.current),
      startSlide: gestureStartSlideRef.current,
      velocity: lastVRef.current,
    });
    scrollingRef.current = false;
    lastVRef.current = 0;
    samplesRef.current = [];
    scrollToSlide(target);
  }, [scrollToSlide]);

  const scheduleSettle = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = 0;
      if (!menuRef.current || gesturingRef.current) return;
      settleToSlide();
    }, SETTLE_MS);
  }, [settleToSlide]);

  const onScroll = useCallback(() => {
    if (menuRef.current) {
      const el = scrollRef.current;
      if (el) {
        const span = Math.max(1, heightRef.current);
        if (!scrollingRef.current) {
          // First movement of a new sequence: this is the page the swipe began
          // on, which is what "at least one page" is measured from.
          scrollingRef.current = true;
          samplesRef.current = [];
          gestureStartSlideRef.current = Math.round(el.scrollTop / span);
        }
        lastSampleTRef.current = performance.now();
        trackSample(samplesRef.current, el.scrollTop, lastSampleTRef.current);
        lastVRef.current = velocityOf(samplesRef.current);
      }
      scheduleSettle();
    }
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const y = el.scrollTop;
      scrollYRef.current = y;
      setScrollY(y);
    });
  }, [scheduleSettle]);

  // Pending zoom anchor: keep the focal year under the cursor after a band
  // switch reflows the stack (and totalHeight/scroll range changes).
  const anchorRef = useRef(null);
  // Where the timeline was standing when the menu took the scroller over.
  const parkedScrollRef = useRef(0);
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    // An absolute target: crossing into or out of the menu, where the scroll
    // axis changes meaning and there is no focal year to pin.
    if (a.scrollTo != null) {
      setScrollTop(a.scrollTo);
      return;
    }
    const targetContentY = layout.tToY(a.focusT);
    setScrollTop(targetContentY - a.cursorY);
    // `bandIndex` is a dependency because crossing the Eras/menu boundary does
    // NOT change `layout` (the menu keeps the coarsest one mounted), so the
    // effect would otherwise never run for exactly the switch that needs it.
  }, [layout, bandIndex, setScrollTop]);

  // Commit a band switch while pinning the focal year under the anchor. Reads
  // the OLD layout to find the focal year; the layout effect above fixes scroll
  // once the new band renders.
  const commitBand = useCallback((nb) => {
    const from = bandIndexRef.current;
    if (nb === MENU_INDEX) {
      // Into the menu: the scroller stops being the timeline and becomes the
      // slide strip, so there is no year to pin. Park where the timeline was
      // and open the menu on its first page.
      parkedScrollRef.current = scrollYRef.current;
      anchorRef.current = { scrollTo: 0 };
    } else if (from === MENU_INDEX) {
      // Back out of the menu: return the reader to where they left the
      // timeline rather than to whichever slide they happened to stop on.
      anchorRef.current = { scrollTo: parkedScrollRef.current };
    } else {
      const old = layoutsRef.current[clamp(from, 0, TIMELINE_N - 1)];
      const focusT = old.yToYear(scrollYRef.current + anchorYRef.current);
      anchorRef.current = { focusT, cursorY: anchorYRef.current };
    }
    bandIndexRef.current = nb;
    setBandIndex(nb);
  }, []);

  // Deep-link: scroll so focusYear sits in the upper quarter of the view, then
  // hand the target back (leaderboard rows, career-follow jumps).
  useLayoutEffect(() => {
    if (focusYear == null) return;
    if (!layout?.blocks?.length || !height) return;
    // A deep link — a personnel track switched on, a leaderboard row, a career
    // follow — is a request to LOOK AT something on the timeline. If it arrives
    // while the menu has the surface, the menu steps aside and the effect runs
    // again on the next commit (hence `bandIndex` in the deps) to do the scroll.
    if (bandIndexRef.current === MENU_INDEX) {
      commitBand(TIMELINE_N - 1);
      return;
    }
    setScrollTop(layout.yearToY(focusYear) - height * 0.25);
    if (onFocusConsumed) onFocusConsumed();
  }, [focusYear, layout, bandIndex, height, onFocusConsumed, setScrollTop, commitBand]);


  const applyGestureH = useCallback(
    (h) => {
      const heights = bandHeightsRef.current;
      // Clamp to the real band range: at the most/least detailed band there's no
      // further level that direction, so an over-pinch simply doesn't respond
      // (no cosmetic over-zoom past the extremes).
      const ch = clamp(h, heights[N - 1], heights[0]);
      gestureHRef.current = ch;
      const nb = pickBand(ch, bandIndexRef.current, heights);
      if (nb !== bandIndexRef.current) commitBand(nb);
      setVisualScale(visualScaleFor(ch, heights[bandIndexRef.current]));
    },
    [commitBand],
  );

  // rAF ease of gestureH toward zoomTargetRef (ctrl-wheel + pinch-release
  // settle). Landing on a band's natural height sets visualScale to 1.
  const tick = useCallback(
    (now) => {
      const dt = lastTRef.current ? now - lastTRef.current : 16;
      lastTRef.current = now;
      const target = zoomTargetRef.current;
      let h = expSmooth(gestureHRef.current, target, dt, ANIM_TAU);
      const done = Math.abs(target - h) < ANIM_DONE_PX;
      if (done) h = target;
      applyGestureH(h);
      if (done) {
        rafRef.current = 0;
        lastTRef.current = 0;
        setVisualScale(visualScaleFor(target, bandHeightsRef.current[bandIndexRef.current]));
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [applyGestureH],
  );

  const startAnim = useCallback(
    (target, anchorY) => {
      zoomTargetRef.current = clamp(
        target,
        bandHeightsRef.current[N - 1] * 0.6,
        bandHeightsRef.current[0] * 1.6,
      );
      anchorYRef.current = anchorY;
      setScaleAnchorY(anchorY);
      if (!rafRef.current) {
        lastTRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [tick],
  );

  // Stable refs to the latest zoom callbacks for the native touch/wheel listeners.
  const startAnimRef = useRef(startAnim);
  startAnimRef.current = startAnim;
  const applyGestureHRef = useRef(applyGestureH);
  applyGestureHRef.current = applyGestureH;

  // Keep the resting zoom state locked to the committed band's natural height
  // when no zoom is in flight, so layout reflows don't leave a stale scale.
  //
  // visualScale MUST be reset here too, not just gestureH. Layouts rebuild
  // whenever the viewport height changes — and the hide-on-scroll header
  // docking in/out changes it by its full 48px — so a reflow lands mid-life
  // with visualScale still holding whatever the last pinch left it at. The
  // canvas then renders scaled about scaleAnchorY, which slides the pinned
  // ribbon stack off the top of the viewport (a few px of phantom offset above
  // the first ribbon, at every zoom). At rest the scale is 1 by definition.
  // `bandIndex` joined the deps when the menu rung arrived: a band can now be
  // committed WITHOUT a gesture (a deep link pulling the reader out of the
  // menu), and the resting gestureH has to follow it or the next pinch would
  // start from the height of the band they just left.
  useEffect(() => {
    if (!rafRef.current && !pinchActiveRef.current) {
      gestureHRef.current = bandHeights[bandIndexRef.current];
      zoomTargetRef.current = gestureHRef.current;
      setVisualScale(1);
      setScaleAnchorY(0);
    }
  }, [bandHeights, bandIndex]);

  // ---- native listeners: ctrl/⌘+wheel zoom + multi-touch scroll suppressor ----
  // Bound via addEventListener (non-passive) because React's synthetic wheel/
  // touch handlers are passive — preventDefault() would be ignored, and the
  // browser would zoom the whole page / scroll during a pinch instead.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const topOf = () => el.getBoundingClientRect().top;

    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain wheel -> native scroll
      e.preventDefault();
      const cursorY = e.clientY - topOf();
      if (!rafRef.current) {
        targetBandRef.current = bandIndexRef.current;
        wheelAccumRef.current = 0;
      }
      wheelAccumRef.current += e.deltaY;
      const steps = Math.trunc(wheelAccumRef.current / WHEEL_STEP);
      if (steps !== 0) {
        wheelAccumRef.current -= steps * WHEEL_STEP;
        targetBandRef.current = clamp(targetBandRef.current + steps, 0, N - 1);
      }
      startAnimRef.current(bandHeightsRef.current[targetBandRef.current], cursorY);
    };

    // Two-finger pinch zoom, driven by TOUCH events. On iOS, pointer events can
    // spuriously fire pointercancel when a second finger lands (dropping the
    // pinch), but touch events reliably report every active touch. We also
    // preventDefault on multi-touch so the browser neither scrolls nor
    // page-zooms during a pinch; one finger is left to scroll natively.
    const dist2 = (t) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        lastTRef.current = 0;
      }
      pinchActiveRef.current = true;
      d0Ref.current = Math.max(1, dist2(e.touches));
      pinchStartHRef.current = gestureHRef.current;
      const anchorY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - topOf();
      anchorYRef.current = anchorY;
      setScaleAnchorY(anchorY);
    };
    const onTouchMove = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (!pinchActiveRef.current) return;
      const d = Math.max(1, dist2(e.touches));
      applyGestureHRef.current(pinchStartHRef.current * (d / d0Ref.current));
    };
    const onTouchEnd = (e) => {
      if (!pinchActiveRef.current) return;
      if (e.touches.length >= 2) return; // still pinching
      pinchActiveRef.current = false;
      startAnimRef.current(bandHeightsRef.current[bandIndexRef.current], anchorYRef.current);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (railSpringRef.current) cancelAnimationFrame(railSpringRef.current);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  // ---- horizontal rail reveal: set + spring/lock ----
  const applyRailPan = useCallback((v) => {
    railPanRef.current = v;
    setRailPan(v);
  }, []);

  const stopRailSpring = useCallback(() => {
    if (railSpringRef.current) {
      cancelAnimationFrame(railSpringRef.current);
      railSpringRef.current = 0;
    }
    lastRailTRef.current = 0;
  }, []);

  const railSpringTick = useCallback(
    (now) => {
      const dt = clamp(lastRailTRef.current ? now - lastRailTRef.current : 16, 0, 50);
      lastRailTRef.current = now;
      const rest = railRestRef.current;
      let v = expSmooth(railPanRef.current, rest, dt, RAIL_SPRING_TAU);
      if (Math.abs(v - rest) < 0.5) v = rest;
      applyRailPan(v);
      if (v === rest) {
        railSpringRef.current = 0;
        lastRailTRef.current = 0;
      } else {
        railSpringRef.current = requestAnimationFrame(railSpringTick);
      }
    },
    [applyRailPan],
  );

  // ---- pointer handling: single-finger horizontal rail reveal only. Vertical
  //      scroll is native; two-finger pinch is owned by the touch listeners
  //      above (and bails this handler via pinchActiveRef). ----
  const dragXRef = useRef(null);
  const dragYRef = useRef(null);
  const pressXRef = useRef(null);
  const pressYRef = useRef(null);
  const axisRef = useRef(null); // null | "h" | "v"
  const movedRef = useRef(false);
  // Pointer id captured for an in-flight rail drag, or null. Only ever set once
  // a press has been promoted to a drag — see onPointerDown.
  const capturedIdRef = useRef(null);

  const onPointerDown = useCallback(
    (e) => {
      stopRailSpring();
      // DELIBERATELY NOT capturing the pointer here — the same bug the desktop
      // tree was fixed for, still live in this one because a phone is normally
      // driven by touch and touch pointers were never captured.
      //
      // While a pointer is captured, Chrome retargets the compatibility mouse
      // events — mousedown, mouseup and crucially CLICK — to the capturing
      // element. Capturing on pointerdown therefore sent every mouse click to
      // this scroll container instead of whatever was under the cursor, and no
      // onClick inside the pane ever ran. It surfaced when the menu-zoom rung
      // put real buttons in here (its call to action did nothing to a mouse);
      // it was equally true of every ribbon and draft row before that.
      //
      // Capture is taken in onPointerMove instead, once the gesture has become
      // a rail drag — at which point retargeting the trailing click away from
      // whatever was under the cursor is exactly what we want.
      pressXRef.current = e.clientX;
      pressYRef.current = e.clientY;
      dragXRef.current = e.clientX;
      dragYRef.current = e.clientY;
      axisRef.current = null;
      movedRef.current = false;
      // A finger on the glass suspends the menu strip's settle: the reader is
      // mid-swipe and the slide they land on is theirs to choose.
      gesturingRef.current = true;
    },
    [stopRailSpring],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (pinchActiveRef.current) return; // a pinch owns the gesture
      if (pressXRef.current == null) return;
      if (axisRef.current == null) {
        const tdx = e.clientX - pressXRef.current;
        const tdy = e.clientY - pressYRef.current;
        if (Math.max(Math.abs(tdx), Math.abs(tdy)) > TAP_SLOP) {
          axisRef.current = Math.abs(tdx) > Math.abs(tdy) * AXIS_BIAS ? "h" : "v";
          movedRef.current = true;
          // Now it is a drag, so take the pointer: the rail keeps tracking if
          // the cursor leaves the container mid-drag. Mouse only — capturing a
          // TOUCH pointer would steal it from the native scroller.
          if (e.pointerType === "mouse" && capturedIdRef.current == null) {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            capturedIdRef.current = e.pointerId;
          }
        } else {
          dragXRef.current = e.clientX;
          dragYRef.current = e.clientY;
          return;
        }
      }
      if (axisRef.current === "h") {
        const dx = e.clientX - dragXRef.current;
        dragXRef.current = e.clientX;
        applyRailPan(
          clamp(railPanRef.current + dx * RAIL_RESIST, -RAIL_MAX_REVEAL, RAIL_MAX_REVEAL),
        );
      } else if (menuRef.current && e.pointerType === "mouse") {
        // MOUSE DRAG on the menu strip, and only there. A finger scrolls this
        // container natively, but a mouse never does — browsers do not scroll
        // on a drag — so on the phone layout in a desktop window (a narrow
        // browser, or ?view=mobile) the start page's one teaching gesture was
        // simply dead. Dragging it by hand costs nothing here because the strip
        // pages rather than free-scrolls; the TIMELINE deliberately keeps its
        // native-scroll model and is untouched.
        const dy = e.clientY - dragYRef.current;
        const el = scrollRef.current;
        if (el && dy !== 0) el.scrollTop -= dy; // scroll event mirrors into state
      }
      dragYRef.current = e.clientY;
      // axis === "v" on touch: let the browser scroll natively; nothing to do.
    },
    [applyRailPan],
  );

  const endPointer = useCallback(
    (e) => {
      // Release only what we actually captured (a plain click never captures).
      if (capturedIdRef.current != null) {
        try {
          e.currentTarget.releasePointerCapture?.(capturedIdRef.current);
        } catch {
          /* the pointer may already be gone */
        }
        capturedIdRef.current = null;
      }
      if (axisRef.current === "h") {
        // Detent: pulled far enough -> lock OPEN at RAIL_LOCK_POS, else close to
        // 0. The same rule dismisses a locked rail dragged back in.
        const mag = Math.abs(railPanRef.current);
        const dir = railPanRef.current < 0 ? -1 : 1;
        railRestRef.current = mag >= RAIL_LOCK_AT ? dir * RAIL_LOCK_POS : 0;
        if (railPanRef.current !== railRestRef.current && !railSpringRef.current) {
          lastRailTRef.current = 0;
          railSpringRef.current = requestAnimationFrame(railSpringTick);
        }
      }
      axisRef.current = null;
      pressXRef.current = null;
      pressYRef.current = null;
      dragYRef.current = null;
      gesturingRef.current = false;

      // The page turn is NOT decided here — see samplesRef. A touch pointer is
      // cancelled the instant the browser starts scrolling, so this runs at the
      // beginning of a swipe, not its end. All this does is let the settle run.
      if (menuRef.current) {
      // THE PAUSE RULE, applied at the one moment it can be. A gesture that
      // ended in a pause is not a throw — holding still before letting go is
      // how a person says "put it down here". The scroll stream cannot show
      // this (a hold produces no events, and the settle's own 140ms of quiet
      // looks identical), so it is read from the release instead: if nothing
      // has moved for longer than IDLE_MS while the pointer was still down,
      // the stored velocity is stale and does not count. A touch pointer is
      // cancelled before this runs, so on a phone the SLIDE_COMMIT_V floor is
      // what keeps a slow drag from turning a page.
      if (performance.now() - lastSampleTRef.current > IDLE_MS) lastVRef.current = 0;
        scheduleSettle();
      }
    },
    [railSpringTick, scheduleSettle],
  );

  // True when the just-finished gesture moved; click handlers ignore that click.
  const didDrag = useCallback(() => movedRef.current, []);

  const scrollBy = useCallback(
    (dy) => {
      const el = scrollRef.current;
      if (el) setScrollTop(el.scrollTop + dy);
    },
    [setScrollTop],
  );


  // Leave the menu for the timeline — what the start page's call to action
  // does. It lands on the coarsest timeline band, the rung the gesture it names
  // would have reached, rather than jumping the reader somewhere they did not
  // ask to be.
  const exitMenu = useCallback(() => {
    if (bandIndexRef.current !== MENU_INDEX) return;
    commitBand(TIMELINE_N - 1);
  }, [commitBand]);

  // Jump the strip to a slide (the menu's pager dots) — the same path a
  // released swipe takes, so a tapped dot and a thrown page land identically.
  const goToSlide = scrollToSlide;

  return {
    band: MOBILE_ZOOM_BANDS[bandIndex],
    bandIndex,
    menu,
    goToSlide,
    exitMenu,
    scrollY,
    maxScroll,
    layout,
    totalHeight: layout.totalHeight,
    scrollRange,
    visualScale,
    scaleAnchorY,
    railPan,
    scrollRef,
    scrollBy,
    didDrag,
    handlers: {
      onScroll,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
    },
  };
}
