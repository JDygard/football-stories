// Viewport for the desktop (landscape) content-stacked timeline — the
// transposed sibling of hooks/useTimelineViewport.js. Same architecture, axes
// swapped:
//
// SCROLL = NATIVE, HORIZONTAL. DesktopMain renders a real overflow-x:auto
// container (spacer width = committed band's totalWidth, SVG as a
// position:sticky overlay pinned left) and this hook mirrors `scrollLeft`
// (rAF-throttled). A plain (unmodified) wheel is translated into horizontal
// scrolling — mouse wheels only emit deltaY, and "wheel moves the timeline"
// is the expected idiom for a horizontal timeline. Trackpad horizontal pans
// and the scrollbar hit the same native scroller. A horizontal MOUSE drag
// also pans (desktop users expect grab-and-drag; touch horizontal pans are
// native via touch-action:pan-x).
//
// ZOOM stays custom (semantic-band zoom): ctrl/⌘+wheel and two-finger pinch
// drive `gestureW`, a desired apparent content WIDTH; `pickBand` commits the
// nearest band and `visualScale` cosmetically bridges the rest along x,
// anchored on the cursor's focal point (kept under the cursor across band
// switches via scrollLeft).
//
// There is NO drag-reveal on desktop: career-follow pills are always visible
// in the margins above the lane and below the rail (the landscape viewport
// has the room), so mobile's rail-reveal machinery has no counterpart here.
// Pointer handling only distinguishes a horizontal mouse drag-pan from a tap
// (didDrag guards trailing clicks).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildDesktopLayout } from "./buildDesktopLayout.js";
import { DESKTOP_BANDS } from "./desktopDetail.js";
import { buildEraBoxes, blurbPadFor } from "./desktopEraModel.js";
import { clamp, expSmooth, pickBand, visualScaleFor } from "../hooks/zoomMath.js";

// DESKTOP_BANDS, not DETAIL_BANDS: the desktop ladder is exactly the four
// user-facing rungs (Eras / Seasons / Season by season / Every game).
const N = DESKTOP_BANDS.length;
const TAP_SLOP = 5; // px of pointer travel before a press counts as a drag
// A drag locks to an axis only when it clearly wins (AXIS_BIAS); horizontal
// mouse drags pan the scroller, vertical drags do nothing (no reveal).
const AXIS_BIAS = 1.4;
const WHEEL_STEP = 90; // accumulated ctrl-wheel deltaY that advances one band
const ANIM_DONE_PX = 0.5;
const ANIM_TAU = 55; // ms

