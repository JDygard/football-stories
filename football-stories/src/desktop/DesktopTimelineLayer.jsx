// Renders the desktop (landscape) content-stacked timeline from a prebuilt
// buildDesktopLayout, scrolled by `scrollX` and virtualized (only blocks
// intersecting the viewport are drawn). The 90°-rotated sibling of
// components/visualization/TeamTimelineLayer.jsx.
//
// Two season representations by detail band:
//   cols -> one win/loss column per game (GAME_DETAIL / GAME_BANDS): franchise
//           green anchored at the BOTTOM (its own score share), opponent red
//           above, split at the score ratio — so a split above the dashed
//           midline reads "outscored them" at a glance — with an arrow tip
//           bumping UP through the split on a win, down on a loss.
//   line -> a single season column with a vertical W-L differential bar
//           (up = winning season, down = losing).
// Offseason blocks are "paper" banner columns spanning the assembly (year,
// record, division finish, point diff — mobile's season-header strip migrated
// here, where landscape has room) and delegate to their content module
// columns. The all-time win-rate curve runs left→right with win% on the
// VERTICAL axis (0 at the lane bottom, 1 at the top) — like a stock chart.
//
// The lane's height is CONTENT-CAPPED (LANE_MAX), never stretched to fill a
// tall window; the whole assembly — entry-pill margin, lane, axis, bottom
// personnel rail, exit-pill margin — centers vertically in the viewport.
//
// Desktop-only affordances: hover <title> tooltips on seasons/games (mobile
// has no hover), and decade/half-decade axis labels at the two most
// zoomed-out bands (a horizontal axis can't fit a label per year there).

import { memo, useMemo } from "react";
import { desktopGeometryFor } from "./desktopDetail.js";
import {
  buildDesktopRibbons,
  buildPillPlan,
  PEEK,
  PILL_H,
  PILL_ROW_H,
} from "./desktopRibbonModel.js";
import DesktopRibbonLayer from "./DesktopRibbonLayer.jsx";

const WIN = "#2e9d51"; // victory green — winner
const LOSS = "#d0423f"; // loss red
const TIE = "#b9bdc4"; // neutral gray — tie
const BORDER = "#d9d9d9"; // hairline separator between the win/loss colors
const BORDER_W = 2; // px the grey underlay is offset toward the loser
const TEXTBG = "#d0d0d0"; // silver label backdrop
const LABEL_FILL = "#1a1a1a";
const PLATE_W = 38; // fixed label-plate length — uniform across every column

// Offseason "year banner" palette — same Material paper surface as mobile.
const OFF_PAPER = "#fbfbfa";
const OFF_HAIR = "#ececec";
const OFF_YEAR = "#2e3338";
const CURVE = "#4a6fa5"; // win-rate line

const RAIL_PAD = 10; // gap between the timeline lane and the ribbon rail
const AXIS_H = 18; // year-axis strip under the lane (only at banner-less bands)
// The lane takes only the height the content earns — never the full window
// (a stretched full-bleed lane reads awkward on tall viewports). The whole
// assembly (pill margin / lane / axis / rail / pill margin) centers
// vertically in whatever remains.
const LANE_MAX = 400;
const LANE_MIN = 140;

// Playoff finish -> outline color (same mapping as mobile).
const MEDALS = [
  [/won (sb|super|champ)/i, "#d4af37"], // gold — won it all
  [/lost (sb|super)/i, "#b9bec7"], // silver — lost the big one
  [/lost conf|lost champ/i, "#8d99ae"], // steel — lost conference
  [/lost div/i, "#cd7f32"], // bronze — lost divisional
  [/lost wc/i, "#2b2b2b"], // black — lost wild card
];

function playoffMedal(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS) {
    if (re.test(playoffs)) return color;
  }
  return null;
}

function recordStr(m) {
  if (!m) return "";
  return m.ties ? `${m.wins}-${m.losses}-${m.ties}` : `${m.wins}-${m.losses}`;
}

