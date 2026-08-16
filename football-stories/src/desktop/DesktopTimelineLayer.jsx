// Renders the desktop (landscape) content-stacked timeline from a prebuilt
// buildDesktopLayout, scrolled by `scrollX` and virtualized (only blocks
// intersecting the viewport are drawn). The 90°-rotated sibling of
// components/visualization/TeamTimelineLayer.jsx.
//
// Two season representations by detail band:
//   rows -> a GAME LOG: a fixed-width column headed "SEASON <record>", holding
//           one horizontal row per game stacking downward, then a POSTSEASON
//           section beneath. Each row is franchise green from the LEFT (its own
//           score share) against opponent red from the right, split at the score
//           ratio, with an arrow tip bumping RIGHT through the split on a win
//           and left on a loss. Zoom 3 shows bare bars; zoom 4 adds the
//           "ARI 24" / "17 SEA" score plates.
//   line -> a single season column with a vertical W-L differential bar
//           (up = winning season, down = losing).
//
// The log is deliberately NOT transposed. Desktop rotates the TIMELINE AXIS —
// years march left→right — but a game log is a list, and a list reads top to
// bottom with horizontal text in every other context a reader has ever met one.
// Rotating it into one column per game with sideways score plates made a
// familiar object unfamiliar. So rows here are the mobile GameRow mark
// (components/visualization/TeamTimelineLayer.jsx) placed in a column, which
// also means the two trees now agree on what a game looks like.
// Offseason blocks are "paper" banner columns (year, record, playoff finish,
// division finish, point diff, all-time win-rate — mobile's season-header strip
// migrated here, where landscape has room) and delegate to their content module
// columns. The all-time win-rate curve runs left→right with win% on the
// VERTICAL axis (0 at the lane bottom, 1 at the top) — like a stock chart.
//
// The lane's height is CONTENT-CAPPED (LANE_MAX), never stretched to fill a
// tall window; the whole assembly — entry-pill margin, lane, axis, bottom
// personnel rail, exit-pill margin — centers vertically in the viewport.
//
// THREE THINGS DELIBERATELY DON'T OVERLAP, and each is worth preserving:
//   - the win-rate PILL lives in the banner's fact stack, not out on the curve
//     it reports (where it collided with ribbons and draft columns);
//   - the RAIL is a full-width zone of its own that the paper columns stop
//     short of, so personnel ribbons read as their own track;
//   - the YEAR AXIS paints AFTER the ribbon layer, with a halo, because opaque
//     ribbon connectors cross it on the way from the lane down into the rail.
//
// Desktop-only affordances: hover <title> tooltips on seasons/games (mobile
// has no hover), and a year axis at the banner-less band, its label step
// derived from the layout's px-per-year (a horizontal axis can't fit a label
// per year, and how many it CAN fit now depends on the window — see axisStep).

import { memo, useMemo } from "react";
import { desktopGeometryFor } from "./desktopDetail.js";
import { BANNER_PAD_L, BANNER_PAD_R } from "./buildDesktopLayout.js";
import {
  buildDesktopRibbons,
  buildPillPlan,
  PEEK,
  PILL_H,
  PILL_ROW_H,
} from "./desktopRibbonModel.js";
import DesktopRibbonLayer from "./DesktopRibbonLayer.jsx";
import DesktopEraLayer from "./DesktopEraLayer.jsx";
import {
  buildEraBoxes,
  ERA_HEADER_H,
  ERA_BORDER_W,
  ERA_RAIL_GAP,
} from "./desktopEraModel.js";
import {
  buildSuperBowlCrowns, crownedYears, medalFrameWidth, CROWN_ZONE,
} from "./desktopCrownModel.js";
import DesktopCrownLayer from "./DesktopCrownLayer.jsx";

import { RESULT, TREND, CURVE as CURVE_TOKENS, playoffMedal } from "../palette.js";

// Red and green are RESERVED for results (see palette.js).
const WIN = RESULT.WIN;
const LOSS = RESULT.LOSS;
const TIE = RESULT.TIE;
const BORDER = RESULT.BORDER; // hairline separator between the win/loss colors
const BORDER_W = 2; // px the grey underlay is offset toward the loser
const TEXTBG = "#d0d0d0"; // silver label backdrop
const LABEL_FILL = "#1a1a1a";
const PLATE_W = 38; // fixed label-plate length — uniform across every column

