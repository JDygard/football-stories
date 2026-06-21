// Viewport for the content-stacked timeline: owns scroll position and a
// continuous zoom that selects a discrete detail band while a cosmetic
// vertical scale tweens between bands so motion feels fluid.
//
// Zoom source of truth is `gestureH` — a desired *apparent* content height in
// px. Pinch drives it 1:1 with finger spread (responsive); wheel eases it
// toward a band height (smooth). The committed band is whichever natural
// height is closest to gestureH (see zoomMath.pickBand); `visualScale =
// gestureH / bandHeight` cosmetically bridges the remainder, anchored on the
// pinch/cursor midpoint. Because apparent height == gestureH on both sides of
// a band switch, the switch is seamless. All band layouts are precomputed so a
// switch never pays a rebuild mid-gesture.
//
// Tap vs drag: pointer travel beyond TAP_SLOP (or any pinch) marks the gesture
// as a drag; `didDrag()` lets click handlers ignore the click that trails a
// pan/pinch so tapping never fights scrolling.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildTimelineLayout } from "../components/visualization/buildTimelineLayout.js";
import { DETAIL_BANDS } from "../components/visualization/detail.js";
import {
  clamp,
  dist,
  expSmooth,
  pickBand,
  visualScaleFor,
} from "./zoomMath.js";

const N = DETAIL_BANDS.length;
const TAP_SLOP = 5; // px of pointer travel before a press counts as a drag (touch + mouse)
// Horizontal "follow the career off the edge" drag. A single-finger gesture is
// locked to one axis the moment it clears TAP_SLOP: vertical (scroll) wins
// unless the horizontal travel beats the vertical by AXIS_BIAS — so a normal
// scroll never drifts sideways. The whole canvas slides with the drag (see
// Main); the rail can open up to RAIL_MAX_REVEAL px (RAIL_RESIST drag-
// resistance so it feels weighty). On release it's a detent: pulled past
// RAIL_LOCK_AT it settles OPEN at RAIL_LOCK_POS and stays there (you can scroll
// and tap in the open state) until a later drag pulls it back under RAIL_LOCK_AT
// to dismiss; short pulls just spring back to 0. The gap between LOCK_AT and
// LOCK_POS gives the lock hysteresis so it doesn't chatter.
const AXIS_BIAS = 1.4;
const RAIL_MAX_REVEAL = 172; // hard clamp while dragging
const RAIL_LOCK_AT = 80; // release past this magnitude -> lock open (or stay)
const RAIL_LOCK_POS = 148; // resting offset of the locked-open rail (room for pill + fade)
const RAIL_RESIST = 0.6;
const RAIL_SPRING_TAU = 130; // ms ease toward the resting target
const WHEEL_STEP = 90; // accumulated wheel deltaY that advances one band
const ANIM_DONE_PX = 0.5; // stop the wheel/settle ease within this of target
const ANIM_TAU = 55; // ms time constant for the wheel/settle ease
// Scroll momentum (flick inertia) on single-finger panning.
const MOMENTUM_TAU = 325; // ms; larger = longer glide
const MIN_FLING_VEL = 0.05; // px/ms at release below which we don't fling
const STOP_VEL = 0.015; // px/ms; momentum ends below this
const MAX_VEL = 8; // px/ms; cap so a fast flick can't launch absurdly