// Humanize a "Nth of M" division finish — compact variants that fit the
// banner column's width.
function divisionLabel(s) {
  if (!s) return null;
  const m = /^\s*(\d+)\w*\s+of\s+(\d+)\s*$/.exec(s);
  if (!m) return { text: s, tone: "neutral" };
  const place = +m[1];
  const total = +m[2];
  if (place === 1) return { text: "Won Div", tone: "good" };
  if (place === total) return { text: "Last in Div", tone: "bad" };
  return { text: s, tone: "neutral" };
}

const toneColor = (tone) =>
  tone === "good" ? "#3f8f2e" : tone === "bad" ? "#c0492b" : "#8a857c";

// One win/loss arrow COLUMN: franchise green anchored at the bottom (by its
// own score) vs opponent red above, split by score, with an arrow-tip bump
// marking the win/loss and a grey hairline along the boundary. Shared by
// regular-season and postseason.
const GameCol = memo(function GameCol({ g, x, gw, laneTop, laneBottom }) {
  const colW = Math.max(3, gw - 2);
  const labels = gw >= 12;
  const laneH = Math.max(1, laneBottom - laneTop);
  const pf = g.points_for ?? 0;
  const pa = g.points_against ?? 0;
  const total = pf + pa || 1;
  const splitY = laneBottom - laneH * (pf / total);
  const isWin = g.result === "W";
  const isTie = g.result === "T";
  const tip = isWin
    ? Math.min(colW, Math.max(0, splitY - laneTop))
    : Math.min(colW, Math.max(0, laneBottom - splitY));
  const tipY = isWin ? splitY - tip : splitY + tip;
  const left = x - colW / 2;
  const right = left + colW;
  const cx = left + colW / 2;
  // Green polygon: up the left edge to the split, out to the tip at the
  // column's horizontal center, back down the right edge.
  const arrow = `${left},${laneBottom} ${left},${splitY} ${cx},${tipY} ${right},${splitY} ${right},${laneBottom}`;
  const bw = BORDER_W;
  // Grey underlay offset toward the loser side (up), plus a bottom-edge sliver.
  const greyArrow = `${left},${laneBottom - bw} ${left},${splitY - bw} ${cx},${tipY - bw} ${right},${splitY - bw} ${right},${laneBottom - bw}`;
  const bgH = Math.min(colW - 3, 14); // plate thickness across the column
  return (
    <g>
      <rect x={left} y={laneTop} width={colW} height={laneH} fill={isTie ? TIE : LOSS}>
        <title>{`${g.franchise_id} ${pf}–${pa} ${g.opponent_id}${isTie ? " (T)" : isWin ? " (W)" : " (L)"}`}</title>
      </rect>
      {!isTie && (
        <g style={{ pointerEvents: "none" }}>
          <polygon points={greyArrow} fill={BORDER} />
          <rect x={left} y={laneBottom - bw} width={colW} height={bw} fill={BORDER} />
          <polygon points={arrow} fill={WIN} />
        </g>
      )}
      {labels && (
        <g style={{ pointerEvents: "none" }}>
          {/* rotated plates: franchise + score reading up from the bottom,
              opponent + score hanging from the top */}
          <g transform={`translate(${cx}, ${laneBottom - 4}) rotate(-90)`}>
            <rect x={0} y={-bgH / 2} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
            <text x={3} y={0.5} fontSize={9} dominantBaseline="central" fill={LABEL_FILL}>
              {`${g.franchise_id} ${pf}`}
            </text>
          </g>
          <g transform={`translate(${cx}, ${laneTop + 4}) rotate(-90)`}>
            <rect x={-PLATE_W} y={-bgH / 2} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
            <text x={-3} y={0.5} fontSize={9} textAnchor="end" dominantBaseline="central" fill={LABEL_FILL}>
              {`${pa} ${g.opponent_id}`}
            </text>
          </g>
        </g>
      )}
    </g>
  );
});

