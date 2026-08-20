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
import { MOBILE_BANDS } from "../components/visualization/detail.js";
import { clamp, expSmooth, pickBand, visualScaleFor } from "./zoomMath.js";

// The phone ladder stops at ERA_SUMMARY: DETAIL_BANDS' two coarse bands share
// zoom rung 1, so walking through both gave two consecutive "Eras" stops.
const N = MOBILE_BANDS.length;
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

export default function useTimelineViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  // Extra scroll range for the pinned-ribbon stack, which pushes the timeline
  // down by its live height (staffRibbonModel.maxStackHeight).
  ribbonSlack = 0,
  height = 0,
  initialBandIndex = 2, // SEASON_LINES
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
    for (let i = out.length - 2; i >= 0; i--) {
      out[i] = Math.max(out[i], out[i + 1] * MIN_BAND_RATIO);
    }
    return out;
  }, [layouts]);

  const layout = layouts[clamp(bandIndex, 0, N - 1)];
  // scrollRange = the timeline plus room for the ribbon stack it hides behind.
  const scrollRange = layout.totalHeight + ribbonSlack;
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

  const onScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const y = el.scrollTop;
      scrollYRef.current = y;
      setScrollY(y);
    });
  }, []);

  // Pending zoom anchor: keep the focal year under the cursor after a band
  // switch reflows the stack (and totalHeight/scroll range changes).
  const anchorRef = useRef(null);
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    const targetContentY = layout.tToY(a.focusT);
    setScrollTop(targetContentY - a.cursorY);
  }, [layout, setScrollTop]);

  // Deep-link: scroll so focusYear sits in the upper quarter of the view, then
  // hand the target back (leaderboard rows, career-follow jumps).
  useLayoutEffect(() => {
    if (focusYear == null) return;
    if (!layout?.blocks?.length || !height) return;
    setScrollTop(layout.yearToY(focusYear) - height * 0.25);
    if (onFocusConsumed) onFocusConsumed();
  }, [focusYear, layout, height, onFocusConsumed, setScrollTop]);

  // Commit a band switch while pinning the focal year under the anchor. Reads
  // the OLD layout to find the focal year; the layout effect above fixes scroll
  // once the new band renders.
  const commitBand = useCallback((nb) => {
    const old = layoutsRef.current[bandIndexRef.current];
    const focusT = old.yToYear(scrollYRef.current + anchorYRef.current);
    anchorRef.current = { focusT, cursorY: anchorYRef.current };
    bandIndexRef.current = nb;
    setBandIndex(nb);
  }, []);

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
  useEffect(() => {
    if (!rafRef.current && !pinchActiveRef.current) {
      gestureHRef.current = bandHeights[bandIndexRef.current];
      zoomTargetRef.current = gestureHRef.current;
      setVisualScale(1);
      setScaleAnchorY(0);
    }
  }, [bandHeights]);

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
  const pressXRef = useRef(null);
  const pressYRef = useRef(null);
  const axisRef = useRef(null); // null | "h" | "v"
  const movedRef = useRef(false);

  const onPointerDown = useCallback(
    (e) => {
      stopRailSpring();
      // Capturing a TOUCH pointer would steal it from the native scroller; only
      // capture the mouse (which never triggers native scroll anyway).
      if (e.pointerType === "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
      pressXRef.current = e.clientX;
      pressYRef.current = e.clientY;
      dragXRef.current = e.clientX;
      axisRef.current = null;
      movedRef.current = false;
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
        } else {
          dragXRef.current = e.clientX;
          return;
        }
      }
      if (axisRef.current === "h") {
        const dx = e.clientX - dragXRef.current;
        dragXRef.current = e.clientX;
        applyRailPan(
          clamp(railPanRef.current + dx * RAIL_RESIST, -RAIL_MAX_REVEAL, RAIL_MAX_REVEAL),
        );
      }
      // axis === "v": let the browser scroll natively; nothing to do.
    },
    [applyRailPan],
  );

  const endPointer = useCallback(
    (e) => {
      if (e.pointerType === "mouse") {
        try {
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
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
    },
    [railSpringTick],
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

  return {
    band: MOBILE_BANDS[bandIndex],
    bandIndex,
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
