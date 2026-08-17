// Content-stacked HORIZONTAL timeline layout — the desktop transposition of
// components/visualization/buildTimelineLayout.js.
//
// Time is the ordering principle left→right; pixel WIDTH is content-driven: a
// season's width comes from the column its content needs (a game log, or a
// collapsed line), an offseason's width from its year-banner column + reserved
// ribbon-connector space + content module columns. Blocks stack contiguously
// along x.
//
// WITHIN a block, content still reads top-to-bottom the normal way: a season's
// games are a vertical LOG of horizontal rows, not one column per game. Only
// the timeline axis is transposed on desktop; the things sitting on it are not.
//
// ONE EXCEPTION — FIT MODE. The coarsest band (Eras) inverts that: it takes the
// viewport width as a given and solves for the season column, so the entire
// franchise history lands edge to edge with no horizontal scrolling at all.
// Offseason widths are still content-driven (they're independent of the season
// width), so the solve is a single pre-pass: measure every offseason, divide
// what's left among the seasons. Callers opt in by passing `fitWidth`; the band
// opts in via `season.fit` in DESKTOP_GEOMETRY.
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
// the top, then the season's record / playoff finish / division / point-diff
// lines, then the all-time win-rate pill. Real layout width is reserved for it
// so it never overlaps the draft column to its right.
//
// Sized so every one of those lines is plainly legible rather than clipped: the
// widest fact ("Last in Div") and the win-rate pill both have to fit INSIDE the
// column now, because the pill no longer floats out over the lane (it used to
// ride the win-rate curve, where it collided with ribbons and draft columns).
//
// The gutters live HERE, next to the width they're a part of, rather than in
// the renderer that draws against them — the column width is only correct
// relative to its own padding, and splitting the two across files is how they
// drift. BANNER_PAD_L is the year headline's left margin: at 6px the year sat
// hard against the paper's edge, running into whatever the previous season left
// there, which is what made the whole run of years read as mashed together.
export const BANNER_PAD_L = 18;
export const BANNER_PAD_R = 8;
const BANNER_CONTENT_W = 80; // widest fact line / win-rate pill must fit this
export const OFF_HEADER_W_FULL = BANNER_PAD_L + BANNER_CONTENT_W + BANNER_PAD_R;
export const OFF_HEADER_W_COMPACT = OFF_HEADER_W_FULL;

// Fit mode (ERA_SUMMARY) bounds on the derived season column.
//
// CEILING so a short franchise history doesn't blow single seasons up into
// meaningless slabs when there's space to burn.
//
// FLOOR because the fit is not always satisfiable: every personnel ribbon
// reserves a CONN_W column in its entry year, and a franchise with decades of
// coaches, GMs and owners on screen can reserve enough width that "fit the
// viewport" would only be reachable by crushing seasons into hairlines — the
// exact cramping this band is meant to relieve. Season legibility wins; the
// band scrolls a little instead. With a typical selection it still fits exactly.
export const ERA_FIT_MAX_SEASON_W = 72;
export const ERA_FIT_MIN_SEASON_W = 16;

// Postseason segment, stacked BENEATH the regular-season rows (zoom 3/4). The
// game log reads downward, so "after the regular season" is simply "lower in
// the column" — no rotated label column, no sideways result strip. It carries
// playoff game rows when we have them, and degrades to a one-line medal-bordered
// result strip when all we know is how the run ended.