// Offseason "year banner" palette — same Material paper surface as mobile.
const OFF_PAPER = "#fbfbfa";
const OFF_HAIR = "#ececec";
const OFF_YEAR = "#2e3338";
const OFF_CHAPTER = "#c7bfaf"; // the rule that opens each year's column
const CURVE = CURVE_TOKENS.desktop; // win-rate line
// Banner fact stack: sized to be plainly legible, not merely present. The
// banner column (OFF_HEADER_W_* in buildDesktopLayout) is measured to hold text
// at this size, so the two must move together.
const FACT_FS = 11;
const FACT_PITCH = 14;
// The year is a HEADLINE, and a headline needs room around it, not just a big
// font. Its gutters come from buildDesktopLayout, which measures the banner
// column to include them. HEADLINE_GAP separates the year from the facts below,
// so it opens the block instead of merely topping a list.
const HEADLINE_GAP = 6;

// The personnel rail is its OWN ZONE, not just a gutter: a full-width tinted
// strip with hairline edges, held clear of the lane by RAIL_PAD, and the one
// horizontal band the offseason "paper" columns deliberately stop short of (see
// paperBottom below). Without that separation the ribbons read as debris under
// the timeline rather than a track in their own right.
const RAIL_PAD = 16; // gap between the timeline lane and the ribbon rail
const RAIL_BG = "#eceef3"; // the rail zone's own surface
const RAIL_EDGE = "#d6dae3"; // hairlines closing the zone top and bottom
// The year axis at the banner-less band. This is the ONLY place years appear at
// that zoom — there is no banner column to carry them — so it has to read as a
// dated axis in its own right: a continuous baseline, a long tick and a large
// bold year at each labelled step, short light ticks on the years between.
// Sparse gray captions floating under the lane did not say "timeline".
const AXIS_H = 34; // year-axis strip under the lane (only at banner-less bands)
const AXIS_MIN_LABEL_GAP = 52; // px between year labels before the step coarsens
const AXIS_MIN_TICK_GAP = 9; // px between minor ticks before they're dropped
const AXIS_RULE = "#b6bdc8";
const AXIS_TICK_MAJOR = "#7c8492";
const AXIS_TICK_MINOR = "#c3c9d2";
// The lane takes only the height the content earns — never the full window
// (a stretched full-bleed lane reads awkward on tall viewports). The whole
// assembly (pill margin / lane / axis / rail / pill margin) centers
// vertically in whatever remains.
const LANE_MAX = 400;
// Floor raised to clear the banner's own stack (year headline + up to four fact
// lines + the ALL-TIME win-rate section). Below this the banner would render
// past the bottom of its own lane on a short window.
const LANE_MIN = 152;

// NAMED ERAS ride only the two coarsest rungs. Lower down, a single era is
// wider than the window and its frame would be two vertical lines with no
// visible relationship — the shape only means something once the whole span
// fits on screen. (Named Eras are the curated data layer; "Eras" the zoom
// level is ERA_SUMMARY. See desktopEraModel.js.)
const ERA_FRAME_BANDS = new Set(["ERA_SUMMARY", "SEASON_LINES"]);

// The bands where a Super Bowl becomes a CROWN. Deliberately its own set rather
// than a reference to ERA_FRAME_BANDS, which happens to hold the same two names
// today for an unrelated reason: these are the LINE-mode zooms, where a season
// is a single column and a playoff finish would otherwise be nothing but the
// shade of its outline. The row-mode zooms already spell the finish out in the
// game log, so they need no crown.
const CROWN_BANDS = new Set(["ERA_SUMMARY", "SEASON_LINES"]);

// Playoff finish -> outline color: gold / silver / steel / bronze / black.
// The table and its matcher live in palette.js, shared with the mobile tree.

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
  tone === "good" ? TREND.GOOD : tone === "bad" ? TREND.BAD : TREND.NEUTRAL;

