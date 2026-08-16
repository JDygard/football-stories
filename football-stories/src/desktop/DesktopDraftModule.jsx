// Desktop offseason DRAFT module — renders a franchise's draft class as a
// COLUMN inside the offseason block. Draft semantics (tier ramp, grade lens,
// summaries) are shared with mobile via desktopDraftModel; the pick rows stack
// vertically down the column, which landscape gives plenty of room for.
//
// ONE ROW SHAPE AT EVERY ZOOM. There used to be two: a stack of tier-coloured
// boxes with a name in them at zoom 2, and transparent rows with a pick label
// and a small grade chip at zoom 3/4. Same pick, two vocabularies, and neither
// carried all four facts. The row is now always the coloured fill — the
// fastest read of a class in the app — with the pick number, the name, the
// position and the grade in fixed columns (see desktopDraftModel's header for
// the picture). Zoom buys ROOM, not a different design: the wider column at
// zoom 3/4 affords the round prefix ("R1 #4" vs "#4") and unabbreviated names.
//
// Interactions (all guarded by data.tapGuard so a pan's trailing click is
// ignored):
//   - compact mode: tap the class background to expand it to the full column
//     (reflows the content stack); tap an expanded class's background to
//     collapse it.
//   - any pick row: tap to open the player info card (data.onSelectPick).
//
// Landscape-only nuance: a column's row count is bounded by the lane height,
// so an oversized class (12-round drafts ran 30+ picks) clamps its rows and
// closes with a "+N more" line instead of overflowing the lane.

import {
  ROW_H,
  ROW_PITCH,
  ROW_INSET,
  HEADER_ROW_H,
  NAME_FS,
  PICK_FS,
  POS_FS,
  POS_SLOT_W,
  TIER_FS,
  tierColor,
  tierTextColor,
  picksForYear,
  isExpandedYear,
  classGradeFor,
  classSummary,
  gradeOf,
  pickGutter,
  layoutPickRow,
  shortName,
  fitText,
  measureDraftDesktop,
} from "./desktopDraftModel.js";

