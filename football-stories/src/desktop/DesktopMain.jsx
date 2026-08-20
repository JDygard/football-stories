// Desktop counterpart of components/Main.jsx: owns interaction state, builds
// the offseason moduleData and ribbon spans, drives useDesktopViewport, and
// renders one <svg> inside a native HORIZONTAL scroll container. The nested
// <g> transform is the cosmetic horizontal zoom tween (career-follow pills
// are always visible — no reveal pan on desktop).
//
// Vertically it's two rows: a CARD SHELF holding every open info card, and the
// timeline below it. Mobile keeps one card at a time floating over the content;
// here they're a list on a shelf, because the reason to open a card is usually
// to hold it against another one.

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
    erasSegment,
    settings,
    adminById,
    focusYear,
    onFocusConsumed,
    ribbonConfig = { roles: {}, players: [] },
    onFollow,
    onFocusEra,
    focusedEraId = null,
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
  const showEras = settings?.showEras !== false;
  // Named Eras: the curated narrative chapters, if this franchise has been
  // authored yet (the segment 404s until it has) and the toggle is on.
  const eras = showEras ? erasSegment?.eras || null : null;

  // ---- interaction state ----
  const [expandedDraftYears, setExpandedDraftYears] = useState(() => new Set());
  // Info cards are a LIST here, not the single selection mobile keeps: landscape
  // has the room, and comparing two players — or a coach against the GM who
  // hired him — is most of why you open one at all. They stack on a shelf above
  // the timeline (see the render) and each is closed explicitly by its ×.
  const [cards, setCards] = useState([]);

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
  // Opening the same person twice is a no-op rather than a duplicate card —
  // re-clicking a long tenure that spans half the screen is easy to do by
  // accident, and two identical cards would be pure noise.
  const openCard = useCallback((card) => {
    setCards((prev) => (prev.some((c) => c.key === card.key) ? prev : [...prev, card]));
  }, []);
  const closeCard = useCallback((key) => {
    setCards((prev) => prev.filter((c) => c.key !== key));
  }, []);
  const closeAllCards = useCallback(() => setCards([]), []);

  const onSelectPick = useCallback(
    (pick) => {
      openCard({
        key: `player:${pick.player_id || `${pick.name}-${pick.year}`}`,
        type: "player",
        pick,
      });
    },
    [openCard],
  );

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

  // ---- ribbon spans: every selected track, staff and players alike ----
  const spans = useMemo(() => {
    const out = [];
    for (const p of ribbonConfig.players || []) {
      // Staff rows carry their segment row whole (entry/exit, prev/next team),
      // so the ribbon layer needs nothing added but the id it keys on.
      if (p.kind === "staff") {
        out.push({ ...p, admin_person_id: p.player_id });
        continue;
      }
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

  // The chapter the viewport needs to know about, so it can reserve whitespace
  // for a blurb that won't fit. Only the selected one ever does.
  const selectedEra = useMemo(() => {
    if (!focusedEraId) return null;
    const era = (eras || []).find((e) => e.id === focusedEraId);
    if (!era?.blurb) return null;
    const years = (mapped?.seasons || []).map((x) => x.year);
    const last = era.end == null ? Math.max(...years) : era.end;
    return { id: era.id, era, blurb: era.blurb, lastYear: last };
  }, [focusedEraId, eras, mapped]);

  const viewport = useDesktopViewport({
    seasons: mapped?.seasons,
    modules,
    moduleData,
    reserveByYear,
    width,
    focusYear,
    onFocusConsumed,
    showPlayoffs,
    selectedEra,
  });
  const {
    layout, scrollX, band, handlers, didDrag, visualScale, scaleAnchorX,
    scrollRef, totalWidth,
  } = viewport;

  // Clicking an era plaque tells the shell to highlight who made that chapter.
  // It deliberately does NOT move the viewport: an auto-zoom was tried
  // (2026-08-16) and removed on the user's call. Selecting a chapter's cast and
  // deciding where you're looking are separate acts, and only the first one is
  // the click's business.
  const handleFocusEra = useCallback(
    (box) => {
      if (onFocusEra) onFocusEra(box);
    },
    [onFocusEra],
  );
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
        openCard({ key: `player:${r.id}`, type: "player", pick });
      } else {
        openCard({ key: `staff:${r.key}`, type: "staff", ribbon: r });
      }
    },
    [pickById, openCard],
  );

  const ready = width > 0 && height > 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* CARD SHELF — the open info cards, in the whitespace above the timeline.
          A real layout row rather than an overlay: it takes its height from the
          column, so the timeline simply gets what's left and its lane re-centres
          instead of being covered up. Zero height when nothing is open.

          It's also OUTSIDE containerRef on purpose — that element is what the
          ResizeObserver measures into the SVG's width/height, so the shelf must
          not be inside it or the timeline would size itself as if the shelf
          weren't there.

          More cards than fit scroll sideways rather than wrapping onto a second
          row; the shelf's height is what the timeline pays for, and it should
          stay predictable no matter how many are open. */}
      {cards.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            // Bounded twice: never more than a third of the pane, and never
            // more than a card's worth of pixels. Cards scroll inside
            // themselves past that, so the timeline's budget stays stable.
            maxHeight: "min(38%, 260px)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 12px",
            overflowX: "auto",
            overflowY: "hidden",
            overscrollBehavior: "contain",
            background: "#f2f4f7",
            borderBottom: "1px solid #dfe3ea",
          }}
        >
          {cards.map((c) => (
            <InfoCard
              key={c.key}
              docked
              selection={c}
              adminById={adminById}
              onClose={() => closeCard(c.key)}
              adjusted={adjustedGrades}
            />
          ))}
          {cards.length > 1 && (
            <button
              onClick={closeAllCards}
              style={{
                flexShrink: 0,
                alignSelf: "center",
                border: "1px solid #d5dae3",
                borderRadius: 6,
                background: "#fff",
                color: "#5b6472",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "5px 9px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Close all
            </button>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}
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
                  eras={eras}
                  pre1967={mapped?.pre1967}
                  adminById={adminById}
                  onSelectStaff={onSelectRibbon}
                  tapGuard={tapGuard}
                  onFollow={onFollow}
                  showWinRate={showWinRate}
                  showPlayoffs={showPlayoffs}
                  onFocusEra={handleFocusEra}
                  focusedEraId={focusedEraId}
                />
              </g>
            </svg>
          )}
        </div>
      </div>
        <DesktopZoomHud band={band} />
      </div>
    </div>
  );
});

export default DesktopMain;
