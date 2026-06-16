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
  },
  externalRef,
) {
  const containerRef = useRef(null);
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
  });
  const { layout, scrollY, band, handlers, didDrag } = viewport;
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
      style={{ height: "100%", overflow: "hidden", position: "relative" }}
    >
      {width > 0 && height > 0 && (
        <svg
          width={width}
          height={height}
          style={{ display: "block", touchAction: "none", cursor: "grab" }}
          {...handlers}
        >
          {/* full-surface hit target so wheel/drag work over empty space too */}
          <rect x={0} y={0} width={width} height={height} fill="transparent" />
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
          />
        </svg>
      )}
      <InfoCard selection={selected} adminById={adminById} onClose={closeCard} />
    </div>
  );
});

export default Main;
