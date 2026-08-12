// Renders the content-stacked timeline from a prebuilt layout, scrolled by
// `scrollY` and virtualized (only blocks intersecting the viewport are drawn).
//
// Two season representations by detail band:
//   rows  -> one win/loss band per game (GAME_DETAIL / GAME_BANDS)
//   line  -> a single season summary strip (SEASON_LINES and coarser)
// Offseason blocks delegate to their content modules (draft, …).
// Personnel tenure ribbons: opaque bordered bands — entry band from the far
// left screen edge (anchored in the offseason's reserved space, or pinned to
// the viewport top), vertical tail in the right gutter, exit band trailing
// off the right edge — all anchored to the same layout coordinates.

import { memo, useMemo } from "react";
import { geometryFor } from "./detail.js";
import { buildStaffRibbons, resolveRibbonStrips, PEEK } from "./staffRibbonModel.js";
import StaffRibbonLayer from "./StaffRibbonLayer.jsx";
import SeasonPage from "./SeasonPage.jsx";
import {
  classGradeFor,
  classSummary,
  picksForYear,
  tierColor,
  tierTextColor,
} from "./offseason/draftModel.js";

const WIN = "#2e9d51"; // victory green — winner
const LOSS = "#d0423f"; // loss red — loser (vivid but not neon)
const TIE = "#b9bdc4"; // neutral gray — tie
const BORDER = "#d9d9d9"; // hairline separator between the win/loss colors
const BORDER_W = 2; // px the grey underlay is offset toward the loser
const TEXTBG = "#d0d0d0"; // silver label backdrop (~11:1 contrast with dark label)
const LABEL_FILL = "#1a1a1a";
const PLATE_W = 38; // fixed label-plate width — uniform across every row
const MARGIN = { top: 8, left: 52, right: 16, bottom: 8 };

// Offseason "year banner" palette — a clean Material "paper" surface lifted off
// the game rows by a soft elevation shadow (no border). The year is set in a
// sterile, modern sans; each card's separation comes from the shadow, not a rule.
const OFF_PAPER = "#fbfbfa";        // paper surface — near-white, neutral
const OFF_HAIR = "#ececec";         // soft divider hairline on paper
const OFF_YEAR = "#2e3338";         // year — cool near-black, minimalist
const SEASON_HEADER_BG = "#f4f4f3"; // faint strip behind the record header
const CURVE = "#3f5d9e";            // win-rate line + pill (navy, mockup palette)

// Zoom 2 "Seasons" card list: a far-left timeline stripe with per-year
// indicator dots, and one rounded card per season.
const STRIPE_X = 18; // timeline stripe center
const CARD_L = 32; // card left edge (content insets from here)
const CARD_PAD = 12; // horizontal padding inside a card
const CARD_STROKE = "#e3e1db";
const CARD_SELECTED = "#2d6cdf"; // expanded card border + dot accent
const DOT_GREY = "#b7bdc7";
// Year row geometry, shared by the card header (which draws the year) and the
// stripe pass (which draws the dot + leader line) so the two can't drift apart.
// Both are offsets from the offseason block's headerY.
const CARD_YEAR_Y = 30; // year text BASELINE
const CARD_DOT_Y = CARD_YEAR_Y - 6; // dot centre, optically level with the digits
const CARD_PCT_Y = CARD_YEAR_Y + 19; // all-time win% line under the year

// Playoff finish -> outline color at Zoom 1/2 (line modes). Tune freely.
// NOTE: user spec'd gold/silver(conf)/bronze(div)/black(WC); "Lost SB" was
// unassigned, so it took silver and Lost Conf shifted to steel.
const MEDALS = [
  [/won (sb|super|champ)/i, "#d4af37"], // gold — won it all
  [/lost (sb|super)/i, "#b9bec7"],      // silver — lost the big one
  [/lost conf|lost champ/i, "#8d99ae"], // steel — lost conference
  [/lost div/i, "#cd7f32"],             // bronze — lost divisional
  [/lost wc/i, "#2b2b2b"],              // black — lost wild card
];

function playoffMedal(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS) {
    if (re.test(playoffs)) return color;
  }
  return null;
}

