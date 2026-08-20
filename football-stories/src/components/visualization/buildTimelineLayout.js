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
// eras: the curated Named Era rows for this franchise (or null). At the two
// coarsest bands (ERA_BANDS) a chapter buys its own breathing room out of the
// blocks at its ends: its FIRST year takes an ERA_HEADER_H plaque row off the
// top of its offseason block, and its LAST year takes an ERA_FOOT_H clear-space
// row off the bottom of its season block. So a title has real space and can
// never land on a season, a card or a ribbon, and the closing border never sits
// flush against the last season.
//
// Both rows belong to a BLOCK rather than sitting BETWEEN two blocks — that
// keeps the stack contiguous, which is what tToY/yToYear (and the zoom anchor
// that calls them) rely on. The cost is that a season block's `height` is no
// longer purely its content, so it also reports `contentHeight`/`contentY1` for
// renderers that lay out inside it. See eraModel.js.
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
import {
  ERA_BANDS,
  ERA_FRAMED_BANDS,
  ERA_HEADER_H,
  ERA_FOOT_H,
  eraSpans,
} from "./eraModel.js";

const OFF_FRAC = 0.4; // nominal time share of an offseason (axis/anchor only)
const SEA_FRAC = 0.6; // nominal time share of a season   (OFF_FRAC + SEA_FRAC = 1)

// The offseason renders as a full-width "year banner": a header band carrying
// the big year, that season's record, and the all-time win-rate value. We
// reserve real layout space for it (below any ribbon-entry reserve, above the
// content modules) so the header never overlaps the draft class beneath it.
const OFF_HEADER_FULL = 38; // header px in full mode (zoom 4)
// Both of these lead with the year, and both carry ~12px of breathing room
// above it (the page's arriving-ribbon rows sit directly on top of the header,
// the card's border does).
const OFF_HEADER_COMPACT = 56; // Seasons-card header (year+grade row, win% row)
const OFF_HEADER_PAGE = 72; // season-page header (big year + win-rate pill)

// Season-page ("Season by season", zoom 3) section geometry: each year is a
// dossier of stacked sections — REGULAR SEASON (record line + W/L chip row),
// DRAFT CLASS (label + module), PLAYOFFS (label + result).
//
// These pages used to be padded to a full viewport and scroll-snapped one per
// screen. That's gone: a page is now exactly as tall as its own content and the
// band scrolls like every other one. The snap metered the scroll — you couldn't
// glance across two seasons or land between them — and the padding left a lot
// of empty screen under a short year.
const SEC_LABEL_H = 24; // section divider + letterspaced label
const REC_LINE_H = 20; // record line under REGULAR SEASON
const CHIPS_H = 26; // W/L chip row
const SEC_PAD = 10;
const POST_LINE_H = 22; // playoff result line ("Missed Playoffs" / finish)

