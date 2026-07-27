// Offseason DRAFT module — renders a franchise's draft class for one year,
// surfacing capital spent (round / overall pick) against return realized
// (value tier + surplus score). Implements the module contract consumed by
// buildTimelineLayout: { id, label, minBand, measure, render }.
//
// Interactions (all guarded by data.tapGuard so a pan's trailing click is
// ignored):
//   - compact mode: tap the class block to expand it to full rows; tap the
//     background/header of an expanded class to collapse it again.
//   - any pick row: tap to open the player info card (data.onSelectPick).

import {
  HEADER_H,
  PICK_ROW_H,
  COMPACT_H,
  tierColor,
  tierTextColor,
  picksForYear,
  isExpandedYear,
  classGradeFor,
  classSummary,
  gradeOf,
  pickLabel,
  truncate,
  measureDraft,
} from "./draftModel.js";

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

function Header({ x, width, y, picks, grade, adjusted }) {
  const s = classSummary(picks, adjusted);
  const right =
    s.scored > 0
      ? `${s.count} picks · ${s.hits} hit${s.hits === 1 ? "" : "s"} · avg ${fmtScore(s.avgScore)}`
      : `${s.count} pick${s.count === 1 ? "" : "s"}`;
  return (
    <g style={{ pointerEvents: "none" }}>
      {/* the year is already on the offseason banner above — just label it */}
      <text x={x + 4} y={y + HEADER_H - 5} fontSize={11} fontWeight={600} fill="#333">
        Draft
      </text>
      {grade && (
        <g>
          <rect
            x={x + 44}
            y={y + 2}
            width={24}
            height={HEADER_H - 6}
            rx={2}
            fill={tierColor(grade.tier)}
          />
          <text
            x={x + 56}
            y={y + HEADER_H / 2}
            fontSize={9}
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
      <text
        x={x + width - 4}
        y={y + HEADER_H - 5}
        fontSize={10}
        textAnchor="end"
        fill="#888"
      >
        {right}
      </text>
      <line
        x1={x + 4}
        x2={x + width - 4}
        y1={y + HEADER_H - 1}
        y2={y + HEADER_H - 1}
        stroke="#e5e5e5"
        strokeWidth={1}
      />
    </g>
  );
}

function PickRow({ p, x, width, y, onSelect, adjusted }) {
  const labelX = x + 6;
  const nameX = x + 54;
  const right = x + width;
  const chipW = 20;
  const chipX = right - 6 - chipW;
  const scoreBarW = 34;
  const scoreBarX = chipX - 8 - scoreBarW;

  const g = gradeOf(p.value, adjusted);
  const score = g.score;
  const tier = g.tier;
  const star = g.provisional ? "*" : "";
  const color = tierColor(tier);

  const nameMax = Math.max(4, Math.floor((scoreBarX - nameX - 6) / 6));
  const label = `${p.name || "Unknown"}${p.position ? " · " + p.position : ""}`;

  const midY = y + PICK_ROW_H / 2;

  return (
    <g
      onClick={onSelect}
      style={onSelect ? { cursor: "pointer" } : undefined}
    >
      {/* row hit target */}
      <rect x={x} y={y} width={width} height={PICK_ROW_H} fill="transparent" />
      <text x={labelX} y={midY} dominantBaseline="middle" fontSize={10} fill="#666">
        {pickLabel(p)}
      </text>
      <text x={nameX} y={midY} dominantBaseline="middle" fontSize={10} fill="#111">
        {truncate(label, nameMax)}
      </text>

      {/* score bar (proportional to 0-100 percentile score) */}
      <rect x={scoreBarX} y={midY - 3} width={scoreBarW} height={6} fill="#eee" rx={1} />
      {score != null && (
        <rect
          x={scoreBarX}
          y={midY - 3}
          width={(scoreBarW * Math.max(0, Math.min(100, score))) / 100}
          height={6}
          fill={color}
          rx={1}
        />
      )}

      {/* tier chip */}
      <rect x={chipX} y={midY - 7} width={chipW} height={14} rx={2} fill={color} />
      <text
        x={chipX + chipW / 2}
        y={midY}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={9}
        fontWeight={700}
        fill={tier ? tierTextColor(tier) : "#5a5a5a"}
      >
        {tier ? tier + star : "–"}
      </text>
    </g>
  );
}

// Compact: header + a single row of tier-colored squares (one per pick).
function CompactChips({ picks, x, width, y, adjusted }) {
  const n = picks.length;
  if (!n) return null;
  const avail = width - 8;
  const gap = 2;
  const sq = Math.max(4, Math.min(12, avail / n - gap));
  return (
    <g transform={`translate(${x + 4}, ${y + 2})`} style={{ pointerEvents: "none" }}>
      {picks.map((p, i) => (
        <rect
          key={p.player_id || i}
          x={i * (sq + gap)}
          y={0}
          width={sq}
          height={Math.min(COMPACT_H - 4, sq)}
          rx={1}
          fill={tierColor(gradeOf(p.value, adjusted).tier)}
        />
      ))}
    </g>
  );
}

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
      />
      <Header x={x} width={width} y={y} picks={picks} grade={grade} adjusted={adjusted} />
      {/* Keyed by mode so the fade replays when the class actually toggles
          between compact chips and full rows, not on every scroll frame. */}
      {!expanded ? (
        <g key="chips" className="draft-reveal">
          <CompactChips picks={picks} x={x} width={width} y={y + HEADER_H} adjusted={adjusted} />
        </g>
      ) : (
        <g key="rows" className="draft-reveal">
          {picks.map((p, i) => (
            <PickRow
              key={p.player_id || `${year}-${i}`}
              p={p}
              x={x}
              width={width}
              y={y + HEADER_H + i * PICK_ROW_H}
              adjusted={adjusted}
              onSelect={
                typeof data.onSelectPick === "function"
                  ? guarded(() => data.onSelectPick(p))
                  : undefined
              }
            />
          ))}
        </g>
      )}
    </g>
  );
}

const DraftModule = {
  id: "draft",
  label: "Draft",
  minBand: "SEASON_LINES",
  enabledByDefault: true,
  measure: measureDraft,
  render: renderDraft,
};

export default DraftModule;
