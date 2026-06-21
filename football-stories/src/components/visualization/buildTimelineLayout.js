// Content-stacked timeline layout.
//
// Replaces the old linear year->pixel scale (and the displaceY hack). Time is
// still the ordering principle, but pixel HEIGHT is content-driven: a season's
// height comes from its games (or a collapsed line), and an offseason's height
// is the sum of its enabled content modules. Blocks are stacked contiguously.
//
// Block order (top = earliest). For each season year Y we emit, in order:
//   offseason(Y)  -- the run-up to season Y; holds draft class Y, sits ABOVE it
//   season(Y)     -- the games of year Y
// so a year's draft renders directly above the season it built.
//
// reserveByYear: { year: px } — vertical space reserved at the TOP of each
// year's offseason block for personnel ribbon entry bands (see
// staffRibbonModel.stripReserveByYear). This is the scroll-model descendant
// of displaceY: entries occupy real layout space instead of overlaying
// content. Modules stack below the reserved area.
//
// A nominal time coordinate (year units) is attached to every block purely for
// axis labels and zoom anchoring; it stays monotonic and contiguous even though
// pixels are not proportional to time:
//   offseason(Y): t in [Y - OFF_FRAC, Y]
//   season(Y):    t in [Y, Y + SEA_FRAC]
//   offseason(Y+1) starts at Y + SEA_FRAC == (Y+1) - OFF_FRAC  (contiguous)
//
// Offseason MODULE contract (implemented by the module registry):
//   {
//     id: string,
//     minBand: string,                       // least-detailed band it shows at
//     measure({ year, detailBand, mode, data }) -> heightPx,
//     render(...)                            // used by the renderer, not here
//   }

import { geometryFor, bandAtLeast, DEFAULT_BAND } from "./detail.js";

const OFF_FRAC = 0.4; // nominal time share of an offseason (axis/anchor only)
const SEA_FRAC = 0.6; // nominal time share of a season   (OFF_FRAC + SEA_FRAC = 1)

// The offseason renders as a full-width "year banner": a header band carrying
// the big year, that season's record, and the all-time win-rate value. We
// reserve real layout space for it (below any ribbon-entry reserve, above the
// content modules) so the header never overlaps the draft class beneath it.
const OFF_HEADER_FULL = 38; // header px in full mode    (zoom 3/4)
const OFF_HEADER_COMPACT = 30; // header px in compact mode (zoom 2)

// A season header strip sits at the TOP of each season block — under the
// offseason paper, directly above the games — and lays out that year's record.
// Only present when a banner is shown (i.e. the offseason isn't hidden).
const SEASON_HEADER_FULL = 20; // record strip above the game rows (zoom 3/4)
const SEASON_HEADER_COMPACT = 22; // record strip above the season line (zoom 2)

// Postseason segment, stacked below the regular-season games (zoom 3/4 only):
// at zoom 4 it's a "POSTSEASON" label + win/loss arrow rows for the playoff
// games; at zoom 3 it collapses to a compact medal-bordered result strip.
const POST_HEADER_H = 14; // label strip above the playoff arrow rows (zoom 4)
const POST_RESULT_H = 22; // compact result strip (zoom 3)

