// Desktop offseason DRAFT module — renders a franchise's draft class as a
// COLUMN inside the offseason block. Draft semantics (tier ramp, grade lens,
// summaries) are shared with mobile via desktopDraftModel; the pick rows stack
// vertically down the column, which landscape gives plenty of room for.
//
// Interactions (all guarded by data.tapGuard so a pan's trailing click is
// ignored):
//   - compact mode: the class is a labeled column of named grade boxes; tap to
//     expand it to full rows (pick number, position, score bar — reflows the
//     content stack). Tap the background of an expanded class to collapse it.
//   - any pick row OR named grade box: tap to open the player info card
//     (data.onSelectPick).
//
// Landscape-only nuance: a column's row count is bounded by the lane height,
// so an oversized class (12-round drafts ran 30+ picks) clamps its rows and
// closes with a "+N more" line instead of overflowing the lane.

import {
  HEADER_ROW_H,
  PICK_ROW_H,
  COMPACT_HEADER_H,
  COMPACT_ROW_H,
  COMPACT_GAP,
  tierColor,
  tierTextColor,
  picksForYear,
  isExpandedYear,
  classGradeFor,
  classSummary,
  gradeOf,
  pickLabel,
  shortName,
  truncate,
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

function Header({ x, width, y, picks, grade, adjusted }) {
  const s = classSummary(picks, adjusted);
  const right =
    s.scored > 0
      ? `${s.count} picks · ${s.hits} hit${s.hits === 1 ? "" : "s"} · avg ${fmtScore(s.avgScore)}`
      : `${s.count} pick${s.count === 1 ? "" : "s"}`;
  return (
    <g style={{ pointerEvents: "none" }}>
      <text x={x + 4} y={y + HEADER_ROW_H - 5} fontSize={11} fontWeight={600} fill="#333">
        Draft
      </text>
      {grade && (
        <g>
          <rect
            x={x + 44}
            y={y + 2}
            width={24}
            height={HEADER_ROW_H - 6}
            rx={2}
            fill={tierColor(grade.tier)}
          />
          <text
            x={x + 56}
            y={y + HEADER_ROW_H / 2}
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
        y={y + HEADER_ROW_H - 5}
        fontSize={10}
        textAnchor="end"
        fill="#888"
      >
        {right}
      </text>
      <line
        x1={x + 4}
        x2={x + width - 4}
        y1={y + HEADER_ROW_H - 1}
        y2={y + HEADER_ROW_H - 1}
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
    <g onClick={onSelect} style={onSelect ? { cursor: "pointer" } : undefined}>
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

// Compact (zoom 2): a LABELED column — "DRAFT" plus the class grade, then one
// tier-colored box per pick with the player's name inside it, top pick first.
//
// The name is what makes the grade mean anything: a column of anonymous colored
// squares tells you a class graded out well without telling you it was a draft
// class or whose it was. Each box is its own tap target into the player card,
// so the compact view is navigable without expanding first.
function CompactClass({ picks, x, width, y, height, grade, adjusted, onSelectPick }) {
  const n = picks.length;
  if (!n) return null;

  const boxX = x + 4;
  const boxW = Math.max(8, width - 8);
  const headY = y + 4;
  const rowsTop = headY + COMPACT_HEADER_H;
  const pitch = COMPACT_ROW_H + COMPACT_GAP;

  // Clamp to the lane, closing with "+N more" — same budget rule the expanded
  // rows use, so toggling never overflows the lane in either direction.
  const maxRows = Math.max(1, Math.floor((height - (rowsTop - y) - 4) / pitch));
  const clamped = n > maxRows;
  const shown = clamped ? picks.slice(0, maxRows - 1) : picks;
  // ~5.4px per char at fontSize 9.5, less the tier letter's gutter on the right.
  const nameMax = Math.max(3, Math.floor((boxW - 22) / 5.4));

  return (
    <g>
      <g style={{ pointerEvents: "none" }}>
        <text x={boxX} y={headY + 11} fontSize={9.5} fontWeight={700} fill="#6b7280" style={{ letterSpacing: 0.7 }}>
          DRAFT
        </text>
        {grade && (
          <g>
            <rect x={boxX + 40} y={headY + 1} width={20} height={12} rx={2} fill={tierColor(grade.tier)} />
            <text
              x={boxX + 50}
              y={headY + 7.5}
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
        <text x={boxX + boxW} y={headY + 11} fontSize={9} textAnchor="end" fill="#9ca3af">
          {n}
        </text>
      </g>

      {shown.map((p, i) => {
        const g = gradeOf(p.value, adjusted);
        const color = tierColor(g.tier);
        const fg = g.tier ? tierTextColor(g.tier) : "#4b5563";
        const rowY = rowsTop + i * pitch;
        const midY = rowY + COMPACT_ROW_H / 2;
        return (
          <g
            key={p.player_id || `${i}`}
            onClick={onSelectPick ? onSelectPick(p) : undefined}
            style={onSelectPick ? { cursor: "pointer" } : undefined}
          >
            <rect x={boxX} y={rowY} width={boxW} height={COMPACT_ROW_H} rx={2} fill={color}>
              <title>
                {`${p.name || "Unknown"}${p.position ? ` · ${p.position}` : ""} · ${pickLabel(p)}${g.tier ? ` · ${g.tier}` : ""}`}
              </title>
            </rect>
            <text
              x={boxX + 5}
              y={midY}
              dominantBaseline="middle"
              fontSize={9.5}
              fontWeight={600}
              fill={fg}
              style={{ pointerEvents: "none" }}
            >
              {truncate(shortName(p.name), nameMax)}
            </text>
            {g.tier && (
              <text
                x={boxX + boxW - 4}
                y={midY}
                dominantBaseline="middle"
                textAnchor="end"
                fontSize={8.5}
                fontWeight={700}
                fill={fg}
                opacity={0.75}
                style={{ pointerEvents: "none" }}
              >
                {g.tier}
                {g.provisional ? "*" : ""}
              </text>
            )}
          </g>
        );
      })}

      {clamped && (
        <text
          x={boxX}
          y={rowsTop + shown.length * pitch + COMPACT_ROW_H / 2}
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

  // Row budget: clamp oversized classes to the lane, closing with "+N more".
  const maxRows = Math.max(1, Math.floor((height - HEADER_ROW_H - 4) / PICK_ROW_H));
  const clamped = expanded && picks.length > maxRows;
  const shown = clamped ? picks.slice(0, maxRows - 1) : picks;
  const moreY = y + HEADER_ROW_H + shown.length * PICK_ROW_H;

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
      {!expanded ? (
        <g key="chips" className="draft-reveal">
          <CompactClass
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
      ) : (
        <g key="rows" className="draft-reveal">
          <Header x={x} width={width} y={y} picks={picks} grade={grade} adjusted={adjusted} />
          {shown.map((p, i) => (
            <PickRow
              key={p.player_id || `${year}-${i}`}
              p={p}
              x={x}
              width={width}
              y={y + HEADER_ROW_H + i * PICK_ROW_H}
              adjusted={adjusted}
              onSelect={
                typeof data.onSelectPick === "function"
                  ? guarded(() => data.onSelectPick(p))
                  : undefined
              }
            />
          ))}
          {clamped && (
            <text
              x={x + 6}
              y={moreY + PICK_ROW_H / 2}
              dominantBaseline="middle"
              fontSize={10}
              fontStyle="italic"
              fill="#888"
              style={{ pointerEvents: "none" }}
            >
              +{picks.length - shown.length} more picks
            </text>
          )}
        </g>
      )}
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