// Clear space above a year's arriving-personnel bands at the "Eras" zoom.
// Every other band puts a year banner or a card header between the previous
// season and this year's arrivals; that band has neither (offseasons are
// hidden), so an entry band landed flush on the season line above it. Only
// bought when the year actually has arrivals — otherwise it would pad all ~60
// years of a franchise for the sake of the handful that need it.
const ERA_ZOOM_RIBBON_HEADROOM = 10;

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
  // Curated Named Era rows (segments/teams_eras/{FID}.json -> `eras`), or null
  // when the franchise has none authored / the feature is toggled off.
  eras = null,
  // { [eraId]: px } — extra plaque height a chapter has asked for, over the
  // standard ERA_HEADER_H. Today only the SELECTED chapter asks, and only for
  // room to print its blurb (see eraBlurbLayout in eraModel). It arrives as a
  // map rather than a single id + height so the layout never has to know what
  // the extra space is FOR, and so a second reason to grow a plaque needs no
  // change here.
  eraHeaderExtra = null,
}) {
  const geom = geometryFor(detailBand);
  const isPage = geom.season.mode === "page";
  const sorted = [...(seasons || [])].sort((a, b) => a.year - b.year);

  // Named Eras, resolved to the years actually present in the data. Only the
  // two coarsest bands frame them; everywhere else the timeline is built
  // exactly as it was before the feature existed.
  const spans = ERA_BANDS.has(detailBand)
    ? eraSpans({ eras, years: sorted.map((s) => s.year) })
    : [];
  const eraOpensAt = new Map(spans.map((e, i) => [e.firstYear, i]));
  // Only a FRAMED band closes a chapter with a foot: the clear space exists to
  // keep a border off the last season, and Season by season draws no border.
  const eraClosesAt = ERA_FRAMED_BANDS.has(detailBand)
    ? new Map(spans.map((e, i) => [e.lastYear, i]))
    : new Map();
  const eraBoxes = spans.map((e) => ({ ...e, y0: 0, contentY: 0, y1: 0 }));

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
    // A Named Era opening on this year buys a plaque row off the TOP of this
    // block. Everything else in the block measures from `blockTop`, below it,
    // so the chapter's title sits in space nothing else can occupy. When no era
    // opens here `eraLead` is 0 and every line below is unchanged.
    const eraIndex = eraOpensAt.get(year);
    const eraLead =
      eraIndex === undefined
        ? 0
        : ERA_HEADER_H + Math.max(0, eraHeaderExtra?.[spans[eraIndex].id] || 0);
    const blockTop = offY0 + eraLead;
    const reserve = Math.max(0, reserveByYear[year] || 0);
    // Header band height by mode; hidden bands get none (no banner there).
    const headerH = isPage
      ? OFF_HEADER_PAGE
      : geom.offseason === "hidden"
        ? 0
        : geom.offseason === "full"
          ? OFF_HEADER_FULL
          : OFF_HEADER_COMPACT;
    // Stacking order within the offseason block (top → bottom):
    //   header (the year marker)  ->  ribbon-entry reserve  ->  content modules
    // The year therefore sits ABOVE the incoming-ribbons area. ribbonTop marks
    // where entry bands anchor (consumed by staffRibbonModel).
    // PAGE mode inverts the first two — personnel ribbons ride the very top of
    // the season page, the big year below — and holds NO modules (the draft
    // renders as a section of the season page instead, per the mockup's
    // section order).
    //
    // The CARRIED-OVER stack (people already in post) is not reserved here:
    // the renderer pushes the whole timeline down by the live stack height
    // instead (see resolveRibbonStrips), which is the only thing that works
    // mid-year as well as at year boundaries. `reserve` covers this year's
    // arrivals, which anchor at a fixed row until they pin.
    //
    // `ribbonLead` is the Eras-zoom headroom described at the constant: with no
    // header of any kind between the previous season and this year's arrivals,
    // the entry bands need their own clear space or they sit flush on the line
    // above.
    const ribbonLead =
      geom.offseason === "hidden" && reserve > 0 ? ERA_ZOOM_RIBBON_HEADROOM : 0;
    const ribbonTop = isPage ? blockTop : blockTop + headerH + ribbonLead;
    const headerY = isPage ? blockTop + reserve : blockTop;
    const bodyTop = isPage ? headerY + headerH : ribbonTop + reserve;
    const moduleBoxes = [];
    let cursor = bodyTop + offseasonPadding;
    if (!isPage) {
      for (const m of activeModules) {
        const h = Math.max(
          0,
          m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0,
        );
        if (h <= 0) continue;
        moduleBoxes.push({ id: m.id, module: m, y: cursor, height: h });
        cursor += h + offseasonPadding;
      }
    }
    // A banner year with no modules is still a real block: just its header.
    const minOff =
      eraLead + ribbonLead + reserve + headerH + (headerH ? 0 : minOffseasonHeight);
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
      headerY,
      ribbonTop,
      // The era plaque row this block is carrying (0 on all but an era's first
      // year), and where the block's own content starts below it. Renderers
      // that paint a surface for the whole block — the zoom-2 card, the zoom-4
      // paper — must measure from `contentY`, or the card swallows the plaque.
      eraHeaderHeight: eraLead,
      contentY: blockTop,
      tStart: year - OFF_FRAC,
      tEnd: year,
      modules: moduleBoxes,
    };
    blocks.push(offBlock);
    y = offY1;

    // ---- SEASON BLOCK (games of `year`, below its offseason) ----
    const seaY0 = y;
    const seaHeaderH = isPage
      ? 0
      : geom.offseason === "hidden"
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
    let page = null;
    let seaModules;
    if (isPage) {
      // ---- SEASON PAGE (zoom 3): stacked sections, mockup order ----
      //   REGULAR SEASON (record + W/L chips) -> DRAFT CLASS -> PLAYOFFS
      const reg = games.filter((g) => !g.is_playoff);
      const post = showPlayoffs ? games.filter((g) => g.is_playoff) : [];
      const regularLabelY = seaY0 + SEC_PAD;
      const recY = regularLabelY + SEC_LABEL_H;
      const chipsY = recY + REC_LINE_H + 4;
      let cursor = chipsY + CHIPS_H + SEC_PAD;
      seaModules = [];
      let draftLabelY = null;
      for (const m of activeModules) {
        const h = Math.max(
          0,
          m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0,
        );
        if (h <= 0) continue;
        if (draftLabelY == null) {
          draftLabelY = cursor;
          cursor += SEC_LABEL_H;
        }
        seaModules.push({ id: m.id, module: m, y: cursor, height: h });
        cursor += h + SEC_PAD;
      }
      if (showPlayoffs) {
        const labelY = cursor;
        const resultY = labelY + SEC_LABEL_H;
        const postChipsY = post.length ? resultY + POST_LINE_H + 2 : null;
        cursor = (postChipsY != null ? postChipsY + CHIPS_H : resultY + POST_LINE_H) + SEC_PAD;
        postseason = {
          kind: "pageSection",
          labelY,
          resultY,
          chipsY: postChipsY,
          chipsH: CHIPS_H,
          result: playoffsResult,
          games: post.map((g, i) => ({ g, i })),
        };
      }
      seaHeight = Math.max(minSeasonHeight, cursor - seaY0);
      page = { regularLabelY, recY, chipsY, chipsH: CHIPS_H, draftLabelY };
      // Nominal per-game positions (win-rate curve anchoring): spread evenly
      // through the page like the line modes.
      const mReg = reg.length || 1;
      gamePositions = reg.map((g, i) => ({ g, i, y: seaY0 + ((i + 0.5) / mReg) * seaHeight }));
    } else if (geom.season.mode === "rows") {
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
    // A Named Era closing on this year buys its clear space off the BOTTOM of
    // this block, after every section above has been positioned — so the foot
    // pads the frame without moving a single mark inside the season.
    const eraFoot = eraClosesAt.has(year) ? ERA_FOOT_H : 0;
    const seaY1 = seaY0 + seaHeight + eraFoot;

    const seaBlock = {
      type: "season",
      year,
      y0: seaY0,
      y1: seaY1,
      // `height` spans the block INCLUDING the era foot, because the block
      // stack and the t<->y mappings are defined over y0..y1. Anything laying
      // out season content wants `contentHeight`/`contentY1` instead — the
      // zoom-2 card and the line-mode centring both do.
      height: seaHeight + eraFoot,
      contentHeight: seaHeight,
      contentY1: seaY0 + seaHeight,
      eraFootHeight: eraFoot,
      seasonHeaderHeight: seaHeaderH,
      postseason,
      tStart: year,
      tEnd: year + SEA_FRAC,
      mode: geom.season.mode,
      gameRowHeight: geom.season.mode === "rows" ? geom.season.gameRowHeight : null,
      games: gamePositions,
      season: s,
      // Page mode only: section offsets + the draft module box (the draft
      // renders as a season-page section, not in the offseason block).
      page,
      modules: seaModules,
    };
    blocks.push(seaBlock);
    y = seaY1;

    byYear.set(year, { offseason: offBlock, season: seaBlock });

    // Era frames close on the SEASON of their last year, so a chapter encloses
    // whole years — the draft class that opens a year is inside the era that
    // year belongs to, not trailing off the end of the one before it.
    if (eraIndex !== undefined) {
      eraBoxes[eraIndex].y0 = offY0;
      eraBoxes[eraIndex].contentY = blockTop;
      // The plaque row's height travels with the box, so the renderer draws
      // into exactly the space that was bought for it rather than re-deriving
      // it and risking a different answer.
      eraBoxes[eraIndex].headerH = eraLead;
    }
    for (const box of eraBoxes) {
      if (year >= box.firstYear && year <= box.lastYear) box.y1 = seaY1;
    }
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
    // Named Era frames in layout coordinates: y0 = top of the plaque row,
    // contentY = where the timeline resumes under it, y1 = bottom of the last
    // season in the chapter. Empty at every band outside ERA_BANDS. The x
    // extents and the text fit are the renderer's half of the job — see
    // buildEraBoxes in eraModel.js.
    eras: eraBoxes,
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
