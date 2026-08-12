// Content-stacked HORIZONTAL timeline layout — the desktop transposition of
// components/visualization/buildTimelineLayout.js.
//
// Time is the ordering principle left→right; pixel WIDTH is content-driven: a
// season's width comes from its game columns (or a collapsed line), an
// offseason's width from its year-banner column + reserved ribbon-connector
// space + content module columns. Blocks stack contiguously along x.
//
// Block order (left = earliest). For each season year Y we emit, in order:
//   offseason(Y)  -- the run-up to season Y (banner column, draft class Y)
//   season(Y)     -- the games of year Y
// so a year's draft renders directly LEFT of the season it built.
//
// reserveByYear: { year: px } — horizontal space reserved inside each year's
// offseason block (between the banner column and the content modules) for the
// VERTICAL personnel-ribbon entry connectors that drop in from the top pill
// zone, down across the timeline at the hire year, into the bottom rail. The
// desktop descendant of the mobile reserve model: connectors occupy real
// layout space instead of overlaying content. `ribbonLeft` marks where they
// anchor (consumed by desktopRibbonModel).
//
// A nominal time coordinate (year units) is attached to every block for axis
// labels and zoom anchoring, monotonic and contiguous even though pixels are
// not proportional to time:
//   offseason(Y): t in [Y - OFF_FRAC, Y]
//   season(Y):    t in [Y, Y + SEA_FRAC]
//
// One deliberate desktop divergence: mobile's per-season header strip (record /
// division finish / point diff) has NO transposed strip — that information
// migrates into the year-banner column, which has abundant vertical room in
// landscape. Season blocks therefore carry pure game graphics.
//
// Kept JSX-free so it can be unit-simulated in node (vite build can't run in
// the sandbox).

import { desktopGeometryFor, bandAtLeast, DEFAULT_BAND } from "./desktopDetail.js";

const OFF_FRAC = 0.4; // nominal time share of an offseason (axis/anchor only)
const SEA_FRAC = 0.6; // nominal time share of a season

// The offseason renders as a full-height "year banner" COLUMN: the big year at
// the top, the season's record/division/point-diff lines beneath it, and the
// all-time win-rate pill riding the curve. Real layout width is reserved for it
// so it never overlaps the draft column to its right.
export const OFF_HEADER_W_FULL = 58; // banner column px in full mode (zoom 3/4)
export const OFF_HEADER_W_COMPACT = 46; // banner column px in compact mode (zoom 2)

// Postseason segment, stacked RIGHT of the regular-season games (zoom 3/4):
// at zoom 4 a rotated "POSTSEASON" label column + win/loss arrow columns; at
// zoom 3 it collapses to a compact medal-bordered result column.
export const POST_HEADER_W = 14; // label column left of the playoff game columns (zoom 4)
export const POST_RESULT_W = 22; // compact result column (zoom 3)