// tier color at an alpha — used to tint the class block by its grade.
function tierTint(tier, alpha) {
  const hex = tierColor(tier);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fmtScore(v) {
  return v == null ? "—" : Math.round(v);
}

// Header strip: "DRAFT", the class grade, and as much of the class summary as
// the column can hold. Shared by both modes — the compact column used to show
// a bare pick count here while the expanded one showed hits and average, which
// meant zooming in silently changed what the header was telling you.
const LABEL_W = 40; // "DRAFT" at PICK_FS + its letter-spacing
const CHIP_W = 20;

function ClassHeader({ x, width, y, picks, grade, adjusted }) {
  const s = classSummary(picks, adjusted);
  const left = x + ROW_INSET;
  const right = x + width - ROW_INSET;
  const summaryX = left + LABEL_W + (grade ? CHIP_W + 6 : 0);
  const summary = fitText(
    [
      s.scored > 0
        ? `${s.count} picks · ${s.hits} hit${s.hits === 1 ? "" : "s"} · avg ${fmtScore(s.avgScore)}`
        : null,
      s.scored > 0 ? `${s.count} picks · ${s.hits} hit${s.hits === 1 ? "" : "s"}` : null,
      `${s.count} pick${s.count === 1 ? "" : "s"}`,
      `${s.count}`,
    ],
    right - summaryX,
    9,
  );

  return (
    <g style={{ pointerEvents: "none" }}>
      <text
        x={left}
        y={y + 11}
        fontSize={9.5}
        fontWeight={700}
        fill="#6b7280"
        style={{ letterSpacing: 0.7 }}
      >
        DRAFT
      </text>
      {grade && (
        <g>
          <rect
            x={left + LABEL_W}
            y={y + 1}
            width={CHIP_W}
            height={12}
            rx={2}
            fill={tierColor(grade.tier)}
          />
          <text
            x={left + LABEL_W + CHIP_W / 2}
            y={y + 7.5}
            fontSize={8.5}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={tierTextColor(grade.tier)}
          >
            {grade.tier}
            {grade.provisional ? "*" : ""}
          </text>
        </g>
      )}
      <text x={right} y={y + 11} fontSize={9} textAnchor="end" fill="#9ca3af">
        {summary}
      </text>
      <line
        x1={left}
        x2={right}
        y1={y + HEADER_ROW_H - 2}
        y2={y + HEADER_ROW_H - 2}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    </g>
  );
}

// The row. Four fields, fixed columns, one tier-coloured fill behind all of
// them. Everything but the name is drawn at reduced opacity in the same ink,
// so the name still leads the row while the pick, position and grade stay
// legible against every rung of the ramp (tierTextColor is contrast-picked).
function PickRow({ p, x, width, y, gutter, adjusted, onSelect }) {
  const g = gradeOf(p.value, adjusted);
  const tier = g.tier;
  const star = g.provisional ? "*" : "";
  const fill = tierColor(tier);
  const ink = tier ? tierTextColor(tier) : "#4b5563";

  const L = layoutPickRow(x, width, gutter.width);
  const full = p.name || "Unknown";
  // The position has its OWN slot now, so it is no longer the thing sacrificed
  // when a name runs long — the name abbreviates and the position survives.
  // (It used to be glued to the name as a "· WR" suffix and dropped first,
  // which meant the longest names — the ones you're most likely to be
  // squinting at — were exactly the ones missing their position.)
  const label = fitText([full, shortName(full)], L.nameW, NAME_FS);
  const pos = p.position ? fitText([p.position], POS_SLOT_W, POS_FS) : "";
  const midY = y + ROW_H / 2;

  return (
    <g onClick={onSelect} style={onSelect ? { cursor: "pointer" } : undefined}>
      {/* The fill is also the hit target, and carries the tooltip so the
          unabbreviated name stays reachable on hover. On the rect, not inside
          the <text>: a <title> child of <text> is never painted but is still
          matched by text queries, which makes the row's visible label
          ambiguous. */}
      <rect x={L.boxX} y={y} width={L.boxW} height={ROW_H} rx={2} fill={fill}>
        <title>
          {`${full}${p.position ? ` · ${p.position}` : ""} · ${gutter.label(p)}${tier ? ` · ${tier}${star}` : ""}`}
        </title>
      </rect>

      <g style={{ pointerEvents: "none" }}>
        <text
          x={L.pickX}
          y={midY}
          dominantBaseline="middle"
          fontSize={PICK_FS}
          fill={ink}
          opacity={0.72}
        >
          {gutter.label(p)}
        </text>
        <text
          x={L.nameX}
          y={midY}
          dominantBaseline="middle"
          fontSize={NAME_FS}
          fontWeight={600}
          fill={ink}
        >
          {label}
        </text>
        {pos && (
          <text
            x={L.posRight}
            y={midY}
            dominantBaseline="middle"
            textAnchor="end"
            fontSize={POS_FS}
            fontWeight={600}
            fill={ink}
            opacity={0.72}
          >
            {pos}
          </text>
        )}
        <text
          x={L.tierRight}
          y={midY}
          dominantBaseline="middle"
          textAnchor="end"
          fontSize={TIER_FS}
          fontWeight={700}
          fill={ink}
          opacity={0.85}
        >
          {tier ? tier + star : "–"}
        </text>
      </g>
    </g>
  );
}

// The column: header, then the rows, clamped to the lane. Both modes render
// this — `width` is the only thing that differs, and the row spec reads its
// own affordances off it.
function DraftColumn({ picks, x, width, y, height, grade, adjusted, onSelectPick }) {
  const n = picks.length;
  if (!n) return null;

  const rowsTop = y + HEADER_ROW_H;
  // Clamp to the lane, closing with "+N more" — the same budget rule in both
  // modes, so toggling a class never overflows the lane in either direction.
  const maxRows = Math.max(1, Math.floor((height - HEADER_ROW_H - 4) / ROW_PITCH));
  const clamped = n > maxRows;
  const shown = clamped ? picks.slice(0, maxRows - 1) : picks;
  const gutter = pickGutter(picks, width);

  return (
    <g>
      <ClassHeader x={x} width={width} y={y} picks={picks} grade={grade} adjusted={adjusted} />
      {shown.map((p, i) => (
        <PickRow
          key={p.player_id || `${i}`}
          p={p}
          x={x}
          width={width}
          y={rowsTop + i * ROW_PITCH}
          gutter={gutter}
          adjusted={adjusted}
          onSelect={onSelectPick ? onSelectPick(p) : undefined}
        />
      ))}
      {clamped && (
        <text
          x={x + ROW_INSET}
          y={rowsTop + shown.length * ROW_PITCH + ROW_H / 2}
          dominantBaseline="middle"
          fontSize={9}
          fontStyle="italic"
          fill="#9ca3af"
          style={{ pointerEvents: "none" }}
        >
          +{n - shown.length} more
        </text>
      )}
    </g>
  );
}

// render ctx (from DesktopTimelineLayer): x/width = the module's column from
// the layout; y/height = the timeline LANE's vertical extent.
function renderDraft({ year, x, width, y, height, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return null;

  const expanded = mode !== "compact" || isExpandedYear(data, year);
  const canToggle = mode === "compact" && typeof data.onToggleYear === "function";
  const grade = classGradeFor(data, year);
  const adjusted = !!data.adjusted;

  const guarded = (fn) => (e) => {
    e.stopPropagation();
    if (data.tapGuard && data.tapGuard()) return;
    fn();
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={grade ? tierTint(grade.tier, 0.1) : "rgba(120,140,170,0.05)"}
        stroke={grade ? tierTint(grade.tier, 0.4) : "rgba(120,140,170,0.18)"}
        strokeWidth={1}
        onClick={canToggle ? guarded(() => data.onToggleYear(year)) : undefined}
        style={canToggle ? { cursor: "pointer" } : undefined}
      >
        {!expanded && (
          <title>{`${year} draft — ${picks.length} pick${picks.length === 1 ? "" : "s"}${grade ? ` · class ${grade.tier}` : ""}`}</title>
        )}
      </rect>
      {/* Keyed by mode so the fade replays when the class actually toggles. */}
      <g key={expanded ? "wide" : "narrow"} className="draft-reveal">
        <DraftColumn
          picks={picks}
          x={x}
          width={width}
          y={y}
          height={height}
          grade={grade}
          adjusted={adjusted}
          onSelectPick={
            typeof data.onSelectPick === "function"
              ? (p) => guarded(() => data.onSelectPick(p))
              : null
          }
        />
      </g>
    </g>
  );
}

const DesktopDraftModule = {
  id: "draft",
  label: "Draft",
  minBand: "SEASON_LINES",
  enabledByDefault: true,
  measure: measureDraftDesktop,
  render: renderDraft,
};

export default DesktopDraftModule;
