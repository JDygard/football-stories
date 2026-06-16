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
    const moduleBoxes = [];
    let cursor = offY0 + reserve + offseasonPadding;
    for (const m of activeModules) {
      const h = Math.max(
        0,
        m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0,
      );
      if (h <= 0) continue;
      moduleBoxes.push({ id: m.id, module: m, y: cursor, height: h });
      cursor += h + offseasonPadding;
    }
    const offHeight = moduleBoxes.length
      ? Math.max(minOffseasonHeight + reserve, cursor - offY0)
      : minOffseasonHeight + reserve;
    const offY1 = offY0 + offHeight;

    const offBlock = {
      type: "offseason",
      year,
      y0: offY0,
      y1: offY1,
      height: offHeight,
      reserve,
      tStart: year - OFF_FRAC,
      tEnd: year,
      modules: moduleBoxes,
    };
    blocks.push(offBlock);
    y = offY1;

    // ---- SEASON BLOCK (games of `year`, below its offseason) ----
    const seaY0 = y;
    let seaHeight;
    let gamePositions;
    if (geom.season.mode === "rows") {
      const rh = geom.season.gameRowHeight;
      seaHeight = Math.max(minSeasonHeight, games.length * rh + seasonPadding);
      const innerTop = seaY0 + seasonPadding / 2;
      gamePositions = games.map((g, i) => ({ g, i, y: innerTop + (i + 0.5) * rh }));
    } else {
      seaHeight = Math.max(minSeasonHeight, geom.season.height);
      const lineY = seaY0 + seaHeight / 2;
      gamePositions = games.map((g, i) => ({ g, i, y: lineY }));
    }
    const seaY1 = seaY0 + seaHeight;

    const seaBlock = {
      type: "season",
      year,
      y0: seaY0,
      y1: seaY1,
      height: seaHeight,
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
