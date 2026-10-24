// Viewport for the desktop (landscape) content-stacked timeline — the
// transposed sibling of hooks/useTimelineViewport.js. Same architecture, axes
// swapped:
//
// THE DESKTOP INPUT MODEL: SCROLL ZOOMS, DRAG PANS.
//
// The wheel is the zoom control — EVERY wheel event, modified or not, drives
// semantic-band zoom on the cursor's focal point. Lateral movement is
// grab-and-drag (plus the native scrollbar and programmatic scrollBy). This is
// the deliberate inverse of what this hook used to do, where a plain wheel
// scrolled sideways and zoom hid behind ctrl/⌘; on a timeline whose whole
// story is told by how far out you're standing, zoom is the gesture worth
// spending the primary input on, and dragging a timeline sideways is the more
// direct way to travel along it anyway.
//
// This is a DESKTOP-ONLY decision. The mobile tree
// (hooks/useTimelineViewport.js) is a separate branch with its own input model
// and is deliberately NOT kept in sync with this one.
//
// SCROLL POSITION is still NATIVE and horizontal. DesktopMain renders a real
// overflow-x:auto container (spacer width = committed band's totalWidth, SVG as
// a position:sticky overlay pinned left) and this hook mirrors `scrollLeft`
// (rAF-throttled). Drag moves that scroller; so do the scrollbar and one-finger
// touch (native, via touch-action:pan-x). Nothing about scroll POSITION changed
// — only what drives it.
//
// ZOOM is custom (semantic-band): the wheel and two-finger pinch drive
// `gestureW`, a desired apparent content WIDTH; `pickBand` commits the nearest
// band and `visualScale` cosmetically bridges the rest along x, anchored on the
// cursor's focal point (kept under the cursor across band switches via
// scrollLeft).
//
// There is NO drag-reveal on desktop: career-follow pills are always visible
// in the margins above the lane and below the rail (the landscape viewport
// has the room), so mobile's rail-reveal machinery has no counterpart here.
// Pointer handling only distinguishes a mouse drag-pan from a tap (didDrag
// guards trailing clicks).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildDesktopLayout } from "./buildDesktopLayout.js";
import { DESKTOP_BANDS, DESKTOP_ZOOM_BANDS } from "./desktopDetail.js";
import { MENU_SLIDE_COUNT, menuScrollExtent, slideOffset } from "../menu/menuModel.js";
import {
  FLING_STOP_V,
  IDLE_MS,
  MIN_FLING_V,
  flingStep,
  slideTargetFor,
  trackSample,
  velocityOf,
} from "./flingModel.js";
import { buildEraBoxes, blurbPadFor } from "./desktopEraModel.js";
import { clamp, expSmooth, pickBand, releaseBand, visualScaleFor } from "../hooks/zoomMath.js";

// DESKTOP_BANDS, not DETAIL_BANDS: the desktop ladder is exactly the four
// user-facing rungs (Eras / Seasons / Season by season / Every game).
const TIMELINE_N = DESKTOP_BANDS.length;
// The ladder the gesture walks has one more stop than there are LAYOUTS: the
// MENU rung (src/menu/), which draws no franchise and therefore has no layout.
// Every index into `layouts` is clamped to TIMELINE_N - 1 for that reason.
const N = DESKTOP_ZOOM_BANDS.length;
const MENU_INDEX = N - 1;
// Minimum width ratio between adjacent rungs in GESTURE space; must clear
// pickBand's e^(2*hyst) ≈ 1.271 reachability threshold with a little room.
const MIN_BAND_RATIO = 1.3;
// Menu rung: how long the scroller has to be quiet before the strip settles
// onto the nearest slide, and how close counts as already there.
const SETTLE_MS = 140;
const SETTLE_EPS = 1;
const TAP_SLOP = 5; // px of pointer travel before a press counts as a drag
// NO AXIS LOCK. A drag pans by its HORIZONTAL COMPONENT whichever way it
// travels — there used to be one, and a mostly-vertical drag did nothing at
// all. That was defensible while the wheel was the main way to move sideways;
// now that drag IS the navigation, a sloppy diagonal that goes nowhere just
// reads as the app being broken. Vertical movement is simply ignored (desktop
// has no drag-reveal — see below).
const WHEEL_STEP = 90; // accumulated wheel PIXELS that advance one band