// The postseason segment right of a season's games. Zoom 4: a rotated
// "POSTSEASON" label column (medal-accented by finish) then win/loss arrow
// columns for the playoff games. Zoom 3: a compact vertical strip that just
// states the result, gold-bordered for a title, silver for runner-up.
const PostseasonSection = memo(function PostseasonSection({ post, laneTop, laneBottom }) {
  if (!post) return null;
  const medal = playoffMedal(post.result);
  const laneH = Math.max(1, laneBottom - laneTop);
  if (post.kind === "result") {
    const { x0, width: w, result } = post;
    return (
      <g style={{ pointerEvents: "none" }}>
        <rect
          x={x0} y={laneTop} width={w} height={laneH} rx={3}
          fill="#fafafa" stroke={medal || "#dcdcdc"} strokeWidth={medal ? 1.75 : 1}
        />
        <g transform={`translate(${x0 + w / 2 + 0.5}, ${laneBottom - 8}) rotate(-90)`}>
          <text
            x={0} y={0} dominantBaseline="central"
            fontSize={9} fontWeight={700} fill="#9a9a9a" style={{ letterSpacing: 1.5 }}
          >
            POSTSEASON
          </text>
          <text
            x={laneH - 16} y={0} dominantBaseline="central" textAnchor="end"
            fontSize={11} fontWeight={700} fill={medal ? "#2b2b2b" : "#777"}
          >
            {result || "—"}
          </text>
        </g>
      </g>
    );
  }
  const { x0, headerW, colW, result, games } = post;
  return (
    <g>
      <g
        transform={`translate(${x0 + headerW - 5}, ${laneBottom}) rotate(-90)`}
        style={{ pointerEvents: "none" }}
      >
        <text x={0} y={0} fontSize={9} fontWeight={700} fill="#9a9a9a" style={{ letterSpacing: 1.5 }}>
          POSTSEASON{result ? ` · ${result}` : ""}
        </text>
      </g>
      <line
        x1={x0 + headerW - 1} x2={x0 + headerW - 1} y1={laneTop} y2={laneBottom}
        stroke={medal || "#e0e0e0"} strokeWidth={medal ? 2 : 1}
      />
      {games.map(({ g, i, x }) => (
        <GameCol
          key={g.game_id || `p-${i}`}
          g={g} x={x} gw={colW}
          laneTop={laneTop} laneBottom={laneBottom}
        />
      ))}
    </g>
  );
});

const SeasonBlock = memo(function SeasonBlock({ block, laneTop, laneBottom, meta, showPlayoffs = true }) {
  const raw = block.season?.season || {};

  if (block.mode === "cols") {
    const gw = block.gameColWidth;
    return (
      <g>
        {block.games.map(({ g, i, x }) => (
          <GameCol
            key={g.game_id || `${block.year}-${i}`}
            g={g} x={x} gw={gw}
            laneTop={laneTop} laneBottom={laneBottom}
          />
        ))}
        <PostseasonSection post={block.postseason} laneTop={laneTop} laneBottom={laneBottom} />
      </g>
    );
  }

  // line mode: a season summary column (W-L differential bar from the
  // midline — up = winning season, down = losing).
  const laneH = Math.max(1, laneBottom - laneTop);
  const wins = raw.wins ?? 0;
  const losses = raw.losses ?? 0;
  const diff = wins - losses;
  const unit = laneH / 2 / 16; // a 16-game swing fills half the lane
  const midY = laneTop + laneH / 2;
  const cx = block.x0 + block.width / 2;
  const barH = Math.min(laneH / 2, Math.abs(diff) * unit);
  const y0 = diff >= 0 ? midY - barH : midY;
  const color = diff >= 0 ? WIN : LOSS;
  const medal = showPlayoffs ? playoffMedal(raw.playoffs) : null;
  const frameW = Math.max(4, Math.min(block.width - 1, 12));
  const barW = Math.min(6, Math.max(2, block.width - 2));
  const tip = `${block.year} · ${recordStr(meta || raw)}${showPlayoffs && raw.playoffs ? ` · ${raw.playoffs}` : ""}`;
  return (
    <g>
      {/* hover target for the whole season column (desktop bonus) */}
      <rect x={block.x0} y={laneTop} width={block.width} height={laneH} fill="transparent">
        <title>{tip}</title>
      </rect>
      {medal && (
        <rect
          x={cx - frameW / 2}
          y={laneTop}
          width={frameW}
          height={laneH}
          fill="none"
          stroke={medal}
          strokeWidth={1.5}
          rx={2}
          style={{ pointerEvents: "none" }}
        />
      )}
      <rect x={cx - barW / 2} y={y0} width={barW} height={Math.max(0, barH)} fill={color} rx={1} style={{ pointerEvents: "none" }} />
    </g>
  );
});

