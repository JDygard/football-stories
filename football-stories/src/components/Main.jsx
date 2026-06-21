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
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useImperativeHandle(externalRef, () => containerRef.current, []);

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

  // iOS Safari does NOT reliably honor `touch-action: none` when the pointer
  // target is an SVG: it claims one-finger drags as page scroll and fires
  // pointercancel mid-gesture, so panning stutters or locks up entirely (every
  // other mobile browser is fine). The only robust fix is a NON-passive
  // touchmove listener that preventDefaults the native scroll. React registers
  // its synthetic onTouchMove/onWheel as PASSIVE, so preventDefault() inside a
  // React handler is silently ignored — we must bind manually here. Pointer
  // events still fire normally; this only suppresses the browser's own scroll.
  const ready = width > 0 && height > 0;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const block = (e) => e.preventDefault();
    el.addEventListener("touchmove", block, { passive: false });
    return () => el.removeEventListener("touchmove", block);
  }, [ready]);

  // ---- interaction state ----
  // Draft classes expanded to full rows while in compact (Zoom 2) mode.
  const [expandedDraftYears, setExpandedDraftYears] = useState(() => new Set());
  // Tapped player pick / staff ribbon -> info card.
  const [selected, setSelected] = useState(null);

  // tapGuard: lets click handlers ignore the click that trails a pan.
  // Wired through a ref because the viewport hook is created below.
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
      }),
    [draftSegment, expandedDraftYears, onToggleDraftYear, onSelectPick, tapGuard],
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

  // Reserve vertical room in each entry year's offseason block for ALL
  // ribbon entry bands (staff + players), so they occupy layout space
  // instead of overlaying content.
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
  const { layout, scrollY, band, handlers, didDrag, visualScale, scaleAnchorY, railPan } =
    viewport;
  didDragRef.current = didDrag;

  // Zooming out past Zoom 2 hides offseasons entirely; clear any expanded
  // draft classes so returning to Zoom 2 doesn't reflow unexpectedly.
  const offseasonHidden = geometryFor(band).offseason === "hidden";
  useEffect(() => {
    if (offseasonHidden && expandedDraftYears.size > 0) {
      setExpandedDraftYears(new Set());
    }
  }, [offseasonHidden, expandedDraftYears]);

  // Ribbon tap routing: player ribbons open the player card (with the
  // real pick when this franchise drafted them), staff ribbons the staff
  // card.
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

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        overflow: "hidden",
        position: "relative",
        touchAction: "none",
      }}
    >
      {width > 0 && height > 0 && (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ display: "block", touchAction: "none", cursor: "grab" }}
          {...handlers}
        >
          {/* full-surface hit target so wheel/drag work over empty space too */}
          <rect x={0} y={0} width={width} height={height} fill="transparent" />
          {/* Horizontal "follow a career off the edge" pan: the WHOLE canvas
              slides with the drag (anything less feels broken), exposing the
              ribbon overhang past each edge. 0 at rest. */}
          <g transform={railPan ? `translate(${railPan} 0)` : undefined}>
            {/* Cosmetic zoom tween: vertically scale the rendered band about the
                pinch/cursor midpoint so motion between discrete detail bands
                reads as continuous. Identity (scale 1) at rest. */}
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
      <InfoCard selection={selected} adminById={adminById} onClose={closeCard} />
    </div>
  );
});

export default Main;