export default function useDesktopViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  width = 0,
  initialBandIndex = 2, // SEASON_LINES
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
  const bandWidths = useMemo(
    () => layouts.map((l) => Math.max(1, l.totalWidth)),
    [layouts],
  );

  const layout = layouts[clamp(bandIndex, 0, N - 1)];
  const maxScroll = Math.max(0, layout.totalWidth - width);
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
  const anchorXRef = useRef(0);

  const gestureWRef = useRef(bandWidths[initialBandIndex]);
  const zoomTargetRef = useRef(bandWidths[initialBandIndex]);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const targetBandRef = useRef(initialBandIndex);
  const wheelAccumRef = useRef(0);
  const pinchActiveRef = useRef(false);
  const d0Ref = useRef(1);
  const pinchStartWRef = useRef(bandWidths[initialBandIndex]);
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

  const onScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const x = el.scrollLeft;
      scrollXRef.current = x;
      setScrollX(x);
    });
  }, []);

  // Pending zoom anchor: keep the focal year under the cursor after a band
  // switch reflows the stack (and totalWidth/scroll range changes).
  const anchorRef = useRef(null);
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    const targetContentX = layout.tToX(a.focusT);
    setScrollLeft(targetContentX - a.cursorX);
  }, [layout, setScrollLeft]);

  // Deep-link: scroll so focusYear sits in the left quarter of the view, then
  // hand the target back (leaderboard rows, career-follow jumps).
  useLayoutEffect(() => {
    if (focusYear == null) return;
    if (!layout?.blocks?.length || !width) return;
    setScrollLeft(layout.yearToX(focusYear) - width * 0.25);
    if (onFocusConsumed) onFocusConsumed();
  }, [focusYear, layout, width, onFocusConsumed, setScrollLeft]);

  // Commit a band switch while pinning the focal year under the anchor.
  const commitBand = useCallback((nb) => {
    const old = layoutsRef.current[bandIndexRef.current];
    const focusT = old.xToYear(scrollXRef.current + anchorXRef.current);
    anchorRef.current = { focusT, cursorX: anchorXRef.current };
    bandIndexRef.current = nb;
    setBandIndex(nb);
  }, []);

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
      const target = zoomTargetRef.current;
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
    (target, anchorX) => {
      zoomTargetRef.current = clamp(
        target,
        bandWidthsRef.current[N - 1] * 0.6,
        bandWidthsRef.current[0] * 1.6,
      );
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
  useEffect(() => {
    if (!rafRef.current && !pinchActiveRef.current) {
      gestureWRef.current = bandWidths[bandIndexRef.current];
      zoomTargetRef.current = gestureWRef.current;
    }
  }, [bandWidths]);

  // ---- native listeners: wheel (scroll + ctrl-zoom) + pinch ----
  // Bound via addEventListener (non-passive) because React's synthetic wheel/
  // touch handlers are passive — preventDefault() would be ignored.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const leftOf = () => el.getBoundingClientRect().left;

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Semantic zoom on the cursor's focal point.
        e.preventDefault();
        const cursorX = e.clientX - leftOf();
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
        startAnimRef.current(bandWidthsRef.current[targetBandRef.current], cursorX);
        return;
      }
      // Plain wheel -> horizontal scroll. Mouse wheels emit deltaY only; route
      // the dominant axis into scrollLeft so both wheels and trackpad
      // horizontal pans move the timeline (and the page never scrolls/swipes).
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (d !== 0) {
        e.preventDefault();
        el.scrollLeft += d;
      }
    };

    // Two-finger pinch zoom via TOUCH events (touch-capable desktops); mirrors
    // the mobile hook. preventDefault on multi-touch so the browser neither
    // scrolls nor page-zooms during a pinch; one finger pans natively (pan-x).
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
      pinchStartWRef.current = gestureWRef.current;
      const anchorX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - leftOf();
      anchorXRef.current = anchorX;
      setScaleAnchorX(anchorX);
    };
    const onTouchMove = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (!pinchActiveRef.current) return;
      const d = Math.max(1, dist2(e.touches));
      applyGestureWRef.current(pinchStartWRef.current * (d / d0Ref.current));
    };
    const onTouchEnd = (e) => {
      if (!pinchActiveRef.current) return;
      if (e.touches.length >= 2) return; // still pinching
      pinchActiveRef.current = false;
      startAnimRef.current(bandWidthsRef.current[bandIndexRef.current], anchorXRef.current);
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
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    },
    [],
  );

  // ---- pointer handling: horizontal MOUSE drag-pan + tap-vs-drag tracking.
  //      Horizontal touch pans are native (touch-action:pan-x); pinch is owned
  //      by the touch listeners above (and bails this handler). ----
  const dragXRef = useRef(null);
  const dragYRef = useRef(null);
  const pressXRef = useRef(null);
  const pressYRef = useRef(null);
  const axisRef = useRef(null); // null | "h" | "v"
  const movedRef = useRef(false);
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
    axisRef.current = null;
    movedRef.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      if (pinchActiveRef.current) return; // a pinch owns the gesture
      if (pressXRef.current == null) return;
      if (axisRef.current == null) {
        const tdx = e.clientX - pressXRef.current;
        const tdy = e.clientY - pressYRef.current;
        if (Math.max(Math.abs(tdx), Math.abs(tdy)) > TAP_SLOP) {
          axisRef.current = Math.abs(tdy) > Math.abs(tdx) * AXIS_BIAS ? "v" : "h";
          movedRef.current = true;
          // The gesture is now a drag, so take the pointer: the pan keeps
          // tracking if the cursor leaves the container mid-drag. Mouse only —
          // capturing a TOUCH pointer would steal it from the native scroller.
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
      if (axisRef.current === "h" && e.pointerType === "mouse") {
        // Grab-and-drag panning for the mouse; touch horizontal is native.
        const dx = e.clientX - dragXRef.current;
        dragXRef.current = e.clientX;
        const el = scrollRef.current;
        if (el) el.scrollLeft -= dx; // scroll event mirrors into state
      }
      // axis === "v": nothing to do — no drag reveal on desktop.
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
    axisRef.current = null;
    pressXRef.current = null;
    pressYRef.current = null;
  }, []);

  // True when the just-finished gesture moved; click handlers ignore that click.
  const didDrag = useCallback(() => movedRef.current, []);

  const scrollBy = useCallback(
    (dx) => {
      const el = scrollRef.current;
      if (el) setScrollLeft(el.scrollLeft + dx);
    },
    [setScrollLeft],
  );

  return {
    band: DESKTOP_BANDS[bandIndex],
    bandIndex,
    scrollX,
    maxScroll,
    layout,
    totalWidth: layout.totalWidth,
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