// WHEEL DELTAS ARE NOT ALL IN PIXELS, and assuming they are is how the zoom
// gesture silently did nothing in some browsers while working in others.
//
// `deltaMode` says what the numbers mean: 0 = pixels, 1 = LINES, 2 = pages.
// Chrome sends mode 0 with ~100 per notch. Firefox sends mode 1 with 3 per
// notch — so against a 90-PIXEL threshold, a Firefox user had to spin the wheel
// THIRTY notches to move one rung, which is indistinguishable from a wheel that
// isn't wired up at all. Everything here has to be normalized to pixels first.
//
// The constants are the usual ones (cf. normalize-wheel): 40px per line puts a
// Firefox notch at 3 x 40 = 120px, right alongside Chrome's ~100, so the gesture
// costs the same amount of wrist in both.
//
// NOTE FOR TESTS: Playwright's `mouse.wheel` can only produce mode 0, so no
// amount of driving it will exercise this. sims/desktop_interaction.drive.mjs
// dispatches WheelEvents with an explicit deltaMode instead.
const WHEEL_LINE_PX = 40;
const WHEEL_PAGE_PX = 800;
// One event may not carry the ladder more than two rungs: page-mode deltas are
// enormous once normalized, and without this a single notch in that mode would
// slam from one end of the zoom range to the other.
const WHEEL_MAX_PX = 2 * WHEEL_STEP;

// A wheel event's travel in PIXELS, along whichever axis dominates.
export function wheelPixels(e) {
  const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  const scale =
    e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? WHEEL_PAGE_PX : 1;
  const px = raw * scale;
  return Math.max(-WHEEL_MAX_PX, Math.min(WHEEL_MAX_PX, px));
}
const ANIM_DONE_PX = 0.5;
const ANIM_TAU = 55; // ms