export function buildDesktopLayout({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  // { year: px } — whitespace appended AFTER that year's season block. Used to
  // give a selected era room for its blurb without letting the frame overlap
  // the chapter that follows: the era still covers exactly its own years, and
  // the extra is empty paper inside the frame.
  padAfterYear = {},
  detailBand = DEFAULT_BAND,
  left = 0,
  seasonPadding = 6,
  offseasonPadding = 6,
  minOffseasonWidth = 6,
  // Lower floor than mobile's 14px tap-target minimum: desktop pointers are
  // precise, and a higher floor would fight fit mode on long franchise
  // histories in a narrow window (see fitWidth below), pushing ERA_SUMMARY's
  // total width up toward SEASON_LINES' — close enough that the zoom's
  // log-space hysteresis could no longer walk cleanly between them.
  minSeasonWidth = 5,
  // Viewport width in px. Only consumed by bands whose season geometry is
  // marked `fit` (ERA_SUMMARY): the season column is derived so the ENTIRE
  // franchise history lands edge to edge with no horizontal scrolling. 0 (the
  // pre-measure frame) falls back to the band's static `width`.
  fitWidth = 0,
  showPlayoffs = true,
}) {
  const geom = desktopGeometryFor(detailBand);
  const sorted = [...(seasons || [])].sort((a, b) => a.year - b.year);

  const showModules = geom.offseason !== "hidden";
  const activeModules = showModules
    ? modules.filter((m) => bandAtLeast(detailBand, m.minBand))
    : [];

  // ---- fit mode: solve for the season width that fills the viewport ----
  // Offseason widths are independent of the season width (banner column +
  // ribbon reserve + module columns), so the remaining space divides evenly
  // among the seasons. Only reachable at bands with `offseason: "hidden"` and
  // no modules, where an offseason block is exactly reserve + minOffseasonWidth
  // — but the pre-pass measures the same quantities the main loop does rather
  // than assuming that, so `fit` stays correct if a coarse band ever gains a
  // banner or a module.
  let lineWidth = geom.season.mode === "line" ? geom.season.width : null;
  if (geom.season.mode === "line" && geom.season.fit && fitWidth > 0 && sorted.length) {
    const headerW =
      geom.offseason === "hidden"
        ? 0
        : geom.offseason === "full"
          ? OFF_HEADER_W_FULL
          : OFF_HEADER_W_COMPACT;
    let offTotal = 0;
    for (const s of sorted) {
      const reserve = Math.max(0, reserveByYear[s.year] || 0);
      let cursor = offseasonPadding;
      for (const m of activeModules) {
        const w = Math.max(
          0,
          m.measure({ year: s.year, detailBand, mode: geom.offseason, data: moduleData }) || 0,
        );
        if (w > 0) cursor += w + offseasonPadding;
      }
      const minOff = reserve + headerW + (headerW ? 0 : minOffseasonWidth);
      offTotal += cursor > offseasonPadding
        ? Math.max(minOff, headerW + reserve + cursor)
        : minOff;
    }
    lineWidth = Math.max(
      Math.max(minSeasonWidth, ERA_FIT_MIN_SEASON_W),
      Math.min(ERA_FIT_MAX_SEASON_W, (fitWidth - offTotal) / sorted.length),
    );
  }

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
    if (geom.season.mode === "rows") {
      // A game LOG: one horizontal row per game, stacking downward inside a
      // fixed-width column. Only x is decided here — row y is a render-time
      // concern, because the renderer shrinks the row pitch to fit the lane
      // rather than truncating the log (see SeasonBlock).
      const reg = games.filter((g) => !g.is_playoff);
      const post = showPlayoffs ? games.filter((g) => g.is_playoff) : [];
      seaWidth = Math.max(minSeasonWidth, geom.season.width + seasonPadding);
      gamePositions = reg.map((g, i) => ({ g, i }));
      if (post.length) {
        // Playoff games are their own labeled section BENEATH the regular
        // season — the log reads downward, so that's simply "later".
        postseason = { kind: "rows", result: playoffsResult, games: post.map((g, i) => ({ g, i })) };
      } else if (playoffsResult) {
        // Reached the postseason but we have no game-level rows for it.
        postseason = { kind: "result", result: playoffsResult };
      }
    } else {
      seaWidth = Math.max(minSeasonWidth, lineWidth);
      const lineX = seaX0 + seaWidth / 2;
      gamePositions = games.map((g, i) => ({ g, i, x: lineX }));
    }
    const seaX1 = seaX0 + seaWidth;
    const padAfter = Math.max(0, padAfterYear[year] || 0);

    const seaBlock = {
      type: "season",
      year,
      x0: seaX0,
      x1: seaX1,
      // Empty paper after the games, owned by the season block so the era
      // frame can reach across it (see buildEraBoxes). NOT part of x1: the
      // games must not stretch into it.
      padAfter,
      width: seaWidth,
      postseason,
      tStart: year,
      tEnd: year + SEA_FRAC,
      mode: geom.season.mode,
      // Nominal row pitch for rows mode; the renderer may shrink it to fit.
      gameRowHeight: geom.season.mode === "rows" ? geom.season.gameRowHeight : null,
      games: gamePositions,
      season: s,
    };
    blocks.push(seaBlock);
    x = seaX1 + padAfter;

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