// One win/loss arrow ROW: franchise green from the LEFT (its own score share)
// against opponent red from the right, split at the score ratio, with an arrow
// tip bumping right through the split on a win and left on a loss, and a grey
// hairline along the boundary. Shared by regular season and postseason.
//
// Geometrically the mobile GameRow with the same proportions; the two trees
// agree on what a game looks like, which is the point — see this file's header.
const GameRow = memo(function GameRow({ g, y, rh, left, right }) {
  const rowH = Math.max(2, rh - (rh >= 8 ? 2 : 1));
  const cw = Math.max(1, right - left);
  const labels = rh >= 13;
  const pf = g.points_for ?? 0;
  const pa = g.points_against ?? 0;
  const total = pf + pa || 1;
  const splitX = left + cw * (pf / total);
  const isWin = g.result === "W";
  const isTie = g.result === "T";
  const tip = isWin
    ? Math.min(rowH, Math.max(0, right - splitX))
    : Math.min(rowH, Math.max(0, splitX - left));
  const tipX = isWin ? splitX + tip : splitX - tip;
  const midY = y + rowH / 2;
  const botY = y + rowH;
  // Green polygon: along the top edge to the split, out to the tip at the row's
  // vertical center, back along the bottom edge.
  const arrow = `${left},${y} ${splitX},${y} ${tipX},${midY} ${splitX},${botY} ${left},${botY}`;
  // Grey underlay offset toward the loser side (right), plus a left-edge sliver.
  const bw = Math.min(BORDER_W, Math.max(1, rowH / 4));
  const greyArrow = `${left + bw},${y} ${splitX + bw},${y} ${tipX + bw},${midY} ${splitX + bw},${botY} ${left + bw},${botY}`;
  const bgH = Math.min(rowH - 3, 14); // plate thickness down the row
  const bgY = y + (rowH - bgH) / 2;
  return (
    <g>
      <rect x={left} y={y} width={cw} height={rowH} fill={isTie ? TIE : LOSS}>
        <title>{`${g.franchise_id} ${pf}–${pa} ${g.opponent_id}${isTie ? " (T)" : isWin ? " (W)" : " (L)"}`}</title>
      </rect>
      {!isTie && (
        <g style={{ pointerEvents: "none" }}>
          <polygon points={greyArrow} fill={BORDER} />
          <rect x={left} y={y} width={bw} height={rowH} fill={BORDER} />
          <polygon points={arrow} fill={WIN} />
        </g>
      )}
      {labels && (
        <g style={{ pointerEvents: "none" }}>
          {/* horizontal plates: franchise + score at the left, opponent's score
              + code at the right — read straight across, like any box score */}
          <rect x={left + 2} y={bgY} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
          <text x={left + 5} y={bgY + bgH / 2} fontSize={9} dominantBaseline="central" fill={LABEL_FILL}>
            {`${g.franchise_id} ${pf}`}
          </text>
          <rect x={right - 2 - PLATE_W} y={bgY} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
          <text
            x={right - 5} y={bgY + bgH / 2}
            fontSize={9} textAnchor="end" dominantBaseline="central" fill={LABEL_FILL}
          >
            {`${pa} ${g.opponent_id}`}
          </text>
        </g>
      )}
    </g>
  );
});

