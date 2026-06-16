// Viewport for the content-stacked timeline: owns scroll position and a zoom
// scalar that selects a discrete detail band. Wheel = zoom (anchored on the
// year under the cursor), drag = pan. Replaces the old year-domain ZoomProvider
// + useYScale; the layout engine now provides the time<->pixel mapping.
//
// Tap vs drag: pointer movement beyond TAP_SLOP marks the gesture as a drag;
// `didDrag()` lets click handlers (draft expand, info cards) ignore the click
// that fires at the end of a pan, so tapping never fights scrolling.

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildTimelineLayout } from "../components/visualization/buildTimelineLayout.js";
import { DETAIL_BANDS, resolveBandIndex } from "../components/visualization/detail.js";

const N = DETAIL_BANDS.length;
const ZOOM_STEP = 0.2; // zoomF change per wheel notch
const TAP_SLOP = 5; // px of pointer travel before a press counts as a drag
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function useTimelineViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  height = 0,
  initialBandIndex = 2, // SEASON_LINES
  focusYear = null,
  onFocusConsumed = null,
}) {
  const [zoomF, setZoomF] = useState(initialBandIndex);
  const [bandIndex, setBandIndex] = useState(initialBandIndex);
  const [scrollYRaw, setScrollYRaw] = useState(0);

  const detailBand = DETAIL_BANDS[bandIndex];

  const layout = useMemo(
    () =>
      buildTimelineLayout({
        seasons,
        modules,
        moduleData,
        reserveByYear,
        detailBand,
        top: 0,
      }),
    [seasons, modules, moduleData, reserveByYear, detailBand],
  );

  const maxScroll = Math.max(0, layout.totalHeight - height);
  const scrollY = clamp(scrollYRaw, 0, maxScroll);

  // Pending zoom anchor: keep the focal year under the cursor after a band
  // change reflows the stack (totalHeight changes).
  const anchorRef = useRef(null);
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    const targetContentY = layout.yearToY(a.focusYear);
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

  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const cursorY = e.clientY - rect.top;
      const focusYear = layout.yToYear(scrollY + cursorY);
      const dir = e.deltaY < 0 ? -1 : 1; // wheel up => zoom in => more detail
      const nz = clamp(zoomF + dir * ZOOM_STEP, 0, N - 1);
      const nb = resolveBandIndex(nz, bandIndex);
      if (nb !== bandIndex) {
        anchorRef.current = { focusYear, cursorY };
        setBandIndex(nb);
      }
      setZoomF(nz);
    },
    [layout, scrollY, zoomF, bandIndex],
  );

  // Drag to pan (pointer events), with tap/drag discrimination.
  const dragRef = useRef(null);
  const pressYRef = useRef(null);
  const movedRef = useRef(false);

  const onPointerDown = useCallback((e) => {
    dragRef.current = e.clientY;
    pressYRef.current = e.clientY;
    movedRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);
  const onPointerMove = useCallback(
    (e) => {
      if (dragRef.current == null) return;
      if (
        pressYRef.current != null &&
        Math.abs(e.clientY - pressYRef.current) > TAP_SLOP
      ) {
        movedRef.current = true;
      }
      const dy = e.clientY - dragRef.current;
      dragRef.current = e.clientY;
      const max = Math.max(0, layout.totalHeight - height);
      setScrollYRaw((s) => clamp(s - dy, 0, max));
    },
    [layout, height],
  );
  const endDrag = useCallback((e) => {
    dragRef.current = null;
    pressYRef.current = null;
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  }, []);

  // True when the just-finished gesture was a pan; click handlers should
  // ignore that click. Resets on the next pointerdown.
  const didDrag = useCallback(() => movedRef.current, []);

  const scrollBy = useCallback(
    (dy) => {
      const max = Math.max(0, layout.totalHeight - height);
      setScrollYRaw((s) => clamp(s + dy, 0, max));
    },
    [layout, height],
  );

  return {
    band: detailBand,
    bandIndex,
    zoomF,
    scrollY,
    maxScroll,
    layout,
    totalHeight: layout.totalHeight,
    scrollBy,
    didDrag,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerLeave: endDrag,
    },
  };
}
