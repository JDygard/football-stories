// Desktop counterpart of components/Main.jsx: owns interaction state, builds
// the offseason moduleData and ribbon spans, drives useDesktopViewport, and
// renders one <svg> inside a native HORIZONTAL scroll container. The nested
// <g> transform is the cosmetic horizontal zoom tween (career-follow pills
// are always visible — no reveal pan on desktop).

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DesktopTimelineLayer from "./DesktopTimelineLayer.jsx";
import InfoCard from "../components/InfoCard.jsx";
import DesktopZoomHud from "./DesktopZoomHud.jsx";
import useDesktopViewport from "./useDesktopViewport.js";
import { getEnabledDesktopModules, buildModuleData } from "./registry.js";
import { desktopGeometryFor } from "./desktopDetail.js";
import { stripReserveByYear, positionGroup } from "./desktopRibbonModel.js";

const DesktopMain = forwardRef(function DesktopMain(
  {
    mapped,
    draftSegment,
    settings,
    adminById,
    focusYear,
    onFocusConsumed,
    ribbonConfig = { roles: {}, players: [] },
    onFollow,
  },
  externalRef,
) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      setDimensions({ width: r.width, height: r.height });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { width, height } = dimensions;

  // Optional-display toggles from the Settings drawer. Absent key => on.
  const showWinRate = settings?.showWinRate !== false;
  const showPlayoffs = settings?.showPlayoffs !== false;
  const adjustedGrades = settings?.availabilityAdjusted === true;

  // ---- interaction state ----
  const [expandedDraftYears, setExpandedDraftYears] = useState(() => new Set());
  const [selected, setSelected] = useState(null);

  // tapGuard: lets click handlers ignore the click that trails a drag.
  const didDragRef = useRef(() => false);
  const tapGuard = useCallback(() => didDragRef.current(), []);

  const onToggleDraftYear = useCallback((year) => {
    setExpandedDraftYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);
  const onSelectPick = useCallback((pick) => {
    setSelected({ type: "player", pick });
  }, []);
  const closeCard = useCallback(() => setSelected(null), []);

  const modules = useMemo(() => getEnabledDesktopModules(settings), [settings]);
  const moduleData = useMemo(
    () =>
      buildModuleData({
        draftSegment,
        expandedDraftYears,
        onToggleDraftYear,
        onSelectPick,
        tapGuard,
        adjusted: adjustedGrades,
      }),
    [draftSegment, expandedDraftYears, onToggleDraftYear, onSelectPick, tapGuard, adjustedGrades],
  );

  // ---- ribbon spans: staff (role-filtered) + selected player tenures ----
  const spans = useMemo(() => {
    const out = [];
    for (const s of mapped?.staff || []) {
      if (ribbonConfig.roles?.[s.role] === false) continue;
      out.push(s);
    }
    for (const p of ribbonConfig.players || []) {
      out.push({
        admin_person_id: p.player_id,
        name: p.name,
        role: positionGroup(p.position),
        from: p.from,
        to: p.to,
        kind: "player",
        approx: p.source === "approx",
        position: p.position,
        prev_team: p.prev_team || null,
        next_team: p.next_team || null,
        entry: p.entry || null,
        exit: p.exit || null,
        conf: p.conf || null,
      });
    }
    return out;
  }, [mapped, ribbonConfig]);

  // Reserve horizontal room in each entry year's offseason block for ALL
  // ribbon entry connectors (staff + players) so they occupy layout space.
  const reserveByYear = useMemo(() => stripReserveByYear(spans), [spans]);

  const viewport = useDesktopViewport({
    seasons: mapped?.seasons,
    modules,
    moduleData,
    reserveByYear,
    width,
    focusYear,
    onFocusConsumed,
    showPlayoffs,
  });
  const {
    layout, scrollX, band, handlers, didDrag, visualScale, scaleAnchorX,
    scrollRef, totalWidth,
  } = viewport;
  didDragRef.current = didDrag;

  // Expose the native scroll container (Header reads scrollTop to hide/show;
  // on desktop scrollTop stays 0, so the header simply stays put).
  useImperativeHandle(externalRef, () => scrollRef.current, [scrollRef]);

  // Zooming out past Zoom 2 hides offseasons entirely; clear any expanded
  // draft classes so returning to Zoom 2 doesn't reflow unexpectedly.
  const offseasonHidden = desktopGeometryFor(band).offseason === "hidden";
  useEffect(() => {
    if (offseasonHidden && expandedDraftYears.size > 0) {
      setExpandedDraftYears(new Set());
    }
  }, [offseasonHidden, expandedDraftYears]);

  // Ribbon tap routing: player ribbons open the player card, staff ribbons
  // the staff card.
  const pickById = useMemo(() => {
    const m = new Map();
    for (const p of draftSegment?.picks || []) {
      if (p.player_id && !m.has(p.player_id)) m.set(p.player_id, p);
    }
    return m;
  }, [draftSegment]);

  const onSelectRibbon = useCallback(
    (r) => {
      if (r.kind === "player") {
        const pick =
          pickById.get(r.id) || {
            player_id: r.id,
            name: r.name,
            position: r.position,
            year: r.from,
            value: null,
            career: null,
          };
        setSelected({ type: "player", pick });
      } else {
        setSelected({ type: "staff", ribbon: r });
      }
    },
    [pickById],
  );

  const ready = width > 0 && height > 0;

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", overflow: "hidden", position: "relative" }}
    >
      {/* Native scroll container: the OS owns horizontal momentum/rubber-band.
          touch-action:pan-x reserves horizontal for the scroller; the pointer
          handlers add mouse drag-pan and tap-vs-drag tracking. */}
      <div
        ref={scrollRef}
        onScroll={handlers.onScroll}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        onPointerLeave={handlers.onPointerLeave}
        style={{
          position: "absolute",
          inset: 0,
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-x",
        }}
      >
        {/* Spacer giving the native scroll range = committed band width. */}
        <div style={{ width: Math.max(totalWidth, width), height: "100%", position: "relative" }}>
          {ready && (
            <svg
              width={width}
              height={height}
              style={{ position: "sticky", left: 0, display: "block" }}
            >
              <rect x={0} y={0} width={width} height={height} fill="transparent" />
              {/* Cosmetic zoom tween between detail bands. Identity at rest. */}
              <g
                transform={`translate(${scaleAnchorX} 0) scale(${visualScale} 1) translate(${-scaleAnchorX} 0)`}
              >
                <DesktopTimelineLayer
                  layout={layout}
                  scrollX={scrollX}
                  width={width}
                  height={height}
                  band={band}
                  moduleData={moduleData}
                  staff={spans}
                  pre1967={mapped?.pre1967}
                  adminById={adminById}
                  onSelectStaff={onSelectRibbon}
                  tapGuard={tapGuard}
                  onFollow={onFollow}
                  showWinRate={showWinRate}
                  showPlayoffs={showPlayoffs}
                />
              </g>
            </svg>
          )}
        </div>
      </div>
      <InfoCard selection={selected} adminById={adminById} onClose={closeCard} adjusted={adjustedGrades} />
      <DesktopZoomHud band={band} />
    </div>
  );
});

export default DesktopMain;