export function buildTimelineLayout({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  detailBand = DEFAULT_BAND,
  top = 0,
  seasonPadding = 6,
  offseasonPadding = 6,
  minOffseasonHeight = 6,
  minSeasonHeight = 14,
  showPlayoffs = true,
}) {
  const geom = geometryFor(detailBand);
  const sorted = [...(seasons || [])].sort((a, b) => a.year - b.year);

  // Modules visible at this detail band (and only when offseasons aren't hidden).
  const showModules = geom.offseason !== "hidden";
  const activeModules = showModules
    ? modules.filter((m) => bandAtLeast(detailBand, m.minBand))
    : [];

  const blocks = [];
  const byYear = new Map();
  let y = top;

  for (const s of sorted) {
    const year = s.year;
    const games = s.games || [];

    // ---- OFFSEASON BLOCK (draft class `year`, sits above the season) ----
    const offY0 = y;
    const reserve = Math.max(0, reserveByYear[year] || 0);
    // Header band height by mode; hidden bands get none (no banner there).
    const headerH =
      geom.offseason === "hidden"
        ? 0
        : geom.offseason === "full"
          ? OFF_HEADER_FULL
          : OFF_HEADER_COMPACT;
    // Stacking order within the offseason block (top → bottom):
    //   header (the year marker)  ->  ribbon-entry reserve  ->  content modules
    // The year therefore sits ABOVE the incoming-ribbons area. ribbonTop marks
    // where entry bands anchor (consumed by staffRibbonModel).
    const ribbonTop = offY0 + headerH;
    const bodyTop = ribbonTop + reserve;
    const moduleBoxes = [];
    let cursor = bodyTop + offseasonPadding;
    for (const m of activeModules) {
      const h = Math.max(
        0,
        m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0,
      );
      if (h <= 0) continue;
      moduleBoxes.push({ id: m.id, module: m, y: cursor, height: h });
      cursor += h + offseasonPadding;
    }
    // A banner year with no modules is still a real block: just its header.
    const minOff = reserve + headerH + (headerH ? 0 : minOffseasonHeight);
    const offHeight = moduleBoxes.length
      ? Math.max(minOff, cursor - offY0)
      : minOff;
    const offY1 = offY0 + offHeight;

    const offBlock = {
      type: "offseason",
      year,
      y0: offY0,
      y1: offY1,
      height: offHeight,
      reserve,
      headerHeight: headerH,
      ribbonTop,
      tStart: year - OFF_FRAC,
      tEnd: year,
      modules: moduleBoxes,
    };
    blocks.push(offBlock);
    y = offY1;

    // ---- SEASON BLOCK (games of `year`, below its offseason) ----
    const seaY0 = y;
    const seaHeaderH =
      geom.offseason === "hidden"
        ? 0
        : geom.season.mode === "rows"
          ? SEASON_HEADER_FULL
          : SEASON_HEADER_COMPACT;
    // When playoffs are toggled off, drop the postseason entirely: no result,
    // no segment, and (in rows mode) the playoff game rows are filtered out
    // below — so no layout space is reserved for any of it.
    const playoffsResult = showPlayoffs ? s.season?.playoffs || null : null;
    let seaHeight;
    let gamePositions;
    let postseason = null;
    if (geom.season.mode === "rows") {
      const rh = geom.season.gameRowHeight;
      // Regular-season games make the main block; playoff games are pulled out
      // into the postseason segment below.
      const reg = games.filter((g) => !g.is_playoff);
      // No playoff rows at all when the toggle is off.
      const post = showPlayoffs ? games.filter((g) => g.is_playoff) : [];
      const regTop = seaY0 + seaHeaderH + seasonPadding / 2;
      gamePositions = reg.map((g, i) => ({ g, i, y: regTop + (i + 0.5) * rh }));
      let cursorY = regTop + reg.length * rh;
      const isDetail = detailBand === "GAME_DETAIL"; // zoom 4
      if (isDetail && post.length) {
        const headerY = cursorY + seasonPadding;
        const rowsTop = headerY + POST_HEADER_H;
        postseason = {
          kind: "rows",
          y0: headerY,
          headerH: POST_HEADER_H,
          rowH: rh,
          result: playoffsResult,
          games: post.map((g, i) => ({ g, i, y: rowsTop + (i + 0.5) * rh })),
        };
        cursorY = rowsTop + post.length * rh;
      } else if (!isDetail && (post.length || playoffsResult)) {
        const stripY = cursorY + seasonPadding;
        postseason = { kind: "result", y0: stripY, height: POST_RESULT_H, result: playoffsResult };
        cursorY = stripY + POST_RESULT_H;
      }
      seaHeight = Math.max(minSeasonHeight, cursorY + seasonPadding / 2 - seaY0);
    } else {
      seaHeight = Math.max(minSeasonHeight, seaHeaderH + geom.season.height);
      const lineY = seaY0 + seaHeaderH + (seaHeight - seaHeaderH) / 2;
      gamePositions = games.map((g, i) => ({ g, i, y: lineY }));
    }
    const seaY1 = seaY0 + seaHeight;

    const seaBlock = {
      type: "season",
      year,
      y0: seaY0,
      y1: seaY1,
      height: seaHeight,
      seasonHeaderHeight: seaHeaderH,
      postseason,
      tStart: year,
      tEnd: year + SEA_FRAC,
      mode: geom.season.mode,
      gameRowHeight: geom.season.mode === "rows" ? geom.season.gameRowHeight : null,
      games: gamePositions,
      season: s,
    };
    blocks.push(seaBlock);
    y = seaY1;

    byYear.set(year, { offseason: offBlock, season: seaBlock });
  }

  const totalHeight = y - top;
  const firstYear = sorted.length ? sorted[0].year : null;
  const lastYear = sorted.length ? sorted[sorted.length - 1].year : null;

  // --- time <-> pixel mappings (piecewise-linear over contiguous blocks) ---
  function tToY(t) {
    if (!blocks.length) return top;
    if (t <= blocks[0].tStart) return blocks[0].y0;
    const last = blocks[blocks.length - 1];
    if (t >= last.tEnd) return last.y1;
    for (const b of blocks) {
      if (t >= b.tStart && t <= b.tEnd) {
        const span = b.tEnd - b.tStart || 1;
        return b.y0 + ((t - b.tStart) / span) * b.height;
      }
    }
    return top;
  }

  function yToYear(yPix) {
    if (!blocks.length) return null;
    if (yPix <= blocks[0].y0) return blocks[0].tStart;
    const last = blocks[blocks.length - 1];
    if (yPix >= last.y1) return last.tEnd;
    for (const b of blocks) {
      if (yPix >= b.y0 && yPix <= b.y1) {
        const h = b.height || 1;
        return b.tStart + ((yPix - b.y0) / h) * (b.tEnd - b.tStart);
      }
    }
    return null;
  }

  // Top of season Y == bottom of its offseason == the integer-year boundary.
  const yearToY = (year) => tToY(year);

  return {
    blocks,
    byYear,
    totalHeight,
    top,
    detailBand,
    firstYear,
    lastYear,
    yearsSpan: firstYear != null ? lastYear - firstYear + 1 : 0,
    tToY,
    yToYear,
    yearToY,
  };
}