export function buildDesktopLayout({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  detailBand = DEFAULT_BAND,
  left = 0,
  seasonPadding = 6,
  offseasonPadding = 6,
  minOffseasonWidth = 6,
  // Lower floor than mobile's 14px tap-target minimum: desktop pointers are
  // precise, and clamping would squeeze ERA_SUMMARY (12) and
  // FRANCHISE_OVERVIEW (5) toward identical widths — leaving the two coarse
  // bands indistinguishable and their total widths too close for the zoom's
  // log-space hysteresis to ever walk between them.
  minSeasonWidth = 5,
  showPlayoffs = true,
}) {
  const geom = desktopGeometryFor(detailBand);
  const sorted = [...(seasons || [])].sort((a, b) => a.year - b.year);

  const showModules = geom.offseason !== "hidden";
  const activeModules = showModules
    ? modules.filter((m) => bandAtLeast(detailBand, m.minBand))
    : [];

  const blocks = [];
  const byYear = new Map();
  let x = left;

  for (const s of sorted) {
    const year = s.year;
    const games = s.games || [];

    // ---- OFFSEASON BLOCK (draft class `year`, left of the season) ----
    const offX0 = x;
    const reserve = Math.max(0, reserveByYear[year] || 0);
    const headerW =
      geom.offseason === "hidden"
        ? 0
        : geom.offseason === "full"
          ? OFF_HEADER_W_FULL
          : OFF_HEADER_W_COMPACT;
    // Stacking order within the offseason block (left → right):
    //   banner column (the year marker) -> ribbon-connector reserve -> modules
    // ribbonLeft marks where entry connectors anchor (consumed by
    // desktopRibbonModel).
    const ribbonLeft = offX0 + headerW;
    const bodyLeft = ribbonLeft + reserve;
    const moduleBoxes = [];
    let cursor = bodyLeft + offseasonPadding;
    for (const m of activeModules) {
      const w = Math.max(
        0,
        m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0,
      );
      if (w <= 0) continue;
      moduleBoxes.push({ id: m.id, module: m, x: cursor, width: w });
      cursor += w + offseasonPadding;
    }
    const minOff = reserve + headerW + (headerW ? 0 : minOffseasonWidth);
    const offWidth = moduleBoxes.length
      ? Math.max(minOff, cursor - offX0)
      : minOff;
    const offX1 = offX0 + offWidth;

    const offBlock = {
      type: "offseason",
      year,
      x0: offX0,
      x1: offX1,
      width: offWidth,
      reserve,
      headerWidth: headerW,
      ribbonLeft,
      tStart: year - OFF_FRAC,
      tEnd: year,
      modules: moduleBoxes,
    };
    blocks.push(offBlock);
    x = offX1;

    // ---- SEASON BLOCK (games of `year`, right of its offseason) ----
    const seaX0 = x;
    const playoffsResult = showPlayoffs ? s.season?.playoffs || null : null;
    let seaWidth;
    let gamePositions;
    let postseason = null;
    if (geom.season.mode === "cols") {
      const gw = geom.season.gameColWidth;
      const reg = games.filter((g) => !g.is_playoff);
      const post = showPlayoffs ? games.filter((g) => g.is_playoff) : [];
      const regLeft = seaX0 + seasonPadding / 2;
      gamePositions = reg.map((g, i) => ({ g, i, x: regLeft + (i + 0.5) * gw }));
      let cursorX = regLeft + reg.length * gw;
      const isDetail = detailBand === "GAME_DETAIL"; // zoom 4
      if (isDetail && post.length) {
        const headerX = cursorX + seasonPadding;
        const colsLeft = headerX + POST_HEADER_W;
        postseason = {
          kind: "cols",
          x0: headerX,
          headerW: POST_HEADER_W,
          colW: gw,
          result: playoffsResult,
          games: post.map((g, i) => ({ g, i, x: colsLeft + (i + 0.5) * gw })),
        };
        cursorX = colsLeft + post.length * gw;
      } else if (!isDetail && (post.length || playoffsResult)) {
        const stripX = cursorX + seasonPadding;
        postseason = { kind: "result", x0: stripX, width: POST_RESULT_W, result: playoffsResult };
        cursorX = stripX + POST_RESULT_W;
      }
      seaWidth = Math.max(minSeasonWidth, cursorX + seasonPadding / 2 - seaX0);
    } else {
      seaWidth = Math.max(minSeasonWidth, geom.season.width);
      const lineX = seaX0 + seaWidth / 2;
      gamePositions = games.map((g, i) => ({ g, i, x: lineX }));
    }
    const seaX1 = seaX0 + seaWidth;

    const seaBlock = {
      type: "season",
      year,
      x0: seaX0,
      x1: seaX1,
      width: seaWidth,
      postseason,
      tStart: year,
      tEnd: year + SEA_FRAC,
      mode: geom.season.mode,
      gameColWidth: geom.season.mode === "cols" ? geom.season.gameColWidth : null,
      games: gamePositions,
      season: s,
    };
    blocks.push(seaBlock);
    x = seaX1;

    byYear.set(year, { offseason: offBlock, season: seaBlock });
  }

  const totalWidth = x - left;
  const firstYear = sorted.length ? sorted[0].year : null;
  const lastYear = sorted.length ? sorted[sorted.length - 1].year : null;

  // --- time <-> pixel mappings (piecewise-linear over contiguous blocks) ---
  function tToX(t) {
    if (!blocks.length) return left;
    if (t <= blocks[0].tStart) return blocks[0].x0;
    const lastB = blocks[blocks.length - 1];
    if (t >= lastB.tEnd) return lastB.x1;
    for (const b of blocks) {
      if (t >= b.tStart && t <= b.tEnd) {
        const span = b.tEnd - b.tStart || 1;
        return b.x0 + ((t - b.tStart) / span) * b.width;
      }
    }
    return left;
  }

  function xToYear(xPix) {
    if (!blocks.length) return null;
    if (xPix <= blocks[0].x0) return blocks[0].tStart;
    const lastB = blocks[blocks.length - 1];
    if (xPix >= lastB.x1) return lastB.tEnd;
    for (const b of blocks) {
      if (xPix >= b.x0 && xPix <= b.x1) {
        const w = b.width || 1;
        return b.tStart + ((xPix - b.x0) / w) * (b.tEnd - b.tStart);
      }
    }
    return null;
  }

  // Left of season Y == right of its offseason == the integer-year boundary.
  const yearToX = (year) => tToX(year);

  return {
    blocks,
    byYear,
    totalWidth,
    left,
    detailBand,
    firstYear,
    lastYear,
    yearsSpan: firstYear != null ? lastYear - firstYear + 1 : 0,
    tToX,
    xToYear,
    yearToX,
  };
}