// The season header: at zoom 4 a faint strip at the top of the season block,
// under the offseason paper and directly above the games; in the zoom-2
// Seasons card (`card`) the same facts as a plain "Record …" line on the card
// surface (no strip, no hairline — mockup style).
function SeasonHeader({ block, contentLeft, contentRight, meta, showPlayoffs = true, card = false }) {
  const h = block.seasonHeaderHeight || 0;
  if (h <= 0 || !meta) return null;
  const y0 = block.y0;
  const cy = y0 + h / 2; // shared centerline — every element aligns to it
  const cw = Math.max(0, contentRight - contentLeft);

  const pd = meta.pointDiff;
  const pdStr = pd == null ? null : pd > 0 ? `+${pd}` : `${pd}`;
  const pdColor = pd > 0 ? "#3f8f2e" : pd < 0 ? "#c0492b" : "#8a857c";

  const df = divisionLabel(meta.divisionFinish);
  const dfColor = df
    ? df.tone === "good"
      ? "#3f8f2e"
      : df.tone === "bad"
        ? "#c0492b"
        : "#8a857c"
    : null;

  if (card) {
    return (
      <text
        x={contentLeft}
        y={cy}
        dominantBaseline="central"
        fontSize={11.5}
        fill="#1d2534"
        style={{ pointerEvents: "none", letterSpacing: 0.1 }}
      >
        <tspan fontWeight={700}>Record</tspan>
        <tspan fontWeight={700}>{`  ${recordStr(meta, showPlayoffs)}`}</tspan>
        {df && <tspan fill={dfColor} fontWeight={600}>{`  ·  ${df.text}`}</tspan>}
        {pdStr && <tspan fill={pdColor} fontWeight={700}>{`  ·  ${pdStr}`}</tspan>}
      </text>
    );
  }

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={contentLeft} y={y0} width={cw} height={h} fill={SEASON_HEADER_BG} />
      <text
        x={contentLeft + 7}
        y={cy}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill="#4a4640"
        style={{ letterSpacing: 0.2 }}
      >
        Record: {recordStr(meta, showPlayoffs)}
        {df && (
          <tspan fill={dfColor} fontWeight={600}>{`    ·    ${df.text}`}</tspan>
        )}
        {pdStr && (
          <tspan fill={pdColor} fontWeight={700}>{`    ${pdStr}`}</tspan>
        )}
      </text>
      <line
        x1={contentLeft} x2={contentRight}
        y1={y0 + h - 0.5} y2={y0 + h - 0.5}
        stroke="#e3ddd2" strokeWidth={1}
      />
    </g>
  );
}

// One win/loss arrow row: franchise green (left, by its own score) vs opponent
// red (right), split by score, with an arrow-tip bump marking the win/loss and
// a grey hairline along the boundary. Shared by regular-season and postseason.
const GameRow = memo(function GameRow({ g, y, rh, contentLeft, contentRight, cw }) {
  const rowH = Math.max(3, rh - 2);
  const labels = rh >= 12;
  const pf = g.points_for ?? 0;
  const pa = g.points_against ?? 0;
  const total = pf + pa || 1;
  const splitX = contentLeft + cw * (pf / total);
  const isWin = g.result === "W";
  const isTie = g.result === "T";
  const tip = isWin
    ? Math.min(rowH, Math.max(0, contentRight - splitX))
    : Math.min(rowH, Math.max(0, splitX - contentLeft));
  const tipX = isWin ? splitX + tip : splitX - tip;
  const arrow = `${contentLeft},0 ${splitX},0 ${tipX},${rowH / 2} ${splitX},${rowH} ${contentLeft},${rowH}`;
  const bw = BORDER_W;
  const greyArrow = `${contentLeft + bw},0 ${splitX + bw},0 ${tipX + bw},${rowH / 2} ${splitX + bw},${rowH} ${contentLeft + bw},${rowH}`;
  const leftLabel = `${g.franchise_id} ${pf}`;
  const rightLabel = `${pa} ${g.opponent_id}`;
  const bgH = Math.min(rowH - 3, 14);
  const bgY = (rowH - bgH) / 2;
  const plateMidY = bgY + bgH / 2;
  return (
    <g transform={`translate(0, ${y - rowH / 2})`}>
      <rect x={contentLeft} y={0} width={Math.max(0, cw)} height={rowH} fill={isTie ? TIE : LOSS} />
      {!isTie && (
        <>
          <polygon points={greyArrow} fill={BORDER} />
          <rect x={contentLeft} y={0} width={bw} height={rowH} fill={BORDER} />
          <polygon points={arrow} fill={WIN} />
        </>
      )}
      {labels && (
        <g>
          <rect x={contentLeft + 2} y={bgY} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
          <text x={contentLeft + 5} y={plateMidY} fontSize={9} dominantBaseline="central" fill={LABEL_FILL}>
            {leftLabel}
          </text>
          <rect x={contentRight - 2 - PLATE_W} y={bgY} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
          <text x={contentRight - 5} y={plateMidY} fontSize={9} textAnchor="end" dominantBaseline="central" fill={LABEL_FILL}>
            {rightLabel}
          </text>
        </g>
      )}
    </g>
  );
});