// The offseason banner COLUMN: a full-bleed-vertical Material "paper" surface
// (zooms 2/3/4), fronted by the minimalist sans year at the top, the season's
// record / division finish / point diff beneath it (migrated from mobile's
// season-header strip), and the all-time win-rate pill riding the curve.
// Content modules (draft, …) stack to the right.
const OffseasonBlock = memo(function OffseasonBlock({
  block,
  laneTop,
  laneBottom,
  paperTop,
  paperBottom,
  offMode,
  detailBand,
  moduleData,
  meta,
  showWinRate = true,
  showPlayoffs = true,
}) {
  const showBanner = offMode !== "hidden";
  if ((!block.modules || !block.modules.length) && !showBanner) return null;

  const headerW = block.headerWidth || 0;
  const laneH = Math.max(1, laneBottom - laneTop);
  const big = offMode === "full";
  const yearSize = big ? 24 : 19;
  const yearY = laneTop + (big ? 24 : 20);

  // Facts stack under the year — record, playoff finish, division, point diff.
  const lines = [];
  if (meta) {
    lines.push({ text: recordStr(meta), color: "#4a4640", weight: 700 });
    if (showPlayoffs && meta.playoffs) {
      const medal = playoffMedal(meta.playoffs);
      lines.push({ text: meta.playoffs, color: medal || "#8a857c", weight: 700 });
    }
    const df = divisionLabel(meta.divisionFinish);
    if (df) lines.push({ text: df.text, color: toneColor(df.tone), weight: 600 });
    if (meta.pointDiff != null) {
      const pd = meta.pointDiff;
      lines.push({
        text: pd > 0 ? `+${pd}` : `${pd}`,
        color: pd > 0 ? "#3f8f2e" : pd < 0 ? "#c0492b" : "#8a857c",
        weight: 700,
      });
    }
  }

  // Overall winrate pill, centered on the height where the all-time win-rate
  // curve crosses this year boundary. "<##>% (<w>/<l>)" with a trend caret;
  // falls back to the bare percentage when the block is too narrow. Hidden at
  // zoom 4 (GAME_DETAIL), where games are the focus.
  let win = null;
  if (showWinRate && showBanner && detailBand !== "GAME_DETAIL" && meta && meta.enterPct != null) {
    const fs = big ? 11 : 10;
    const pct = Math.round(meta.enterPct * 100);
    const caretW = fs * 0.62;
    const gap = 4;
    const mk = (label) => {
      const textW = Math.round(label.length * fs * 0.52);
      return { label, w: caretW + gap + textW + 16 };
    };
    let p = mk(`${pct}% (${meta.enterWins}/${meta.enterLosses})`);
    if (p.w > block.width - 4) p = mk(`${pct}%`);
    if (p.w <= block.width - 4) {
      const ph = 18;
      const curveY = laneBottom - meta.enterPct * laneH;
      const cy = Math.max(laneTop + ph, Math.min(laneBottom - ph, curveY));
      const cx = Math.max(
        block.x0 + p.w / 2 + 2,
        Math.min(block.x1 - p.w / 2 - 2, block.x0 + block.width / 2),
      );
      const dir =
        meta.prevPct == null
          ? 0
          : meta.enterPct > meta.prevPct
            ? 1
            : meta.enterPct < meta.prevPct
              ? -1
              : 0;
      win = { fs, label: p.label, w: p.w, ph, cx, cy, caretW, gap, dir };
    }
  }

  return (
    <g>
      {showBanner && (
        <g style={{ pointerEvents: "none" }}>
          {/* Material "paper" surface — spans the whole assembly (pill
              margins + lane + rail), softly elevated by the shadow pass */}
          <rect x={block.x0} y={paperTop} width={block.width} height={paperBottom - paperTop} fill={OFF_PAPER} />

          {headerW > 0 && (
            <g>
              {/* the year — top of the banner column, horizontal (never
                  rotated: it's the primary landmark) */}
              <text
                x={block.x0 + 6}
                y={yearY}
                fontSize={yearSize}
                fontWeight={600}
                fill={OFF_YEAR}
                style={{ letterSpacing: -0.4 }}
              >
                {block.year}
              </text>

              {/* the season's facts, stacked beneath the year */}
              {lines.map((l, i) => (
                <text
                  key={i}
                  x={block.x0 + 7}
                  y={yearY + 17 + i * 13}
                  fontSize={10}
                  fontWeight={l.weight}
                  fill={l.color}
                  style={{ letterSpacing: 0.2 }}
                >
                  {l.text}
                </text>
              ))}

              {/* overall winrate pill riding the curve crossing */}
              {win && (() => {
                const innerLeft = win.cx - win.w / 2 + 8;
                const caretLeft = innerLeft;
                const textX = innerLeft + win.caretW + win.gap;
                const ch = win.caretW * 0.92;
                const up = `${caretLeft},${win.cy + ch / 2} ${caretLeft + win.caretW},${win.cy + ch / 2} ${caretLeft + win.caretW / 2},${win.cy - ch / 2}`;
                const down = `${caretLeft},${win.cy - ch / 2} ${caretLeft + win.caretW},${win.cy - ch / 2} ${caretLeft + win.caretW / 2},${win.cy + ch / 2}`;
                return (
                  <g>
                    <rect
                      x={win.cx - win.w / 2}
                      y={win.cy - win.ph / 2}
                      width={win.w}
                      height={win.ph}
                      rx={win.ph / 2}
                      fill={CURVE}
                    />
                    {win.dir !== 0 && (
                      <polygon
                        points={win.dir > 0 ? up : down}
                        fill={win.dir > 0 ? "#4ade80" : "#ff6b6b"}
                        stroke="#ffffff"
                        strokeWidth={0.75}
                        strokeLinejoin="round"
                      />
                    )}
                    <text
                      x={win.dir !== 0 ? textX : win.cx}
                      y={win.cy}
                      fontSize={win.fs}
                      fontWeight={600}
                      textAnchor={win.dir !== 0 ? "start" : "middle"}
                      dominantBaseline="central"
                      fill="#ffffff"
                    >
                      {win.label}
                    </text>
                  </g>
                );
              })()}

              {/* hairline closing the banner column off from the content */}
              <line
                x1={block.x0 + headerW - 0.5} x2={block.x0 + headerW - 0.5}
                y1={laneTop} y2={laneBottom}
                stroke={OFF_HAIR} strokeWidth={1}
              />
            </g>
          )}
        </g>
      )}
      {block.modules.map((box) => (
        <g key={`${block.year}-${box.id}`}>
          {box.module.render({
            year: block.year,
            x: box.x,
            width: box.width,
            y: laneTop,
            height: laneH,
            mode: offMode,
            detailBand,
            data: moduleData,
          })}
        </g>
      ))}
    </g>
  );
});