export default function useDesktopViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  width = 0,
  // The window OPENS on the menu rung — it is the start page, not a level you
  // have to go looking for.
  initialBandIndex = MENU_INDEX,
  focusYear = null,
  onFocusConsumed = null,
  showPlayoffs = true,
  // The selected Named Era, when one is picked: { id, lastYear, blurb }. A
  // chapter too narrow to hold a readable blurb line gets whitespace reserved
  // after its last season. Computed HERE because this hook owns the layouts —
  // deriving the pad in a consumer would mean measuring a padded layout to
  // decide the pad, which oscillates.
  selectedEra = null,
}) {
  const [bandIndex, setBandIndex] = useState(initialBandIndex);
  // scrollX mirrors the scroll container's scrollLeft (set from scroll events).
  const [scrollXState, setScrollX] = useState(0);
  // Cosmetic horizontal scale during a band transition, anchored at scaleAnchorX.
  const [visualScale, setVisualScale] = useState(1);
  const [scaleAnchorX, setScaleAnchorX] = useState(0);

  // The native scroll container (DesktopMain attaches this).
  const scrollRef = useRef(null);

  // Precompute every band's layout once; switching bands is a pure index change.
  // `width` is a dependency because the Eras band is fit-to-viewport — a window
  // resize genuinely changes its geometry, unlike the other three.
  const layouts = useMemo(() => {
    const build = (band, padAfterYear) =>
      buildDesktopLayout({
        seasons,
        modules,
        moduleData,
        reserveByYear,
        padAfterYear,
        detailBand: band,
        left: 0,
        fitWidth: width,
        showPlayoffs,
      });

    return DESKTOP_BANDS.map((band) => {
      const base = build(band, undefined);
      if (!selectedEra?.blurb || selectedEra.lastYear == null) return base;
      // Measure the chapter on the UNPADDED layout, then rebuild once. The
      // pad is never fed back in, so there's no loop.
      const boxes = buildEraBoxes({
        eras: [selectedEra.era],
        layout: base,
      });
      const pad = blurbPadFor(boxes[0]);
      if (!pad) return base;
      return build(band, { [selectedEra.lastYear]: pad });
    });
  }, [seasons, modules, moduleData, reserveByYear, width, showPlayoffs, selectedEra]);
  const bandWidths = useMemo(() => {
    const out = layouts.map((l) => Math.max(1, l.totalWidth));
    // The MENU rung is one screenful of apparent content — a slide, not the
    // whole strip. Its scroll extent runs to several screens, but that is
    // paging rather than zoom, and feeding the strip's length in here would put
    // the menu somewhere up the middle of the ladder.
    out.push(Math.max(1, width || 1200));
    // GESTURE-SPACE FLOOR, and the menu rung is the whole reason it exists here.
    // The Eras band is fit-to-viewport (DESKTOP_GEOMETRY's `fit`), so its true
    // width is ALSO about one window — the same measure the menu takes. Two
    // rungs at the same width are indistinguishable to pickBand, which walks in
    // log space with a dead zone either side of each geometric-mean boundary: a
    // rung is only reachable when it clears e^(2*hyst) ≈ 1.271x its neighbour.
    // Left uncorrected, the menu and Eras would have made one rung you could
    // not get off. Layouts still render their true widths — bandWidths feeds
    // nothing but the gesture, and visualScale settles to 1 at rest either way.
    // Same correction, same reasoning, as MIN_BAND_RATIO in useTimelineViewport.
    for (let i = out.length - 2; i >= 0; i--) {
      out[i] = Math.max(out[i], out[i + 1] * MIN_BAND_RATIO);
    }
    return out;
  }, [layouts, width]);

  const menu = bandIndex === MENU_INDEX;
  // No layout for the menu rung; it keeps the coarsest one mounted underneath
  // so leaving the menu lands back on a real band with a real scroll range.
  const layout = layouts[clamp(bandIndex, 0, TIMELINE_N - 1)];
  // The scroller's content size: the timeline, or the slide strip the very same
  // scroller pages through at the menu rung.
  const totalWidth = menu ? menuScrollExtent(width) : layout.totalWidth;
  const maxScroll = Math.max(0, totalWidth - width);
  const scrollX = clamp(scrollXState, 0, maxScroll);

  // --- refs mirroring state for use inside rAF / event callbacks ---
  const bandIndexRef = useRef(bandIndex);
  bandIndexRef.current = bandIndex;
  const scrollXRef = useRef(scrollX);
  scrollXRef.current = scrollX;
  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;
  const widthRef = useRef(width);
  widthRef.current = width;
  const bandWidthsRef = useRef(bandWidths);
  bandWidthsRef.current = bandWidths;
  // Read by the wheel listener, which is bound once and must not close over a
  // stale rung.
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const anchorXRef = useRef(0);

  const gestureWRef = useRef(bandWidths[initialBandIndex]);
  // The settle target is a band INDEX, not a pixel value: it is resolved
  // against the live bandWidths on every frame. Those can change under an
  // in-flight settle (on the phone the hide-on-scroll header docking changes
  // the viewport, and with it the menu rung and the floors stacked on it), and
  // a pixel target captured beforehand then landed a band at a scale that was
  // no longer 1 — a squished timeline nothing corrected until the next gesture.
  const zoomTargetRef = useRef(initialBandIndex);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const targetBandRef = useRef(initialBandIndex);
  const wheelAccumRef = useRef(0);
  const pinchActiveRef = useRef(false);
  const d0Ref = useRef(1);
  const pinchStartWRef = useRef(bandWidths[initialBandIndex]);
  const pinchStartBandRef = useRef(initialBandIndex); // committed band at pinch start
  // Scroll-event rAF throttle.
  const scrollRafRef = useRef(0);

  // ---- imperative scroll: write scrollLeft, reflect into state ----
  const setScrollLeft = useCallback((x) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, x); // browser clamps to scroll range
    const nx = el.scrollLeft;
    scrollXRef.current = nx;
    setScrollX(nx);
  }, []);

  // ---- menu rung: settle onto the nearest slide -----------------------------
  //
  // Paged by hand rather than by CSS scroll-snap, for the reason spelled out in
  // useTimelineViewport: this container carries a non-passive wheel listener,
  // which takes scrolling off the compositor, and main-thread scrolling with
  // `scroll-snap-type: mandatory` re-snaps after every single delta. It would
  // have pulled every swipe — and every frame of the mouse drag-pan, which
  // moves this element programmatically — straight back to the slide it
  // started on.
  const settleTimerRef = useRef(0);
  const gesturingRef = useRef(false);
  // Trailing position samples for the gesture's velocity (see flingModel).
  const samplesRef = useRef([]);
  // The velocity the strip had when it was LAST ACTUALLY MOVING, kept for the
  // menu settle — by the time it fires everything is at rest and the live
  // reading is zero. See the long note in useTimelineViewport: a touch pointer
  // is CANCELLED the moment the browser starts scrolling, so a page turn
  // decided at pointerup runs at the start of a swipe and never sees it. The
  // decision therefore happens where scrolling stops, on both platforms.
  const lastVRef = useRef(0);
  const lastSampleTRef = useRef(0);
  const scrollingRef = useRef(false);
  // In-flight momentum coast.
  const flingRafRef = useRef(0);
  const flingVRef = useRef(0);
  const flingLastTRef = useRef(0);

  const scrollToSlide = useCallback(
    (i) => {
      const el = scrollRef.current;
      if (!el) return;
      const span = Math.max(1, widthRef.current);
      const x = slideOffset(clamp(i, 0, MENU_SLIDE_COUNT - 1), span);
      if (Math.abs(el.scrollLeft - x) < SETTLE_EPS) return;
      if (el.scrollTo) el.scrollTo({ left: x, behavior: "smooth" });
      else setScrollLeft(x);
    },
    [setScrollLeft],
  );

  // Land the strip, judging the swipe on INTENT rather than on how far it
  // happened to get.
  const settleToSlide = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = slideTargetFor({
      scroll: el.scrollLeft,
      span: Math.max(1, widthRef.current),
      startSlide: gestureStartSlideRef.current,
      velocity: lastVRef.current,
      count: MENU_SLIDE_COUNT,
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

  // ---- momentum ------------------------------------------------------------
  //
  // The mouse drag moves this scroller by assigning `scrollLeft`, so the
  // browser contributes no inertia of its own: without this the timeline
  // stopped dead on mouse-up however hard it was thrown. `flingModel` owns the
  // physics and the intent rule; this is the loop that applies them.
  const stopFling = useCallback(() => {
    if (flingRafRef.current) {
      cancelAnimationFrame(flingRafRef.current);
      flingRafRef.current = 0;
    }
    flingVRef.current = 0;
    flingLastTRef.current = 0;
  }, []);

  const flingTick = useCallback(
    (now) => {
      const el = scrollRef.current;
      if (!el) {
        flingRafRef.current = 0;
        return;
      }
      const dt = flingLastTRef.current ? now - flingLastTRef.current : 16;
      flingLastTRef.current = now;
      const before = el.scrollLeft;
      el.scrollLeft = before + flingVRef.current * dt;
      // Hitting either end ends the coast: the browser clamped us, so the
      // remaining velocity has nowhere to go and would just spin a rAF.
      const moved = Math.abs(el.scrollLeft - before) > 0.5;
      flingVRef.current = flingStep(flingVRef.current, dt);
      if (!moved || Math.abs(flingVRef.current) < FLING_STOP_V) {
        flingRafRef.current = 0;
        flingLastTRef.current = 0;
        flingVRef.current = 0;
        return;
      }
      flingRafRef.current = requestAnimationFrame(flingTick);
    },
    [],
  );

  const startFling = useCallback(
    (v) => {
      stopFling();
      flingVRef.current = v;
      flingLastTRef.current = 0;
      flingRafRef.current = requestAnimationFrame(flingTick);
    },
    [flingTick, stopFling],
  );

  const onScroll = useCallback(() => {
    if (menuRef.current) {
      const el = scrollRef.current;
      if (el) {
        const span = Math.max(1, widthRef.current);
        if (!scrollingRef.current) {
          scrollingRef.current = true;
          samplesRef.current = [];
          gestureStartSlideRef.current = Math.round(el.scrollLeft / span);
        }
        lastSampleTRef.current = performance.now();
        trackSample(samplesRef.current, el.scrollLeft, lastSampleTRef.current);
        lastVRef.current = velocityOf(samplesRef.current);
      }
      scheduleSettle();
    }
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const x = el.scrollLeft;
      scrollXRef.current = x;
      setScrollX(x);
    });
  }, [scheduleSettle]);

  // Stable refs for the momentum callbacks used by the bound-once listeners.
  const stopFlingRef = useRef(stopFling);
  stopFlingRef.current = stopFling;

  // Pending zoom anchor: keep the focal year under the cursor after a band
  // switch reflows the stack (and totalWidth/scroll range changes).
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
      setScrollLeft(a.scrollTo);
      return;
    }
    const targetContentX = layout.tToX(a.focusT);
    setScrollLeft(targetContentX - a.cursorX);
    // `bandIndex` is a dependency because crossing the Eras/menu boundary does
    // NOT change `layout` (the menu keeps the coarsest one mounted), so the
    // effect would otherwise never run for exactly the switch that needs it.
  }, [layout, bandIndex, setScrollLeft]);

  // Commit a band switch while pinning the focal year under the anchor.
  const commitBand = useCallback((nb) => {
    const from = bandIndexRef.current;
    if (nb === MENU_INDEX) {
      // Into the menu: the scroller stops being the timeline and becomes the
      // slide strip, so there is no year to pin. Park where the timeline was
      // and open the menu on its first page.
      parkedScrollRef.current = scrollXRef.current;
      anchorRef.current = { scrollTo: 0 };
    } else if (from === MENU_INDEX) {
      // Back out of the menu: return the reader to where they left the
      // timeline rather than to whichever slide they happened to stop on.
      anchorRef.current = { scrollTo: parkedScrollRef.current };
    } else {
      const old = layoutsRef.current[clamp(from, 0, TIMELINE_N - 1)];
      const focusT = old.xToYear(scrollXRef.current + anchorXRef.current);
      anchorRef.current = { focusT, cursorX: anchorXRef.current };
    }
    bandIndexRef.current = nb;
    setBandIndex(nb);
  }, []);

  // Deep-link: scroll so focusYear sits in the left quarter of the view, then
  // hand the target back (leaderboard rows, career-follow jumps).
  useLayoutEffect(() => {
    if (focusYear == null) return;
    if (!layout?.blocks?.length || !width) return;
    // A deep link — a personnel track switched on, a leaderboard row, a career
    // follow — is a request to LOOK AT something on the timeline. If it arrives
    // while the menu has the surface, the menu steps aside and the effect runs
    // again on the next commit (hence `bandIndex` in the deps) to do the scroll.
    if (bandIndexRef.current === MENU_INDEX) {
      commitBand(TIMELINE_N - 1);
      return;
    }
    setScrollLeft(layout.yearToX(focusYear) - width * 0.25);
    if (onFocusConsumed) onFocusConsumed();
  }, [focusYear, layout, bandIndex, width, onFocusConsumed, setScrollLeft, commitBand]);

  const applyGestureW = useCallback(
    (w) => {
      const widths = bandWidthsRef.current;
      const cw = clamp(w, widths[N - 1], widths[0]);
      gestureWRef.current = cw;
      const nb = pickBand(cw, bandIndexRef.current, widths);
      if (nb !== bandIndexRef.current) commitBand(nb);
      setVisualScale(visualScaleFor(cw, widths[bandIndexRef.current]));
    },
    [commitBand],
  );

  // rAF ease of gestureW toward zoomTargetRef (ctrl-wheel + pinch-release
  // settle). Landing on a band's natural width sets visualScale to 1.
  const tick = useCallback(
    (now) => {
      const dt = lastTRef.current ? now - lastTRef.current : 16;
      lastTRef.current = now;
      const target = bandWidthsRef.current[zoomTargetRef.current];
      let w = expSmooth(gestureWRef.current, target, dt, ANIM_TAU);
      const done = Math.abs(target - w) < ANIM_DONE_PX;
      if (done) w = target;
      applyGestureW(w);
      if (done) {
        rafRef.current = 0;
        lastTRef.current = 0;
        setVisualScale(visualScaleFor(target, bandWidthsRef.current[bandIndexRef.current]));
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [applyGestureW],
  );

  const startAnim = useCallback(
    (targetBand, anchorX) => {
      zoomTargetRef.current = clamp(targetBand, 0, N - 1);
      anchorXRef.current = anchorX;
      setScaleAnchorX(anchorX);
      if (!rafRef.current) {
        lastTRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [tick],
  );

  const startAnimRef = useRef(startAnim);
  startAnimRef.current = startAnim;
  const applyGestureWRef = useRef(applyGestureW);
  applyGestureWRef.current = applyGestureW;

  // Keep the resting gestureW locked to the committed band's natural width
  // when no zoom is in flight, so layout reflows don't leave a stale scale.
  // `bandIndex` joined the deps when the menu rung arrived: a band can now be
  // committed WITHOUT a gesture (a deep link pulling the reader out of the
  // menu), and the resting gestureW has to follow it or the next wheel notch
  // would start from the width of the band they just left.
  useEffect(() => {
    if (!rafRef.current && !pinchActiveRef.current) {
      gestureWRef.current = bandWidths[bandIndexRef.current];
      zoomTargetRef.current = bandIndexRef.current;
    }
  }, [bandWidths, bandIndex]);

  // ---- native listeners: wheel (scroll + ctrl-zoom) + pinch ----
  // Bound via addEventListener (non-passive) because React's synthetic wheel/
  // touch handlers are passive — preventDefault() would be ignored.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const leftOf = () => el.getBoundingClientRect().left;

    // EVERY wheel event zooms, on the cursor's focal point — that is the whole
    // point of the desktop input model (see the note at the top of this file).
    //
    // No ctrl/⌘ branch any more, but preventDefault still has to run on the
    // modified case or the BROWSER page-zooms underneath us; a ctrl+wheel now
    // simply zooms the timeline like every other wheel.
    //
    // The delta is normalized to PIXELS first (see wheelPixels — deltaMode is
    // not always 0), and the dominant axis feeds the accumulator so the gesture
    // also works on hardware that reports a sideways scroll (a tilt wheel, a
    // horizontal swipe) instead of a vertical one.
    const onWheel = (e) => {
      // AT THE MENU RUNG the scroller is the slide strip, and a sideways swipe
      // is the gesture the start page teaches — so it must reach the native
      // scroller instead of being eaten by the zoom. A vertical wheel still
      // zooms: on a mouse it is the only way back into the timeline, and the
      // pager dots cover paging for that hardware.
      if (menuRef.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      // Zooming takes the scroller over — a coast still running underneath
      // would drag the focal point out from under the cursor.
      stopFlingRef.current();
      const d = wheelPixels(e);
      if (d === 0) return;
      const cursorX = e.clientX - leftOf();
      // A fresh gesture re-bases on the COMMITTED band: without this the
      // accumulator would keep counting from wherever the last one left off
      // and a single notch could jump two rungs.
      if (!rafRef.current) {
        targetBandRef.current = bandIndexRef.current;
        wheelAccumRef.current = 0;
      }
      wheelAccumRef.current += d;
      const steps = Math.trunc(wheelAccumRef.current / WHEEL_STEP);
      if (steps !== 0) {
        wheelAccumRef.current -= steps * WHEEL_STEP;
        targetBandRef.current = clamp(targetBandRef.current + steps, 0, N - 1);
      }
      startAnimRef.current(targetBandRef.current, cursorX);
    };

    // Two-finger pinch zoom via TOUCH events (touch-capable desktops); mirrors
    // the mobile hook. preventDefault on multi-touch so the browser neither
    // scrolls nor page-zooms during a pinch; one finger pans natively (pan-x).
    const dist2 = (t) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    // A pinch that crosses a band re-renders the canvas, and the element each
    // finger first landed on is usually part of what goes (a season block, a
    // menu card). Touch events stay targeted at that node after it is detached,
    // so they stop bubbling up to `el`: the touchend never arrived,
    // pinchActiveRef stayed true, and the cosmetic scale froze mid-tween — the
    // squished view after a zoom change, which lasted until some later
    // one-finger scroll happened to deliver a touchend. Listening on the touch
    // targets themselves keeps the tail of the gesture reachable; `seen` stops
    // an event that does still bubble from being handled twice.
    const seen = new WeakSet();
    const firstSight = (e) => {
      if (seen.has(e)) return false;
      seen.add(e);
      return true;
    };
    const fingerTargets = new Set();
    const bindTargets = (touches) => {
      for (const t of touches) {
        const n = t.target;
        if (!n || n === el || fingerTargets.has(n)) continue;
        n.addEventListener("touchmove", onTouchMove, { passive: false });
        n.addEventListener("touchend", onTouchEnd);
        n.addEventListener("touchcancel", onTouchEnd);
        fingerTargets.add(n);
      }
    };
    const unbindTargets = () => {
      for (const n of fingerTargets) {
        n.removeEventListener("touchmove", onTouchMove);
        n.removeEventListener("touchend", onTouchEnd);
        n.removeEventListener("touchcancel", onTouchEnd);
      }
      fingerTargets.clear();
    };

    const onTouchStart = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      stopFlingRef.current();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        lastTRef.current = 0;
      }
      pinchActiveRef.current = true;
      bindTargets(e.touches);
      d0Ref.current = Math.max(1, dist2(e.touches));
      pinchStartWRef.current = gestureWRef.current;
      pinchStartBandRef.current = bandIndexRef.current;
      const anchorX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - leftOf();
      anchorXRef.current = anchorX;
      setScaleAnchorX(anchorX);
    };
    const onTouchMove = (e) => {
      if (!firstSight(e)) return;
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (!pinchActiveRef.current) return;
      const d = Math.max(1, dist2(e.touches));
      applyGestureWRef.current(pinchStartWRef.current * (d / d0Ref.current));
    };
    const onTouchEnd = (e) => {
      if (!firstSight(e)) return;
      if (!pinchActiveRef.current) return;
      if (e.touches.length >= 2) return; // still pinching
      pinchActiveRef.current = false;
      unbindTargets();
      const target = releaseBand({
        gesture: gestureWRef.current,
        startBand: pinchStartBandRef.current,
        committed: bandIndexRef.current,
        heights: bandWidthsRef.current,
      });
      startAnimRef.current(target, anchorXRef.current);
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
      unbindTargets();
    };
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      if (flingRafRef.current) cancelAnimationFrame(flingRafRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  // ---- pointer handling: MOUSE drag-pan + tap-vs-drag tracking.
  //      Drag is the primary lateral navigation on desktop. Horizontal touch
  //      pans are native (touch-action:pan-x); pinch is owned by the touch
  //      listeners above (and bails this handler). ----
  const dragXRef = useRef(null);
  const dragYRef = useRef(null);
  const pressXRef = useRef(null);
  const pressYRef = useRef(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  // Which slide the in-flight gesture started on (menu rung only).
  const gestureStartSlideRef = useRef(0);
  // Pointer id we captured for an in-flight drag, or null. Only set once a
  // press has been promoted to a drag — see onPointerDown for why.
  const capturedIdRef = useRef(null);

  const onPointerDown = useCallback((e) => {
    // DELIBERATELY NOT capturing the pointer here.
    //
    // While a pointer is captured, Chrome retargets the compatibility mouse
    // events — mousedown, mouseup and crucially CLICK — to the capturing
    // element. Capturing on pointerdown therefore sent every click to this
    // scroll container instead of the ribbon, career-follow pill or draft row
    // the user actually pressed, and none of their onClick handlers ever ran:
    // tapping a name opened no info card, and tapping a "To <team>" pill
    // navigated nowhere. Nothing about the markup or the geometry looked wrong,
    // which is what made it hard to see.
    //
    // Capture is taken in onPointerMove instead, once the gesture has actually
    // become a drag — at which point retargeting the trailing click away from
    // whatever was under the cursor is exactly what we want (it's the same
    // click tapGuard exists to swallow).
    pressXRef.current = e.clientX;
    pressYRef.current = e.clientY;
    dragXRef.current = e.clientX;
    dragYRef.current = e.clientY;
    draggingRef.current = false;
    movedRef.current = false;
    // A held pointer suspends the menu strip's settle: the reader is mid-drag
    // and the slide they land on is theirs to choose.
    gesturingRef.current = true;
    // Grabbing the timeline mid-coast stops it dead — catching a thrown thing
    // is how you stop it.
    stopFlingRef.current();
    // Seeded only for the TIMELINE coast; the menu strip's own decision is
    // driven by the scroll sequence instead (see samplesRef above).
    if (!menuRef.current) {
      const el = scrollRef.current;
      samplesRef.current = [];
      if (el) trackSample(samplesRef.current, el.scrollLeft, e.timeStamp);
    }
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      if (pinchActiveRef.current) return; // a pinch owns the gesture
      if (pressXRef.current == null) return;
      if (!draggingRef.current) {
        // Promote press -> drag once it clears the slop, in ANY direction.
        const tdx = e.clientX - pressXRef.current;
        const tdy = e.clientY - pressYRef.current;
        if (Math.max(Math.abs(tdx), Math.abs(tdy)) <= TAP_SLOP) {
          dragXRef.current = e.clientX;
          dragYRef.current = e.clientY;
          return;
        }
        draggingRef.current = true;
        movedRef.current = true;
        // The gesture is now a drag, so take the pointer: the pan keeps
        // tracking if the cursor leaves the container mid-drag. Mouse only —
        // capturing a TOUCH pointer would steal it from the native scroller.
        if (e.pointerType === "mouse" && capturedIdRef.current == null) {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          capturedIdRef.current = e.pointerId;
        }
      }
      if (e.pointerType === "mouse") {
        // Grab-and-drag panning for the mouse; touch horizontal is native.
        // Only the HORIZONTAL component is used — the timeline has one axis —
        // but the drag is never rejected for being too vertical.
        const dx = e.clientX - dragXRef.current;
        dragXRef.current = e.clientX;
        dragYRef.current = e.clientY;
        const el = scrollRef.current;
        if (el && dx !== 0) el.scrollLeft -= dx; // scroll event mirrors into state
        // Sample the SCROLLER, not the pointer: one sign convention, and a drag
        // that ran into either end reports the zero velocity it really has. At
        // the menu rung the scroll handler is already doing this.
        if (el && !menuRef.current) trackSample(samplesRef.current, el.scrollLeft, e.timeStamp);
      }
    },
    [],
  );

  const endPointer = useCallback((e) => {
    // Release only what we actually captured (a plain click never captures).
    if (capturedIdRef.current != null) {
      try {
        e.currentTarget.releasePointerCapture?.(capturedIdRef.current);
      } catch {
        /* the pointer may already be gone */
      }
      capturedIdRef.current = null;
    }
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    pressXRef.current = null;
    pressYRef.current = null;
    gesturingRef.current = false;

    if (menuRef.current) {
      // The page turn is NOT decided here — a touch pointer is cancelled the
      // instant the browser starts scrolling, so this can run at the beginning
      // of a swipe rather than its end. The settle owns that decision.
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
      return;
    }
    // The TIMELINE coast, which is mouse-drag only and so has no such problem:
    // how fast it was moving when let go, or zero if the gesture ended in a
    // pause — a person putting the view down, not throwing it (see velocityOf).
    const el = scrollRef.current;
    const v = wasDragging && el ? velocityOf(samplesRef.current, e.timeStamp) : 0;
    samplesRef.current = [];
    if (Math.abs(v) >= MIN_FLING_V) startFling(v);
  }, [scheduleSettle, startFling]);

  // True when the just-finished gesture moved; click handlers ignore that click.
  const didDrag = useCallback(() => movedRef.current, []);

  const scrollBy = useCallback(
    (dx) => {
      const el = scrollRef.current;
      if (el) setScrollLeft(el.scrollLeft + dx);
    },
    [setScrollLeft],
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
  // released flick takes, so a tapped dot and a thrown page land identically.
  const goToSlide = scrollToSlide;

  return {
    band: DESKTOP_ZOOM_BANDS[bandIndex],
    bandIndex,
    menu,
    goToSlide,
    exitMenu,
    scrollX,
    maxScroll,
    layout,
    totalWidth,
    visualScale,
    scaleAnchorX,
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