// The postseason segment under a season's games. Zoom 4: a "POSTSEASON" label
// (medal-accented by finish) over win/loss arrow rows for the playoff games.
// Zoom 3: a compact strip that just states the result, gold-bordered for a
// title, silver for runner-up (other finishes take their medal color).
const PostseasonSection = memo(function PostseasonSection({ post, contentLeft, contentRight, cw }) {
  if (!post) return null;
  const medal = playoffMedal(post.result);
  if (post.kind === "result") {
    const { y0, height: h, result } = post;
    return (
      <g style={{ pointerEvents: "none" }}>
        <rect
          x={contentLeft} y={y0} width={Math.max(0, cw)} height={h} rx={3}
          fill="#fafafa" stroke={medal || "#dcdcdc"} strokeWidth={medal ? 1.75 : 1}
        />
        <text
          x={contentLeft + 8} y={y0 + h / 2 + 0.5} dominantBaseline="central"
          fontSize={9} fontWeight={700} fill="#9a9a9a" style={{ letterSpacing: 1.5 }}
        >
          POSTSEASON
        </text>
        <text
          x={contentRight - 8} y={y0 + h / 2 + 0.5} dominantBaseline="central"
          textAnchor="end" fontSize={11} fontWeight={700} fill={medal ? "#2b2b2b" : "#777"}
        >
          {result || "—"}
        </text>
      </g>
    );
  }
  const { y0, headerH, rowH, result, games } = post;
  return (
    <g>
      <text
        x={contentLeft} y={y0 + headerH - 4} fontSize={9} fontWeight={700}
        fill="#9a9a9a" style={{ letterSpacing: 1.5 }}
      >
        POSTSEASON{result ? ` · ${result}` : ""}
      </text>
      <line
        x1={contentLeft} x2={contentRight} y1={y0 + headerH - 1} y2={y0 + headerH - 1}
        stroke={medal || "#e0e0e0"} strokeWidth={medal ? 2 : 1}
      />
      {games.map(({ g, i, y }) => (
        <GameRow
          key={g.game_id || `p-${i}`}
          g={g} y={y} rh={rowH}
          contentLeft={contentLeft} contentRight={contentRight} cw={cw}
        />
      ))}
    </g>
  );
});

const SeasonBlock = memo(function SeasonBlock({ block, contentLeft, contentRight, centerX, cw, labelInline, meta, showPlayoffs = true, card = false }) {
  const sm = block.season || {};
  const raw = sm.season || {};
  const header = (
    <SeasonHeader
      block={block}
      contentLeft={contentLeft}
      contentRight={contentRight}
      meta={meta}
      showPlayoffs={showPlayoffs}
      card={card}
    />
  );

  if (block.mode === "rows") {
    const rh = block.gameRowHeight;
    return (
      <g>
        {header}
        {block.games.map(({ g, i, y }) => (
          <GameRow
            key={g.game_id || `${block.year}-${i}`}
            g={g} y={y} rh={rh}
            contentLeft={contentLeft} contentRight={contentRight} cw={cw}
          />
        ))}
        <PostseasonSection
          post={block.postseason}
          contentLeft={contentLeft}
          contentRight={contentRight}
          cw={cw}
        />
      </g>
    );
  }

  // line mode: a season summary strip (W-L differential bar from center).
  const wins = raw.wins ?? 0;
  const losses = raw.losses ?? 0;
  const diff = wins - losses;
  const unit = cw / 2 / 16; // a 16-game swing fills half the width
  const hh = block.seasonHeaderHeight || 0;
  const y = block.y0 + hh + (block.height - hh) / 2; // center in the content, below the header
  const barW = Math.min(cw / 2, Math.abs(diff) * unit);
  const x0 = diff >= 0 ? centerX : centerX - barW;
  const color = diff >= 0 ? WIN : LOSS;
  const medal = showPlayoffs ? playoffMedal(raw.playoffs) : null;
  const frameH = Math.max(8, Math.min(block.height - 1, 12));
  return (
    <g>
      {header}
      {/* The W-L differential bar + medal frame belong to the zoom-1 era
          lines; the zoom-2 Seasons card carries the record as text instead. */}
      {!card && medal && (
        <rect
          x={contentLeft}
          y={y - frameH / 2}
          width={cw}
          height={frameH}
          fill="none"
          stroke={medal}
          strokeWidth={1.5}
          rx={2}
        />
      )}
      {!card && <rect x={x0} y={y - 3} width={barW} height={6} fill={color} rx={1} />}
      {/* The record lives in the year banner above the season; only show it
          inline at the most-zoomed-out bands where no banner is drawn. */}
      {labelInline && (
        <text x={contentLeft + 4} y={y} fontSize={10} dominantBaseline="middle" fill="#333">
          {block.year} · {wins}-{losses}
          {showPlayoffs && raw.playoffs ? ` · ${raw.playoffs}` : ""}
        </text>
      )}
    </g>
  );
});