export default function useTimelineViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  height = 0,
  initialBandIndex = 2, // SEASON_LINES
  focusYear = null,
  onFocusConsumed = null,
  showPlayoffs = true,
}) {
  const [bandIndex, setBandIndex] = useState(initialBandIndex);
  const [scrollYRaw, setScrollYRaw] = useState(0);
  // Horizontal rail reveal (px). Authoritative value is railPanRef; state just
  // drives the render. 0 = rest.
  const [railPan, setRailPan] = useState(0);
  // Cosmetic tween: vertical scale applied to the rendered band, anchored at
  // scaleAnchorY (viewport px). 1 at rest.
  const [visualScale, setVisualScale] = useState(1);
  const [scaleAnchorY, setScaleAnchorY] = useState(0);

  // Precompute every band's layout once. Switching bands is then a pure index
  // change (no rebuild lag), and we get all natural heights for free.
  const layouts = useMemo(
    () =>
      DETAIL_BANDS.map((band) =>
        buildTimelineLayout({
          seasons,
          modules,
          moduleData,
          reserveByYear,
          detailBand: band,
          top: 0,
          showPlayoffs,
        }),
      ),
    [seasons, modules, moduleData, reserveByYear, showPlayoffs],
  );
  const bandHeights = useMemo(
    () => layouts.map((l) => Math.max(1, l.totalHeight)),
    [layouts],
  );

  const layout = layouts[clamp(bandIndex, 0, N - 1)];
  const maxScroll = Math.max(0, layout.totalHeight - height);
  const scrollY = clamp(scrollYRaw, 0, maxScroll);

  // --- refs mirroring state for use inside rAF / pointer callbacks ---
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

  // gestureH (apparent height) is a ref so pointer/rAF code mutates it without
  // re-renders; visualScale state is what actually renders.
  const gestureHRef = useRef(bandHeights[initialBandIndex]);
  const zoomTargetRef = useRef(bandHeights[initialBandIndex]);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  // Wheel/trackpad zoom snaps to whole bands (so resting visualScale is
  // exactly 1); deltaY accumulates and steps the target band at WHEEL_STEP.
  const targetBandRef = useRef(initialBandIndex);
  const wheelAccumRef = useRef(0);
  // Momentum: velocity sampled during a pan (scrollY px/ms), then decayed by
  // its own rAF loop after release. Position is tracked separately so the
  // glide doesn't lag React state.
  const scrollVelRef = useRef(0);
  const lastMoveTRef = useRef(0);
  const momentumPosRef = useRef(0);
  const momentumRafRef = useRef(0);
  const lastMomentumTRef = useRef(0);
  // Horizontal rail reveal: authoritative value, the target it springs toward
  // (0 = closed, ±RAIL_LOCK_POS = locked open), and its rAF handle.
  const railPanRef = useRef(0);
  const railRestRef = useRef(0);
  const railSpringRef = useRef(0);
  const lastRailTRef = useRef(0);

  // Pending zoom anchor: keep the focal time under the cursor/pinch midpoint
  // after a band switch reflows the stack. Stores a nominal time `t` (year
  // units) which survives the reflow; new layout maps it back to a pixel.
  const anchorRef = useRef(null);
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    const targetContentY = layout.tToY(a.focusT);
    const max = Math.max(0, layout.totalHeight - height);
    setScrollYRaw(clamp(targetContentY - a.cursorY, 0, max));
  }, [layout, height]);

  // Deep-link: scroll so focusYear sits in the upper quarter of the view,
  // then hand the target back (leaderboard rows, career-follow jumps).
  useLayoutEffect(() => {
    if (focusYear == null) return;
    if (!layout?.blocks?.length || !height) return;
    const max = Math.max(0, layout.totalHeight - height);
    setScrollYRaw(clamp(layout.yearToY(focusYear) - height * 0.25, 0, max));
    if (onFocusConsumed) onFocusConsumed();
  }, [focusYear, layout, height, onFocusConsumed]);

  // Commit a band switch while pinning the focal time under the anchor. Reads
  // the OLD layout (current band) to find the focal time, then defers the
  // scroll fix to the layout effect above once the new band renders.
  const commitBand = useCallback((nb) => {
    const old = layoutsRef.current[bandIndexRef.current];
    const focusT = old.yToYear(scrollYRef.current + anchorYRef.current);
    anchorRef.current = { focusT, cursorY: anchorYRef.current };
    bandIndexRef.current = nb;
    setBandIndex(nb);
  }, []);

  // Apply a desired apparent height: update committed band + visual scale.
  const applyGestureH = useCallback(
    (h) => {
      gestureHRef.current = h;
      const heights = bandHeightsRef.current;
      const nb = pickBand(h, bandIndexRef.current, heights);
      if (nb !== bandIndexRef.current) commitBand(nb);
      setVisualScale(visualScaleFor(h, heights[bandIndexRef.current]));
    },
    [commitBand],
  );

  // rAF ease of gestureH toward zoomTargetRef (wheel zoom + pinch-release
  // settle). Settling toward a band's natural height lands visualScale on 1.
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
        // Snap any sub-pixel residue so resting scale is exactly 1.
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

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);
      if (railSpringRef.current) cancelAnimationFrame(railSpringRef.current);
    },
    [],
  );

  // ---- scroll momentum: decay sampled velocity, glide, stop at bounds ----
  const stopMomentum = useCallback(() => {
    if (momentumRafRef.current) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = 0;
    }
    scrollVelRef.current = 0;
    lastMomentumTRef.current = 0;
  }, []);

  const momentumTick = useCallback((now) => {
    // Cap dt so a backgrounded tab doesn't teleport the glide.
    const dt = clamp(
      lastMomentumTRef.current ? now - lastMomentumTRef.current : 16,
      0,
      50,
    );
    lastMomentumTRef.current = now;
    const max = Math.max(
      0,
      layoutsRef.current[bandIndexRef.current].totalHeight - heightRef.current,
    );
    let pos = momentumPosRef.current + scrollVelRef.current * dt;
    let atBound = false;
    if (pos <= 0) {
      pos = 0;
      atBound = true;
    } else if (pos >= max) {
      pos = max;
      atBound = true;
    }
    momentumPosRef.current = pos;
    setScrollYRaw(pos);
    scrollVelRef.current *= Math.exp(-dt / MOMENTUM_TAU);
    if (atBound || Math.abs(scrollVelRef.current) < STOP_VEL) {
      momentumRafRef.current = 0;
      lastMomentumTRef.current = 0;
      scrollVelRef.current = 0;
    } else {
      momentumRafRef.current = requestAnimationFrame(momentumTick);
    }
  }, []);

  // ---- horizontal rail reveal: set + spring back to rest ----
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

  // ---- wheel / trackpad zoom: accumulate deltaY, step whole bands, ease ----
  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      stopMomentum();
      const rect = e.currentTarget.getBoundingClientRect();
      const cursorY = e.clientY - rect.top;
      if (!rafRef.current) {
        // Fresh gesture: sync the target to whatever band we're resting on.
        targetBandRef.current = bandIndexRef.current;
        wheelAccumRef.current = 0;
      }
      wheelAccumRef.current += e.deltaY; // down (+) = zoom out = higher index
      const steps = Math.trunc(wheelAccumRef.current / WHEEL_STEP);
      if (steps !== 0) {
        wheelAccumRef.current -= steps * WHEEL_STEP;
        targetBandRef.current = clamp(targetBandRef.current + steps, 0, N - 1);
      }
      startAnim(bandHeightsRef.current[targetBandRef.current], cursorY);
    },
    [startAnim, stopMomentum],
  );

  // ---- pointer handling: 1 pointer = pan, 2 pointers = pinch zoom ----
  const pointersRef = useRef(new Map()); // pointerId -> {x, y}
  const pinchRef = useRef(null); // { d0, startH }
  const dragRef = useRef(null); // last clientY while panning
  const dragXRef = useRef(null); // last clientX while panning
  const pressYRef = useRef(null);
  const pressXRef = useRef(null);
  // Axis lock for a single-finger gesture: null until it clears the slop, then
  // "v" (scroll) or "h" (rail reveal) for the rest of the gesture.
  const axisRef = useRef(null);
  const movedRef = useRef(false);

  // Keep the resting gestureH locked to the committed band's natural height
  // when no zoom gesture/animation is in flight, so layout reflows (e.g.
  // expanding a draft class) don't leave a stale residual scale behind.
  useEffect(() => {
    if (!rafRef.current && !pinchRef.current) {
      gestureHRef.current = bandHeights[bandIndexRef.current];
      zoomTargetRef.current = gestureHRef.current;
    }
  }, [bandHeights]);

  const twoPointers = () => {
    const it = pointersRef.current.values();
    return [it.next().value, it.next().value];
  };

  const beginPinch = useCallback((rectTop) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTRef.current = 0;
    }
    const [p, q] = twoPointers();
    const d0 = Math.max(1, dist(p, q));
    const anchorY = (p.y + q.y) / 2 - rectTop;
    pinchRef.current = { d0, startH: bandHeightsRef.current[bandIndexRef.current] };
    anchorYRef.current = anchorY;
    setScaleAnchorY(anchorY);
    gestureHRef.current = pinchRef.current.startH;
    dragRef.current = null; // suspend single-finger pan
    movedRef.current = true; // a pinch is never a tap
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      stopMomentum(); // a new touch grabs the page; kill any glide in flight
      stopRailSpring(); // grab the rail mid-spring if the user re-touches
      const rect = e.currentTarget.getBoundingClientRect();
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture?.(e.pointerId);
      if (pointersRef.current.size >= 2) {
        beginPinch(rect.top);
      } else {
        dragRef.current = e.clientY;
        dragXRef.current = e.clientX;
        pressYRef.current = e.clientY;
        pressXRef.current = e.clientX;
        axisRef.current = null;
        movedRef.current = false;
        scrollVelRef.current = 0;
        lastMoveTRef.current = performance.now();
      }
    },
    [beginPinch, stopMomentum, stopRailSpring],
  );

  const onPointerMove = useCallback(
    (e) => {
      const pt = pointersRef.current.get(e.pointerId);
      if (!pt) return;
      pt.x = e.clientX;
      pt.y = e.clientY;

      if (pinchRef.current && pointersRef.current.size >= 2) {
        const [p, q] = twoPointers();
        const d = Math.max(1, dist(p, q));
        const { d0, startH } = pinchRef.current;
        applyGestureH(startH * (d / d0));
        return;
      }

      if (dragRef.current == null) return;

      // Decide the axis once the gesture clears the slop; vertical wins ties so
      // a scroll never drifts sideways.
      if (axisRef.current == null) {
        const tdx = pressXRef.current != null ? e.clientX - pressXRef.current : 0;
        const tdy = pressYRef.current != null ? e.clientY - pressYRef.current : 0;
        if (Math.max(Math.abs(tdx), Math.abs(tdy)) > TAP_SLOP) {
          axisRef.current =
            Math.abs(tdx) > Math.abs(tdy) * AXIS_BIAS ? "h" : "v";
          movedRef.current = true;
        } else {
          // still within slop — track positions, commit to nothing yet
          dragRef.current = e.clientY;
          dragXRef.current = e.clientX;
          return;
        }
      }

      if (axisRef.current === "h") {
        // Follow the career off the edge: drag the rail open (resisted), clamp
        // to a max reveal. No vertical scroll, no fling.
        const dx = e.clientX - dragXRef.current;
        dragXRef.current = e.clientX;
        dragRef.current = e.clientY;
        applyRailPan(
          clamp(
            railPanRef.current + dx * RAIL_RESIST,
            -RAIL_MAX_REVEAL,
            RAIL_MAX_REVEAL,
          ),
        );
        return;
      }

      // axis === "v": vertical scroll (existing behavior)
      const dy = e.clientY - dragRef.current;
      dragRef.current = e.clientY;
      dragXRef.current = e.clientX;
      const max = Math.max(0, layoutsRef.current[bandIndexRef.current].totalHeight - heightRef.current);
      setScrollYRaw((s) => clamp(s - dy, 0, max));
      // Track scroll velocity (px/ms) for the release fling; recent-weighted
      // so a pause-then-release lands near zero and won't drift.
      const now = performance.now();
      const dtv = now - lastMoveTRef.current;
      lastMoveTRef.current = now;
      if (dtv > 0 && dtv < 100) {
        const vInst = clamp(-dy / dtv, -MAX_VEL, MAX_VEL);
        scrollVelRef.current = scrollVelRef.current * 0.4 + vInst * 0.6;
      }
    },
    [applyGestureH, applyRailPan],
  );

  const endPointer = useCallback(
    (e) => {
      pointersRef.current.delete(e.pointerId);
      e.currentTarget?.releasePointerCapture?.(e.pointerId);

      if (pinchRef.current) {
        if (pointersRef.current.size >= 2) return; // still pinching
        // Pinch ended: settle gestureH to the committed band (scale -> 1).
        pinchRef.current = null;
        startAnim(bandHeightsRef.current[bandIndexRef.current], anchorYRef.current);
        // Hand a lingering finger back to single-finger pan; re-decide axis.
        const rest = pointersRef.current.values().next().value;
        if (rest) {
          dragRef.current = rest.y;
          dragXRef.current = rest.x;
          pressYRef.current = rest.y;
          pressXRef.current = rest.x;
          axisRef.current = null;
        } else {
          dragRef.current = null;
        }
        return;
      }
      if (pointersRef.current.size === 0) {
        if (axisRef.current === "h") {
          // Release of a rail drag = a detent decision: pulled far enough ->
          // settle OPEN (locked) at RAIL_LOCK_POS, else snap closed to 0. The
          // same rule dismisses a locked rail that's been pulled back in. No
          // vertical fling.
          const mag = Math.abs(railPanRef.current);
          const dir = railPanRef.current < 0 ? -1 : 1;
          railRestRef.current = mag >= RAIL_LOCK_AT ? dir * RAIL_LOCK_POS : 0;
          if (railPanRef.current !== railRestRef.current && !railSpringRef.current) {
            lastRailTRef.current = 0;
            railSpringRef.current = requestAnimationFrame(railSpringTick);
          }
        } else if (
          movedRef.current &&
          Math.abs(scrollVelRef.current) > MIN_FLING_VEL
        ) {
          // Release fling: launch the glide if the pan was moving fast enough.
          momentumPosRef.current = scrollYRef.current;
          lastMomentumTRef.current = 0;
          if (!momentumRafRef.current) {
            momentumRafRef.current = requestAnimationFrame(momentumTick);
          }
        }
        axisRef.current = null;
        dragRef.current = null;
        dragXRef.current = null;
        pressYRef.current = null;
        pressXRef.current = null;
      }
    },
    [startAnim, momentumTick, railSpringTick],
  );

  // True when the just-finished gesture moved (pan or pinch); click handlers
  // ignore that click. Resets on the next single-finger pointerdown.
  const didDrag = useCallback(() => movedRef.current, []);

  const scrollBy = useCallback(
    (dy) => {
      const max = Math.max(0, layout.totalHeight - height);
      setScrollYRaw((s) => clamp(s + dy, 0, max));
    },
    [layout, height],
  );

  return {
    band: DETAIL_BANDS[bandIndex],
    bandIndex,
    scrollY,
    maxScroll,
    layout,
    totalHeight: layout.totalHeight,
    visualScale,
    scaleAnchorY,
    railPan,
    scrollBy,
    didDrag,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
    },
  };
}