const DesktopTimelineLayer = memo(function DesktopTimelineLayer({
  layout,
  scrollX = 0,
  width,
  height,
  band,
  moduleData = {},
  staff = [],
  pre1967 = null,
  adminById,
  onSelectStaff,
  tapGuard,
  onFollow,
  showWinRate = true,
  showPlayoffs = true,
}) {
  const ribbonLayout = useMemo(
    () => buildDesktopRibbons({ staff, layout }),
    [staff, layout],
  );
  const pillPlan = useMemo(
    () => buildPillPlan(ribbonLayout.ribbons),
    [ribbonLayout],
  );

  // Vertical composition (top → bottom): entry-pill margin -> timeline lane
  // -> year axis (banner-less bands only) -> bottom rail (personnel bands)
  // -> peek + exit-pill margin. The lane is capped at LANE_MAX — height is
  // spent only on what the content uses — and the whole assembly centers in
  // the viewport.
  const offMode = desktopGeometryFor(band).offseason;
  const railH = ribbonLayout.railHeight;
  const topZone = pillPlan.entryRows ? pillPlan.entryRows * PILL_ROW_H + 6 : 10;
  const axisH = offMode === "hidden" ? AXIS_H : 0;
  const railBlock = railH ? RAIL_PAD + railH : 0;
  const botZone = railH
    ? PEEK + (pillPlan.exitRows ? pillPlan.exitRows * PILL_ROW_H + 6 : 8)
    : 8;
  const fixedH = topZone + axisH + railBlock + botZone;
  const laneH = Math.max(LANE_MIN, Math.min(LANE_MAX, height - 16 - fixedH));
  const assemblyH = fixedH + laneH;
  const assemblyTop = Math.max(8, (height - assemblyH) * 0.45);
  const assemblyBottom = assemblyTop + assemblyH;
  const laneTop = assemblyTop + topZone;
  const laneBottom = laneTop + laneH;
  const railTop = laneBottom + axisH + (railH ? RAIL_PAD : 0);
  const railBottom = railTop + railH;
  // Pill row centers: entry rows stack upward from the lane, exit rows
  // downward from the rail's peek.
  const entryPillY = (row) => laneTop - 10 - PILL_H / 2 - row * PILL_ROW_H;
  const exitPillY = (row) => railBottom + PEEK + 4 + PILL_H / 2 + row * PILL_ROW_H;

  // Cumulative franchise winrate AFTER EACH GAME, spanning the entire
  // timeline width. x comes from the layout (true game columns at Zoom 3/4;
  // games spread evenly through the season block at Zoom 1/2); the win% maps
  // to the VERTICAL axis — so the curve survives every band change.
  const winCurve = useMemo(() => {
    if (!layout?.blocks?.length) return null;
    // Seed with pre-1967 aggregate W-L-T so the curve starts at the
    // franchise's TRUE all-time ratio (see the mobile layer's note).
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    const pts = [];
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const reg = b.games || [];
      const post = b.postseason?.games || [];
      const seq = post.length ? [...reg, ...post] : reg;
      const m = seq.length || 1;
      seq.forEach(({ g }, idx) => {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
        const x =
          b.mode === "cols"
            ? seq[idx].x
            : b.x0 + ((idx + 0.5) / m) * b.width;
        pts.push([x, (w + t / 2) / n]);
      });
    }
    return pts.length ? pts : null;
  }, [layout, pre1967]);

  // Per-year banner facts (same accumulation, sampled before each season).
  const seasonMeta = useMemo(() => {
    const map = new Map();
    if (!layout?.blocks?.length) return map;
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    let prevPct = null;
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const raw = b.season?.season || {};
      const enterPct = n > 0 ? (w + t / 2) / n : null;
      map.set(b.year, {
        enterPct,
        enterWins: w,
        enterLosses: n - w - t,
        prevPct,
        wins: raw.wins ?? 0,
        losses: raw.losses ?? 0,
        ties: raw.ties ?? 0,
        playoffs: raw.playoffs || null,
        pointDiff: raw.point_diff ?? null,
        divisionFinish: raw.division_finish || null,
      });
      prevPct = enterPct;
      const post = b.postseason?.games || [];
      const seq = post.length ? [...(b.games || []), ...post] : b.games || [];
      for (const { g } of seq) {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
      }
    }
    return map;
  }, [layout, pre1967]);

  // virtualize: only blocks intersecting [scrollX, scrollX+width] (+pad).
  const visible = useMemo(() => {
    if (!layout?.blocks) return [];
    const l = scrollX - 60;
    const r = scrollX + width + 60;
    return layout.blocks.filter((b) => b.x1 > l && b.x0 < r);
  }, [layout, scrollX, width]);

  // The win-rate polyline spans the full timeline width; build its point
  // string once per layout/geometry change instead of per scroll frame.
  const winCurvePoints = useMemo(() => {
    if (!winCurve) return null;
    return winCurve
      .map(([x, r]) => `${x.toFixed(1)},${(laneBottom - r * laneH).toFixed(1)}`)
      .join(" ");
  }, [winCurve, laneBottom, laneH]);

  if (!layout || !width || !height) return null;

  // Axis label pitch at banner-less bands: a horizontal axis can't fit every
  // year, so step to half-decades / decades.
  const axisStep = band === "FRANCHISE_OVERVIEW" ? 10 : 5;

  return (
    <>
    <defs>
      {/* Soft elevation for the offseason "paper" columns — a short fading
          strip along each column's right edge (GPU-composited gradient, no
          SVG filter; see the mobile layer's performance note). */}
      <linearGradient id="offPaperShadowH" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#3a2f1a" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#3a2f1a" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g transform={`translate(${-scrollX}, 0)`}>
      {/* all-time win-rate curve (0..1 up the lane), drawn BEHIND the blocks
          so each opaque offseason banner — and the franchise-record pill that
          rides on it — cleanly occludes the line where it passes through.
          Hidden at zoom 4 (GAME_DETAIL), where individual games are the focus. */}
      {showWinRate && winCurve && band !== "GAME_DETAIL" && (
        <g style={{ pointerEvents: "none" }}>
          <line
            x1={0}
            x2={layout.totalWidth}
            y1={laneTop + laneH / 2}
            y2={laneTop + laneH / 2}
            stroke="#d8dde6"
            strokeWidth={1}
            strokeDasharray="2 6"
          />
          <polyline
            fill="none"
            stroke={CURVE}
            strokeWidth={1.5}
            strokeOpacity={0.7}
            points={winCurvePoints}
          />
        </g>
      )}

      {visible.map((b) =>
        b.type === "season" ? (
          <SeasonBlock
            key={`s-${b.year}`}
            block={b}
            laneTop={laneTop}
            laneBottom={laneBottom}
            meta={seasonMeta.get(b.year)}
            showPlayoffs={showPlayoffs}
          />
        ) : (
          <OffseasonBlock
            key={`o-${b.year}`}
            block={b}
            laneTop={laneTop}
            laneBottom={laneBottom}
            paperTop={assemblyTop}
            paperBottom={assemblyBottom}
            offMode={offMode}
            detailBand={band}
            moduleData={moduleData}
            meta={seasonMeta.get(b.year)}
            showWinRate={showWinRate}
            showPlayoffs={showPlayoffs}
          />
        ),
      )}

      {/* Offseason column drop-shadows, in their own pass AFTER the blocks so
          each strip lands on top of the season content to its right. */}
      {offMode !== "hidden" &&
        visible
          .filter((b) => b.type === "offseason")
          .map((b) => (
            <rect
              key={`osh-${b.year}`}
              x={b.x1}
              y={assemblyTop}
              width={6}
              height={assemblyH}
              fill="url(#offPaperShadowH)"
              style={{ pointerEvents: "none" }}
            />
          ))}

      {/* year axis only at the most-zoomed-out bands; otherwise the banner
          column left of each season carries the (much bigger) year */}
      {offMode === "hidden" &&
        visible
          .filter((b) => b.type === "season" && b.year % axisStep === 0)
          .map((b) => (
            <text
              key={`y-${b.year}`}
              x={b.x0 + b.width / 2}
              y={laneBottom + 13}
              fontSize={10}
              textAnchor="middle"
              fill="#555"
              style={{ pointerEvents: "none" }}
            >
              {b.year}
            </text>
          ))}

      {/* personnel tenure ribbons: entry connector in from the top pill
          zone, band along the bottom rail, exit connector down through the
          peek to its pill */}
      <DesktopRibbonLayer
        ribbons={ribbonLayout.ribbons}
        pillPlan={pillPlan}
        width={width}
        scrollX={scrollX}
        laneTop={laneTop}
        railTop={railTop}
        slotCount={ribbonLayout.slotCount}
        bandH={ribbonLayout.bandH}
        entryPillY={entryPillY}
        exitPillY={exitPillY}
        adminById={adminById}
        onSelect={onSelectStaff}
        onFollow={onFollow}
        tapGuard={tapGuard}
      />
    </g>
    </>
  );
});

export default DesktopTimelineLayer;
