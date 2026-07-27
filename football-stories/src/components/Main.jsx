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
import TeamTimelineLayer from "./visualization/TeamTimelineLayer.jsx";
import InfoCard from "./InfoCard.jsx";
import ZoomHud from "./ZoomHud.jsx";
import useTimelineViewport from "../hooks/useTimelineViewport.js";
import { getEnabledModules, buildModuleData } from "./visualization/offseason/registry.js";
import { geometryFor } from "./visualization/detail.js";
import {
  stripReserveByYear,
  positionGroup,
} from "./visualization/staffRibbonModel.js";

const Main = forwardRef(function Main(
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
  // Draft-grade lens: standard "value delivered" by default; opt-in to the
  // availability-adjusted grade (absent/false => standard).
  const adjustedGrades = settings?.availabilityAdjusted === true;

  // ---- interaction state ----
  // Draft classes expanded to full rows while in compact (Zoom 2) mode.
  const [expandedDraftYears, setExpandedDraftYears] = useState(() => new Set());
  // Tapped player pick / staff ribbon -> info card.
  const [selected, setSelected] = useState(null);

  // tapGuard: lets click handlers ignore the click that trails a pan.
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

  const modules = useMemo(() => getEnabledModules(settings), [settings]);
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
        // Career-follow links from the tenure pipeline.
        prev_team: p.prev_team || null,
        next_team: p.next_team || null,
        entry: p.entry || null,
        exit: p.exit || null,
        conf: p.conf || null,
      });
    }
    return out;
  }, [mapped, ribbonConfig]);

  // Reserve vertical room in each entry year's offseason block for ALL ribbon
  // entry bands (staff + players) so they occupy layout space.
  const reserveByYear = useMemo(() => stripReserveByYear(spans), [spans]);

  const viewport = useTimelineViewport({
    seasons: mapped?.seasons,
    modules,
    moduleData,
    reserveByYear,
    height,
    focusYear,
    onFocusConsumed,
    showPlayoffs,
  });
  const {
    layout, scrollY, band, handlers, didDrag, visualScale, scaleAnchorY,
    railPan, scrollRef, totalHeight,
  } = viewport;
  didDragRef.current = didDrag;

  // Expose the native scroll container (Header reads its scrollTop to hide/show).
  useImperativeHandle(externalRef, () => scrollRef.current, [scrollRef]);

  // Zooming out past Zoom 2 hides offseasons entirely; clear any expanded draft
  // classes so returning to Zoom 2 doesn't reflow unexpectedly.
  const offseasonHidden = geometryFor(band).offseason === "hidden";
  useEffect(() => {
    if (offseasonHidden && expandedDraftYears.size > 0) {
      setExpandedDraftYears(new Set());
    }
  }, [offseasonHidden, expandedDraftYears]);

  // Ribbon tap routing: player ribbons open the player card, staff ribbons the
  // staff card.
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
      {/* Native scroll container: the OS owns vertical momentum/rubber-band.
          touch-action:pan-y reserves vertical for the scroller and hands
          horizontal drags to the rail-reveal pointer handlers. */}
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
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
        }}
      >
        {/* Spacer giving the native scroll range = committed band height. */}
        <div style={{ height: Math.max(totalHeight, height), position: "relative" }}>
          {ready && (
            <svg
              width={width}
              height={height}
              style={{ position: "sticky", top: 0, display: "block" }}
            >
              <rect x={0} y={0} width={width} height={height} fill="transparent" />
              {/* Horizontal "follow a career off the edge" pan: the whole canvas
                  slides with the drag, exposing the ribbon overhang. */}
              <g transform={railPan ? `translate(${railPan} 0)` : undefined}>
                {/* Cosmetic zoom tween between detail bands. Identity at rest. */}
                <g
                  transform={`translate(0 ${scaleAnchorY}) scale(1 ${visualScale}) translate(0 ${-scaleAnchorY})`}
                >
                  <TeamTimelineLayer
                    layout={layout}
                    scrollY={scrollY}
                    width={width}
                    height={height}
                    band={band}
                    moduleData={moduleData}
                    staff={spans}
                    pre1967={mapped?.pre1967}
                    adminById={adminById}
                    onSelectStaff={onSelectRibbon}
                    tapGuard={tapGuard}
                    railPan={railPan}
                    onFollow={onFollow}
                    showWinRate={showWinRate}
                    showPlayoffs={showPlayoffs}
                  />
                </g>
              </g>
            </svg>
          )}
        </div>
      </div>
      <InfoCard selection={selected} adminById={adminById} onClose={closeCard} adjusted={adjustedGrades} />
      <ZoomHud band={band} />
    </div>
  );
});

export default Main;