function recordStr(m, showPlayoffs = true) {
  if (!m) return "";
  const wlt = m.ties ? `${m.wins}-${m.losses}-${m.ties}` : `${m.wins}-${m.losses}`;
  return showPlayoffs && m.playoffs ? `${wlt} · ${m.playoffs}` : wlt;
}

// Humanize a "Nth of M" division finish: first = won the division, last = last.
// Middle finishes keep their ordinal. tone drives the header color.
function divisionLabel(s) {
  if (!s) return null;
  const m = /^\s*(\d+)\w*\s+of\s+(\d+)\s*$/.exec(s);
  if (!m) return { text: s, tone: "neutral" };
  const place = +m[1];
  const total = +m[2];
  if (place === 1) return { text: "Won Division", tone: "good" };
  if (place === total) return { text: "Last in Division", tone: "bad" };
  return { text: s, tone: "neutral" };
}

// The offseason is the centerpiece: a full-bleed Material "paper" card spanning
// the whole interface width (zooms 2/3/4), borderless and softly elevated,
// fronted by a header carrying the minimalist sans year (far left) and the
// all-time overall-winrate pill in line with it (right) — both above the draft.
// Winrate is hidden at zoom 4. Content modules (draft, …) stack below.
const OffseasonBlock = memo(function OffseasonBlock({
  block,
  contentLeft,
  contentRight,
  cw,
  fullWidth,
  offMode,
  detailBand,
  moduleData,
  meta,
  showWinRate = true,
}) {
  // ---- Zoom 2 "Seasons" card header ----
  // The card (drawn by the layer's card pass) is the surface; this header is
  // year + grade chip on the first row, all-time win% left / picks summary
  // right on the second. No paper, no curve pill — mockup style.
  if (offMode === "compact") {
    const grade = classGradeFor(moduleData, block.year);
    const picks = picksForYear(moduleData, block.year);
    const s = picks.length ? classSummary(picks, !!moduleData.adjusted) : null;
    const summary = s
      ? s.scored > 0
        ? `${s.count} picks · ${s.hits} hit${s.hits === 1 ? "" : "s"} · avg ${
            s.avgScore == null ? "—" : Math.round(s.avgScore)
          }`
        : `${s.count} pick${s.count === 1 ? "" : "s"}`
      : null;
    const y0 = block.headerY ?? block.y0;
    const yearY = y0 + CARD_YEAR_Y; // breathing room under the card's top edge
    const pctY = y0 + CARD_PCT_Y;
    return (
      <g>
        <g style={{ pointerEvents: "none" }}>
          <text
            x={contentLeft}
            y={yearY}
            fontSize={17}
            fontWeight={600}
            fill={OFF_YEAR}
            style={{ letterSpacing: -0.2 }}
          >
            {block.year}
          </text>
          {grade && (
            <g>
              <rect x={contentLeft + 46} y={yearY - 14} width={22} height={16} rx={4} fill={tierColor(grade.tier)} />
              <text
                x={contentLeft + 57}
                y={yearY - 6}
                fontSize={9.5}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                fill={tierTextColor(grade.tier)}
              >
                {grade.tier}
                {grade.provisional ? "*" : ""}
              </text>
            </g>
          )}
          {showWinRate && meta && meta.enterPct != null && (
            <text x={contentLeft} y={pctY} fontSize={12.5} fontWeight={400} fill="#22304a">
              {`${Math.round(meta.enterPct * 100)}% (${meta.enterWins}–${meta.enterLosses})`}
            </text>
          )}
          {summary && (
            <text x={contentRight} y={pctY} fontSize={10} textAnchor="end" fill="#8a8f98">
              {summary}
            </text>
          )}
        </g>
        {block.modules.map((box) => (
          <g key={`${block.year}-${box.id}`}>
            {box.module.render({
              year: block.year,
              x: contentLeft,
              width: cw,
              y: box.y,
              height: box.height,
              mode: offMode,
              detailBand,
              data: moduleData,
            })}
          </g>
        ))}
      </g>
    );
  }

  const showBanner = offMode !== "hidden"; // zoom 4 (full) banner
  if ((!block.modules || !block.modules.length) && !showBanner) return null;

  const headerH = block.headerHeight || 0;
  // Header (year marker) sits at the very top of the block, ABOVE the ribbon
  // reserve (which now begins at block.ribbonTop).
  const headTop = block.y0;
  const headBot = headTop + headerH;
  const headMid = headTop + headerH / 2; // shared centerline for year + winrate
  const big = offMode === "full";
  const yearSize = big ? 24 : 19;

  // Overall winrate pill, centered on the point where the all-time win-rate
  // curve passes through this year's header line, and vertically in line with
  // the year. Reads "<##>% (<wins>/<losses>)" with a stock-ticker trend caret:
  // green up if the franchise pct improved since last year, red down if it
  // receded. Hidden at zoom 4 (GAME_DETAIL), where games are the focus.
  let win = null;
  if (showWinRate && headerH > 0 && detailBand !== "GAME_DETAIL" && meta && meta.enterPct != null) {
    const fs = big ? 11 : 10;
    const pct = Math.round(meta.enterPct * 100);
    const label = `${pct}% (${meta.enterWins}–${meta.enterLosses})`;
    const ph = Math.min(headerH - 8, 18);
    const caretW = fs * 0.62;
    const gap = 4;
    const textW = Math.round(label.length * fs * 0.52);
    const w = caretW + gap + textW + 16; // caret + gap + text + side padding
    // x where the curve crosses this header line, clamped inside the content
    const curveX = contentLeft + meta.enterPct * cw;
    const cx = Math.max(contentLeft + w / 2, Math.min(contentRight - w / 2, curveX));
    // trend vs the prior season's entering pct: 1 up / -1 down / 0 flat|first
    const dir =
      meta.prevPct == null
        ? 0
        : meta.enterPct > meta.prevPct
          ? 1
          : meta.enterPct < meta.prevPct
            ? -1
            : 0;
    win = { fs, label, w, ph, cx, caretW, gap, dir };
  }

  return (
    <g>
      {showBanner && (
        <g style={{ pointerEvents: "none" }}>
          {/* Material "paper" surface — full interface width, softly elevated,
              no border (separation comes from the shadow alone) */}
          <rect
            x={0}
            y={block.y0}
            width={fullWidth}
            height={block.height}
            fill={OFF_PAPER}
          />

          {headerH > 0 && (
            <g>
              {/* the year — sterile, modern, minimalist sans, at the far left
                  of the viewport, centered on the header line */}
              <text
                x={6}
                y={headMid}
                dominantBaseline="central"
                fontSize={yearSize}
                fontWeight={600}
                fill={OFF_YEAR}
                style={{ letterSpacing: -0.4 }}
              >
                {block.year}
              </text>

              {/* overall winrate, centered on the curve crossing, with a
                  green-up / red-down trend caret, above the draft */}
              {win && (() => {
                const innerLeft = win.cx - win.w / 2 + 8;
                const caretLeft = innerLeft;
                const textX = innerLeft + win.caretW + win.gap;
                const ch = win.caretW * 0.92; // caret triangle height
                const up = `${caretLeft},${headMid + ch / 2} ${caretLeft + win.caretW},${headMid + ch / 2} ${caretLeft + win.caretW / 2},${headMid - ch / 2}`;
                const down = `${caretLeft},${headMid - ch / 2} ${caretLeft + win.caretW},${headMid - ch / 2} ${caretLeft + win.caretW / 2},${headMid + ch / 2}`;
                return (
                  <g>
                    <rect
                      x={win.cx - win.w / 2}
                      y={headMid - win.ph / 2}
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
                      y={headMid}
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

              {/* hairline closing the header off from the content below */}
              <line
                x1={contentLeft} x2={contentRight}
                y1={headBot - 0.5} y2={headBot - 0.5}
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
            x: contentLeft,
            width: cw,
            y: box.y,
            height: box.height,
            mode: offMode,
            detailBand,
            data: moduleData,
          })}
        </g>
      ))}
    </g>
  );
});

const RAIL_PAD = 10; // gap between timeline content and the tail gutter

const TeamTimelineLayer = memo(function TeamTimelineLayer({
  layout,
  scrollY = 0,
  width,
  height,
  band,
  moduleData = {},
  staff = [],
  pre1967 = null,
  adminById,
  onSelectStaff,
  tapGuard,
  railPan = 0,
  onFollow,
  showWinRate = true,
  showPlayoffs = true,
}) {
  const ribbonLayout = useMemo(
    () => buildStaffRibbons({ staff, layout }),
    [staff, layout],
  );

  // Cumulative franchise winrate AFTER EACH GAME, spanning the entire
  // timeline height. y comes from the layout (true game rows at Zoom 3/4;
  // games spread evenly through the season block at Zoom 1/2), x is the
  // running win% — so the curve survives every band change.
  const winCurve = useMemo(() => {
    if (!layout?.blocks?.length) return null;
    // Seed with pre-1967 aggregate W-L-T when available, so the curve
    // starts at the franchise's TRUE all-time ratio instead of swinging
    // 0-or-1 on the 1967 opener (the data floor isn't the founding date —
    // the Colts had 14 Baltimore seasons before our first row).
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    const pts = [];
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const reg = b.games || [];
      const post = b.postseason?.games || [];
      // chronological: regular season, then that year's playoff games
      const seq = post.length ? [...reg, ...post] : reg;
      const m = seq.length || 1;
      seq.forEach(({ g }, idx) => {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
        const y =
          b.mode === "rows"
            ? seq[idx].y
            : b.y0 + ((idx + 0.5) / m) * b.height;
        pts.push([y, (w + t / 2) / n]);
      });
    }
    return pts.length ? pts : null;
  }, [layout, pre1967]);

  // Per-year banner facts: the season's record, and the all-time win-rate
  // ENTERING that year (the curve's value at the year boundary, where the
  // banner sits). Same accumulation as winCurve, sampled before each season.
  const seasonMeta = useMemo(() => {
    const map = new Map();
    if (!layout?.blocks?.length) return map;
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    let prevPct = null; // entering-pct of the PRIOR season, for the trend caret
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const raw = b.season?.season || {};
      const enterPct = n > 0 ? (w + t / 2) / n : null;
      map.set(b.year, {
        enterPct,
        enterWins: w, // cumulative all-time record ENTERING this year
        enterLosses: n - w - t,
        prevPct, // prior year's entering-pct (null for the first season)
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

  const railWidth = ribbonLayout.railWidth;
  // Tails sit just inside the right screen edge (inset by PEEK so exit bands
  // leave a 3px leaving-stub); exit bands still run off-screen from there.
  const railLeft = width - railWidth - PEEK;
  // Band-specific content edges: the Seasons card list (zoom 2) insets from
  // the timeline stripe + card padding, the season pages (zoom 3) use slim
  // page margins, everything else keeps the classic margins.
  const isCards = band === "SEASON_LINES";
  const isPages = band === "GAME_BANDS";
  const baseRight = railWidth
    ? railLeft - RAIL_PAD
    : width - (isPages ? 14 : isCards ? 20 : MARGIN.right);
  const cardRight = baseRight; // card rect right edge (zoom 2)
  const contentLeft = isCards ? CARD_L + CARD_PAD : isPages ? 14 : MARGIN.left;
  const contentRight = isCards ? cardRight - CARD_PAD : baseRight;
  const cw = Math.max(0, contentRight - contentLeft);
  const centerX = (contentLeft + contentRight) / 2;

  // Pinned personnel stack. The strips resolve to CONTENT coordinates with the
  // stack hanging just above `scrollY`; the content group below is drawn at
  // `+stackHeight - scrollY`, which parks the stack across the top of the
  // canvas and starts the timeline underneath it. Nothing is ever covered.
  const { strips: ribbonStrips, stackHeight } = useMemo(
    () => resolveRibbonStrips({ ribbons: ribbonLayout.ribbons, scrollY }),
    [ribbonLayout, scrollY],
  );

  // virtualize: only blocks intersecting the visible content window, which the
  // stack shifts down by stackHeight (so the pad has to clear the tallest
  // stack, not a fixed 60px).
  const vPad = 60 + stackHeight;
  const vBot = scrollY + height + vPad;
  const visible = useMemo(() => {
    if (!layout?.blocks) return [];
    const top = scrollY - vPad;
    const bot = scrollY + height + vPad;
    return layout.blocks.filter((b) => b.y1 > top && b.y0 < bot);
  }, [layout, scrollY, height, vPad]);

  // Years with any visible block — the per-year passes (zoom-2 cards, zoom-3
  // pages) render once per year, not once per half-block.
  const visibleYears = useMemo(() => {
    const seen = new Set();
    const years = [];
    for (const b of visible) {
      if (seen.has(b.year)) continue;
      seen.add(b.year);
      years.push(b.year);
    }
    return years;
  }, [visible]);

  // The win-rate polyline spans the full timeline height (it's drawn behind the
  // virtualized blocks), so build its point string once per layout/geometry
  // change instead of re-joining ~all games on every scroll frame.
  const winCurvePoints = useMemo(() => {
    if (!winCurve) return null;
    return winCurve
      .map(([y, r]) => `${(contentLeft + r * cw).toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
  }, [winCurve, contentLeft, cw]);

  if (!layout || !width || !height) return null;

  const offMode = geometryFor(band).offseason;

  return (
    <>
    <defs>
      {/* Soft elevation for the offseason "paper" cards. This used to be an
          feDropShadow filter, but SVG filters rasterize on the CPU and
          re-rasterize on every scroll/zoom transform — with many cards visible
          at Zoom 2 that was the iOS stutter. A linear-gradient fill is
          GPU-composited and free under transforms; it's painted as a short
          fading strip beneath each card (see the offseason shadow pass below). */}
      <linearGradient id="offPaperShadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a2f1a" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#3a2f1a" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g transform={`translate(0, ${stackHeight - scrollY})`}>
      {/* all-time win-rate curve (0..1 across the content width), drawn BEHIND
          the blocks so each opaque offseason banner — and the franchise-record
          pill that rides on it — cleanly occludes the line where it passes
          through. The line stays visible across the season/game rows.
          Hidden at zoom 4 (GAME_DETAIL), where individual games are the focus. */}
      {showWinRate && winCurve && band !== "GAME_DETAIL" && (
        <g style={{ pointerEvents: "none" }}>
          <line
            x1={contentLeft + cw / 2}
            x2={contentLeft + cw / 2}
            y1={0}
            y2={layout.totalHeight}
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

      {/* Zoom-2 "Seasons": far-left timeline stripe + per-year indicator dot
          + one rounded card per season. The card is the tap target — a tap
          expands its draft class (when the module is enabled) and lights the
          card + dot. Drawn before the blocks so content paints on top. */}
      {isCards && layout.blocks.length > 0 && (
        <g>
          <line
            x1={STRIPE_X}
            x2={STRIPE_X}
            y1={layout.blocks[0].y0 + 10}
            y2={layout.blocks[layout.blocks.length - 1].y1 - 10}
            stroke="#d9dde3"
            strokeWidth={3}
            strokeLinecap="round"
            style={{ pointerEvents: "none" }}
          />
          {visibleYears.map((year) => {
            const pair = layout.byYear.get(year);
            if (!pair) return null;
            const { offseason: off, season: sea } = pair;
            const expanded = !!moduleData.expandedYears?.has(year);
            const canToggle =
              off.modules.length > 0 && typeof moduleData.onToggleYear === "function";
            // Level with the year's digits (same base offset the card header
            // uses), with a leader line running from the dot across the card
            // edge to just left of the year.
            const dotY = (off.headerY ?? off.y0) + CARD_DOT_Y;
            const dotR = expanded ? 7 : 4;
            return (
              <g key={`card-${year}`}>
                <rect
                  x={CARD_L}
                  y={off.y0 + 3}
                  width={Math.max(0, cardRight - CARD_L)}
                  height={sea.y1 - off.y0 - 6}
                  rx={10}
                  fill="#fff"
                  stroke={expanded ? CARD_SELECTED : CARD_STROKE}
                  strokeWidth={expanded ? 1.5 : 1}
                  onClick={
                    canToggle
                      ? (e) => {
                          e.stopPropagation();
                          if (tapGuard && tapGuard()) return;
                          moduleData.onToggleYear(year);
                        }
                      : undefined
                  }
                  style={canToggle ? { cursor: "pointer" } : undefined}
                />
                <line
                  x1={STRIPE_X + dotR}
                  x2={contentLeft - 5}
                  y1={dotY}
                  y2={dotY}
                  stroke={expanded ? CARD_SELECTED : DOT_GREY}
                  strokeWidth={expanded ? 1.5 : 1}
                  style={{ pointerEvents: "none" }}
                />
                {expanded ? (
                  <g style={{ pointerEvents: "none" }}>
                    <circle cx={STRIPE_X} cy={dotY} r={dotR} fill="#fff" stroke={CARD_SELECTED} strokeWidth={2} />
                    <circle cx={STRIPE_X} cy={dotY} r={3.5} fill={CARD_SELECTED} />
                  </g>
                ) : (
                  <circle cx={STRIPE_X} cy={dotY} r={dotR} fill={DOT_GREY} style={{ pointerEvents: "none" }} />
                )}
              </g>
            );
          })}
        </g>
      )}

      {isPages
        ? visibleYears.map((year) => {
            const pair = layout.byYear.get(year);
            if (!pair) return null;
            return (
              <SeasonPage
                key={`p-${year}`}
                offBlock={pair.offseason}
                seaBlock={pair.season}
                contentLeft={contentLeft}
                contentRight={contentRight}
                fullWidth={width}
                meta={seasonMeta.get(year)}
                moduleData={moduleData}
                detailBand={band}
                showWinRate={showWinRate}
              />
            );
          })
        : visible.map((b) =>
            b.type === "season" ? (
              <SeasonBlock
                key={`s-${b.year}`}
                block={b}
                contentLeft={contentLeft}
                contentRight={contentRight}
                centerX={centerX}
                cw={cw}
                labelInline={offMode === "hidden"}
                meta={seasonMeta.get(b.year)}
                showPlayoffs={showPlayoffs}
                card={offMode === "compact"}
              />
            ) : (
              <OffseasonBlock
                key={`o-${b.year}`}
                block={b}
                contentLeft={contentLeft}
                contentRight={contentRight}
                cw={cw}
                fullWidth={width}
                offMode={offMode}
                detailBand={band}
                moduleData={moduleData}
                meta={seasonMeta.get(b.year)}
                showWinRate={showWinRate}
              />
            ),
          )}

      {/* Offseason card drop-shadows (zoom-4 banners only: the zoom-3 pages
          draw their own boundary seam and the zoom-2 cards have borders),
          drawn in their own pass AFTER the blocks so each strip lands on top
          of the season content below it. Cheap gradient strips — no SVG
          filter, no per-frame rasterization. */}
      {offMode === "full" &&
        !isPages &&
        visible
          .filter((b) => b.type === "offseason")
          .map((b) => (
            <rect
              key={`osh-${b.year}`}
              x={0}
              y={b.y1}
              width={width}
              height={6}
              fill="url(#offPaperShadow)"
              style={{ pointerEvents: "none" }}
            />
          ))}

      {/* year labels only at the most-zoomed-out bands; otherwise the banner
          above each season carries the (much bigger) year */}
      {offMode === "hidden" &&
        visible
          .filter((b) => b.type === "season")
          .map((b) => (
            <text
              key={`y-${b.year}`}
              x={MARGIN.left - 6}
              y={b.y0 + 10}
              fontSize={10}
              textAnchor="end"
              fill="#555"
            >
              {b.year}
            </text>
          ))}

      {/* personnel tenure ribbons (entry band + gutter tail + exit band) */}
      <StaffRibbonLayer
        ribbons={ribbonLayout.ribbons}
        strips={ribbonStrips}
        width={width}
        slotCount={ribbonLayout.slotCount}
        tailWidth={ribbonLayout.tailW}
        railPan={railPan}
        viewBottom={vBot}
        adminById={adminById}
        onSelect={onSelectStaff}
        onFollow={onFollow}
        tapGuard={tapGuard}
      />
    </g>

    </>
  );
});

export default TeamTimelineLayer;