// A season as a GAME LOG column: "SEASON <record>" header, the regular-season
// rows, then a POSTSEASON section beneath them.
//
// Row pitch is solved here, not in the layout engine: the nominal pitch comes
// from the band, but a short lane shrinks it so the log stays COMPLETE. A game
// log that silently drops December is worse than one with thinner rows — unlike
// the draft column, where "+N more" is honest because the picks are ranked and
// you're seeing the top of the class.
const SeasonLog = memo(function SeasonLog({
  block, laneTop, laneBottom, meta, medal, showPlayoffs = true,
}) {
  const laneH = Math.max(1, laneBottom - laneTop);
  const left = block.x0 + 3;
  const right = block.x1 - 3;
  const cw = Math.max(1, right - left);
  const wide = cw >= 110; // room to spell out the section words

  const reg = block.games || [];
  const post = showPlayoffs ? block.postseason : null;
  const postRows = post?.kind === "rows" ? post.games : [];
  const headH = wide ? 16 : 12;
  const postHeadH = post ? (wide ? 14 : 10) : 0;
  const postStripH = post && post.kind === "result" ? 16 : 0;

  const nRows = Math.max(1, reg.length + postRows.length);
  const avail = laneH - headH - postHeadH - postStripH - 6;
  const rh = Math.max(2, Math.min(block.gameRowHeight || 16, avail / nRows));

  const rowsTop = laneTop + headH + 3;
  const postTop = rowsTop + reg.length * rh + postHeadH;

  return (
    <g>
      <g style={{ pointerEvents: "none" }}>
        {wide && (
          <text x={left} y={laneTop + 11} fontSize={9.5} fontWeight={700} fill="#6b7280" style={{ letterSpacing: 0.7 }}>
            SEASON
          </text>
        )}
        <text
          x={wide ? right : left}
          y={laneTop + (wide ? 11 : 9)}
          fontSize={wide ? 10.5 : 9}
          fontWeight={700}
          textAnchor={wide ? "end" : "start"}
          fill="#4a4640"
        >
          {recordStr(meta || block.season?.season)}
        </text>
        {/* medal accent: the finish colors the log's own rule, so a title year
            is legible from the column alone */}
        <rect
          x={left}
          y={laneTop + headH - 2}
          width={cw}
          height={medal ? 2.5 : 1}
          fill={medal || "#e6e3dd"}
        />
      </g>

      {reg.map(({ g, i }) => (
        <GameRow
          key={g.game_id || `${block.year}-${i}`}
          g={g} y={rowsTop + i * rh} rh={rh} left={left} right={right}
        />
      ))}

      {post && (
        <g>
          <g style={{ pointerEvents: "none" }}>
            <text
              x={left}
              y={postTop - 4}
              fontSize={8.5}
              fontWeight={700}
              fill={medal ? "#6b6357" : "#9ca3af"}
              style={{ letterSpacing: 0.7 }}
            >
              {wide ? `POSTSEASON${post.result ? ` · ${post.result}` : ""}` : "PLAYOFFS"}
            </text>
          </g>
          {postRows.map(({ g, i }) => (
            <GameRow
              key={g.game_id || `${block.year}-p${i}`}
              g={g} y={postTop + i * rh} rh={rh} left={left} right={right}
            />
          ))}
          {post.kind === "result" && (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={left} y={postTop} width={cw} height={14} rx={3}
                fill="#fafafa" stroke={medal || "#dcdcdc"} strokeWidth={medal ? 1.75 : 1}
              />
              <text
                x={left + 5} y={postTop + 7.5}
                fontSize={9.5} fontWeight={700} dominantBaseline="middle"
                fill={medal ? "#2b2b2b" : "#777"}
              >
                {post.result || "—"}
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  );
});

const SeasonBlock = memo(function SeasonBlock({
  block, laneTop, laneBottom, meta, showPlayoffs = true, crowned = false,
}) {
  const raw = block.season?.season || {};

  if (block.mode === "rows") {
    return (
      <SeasonLog
        block={block}
        laneTop={laneTop}
        laneBottom={laneBottom}
        meta={meta}
        medal={showPlayoffs ? playoffMedal(raw.playoffs) : null}
        showPlayoffs={showPlayoffs}
      />
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
  // A crowned season (a Super Bowl at a line-mode zoom) does NOT draw its frame
  // here: the crown draws the same frame taller, breaking up out of the lane,
  // and two frames on one column would double-stroke it.
  const medal = showPlayoffs && !crowned ? playoffMedal(raw.playoffs) : null;
  // Both scale WITH the column instead of sitting at a fixed few px: season
  // columns are no longer one width (Eras fits itself to the viewport, Seasons
  // is far wider than it was), and a hairline bar centered in a wide empty
  // column reads as a rendering bug rather than a deliberate mark.
  const frameW = medalFrameWidth(block);
  const barW = Math.max(2, Math.min(14, block.width * 0.42));
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

// The offseason banner COLUMN: a Material "paper" surface (zooms 2/3/4)
// spanning the pill margin, lane and axis — but NOT the personnel rail, which
// is the ribbons' own zone — fronted by the minimalist sans year at the top and
// the season's facts stacked beneath it: record, playoff finish, division
// finish, point diff (migrated from mobile's season-header strip), then the
// all-time win-rate pill and raw all-time record.
//
// The win-rate pill is the last row of that stack rather than a floating chip
// on the win-rate curve. Riding the curve put it at an unpredictable height
// somewhere out in the lane, where it fought the personnel ribbons crossing
// beneath it and the draft column beside it, and where consecutive years could
// stack their pills on top of each other. In the stack it has a fixed slot that
// by construction collides with nothing; the curve still runs through the lane,
// and the pill's caret still reports which way it moved.
//
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
  const yearSize = big ? 27 : 24;
  const yearY = laneTop + (big ? 28 : 26);
  // Left edge of every element in the banner stack, and the usable width once
  // both gutters are taken out. Everything is sized against innerW, so nothing
  // spills over the hairline into the draft column.
  const textX = block.x0 + BANNER_PAD_L;
  const innerW = Math.max(0, headerW - BANNER_PAD_L - BANNER_PAD_R);

  // Facts stack under the year — record, playoff finish, division, point diff.
  const lines = [];
  if (meta) {
    lines.push({ text: recordStr(meta), color: "#4a4640", weight: 700 });
    if (showPlayoffs && meta.playoffs) {
      const medal = playoffMedal(meta.playoffs);
      lines.push({ text: meta.playoffs, color: medal || TREND.NEUTRAL, weight: 700 });
    }
    const df = divisionLabel(meta.divisionFinish);
    if (df) lines.push({ text: df.text, color: toneColor(df.tone), weight: 600 });
    if (meta.pointDiff != null) {
      const pd = meta.pointDiff;
      lines.push({
        text: pd > 0 ? `+${pd}` : `${pd}`,
        color: pd > 0 ? TREND.GOOD : pd < 0 ? TREND.BAD : TREND.NEUTRAL,
        weight: 700,
      });
    }
  }
  const factsTop = yearY + HEADLINE_GAP + FACT_PITCH;
  const factsBottom = factsTop + lines.length * FACT_PITCH;

  // Overall win-rate: the last section of the fact stack (see this component's
  // header for why it no longer rides the curve). A small "ALL-TIME" label, the
  // percentage pill with its trend caret, then the raw cumulative record.
  //
  // The label is what disambiguates the section: two lines above sits the
  // SEASON's record ("9-7"), so an unlabelled "180-300" underneath reads as
  // another season stat. Labelling it also lets both numbers stay short enough
  // to fit the column, which an inline "180-300 all-time" suffix did not.
  // Hidden at zoom 4 (GAME_DETAIL), where individual games are the focus.
  let win = null;
  if (
    showWinRate &&
    showBanner &&
    headerW > 0 &&
    detailBand !== "GAME_DETAIL" &&
    meta &&
    meta.enterPct != null
  ) {
    const fs = 11.5;
    const label = `${Math.round(meta.enterPct * 100)}%`;
    const dir =
      meta.prevPct == null
        ? 0
        : meta.enterPct > meta.prevPct
          ? 1
          : meta.enterPct < meta.prevPct
            ? -1
            : 0;
    const caretW = dir ? 7 : 0;
    const gap = dir ? 4 : 0;
    const w = Math.min(
      innerW,
      9 + caretW + gap + Math.round(label.length * fs * 0.6) + 9,
    );
    win = {
      fs,
      label,
      dir,
      caretW,
      gap,
      w,
      h: 18,
      record: `${meta.enterWins}-${meta.enterLosses}`,
    };
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
              {/* CHAPTER RULE — the vertical bar that opens each year's column,
                  running the full height of its paper. Paired with the drop
                  shadow already falling off the column's right edge, it closes
                  the year into a block of its own: the eye reads "new year"
                  before it reads the digits. Without it the timeline was one
                  unbroken horizontal run and every year ran into the last. */}
              <rect x={block.x0} y={paperTop} width={2.5} height={paperBottom - paperTop} fill={OFF_CHAPTER} />

              {/* the year — the headline, horizontal (never rotated: it's the
                  primary landmark), set in from the chapter rule */}
              <text
                x={textX}
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
                  x={textX}
                  y={factsTop + i * FACT_PITCH}
                  fontSize={FACT_FS}
                  fontWeight={l.weight}
                  fill={l.color}
                  style={{ letterSpacing: 0.2 }}
                >
                  {l.text}
                </text>
              ))}

              {/* all-time win-rate: last section of the fact stack */}
              {win && (() => {
                const px = textX;
                const py = factsBottom + 13;
                const cy = py + win.h / 2;
                const caretLeft = px + 9;
                const labelX = caretLeft + win.caretW + win.gap;
                const ch = win.caretW * 0.92;
                const up = `${caretLeft},${cy + ch / 2} ${caretLeft + win.caretW},${cy + ch / 2} ${caretLeft + win.caretW / 2},${cy - ch / 2}`;
                const down = `${caretLeft},${cy - ch / 2} ${caretLeft + win.caretW},${cy - ch / 2} ${caretLeft + win.caretW / 2},${cy + ch / 2}`;
                return (
                  <g>
                    <text
                      x={px}
                      y={factsBottom + 9}
                      fontSize={8.5}
                      fontWeight={700}
                      fill="#a8a29a"
                      style={{ letterSpacing: 0.7 }}
                    >
                      ALL-TIME
                    </text>
                    <rect
                      x={px}
                      y={py}
                      width={win.w}
                      height={win.h}
                      rx={win.h / 2}
                      fill={CURVE}
                    />
                    {win.dir !== 0 && (
                      <polygon
                        points={win.dir > 0 ? up : down}
                        fill={win.dir > 0 ? TREND.UP : TREND.DOWN}
                        stroke="#ffffff"
                        strokeWidth={0.75}
                        strokeLinejoin="round"
                      />
                    )}
                    <text
                      x={win.dir !== 0 ? labelX : px + win.w / 2}
                      y={cy}
                      fontSize={win.fs}
                      fontWeight={600}
                      textAnchor={win.dir !== 0 ? "start" : "middle"}
                      dominantBaseline="central"
                      fill="#ffffff"
                    >
                      {win.label}
                    </text>
                    <text
                      x={px}
                      y={py + win.h + 12}
                      fontSize={9.5}
                      fontWeight={600}
                      fill="#9a958c"
                      style={{ letterSpacing: 0.2 }}
                    >
                      {win.record}
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
  eras = null,
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

  // Vertical composition (top → bottom): entry-pill margin -> ERA PLAQUE (when
  // Named Eras are on) -> timeline lane -> year axis (banner-less bands only)
  // -> bottom rail (personnel bands) -> peek + exit-pill margin. The lane is
  // capped at LANE_MAX — height is spent only on what the content uses — and
  // the whole assembly centers in the viewport.
  //
  // NOTE THE PILL MARGIN'S POSITION. With eras on it sits ABOVE the plaque, so
  // an arriving coach/GM/player enters the era frame from OUTSIDE it, the way
  // a person arrives into a chapter rather than starting inside one. With eras
  // off it sits where it always did, directly above the lane — the whole
  // reorder is conditional so the game zooms are untouched.
  const eraBoxes = useMemo(
    () => (eras?.length ? buildEraBoxes({ eras, layout }) : []),
    [eras, layout],
  );
  const showEras = eraBoxes.length > 0 && ERA_FRAME_BANDS.has(band);

  // Super Bowl crowns. Built off the FULL block list, not `visible`, so a
  // merged run keeps its shape while it scrolls in from off-screen — deciding
  // that two titles are back-to-back must not depend on which of them the
  // viewport currently holds.
  const crowns = useMemo(
    () =>
      CROWN_BANDS.has(band)
        ? buildSuperBowlCrowns({ blocks: layout?.blocks, showPlayoffs })
        : [],
    [band, layout, showPlayoffs],
  );
  const crowned = useMemo(() => crownedYears(crowns), [crowns]);

  const offMode = desktopGeometryFor(band).offseason;
  const railH = ribbonLayout.railHeight;
  const topZone = pillPlan.entryRows ? pillPlan.entryRows * PILL_ROW_H + 6 : 10;
  const axisH = offMode === "hidden" ? AXIS_H : 0;
  const railBlock = railH ? RAIL_PAD + railH : 0;
  // The era header strip is a REAL ROW in the assembly, not an overlay: it buys
  // its height from the same budget as everything else, so era titles sit above
  // the timeline instead of on top of it.
  const eraZoneH = showEras ? ERA_HEADER_H : 0;
  // A crown rises CROWN_ZONE above the lane. With eras on that fits inside the
  // header band's own bottom air — the band is 132 tall and its text stops at
  // the record baseline (92), so the crown costs NOTHING there and the timeline
  // does not shift when a franchise happens to have won one. With eras off
  // there is no band to borrow from, so it buys its own row like everything
  // else in this assembly. sims/desktop_crown.sim.mjs asserts the header case
  // actually clears the record line.
  const crownZoneH = crowns.length && !showEras ? CROWN_ZONE : 0;
  const botZone = railH
    ? PEEK + (pillPlan.exitRows ? pillPlan.exitRows * PILL_ROW_H + 6 : 8)
    : 8;
  const fixedH = eraZoneH + crownZoneH + topZone + axisH + railBlock + botZone;
  const laneH = Math.max(LANE_MIN, Math.min(LANE_MAX, height - 16 - fixedH));
  const assemblyH = fixedH + laneH;
  const assemblyTop = Math.max(8, (height - assemblyH) * 0.45);
  const assemblyBottom = assemblyTop + assemblyH;
  // Everything below the plaque hangs off contentTop — that's what keeps the
  // year columns clear of the era titles.
  const eraTop = assemblyTop + (showEras ? topZone : 0);
  const contentTop = eraTop + eraZoneH;
  const laneTop = showEras ? contentTop : contentTop + topZone + crownZoneH;
  const laneBottom = laneTop + laneH;
  const railTop = laneBottom + axisH + (railH ? RAIL_PAD : 0);
  const railBottom = railTop + railH;
  // The rail's own zone: a tinted full-width strip from half the pad above the
  // top band down past the peek, so exit connectors are visibly LEAVING it.
  const railZone = railH
    ? { top: railTop - RAIL_PAD / 2, bottom: railBottom + PEEK + 4 }
    : null;
  // Offseason paper stops above that zone. The rail is the one horizontal band
  // that belongs to the personnel ribbons alone; running year columns through
  // it is what made the ribbons read as clutter under the timeline instead of a
  // track of their own.
  const paperBottom = railZone ? railZone.top - 3 : assemblyBottom;
  // WHERE A CHAPTER ENDS. Not at the paper's edge: it runs on down through the
  // rail, past the bottom of the last tenure BAND, so the people who served in
  // an era are inside its frame. It stops just below them rather than at the
  // rail zone's own bottom edge, because what lies further down is the peek and
  // the exit pills — a career LEAVING, which belongs to the person and not to
  // the chapter they're walking out of.
  //
  // ERA_RAIL_GAP is CLEAR SPACE, so the stroke width is added on top: the
  // border is centred on this line, and it's the stroke's near edge that has to
  // clear the bands, not its centre.
  const eraBottom = railH ? railBottom + ERA_RAIL_GAP + ERA_BORDER_W : paperBottom;
  // Pill row centers: entry rows stack upward from the lane, exit rows
  // downward from the rail's peek.
  // Entry pills stack upward from whatever the ribbons are arriving INTO: the
  // top of the era frame when there is one, the lane itself otherwise.
  const pillFloor = showEras ? eraTop : laneTop;
  const entryPillY = (row) => pillFloor - 10 - PILL_H / 2 - row * PILL_ROW_H;
  const exitPillY = (row) => railBottom + PEEK + 4 + PILL_H / 2 + row * PILL_ROW_H;

  // Cumulative franchise winrate AFTER EACH GAME, spanning the entire timeline
  // width: a season's games spread evenly across its block, and the win% maps
  // to the VERTICAL axis — so the curve keeps per-game resolution and survives
  // every band change.
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
        // No game owns an x of its own any more — a game is a ROW inside the
        // season's column — so spread the season's games evenly across the
        // block. The curve stays smooth and keeps its per-game resolution.
        pts.push([b.x0 + ((idx + 0.5) / m) * b.width, (w + t / 2) / n]);
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

  // Axis label pitch at banner-less bands: a horizontal axis can't fit a label
  // per year, so coarsen the step until neighbouring labels clear
  // AXIS_MIN_LABEL_GAP. Derived from the actual layout rather than hardcoded
  // per band, because the Eras band now sizes itself to the viewport — how many
  // years fit legibly depends on the window and on how much room the ribbon
  // reserve took, neither of which a constant can know.
  const pxPerYear = layout.yearsSpan ? layout.totalWidth / layout.yearsSpan : 0;
  const axisStep =
    [1, 2, 5, 10, 25, 50].find((s) => s * pxPerYear >= AXIS_MIN_LABEL_GAP) || 50;
  // Minor ticks subdivide the labelled step — the finest interval that still
  // leaves the ticks apart enough to count. null when even the coarsest
  // subdivision would crowd, in which case the axis is majors only.
  const axisMinorStep =
    [1, 2, 5, 10].find((s) => s < axisStep && s * pxPerYear >= AXIS_MIN_TICK_GAP) || null;

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

      {/* NAMED ERAS, pass 1 — the interior tint and the plaque's band, UNDER
          everything: year columns, win-rate curve, rail, ribbons. Barely-there
          on purpose: enough to see where one chapter ends and the next begins,
          not enough to tint the content. */}
      {showEras && (
        <DesktopEraLayer
          boxes={eraBoxes}
          top={eraTop}
          bottom={eraBottom}
          layer="wash"
        />
      )}

      {/* SUPER BOWL CROWNS, pass 1 — the gold wash inside a title's frame,
          under the columns and everything that crosses them. */}
      <DesktopCrownLayer
        crowns={crowns}
        laneTop={laneTop}
        laneBottom={laneBottom}
        layer="wash"
      />

      {visible.map((b) =>
        b.type === "season" ? (
          <SeasonBlock
            key={`s-${b.year}`}
            block={b}
            laneTop={laneTop}
            laneBottom={laneBottom}
            meta={seasonMeta.get(b.year)}
            showPlayoffs={showPlayoffs}
            crowned={crowned.has(b.year)}
          />
        ) : (
          <OffseasonBlock
            key={`o-${b.year}`}
            block={b}
            laneTop={laneTop}
            laneBottom={laneBottom}
            paperTop={contentTop}
            paperBottom={paperBottom}
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
              y={contentTop}
              width={6}
              height={Math.max(0, paperBottom - contentTop)}
              fill="url(#offPaperShadowH)"
              style={{ pointerEvents: "none" }}
            />
          ))}

      {/* The personnel rail's own zone — a full-width surface the year columns
          stop short of, so the ribbons read as a track rather than as clutter
          under the timeline. Drawn before the ribbons; they sit on it. */}
      {railZone && (
        <g style={{ pointerEvents: "none" }}>
          <rect
            x={0}
            y={railZone.top}
            width={layout.totalWidth}
            height={railZone.bottom - railZone.top}
            fill={RAIL_BG}
          />
          <line
            x1={0} x2={layout.totalWidth}
            y1={railZone.top + 0.5} y2={railZone.top + 0.5}
            stroke={RAIL_EDGE} strokeWidth={1}
          />
          <line
            x1={0} x2={layout.totalWidth}
            y1={railZone.bottom - 0.5} y2={railZone.bottom - 0.5}
            stroke={RAIL_EDGE} strokeWidth={1}
          />
        </g>
      )}

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

      {/* NAMED ERAS, pass 2 — the border and the label, over the ribbons and
          haloed. Both need it: the frame's bottom now encloses the rail's
          OPAQUE tenure bands, so a border painted under them would break at
          every chapter boundary a tenure crosses; and incoming ribbons enter
          from ABOVE and drop through the plaque band, so a connector painted
          over a title strikes it clean through. Same call, same reason, as the
          year axis below. */}
      {showEras && (
        <DesktopEraLayer
          boxes={eraBoxes}
          top={eraTop}
          bottom={eraBottom}
          layer="plaque"
        />
      )}

      {/* SUPER BOWL CROWNS, pass 2 — the frame's outline and the plaque, over
          everything and haloed, for the same reason the era plaque and the year
          axis are: ribbons drop through this exact band on their way to the
          rail. Painted AFTER the era plaque, so where a title lands on a
          chapter boundary the crown wins and the border passes behind it. */}
      <DesktopCrownLayer
        crowns={crowns}
        laneTop={laneTop}
        laneBottom={laneBottom}
        layer="crown"
      />

      {/* YEAR AXIS — banner-less band only; elsewhere the column left of each
          season carries the (much bigger) year.

          A real dated axis: a baseline running the whole timeline, minor ticks
          on the intervening years, and a long tick under a large bold year at
          each labelled step.

          Drawn LAST, after the ribbon layer, every mark carrying a white halo.
          Ribbon connectors are opaque and cross exactly this strip on their way
          between the lane and the rail, so painting the axis under them buried
          the years; painting it over them, haloed, is what keeps the axis
          readable no matter how busy the personnel are. The halo is also what
          lets the baseline cross a connector and still read as one line. */}
      {offMode === "hidden" && (
        <g style={{ pointerEvents: "none" }}>
          <line
            x1={0} x2={layout.totalWidth}
            y1={laneBottom + 0.5} y2={laneBottom + 0.5}
            stroke="#ffffff" strokeWidth={3.5}
          />
          <line
            x1={0} x2={layout.totalWidth}
            y1={laneBottom + 0.5} y2={laneBottom + 0.5}
            stroke={AXIS_RULE} strokeWidth={1}
          />
          {axisMinorStep &&
            visible
              .filter(
                (b) =>
                  b.type === "season" &&
                  b.year % axisMinorStep === 0 &&
                  b.year % axisStep !== 0,
              )
              .map((b) => {
                const cx = b.x0 + b.width / 2;
                return (
                  <g key={`ym-${b.year}`}>
                    <line x1={cx} x2={cx} y1={laneBottom} y2={laneBottom + 5} stroke="#ffffff" strokeWidth={3.5} />
                    <line x1={cx} x2={cx} y1={laneBottom} y2={laneBottom + 5} stroke={AXIS_TICK_MINOR} strokeWidth={1} />
                  </g>
                );
              })}
          {visible
            .filter((b) => b.type === "season" && b.year % axisStep === 0)
            .map((b) => {
              const cx = b.x0 + b.width / 2;
              return (
                <g key={`y-${b.year}`}>
                  <line x1={cx} x2={cx} y1={laneBottom} y2={laneBottom + 10} stroke="#ffffff" strokeWidth={4.5} />
                  <line x1={cx} x2={cx} y1={laneBottom} y2={laneBottom + 10} stroke={AXIS_TICK_MAJOR} strokeWidth={1.5} />
                  <text
                    x={cx}
                    y={laneBottom + 25}
                    fontSize={15}
                    fontWeight={700}
                    textAnchor="middle"
                    fill={OFF_YEAR}
                    stroke="#ffffff"
                    strokeWidth={3.5}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    style={{ letterSpacing: -0.2 }}
                  >
                    {b.year}
                  </text>
                </g>
              );
            })}
        </g>
      )}
    </g>
    </>
  );
});

export default DesktopTimelineLayer;
