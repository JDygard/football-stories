// Node simulation of the desktop pure-logic modules (vite build can't run in
// the sandbox). Synthetic franchise: 30 seasons, playoffs, staff, draft data.
import {
  buildDesktopLayout, ERA_FIT_MAX_SEASON_W, ERA_FIT_MIN_SEASON_W,
} from "../src/desktop/buildDesktopLayout.js";
import {
  DESKTOP_BANDS, ZOOM_LEVELS, desktopGeometryFor, zoomLabelFor,
} from "../src/desktop/desktopDetail.js";
import {
  buildDesktopRibbons, stripReserveByYear, CONN_W, BAND_H, MIN_BAND_H,
  LABEL_MIN_BAND_H, MAX_LABELLED_SLOTS,
  buildPillPlan, layoutPillRows, pillWidth,
} from "../src/desktop/desktopRibbonModel.js";
import {
  measureDraftDesktop, shortName, COMPACT_COL_W, FULL_COL_W,
} from "../src/desktop/desktopDraftModel.js";
import { pickBand } from "../src/hooks/zoomMath.js";
import {
  eraZoneFor,
  ERA_HEADER_H,
  ERA_HEADER_COMPACT_H,
} from "../src/desktop/desktopEraModel.js";
import {
  buildEraBoxes, eraYearsLabel, eraRecordLabel, estimateTextWidth,
  ERA_LABEL_FS, ERA_YEARS_FS, ERA_TEXT_INSET, ERA_LABEL_BASELINE,
} from "../src/desktop/desktopEraModel.js";

// Viewport width the fit-mode (Eras) assertions reason about.
const VIEWPORT_W = 1600;

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) { failures++; console.log("FAIL:", msg); }
};

// ---- synthetic data ----
const seasons = [];
for (let y = 1990; y < 2020; y++) {
  const n = 16;
  const games = [];
  for (let i = 0; i < n; i++) {
    const win = (i + y) % 3 !== 0;
    games.push({
      game_id: `${y}-${i}`, season: y, is_playoff: false,
      result: win ? "W" : "L", points_for: win ? 24 : 13, points_against: win ? 17 : 27,
      franchise_id: "TST", opponent_id: "OPP",
    });
  }
  if (y % 4 === 0) {
    games.push({ game_id: `${y}-p0`, season: y, is_playoff: true, result: "L",
      points_for: 20, points_against: 30, franchise_id: "TST", opponent_id: "OPP" });
  }
  seasons.push({
    year: y, games,
    season: { wins: 11, losses: 5, ties: 0, playoffs: y % 4 === 0 ? "Lost WC" : null,
      point_diff: 40, division_finish: "2nd of 4" },
  });
}

// fake draft data: picks per year (some big classes to test row clamp math)
const draftByYear = {};
for (let y = 1990; y < 2020; y++) {
  draftByYear[y] = Array.from({ length: y === 1992 ? 25 : 7 }, (_, i) => ({
    player_id: `p${y}-${i}`, year: y, round: 1 + (i % 7), pick_overall: i * 20 + 3,
    name: `Player ${i}`, position: "QB", value: { score: 50, tier: "B" },
  }));
}
const modData = { draftByYear, expandedYears: new Set([1995]) };
const fakeDraftModule = {
  id: "draft", minBand: "SEASON_LINES",
  measure: measureDraftDesktop,
  render: () => null,
};

// staff spans, incl. same-year entries and same-year exits
const staff = [
  { admin_person_id: "a", name: "Alice", role: "coach", from: 1990, to: 1999 },
  { admin_person_id: "b", name: "Bob", role: "gm", from: 1990, to: 2005, exit: "retired" },
  { admin_person_id: "c", name: "Carol", role: "owner", from: 1992, to: 2019 },
  { admin_person_id: "d", name: "Dan", role: "coach", from: 2000, to: 2005, exit: "to_team", next_team: "OPP" },
  { admin_person_id: "e", name: "Eve", role: "coach", from: 2006, to: 2012, entry: "from_team", prev_team: "OPP" },
  { admin_person_id: "f", name: "Fay", role: "gm", from: 2006, to: 2012, entry: "drafted" },
  { admin_person_id: "g", name: "Gil", role: "coach", from: 2013, to: 2019 },
];
const reserveByYear = stripReserveByYear(staff);
ok(reserveByYear[1990] === 2 * CONN_W, `reserve 1990 = 2 connectors (got ${reserveByYear[1990]})`);
ok(reserveByYear[2006] === 2 * CONN_W, "reserve 2006 = 2 connectors");

// ---- the ladder is exactly the four user-facing rungs ----
ok(DESKTOP_BANDS.length === ZOOM_LEVELS,
  `desktop ladder = ${ZOOM_LEVELS} rungs (got ${DESKTOP_BANDS.length}: ${DESKTOP_BANDS.join(",")})`);
{
  const rungs = DESKTOP_BANDS.map((b) => zoomLabelFor(b).zoom);
  ok(new Set(rungs).size === DESKTOP_BANDS.length,
    `no two bands share a zoom rung (got ${rungs.join(",")})`);
  ok(new Set(DESKTOP_BANDS.map((b) => zoomLabelFor(b).name)).size === DESKTOP_BANDS.length,
    "no two bands share a zoom name");
}

// ---- layouts per band ----
const layouts = DESKTOP_BANDS.map((band) =>
  buildDesktopLayout({
    seasons, modules: [fakeDraftModule], moduleData: modData, reserveByYear,
    detailBand: band, fitWidth: VIEWPORT_W,
  }),
);
const widths = layouts.map((l) => l.totalWidth);
console.log("band widths:", DESKTOP_BANDS.map((b, i) => `${b}=${Math.round(widths[i])}`).join("  "));
for (let i = 1; i < widths.length; i++) {
  ok(widths[i] < widths[i - 1], `totalWidth monotonic decreasing at ${DESKTOP_BANDS[i]}`);
}
// Adjacent bands must stay far enough apart in log space that pickBand's
// hysteresis can actually walk between them (that's what killed the fifth band).
// pickBand's algebra needs ratio > exp(2 * hyst) ≈ 1.271; assert 1.35 so
// retuning a band width has somewhere to go before the zoom silently sticks.
const MIN_BAND_RATIO = 1.35;
for (let i = 1; i < widths.length; i++) {
  ok(widths[i - 1] / widths[i] > MIN_BAND_RATIO,
    `bands ${DESKTOP_BANDS[i - 1]}/${DESKTOP_BANDS[i]} distinguishable (ratio ${(widths[i - 1] / widths[i]).toFixed(2)})`);
}
// Ribbon reserve is a constant ADDED to both sides of every ratio, so a heavily
// populated rail compresses them. Since row-mode season columns are fixed width,
// that compression is no longer offset by anything — check the crowded case too.
{
  const heavy = stripReserveByYear(
    Array.from({ length: 40 }, (_, i) => ({
      admin_person_id: `h${i}`, name: `H${i}`, role: "coach",
      from: 1990 + (i % 29), to: 1990 + (i % 29) + 2,
    })),
  );
  const hw = DESKTOP_BANDS.map((band) =>
    buildDesktopLayout({
      seasons, modules: [fakeDraftModule], moduleData: modData,
      reserveByYear: heavy, detailBand: band, fitWidth: VIEWPORT_W,
    }).totalWidth,
  );
  for (let i = 1; i < hw.length; i++) {
    ok(hw[i - 1] / hw[i] > MIN_BAND_RATIO,
      `crowded rail keeps ${DESKTOP_BANDS[i - 1]}/${DESKTOP_BANDS[i]} distinguishable (ratio ${(hw[i - 1] / hw[i]).toFixed(2)})`);
  }
}

for (const [i, L] of layouts.entries()) {
  const band = DESKTOP_BANDS[i];
  // contiguity + alternation
  let prev = 0, lastX1 = L.left;
  for (const b of L.blocks) {
    ok(Math.abs(b.x0 - lastX1) < 1e-9, `${band}: contiguous at ${b.type} ${b.year}`);
    lastX1 = b.x1;
    ok(Math.abs((b.x1 - b.x0) - b.width) < 1e-9, `${band}: width consistent ${b.year}`);
  }
  ok(L.blocks[0].type === "offseason", `${band}: starts with offseason`);
  ok(L.blocks.length === seasons.length * 2, `${band}: 2 blocks per year`);
  // year boundary: offseason(Y).x1 == season(Y).x0 == yearToX(Y)
  for (const y of [1990, 2001, 2019]) {
    const { offseason, season } = L.byYear.get(y);
    ok(Math.abs(offseason.x1 - season.x0) < 1e-9, `${band}: off/season boundary ${y}`);
    ok(Math.abs(L.yearToX(y) - season.x0) < 1e-6, `${band}: yearToX(${y}) == season.x0`);
  }
  // t<->x roundtrip
  for (const t of [1990.0, 1995.3, 2007.77, 2019.5]) {
    const x = L.tToX(t);
    const t2 = L.xToYear(x);
    ok(Math.abs(t2 - t) < 1e-6, `${band}: t->x->t roundtrip ${t} (got ${t2})`);
  }
  // reserve respected: modules start right of ribbonLeft + reserve
  const geom = desktopGeometryFor(band);
  if (geom.offseason !== "hidden") {
    const off = L.byYear.get(1990).offseason;
    ok(off.ribbonLeft === off.x0 + off.headerWidth, `${band}: ribbonLeft anchors after banner`);
    for (const m of off.modules) {
      ok(m.x >= off.ribbonLeft + off.reserve, `${band}: module clear of reserve (1990)`);
    }
  }
  // rows mode: the season is a game LOG in a fixed-width column. Every regular
  // game gets a row, in order, and playoff games are their own section beneath.
  const sea = L.byYear.get(1992).season; // a playoff year in the fixture
  if (sea.mode === "rows") {
    const reg = seasons.find((s) => s.year === 1992).games.filter((g) => !g.is_playoff);
    ok(sea.games.length === reg.length,
      `${band}: every regular-season game has a row (${sea.games.length} vs ${reg.length})`);
    ok(sea.games.every(({ i }, k) => i === k), `${band}: rows in game order`);
    ok(sea.games.every(({ g }) => !g.is_playoff), `${band}: playoff games kept out of the regular rows`);
    // Fixed column: the width can't depend on how many games were played, which
    // is the whole reason the band widths need checking separately (see above).
    const sea1991 = L.byYear.get(1991).season;
    ok(sea.width === sea1991.width, `${band}: season column width is fixed, not game-count-driven`);
    ok(sea.gameRowHeight > 0, `${band}: carries a nominal row pitch`);
    ok(sea.postseason && sea.postseason.kind === "rows", `${band}: postseason is its own row section`);
    ok(sea.postseason.games.every(({ g }) => g.is_playoff), `${band}: only playoff games in that section`);
    // A year that reached the postseason with no game-level rows degrades to a
    // one-line result strip rather than vanishing.
    const noRows = buildDesktopLayout({
      seasons: [{ year: 2000, games: [], season: { wins: 12, losses: 4, playoffs: "Won SB" } }],
      modules: [], moduleData: {}, reserveByYear: {}, detailBand: band,
    }).byYear.get(2000).season;
    ok(noRows.postseason && noRows.postseason.kind === "result" && noRows.postseason.result === "Won SB",
      `${band}: playoff finish without game rows degrades to a result strip`);
    // showPlayoffs off suppresses the whole section.
    const noPost = buildDesktopLayout({
      seasons, modules: [], moduleData: {}, reserveByYear: {},
      detailBand: band, showPlayoffs: false,
    }).byYear.get(1992).season;
    ok(noPost.postseason === null, `${band}: showPlayoffs=false drops the postseason section`);
  }
}

// ---- fit mode: the Eras band fills the viewport exactly ----
{
  const eraIdx = DESKTOP_BANDS.indexOf("ERA_SUMMARY");
  const era = layouts[eraIdx];
  ok(Math.abs(era.totalWidth - VIEWPORT_W) < 1,
    `Eras fits the viewport (${era.totalWidth.toFixed(1)} vs ${VIEWPORT_W})`);
  // Seasons got the leftover space, so they're far wider than the old fixed 12px
  // — that's the breathing room the ribbons and year labels needed.
  const w1995 = era.byYear.get(1995).season.width;
  ok(w1995 > 12, `fit widens season columns (got ${w1995.toFixed(1)})`);
  ok(w1995 <= ERA_FIT_MAX_SEASON_W + 1e-9, `fit respects the ceiling (got ${w1995.toFixed(1)})`);
  // Every season column is the same width; only offseasons (ribbon reserve) vary.
  const seasonWidths = new Set(
    era.blocks.filter((b) => b.type === "season").map((b) => b.width.toFixed(6)),
  );
  ok(seasonWidths.size === 1, `fit season columns uniform (got ${seasonWidths.size} distinct)`);

  // A wider window yields a wider band; a narrow one clamps to the floor and
  // scrolls rather than collapsing seasons to nothing.
  const wide = buildDesktopLayout({
    seasons, modules: [fakeDraftModule], moduleData: modData, reserveByYear,
    detailBand: "ERA_SUMMARY", fitWidth: 2400,
  });
  ok(Math.abs(wide.totalWidth - 2400) < 1, `fit tracks the window (got ${wide.totalWidth.toFixed(1)})`);
  const tiny = buildDesktopLayout({
    seasons, modules: [fakeDraftModule], moduleData: modData, reserveByYear,
    detailBand: "ERA_SUMMARY", fitWidth: 120,
  });
  ok(tiny.byYear.get(1995).season.width === ERA_FIT_MIN_SEASON_W,
    `unsatisfiable fit floors the season column (got ${tiny.byYear.get(1995).season.width})`);
  ok(tiny.totalWidth > 120, "over-narrow window scrolls rather than crushing seasons");

  // Same story with a heavily-populated rail: 40 tracked people reserve enough
  // connector columns that the fit can't be met, and seasons hold the floor.
  const crowdSpans = Array.from({ length: 40 }, (_, i) => ({
    admin_person_id: `c${i}`, name: `C${i}`, role: "coach",
    from: 1990 + (i % 29), to: 1990 + (i % 29) + 3,
  }));
  const crowded = buildDesktopLayout({
    seasons, modules: [fakeDraftModule], moduleData: modData,
    reserveByYear: stripReserveByYear(crowdSpans),
    detailBand: "ERA_SUMMARY", fitWidth: VIEWPORT_W,
  });
  ok(crowded.byYear.get(1995).season.width >= ERA_FIT_MIN_SEASON_W,
    `crowded rail never crushes seasons (got ${crowded.byYear.get(1995).season.width})`);

  // No fitWidth (the pre-measure frame) falls back to the static width.
  const unmeasured = buildDesktopLayout({
    seasons, modules: [fakeDraftModule], moduleData: modData, reserveByYear,
    detailBand: "ERA_SUMMARY",
  });
  ok(unmeasured.byYear.get(1995).season.width === 12, "no fitWidth falls back to the static width");
}

// Bands WITHOUT `fit` ignore fitWidth entirely — only Eras is viewport-driven.
for (const band of ["GAME_DETAIL", "GAME_BANDS", "SEASON_LINES"]) {
  const a = buildDesktopLayout({ seasons, modules: [fakeDraftModule], moduleData: modData, reserveByYear, detailBand: band, fitWidth: 800 });
  const b = buildDesktopLayout({ seasons, modules: [fakeDraftModule], moduleData: modData, reserveByYear, detailBand: band, fitWidth: 3000 });
  ok(a.totalWidth === b.totalWidth, `${band} is content-driven, not viewport-driven`);
}

// draft measure modes
ok(measureDraftDesktop({ year: 1991, mode: "compact", data: modData }) === COMPACT_COL_W, "compact class = labeled grade column");
ok(measureDraftDesktop({ year: 1995, mode: "compact", data: modData }) === FULL_COL_W, "expanded compact class = full column");
ok(measureDraftDesktop({ year: 1991, mode: "full", data: modData }) === FULL_COL_W, "full mode = full column");
ok(measureDraftDesktop({ year: 1975, mode: "full", data: modData }) === 0, "no picks = 0 width");

// grade-box name formatting
ok(shortName("Jamarr Chase") === "J. Chase", `shortName basic (got ${shortName("Jamarr Chase")})`);
ok(shortName("Odell Beckham Jr.") === "O. Beckham", `shortName drops suffix (got ${shortName("Odell Beckham Jr.")})`);
ok(shortName("Robert Griffin III") === "R. Griffin", `shortName drops numeral suffix (got ${shortName("Robert Griffin III")})`);
ok(shortName("Ochocinco") === "Ochocinco", "shortName passes a mononym through");
ok(shortName("") === "—", "shortName handles a missing name");
ok(shortName("Amon-Ra St. Brown") === "A. Brown", `shortName multi-token surname (got ${shortName("Amon-Ra St. Brown")})`);

// ---- ribbons on the SEASON_LINES layout ----
const L2 = layouts[DESKTOP_BANDS.indexOf("SEASON_LINES")];
const rb = buildDesktopRibbons({ staff, layout: L2 });
console.log(`ribbons: ${rb.ribbons.length}, slots: ${rb.slotCount}, bandH: ${rb.bandH}, railHeight: ${rb.railHeight}`);
ok(rb.ribbons.length === staff.length, "all spans became ribbons");
ok(rb.railHeight === rb.slotCount * rb.bandH, "railHeight = slots * bandH");
// entry connectors sit inside their year's reserved slice
for (const r of rb.ribbons) {
  const off = L2.byYear.get(r.from)?.offseason;
  if (off) {
    ok(r.x0 >= off.ribbonLeft - 1e-9 && r.x0 + CONN_W <= off.ribbonLeft + off.reserve + 1e-9,
      `ribbon ${r.name} entry inside reserve (x0=${r.x0}, ribbonLeft=${off.ribbonLeft}, reserve=${off.reserve})`);
  }
  ok(r.tailEnd > r.x0, `ribbon ${r.name} has extent`);
  if (r.hasExit) ok(r.exitX + CONN_W === r.tailEnd, `ribbon ${r.name} tailEnd = exit right edge`);
}
// same-slot ribbons never overlap in x
const bySlot = new Map();
for (const r of rb.ribbons) {
  if (!bySlot.has(r.slot)) bySlot.set(r.slot, []);
  bySlot.get(r.slot).push(r);
}
for (const [slot, list] of bySlot) {
  list.sort((a, b) => a.x0 - b.x0);
  for (let i = 1; i < list.length; i++) {
    ok(list[i].x0 >= list[i - 1].tailEnd - 1e-9, `slot ${slot} bands don't overlap (${list[i - 1].name} vs ${list[i].name})`);
  }
}
// same-year exits (d: to 2005, b: to 2005) are staggered apart
const dR = rb.ribbons.find((r) => r.name === "Dan");
const bR = rb.ribbons.find((r) => r.name === "Bob");
ok(dR.hasExit && bR.hasExit && dR.exitX !== bR.exitX, `shared exits staggered (Dan ${dR.exitX} vs Bob ${bR.exitX})`);
// no exit connector lands on an entry column
const entryCols = new Set(rb.ribbons.map((r) => r.x0));
for (const r of rb.ribbons) {
  if (r.hasExit) ok(!entryCols.has(r.exitX), `exit of ${r.name} not on an entry column`);
}

// ---- always-visible pill plan ----
// layoutPillRows: separated pills share row 0; overlapping pairs split rows;
// a third overlapper beyond maxRows hides (-1).
const rows1 = layoutPillRows([
  { key: "a", x: 100, w: 60 }, { key: "b", x: 300, w: 60 },
]);
ok(rows1.get("a") === 0 && rows1.get("b") === 0, "separated pills share row 0");
const rows2 = layoutPillRows([
  { key: "a", x: 100, w: 60 }, { key: "b", x: 116, w: 60 }, { key: "c", x: 132, w: 60 },
]);
ok(rows2.get("a") === 0 && rows2.get("b") === 1 && rows2.get("c") === -1,
  `crowded pills stack then hide (${rows2.get("a")},${rows2.get("b")},${rows2.get("c")})`);
ok(pillWidth("Retired") > 40, "pill width scales with text");

const plan = buildPillPlan(rb.ribbons);
// Eve (from_team) + Fay (drafted) enter 2006 on adjacent connectors -> pills
// collide -> two entry rows. Bob (retired) + Dan (to_team) exit staggered ->
// still overlapping pill widths -> two exit rows.
ok(plan.entryRows === 2, `entry pills packed into 2 rows (got ${plan.entryRows})`);
ok(plan.exitRows >= 1, `exit pills present (got ${plan.exitRows} rows)`);
ok(plan.entryByKey.size === 2 && plan.exitByKey.size === 2, "pill plan covers labeled ribbons only");
// no same-row horizontal overlaps among placed pills
for (const side of [plan.entryByKey, plan.exitByKey]) {
  const byRow = new Map();
  for (const p of side.values()) {
    if (p.row < 0) continue;
    if (!byRow.has(p.row)) byRow.set(p.row, []);
    byRow.get(p.row).push(p);
  }
  for (const [row, list] of byRow) {
    list.sort((a, b) => a.x - b.x);
    for (let i = 1; i < list.length; i++) {
      ok(list[i].x - list[i].w / 2 >= list[i - 1].x + list[i - 1].w / 2,
        `row ${row} pills don't overlap`);
    }
  }
}

// CROWDING. The rail caps concurrent ribbons rather than squishing past the
// point a band can hold its name. This used to allow 16 slots against a 6px
// floor while the render layer only drew labels at >=11px, so at 9 concurrent
// ribbons every label on the rail — including the coaches' — silently vanished.
// The timeline is for reading a few careers, not for stacking a whole roster.
const buildCrowd = (n) => {
  const crowd = Array.from({ length: n }, (_, i) => ({
    admin_person_id: `x${i}`, name: `X${i}`, role: "coach", from: 1991, to: 2018,
  }));
  return buildDesktopRibbons({
    staff: crowd,
    layout: buildDesktopLayout({ seasons, modules: [], moduleData: {}, reserveByYear: stripReserveByYear(crowd), detailBand: "SEASON_LINES" }),
  });
};

// THE INVARIANT: at every reachable slot count, a band can still hold its
// label. If this fails, names disappear from the rail with no other symptom.
for (let n = 1; n <= 20; n++) {
  const rb = buildCrowd(n);
  ok(rb.bandH >= LABEL_MIN_BAND_H,
    `${n} concurrent ribbons: bandH ${rb.bandH} still fits a label (>=${LABEL_MIN_BAND_H})`);
  ok(rb.slotCount <= MAX_LABELLED_SLOTS,
    `${n} concurrent ribbons: rail caps at ${MAX_LABELLED_SLOTS} slots (got ${rb.slotCount})`);
}

const rb2 = buildCrowd(12);
ok(rb2.slotCount === MAX_LABELLED_SLOTS, `12 concurrent -> capped to ${MAX_LABELLED_SLOTS} (got ${rb2.slotCount})`);
ok(rb2.dropped === 12 - MAX_LABELLED_SLOTS,
  `the cap REPORTS what it dropped (${rb2.dropped}), so the UI can say so`);
ok(rb2.ribbons.length === MAX_LABELLED_SLOTS, `only the kept ribbons are returned (${rb2.ribbons.length})`);
ok(rb2.bandH < BAND_H, `crowd bands still squish toward the floor (bandH=${rb2.bandH})`);
ok(rb2.railHeight <= 6 * BAND_H, `rail within squish budget (${rb2.railHeight})`);
ok(buildCrowd(4).dropped === 0, "an uncrowded rail drops nothing");

// ---- NAMED ERAS: curated era rows -> frame boxes ----
// Synthetic franchise runs 1990..2019, so these cover the three cases the
// curated file can legitimately produce: an ordinary interior era, one that
// runs past the last played season (ongoing), and one authored entirely
// outside the data.
const eraLayout = buildDesktopLayout({
  seasons, modules: [], moduleData: {}, reserveByYear: {},
  detailBand: "ERA_SUMMARY", fitWidth: VIEWPORT_W,
});
const eraRows = [
  { id: "early", label: "The Early Years", short: "Early", start: 1990, end: 1999,
    record: { wins: 84, losses: 76, ties: 0 } },
  { id: "one", label: "The Long Name Of A Single Lost Season", short: "Lost", start: 2003, end: 2003,
    record: { wins: 11, losses: 5, ties: 0 } },
  { id: "nano", label: "Another Very Long Name For One Season", start: 2006, end: 2006,
    record: { wins: 4, losses: 12, ties: 0 } },
  { id: "late", label: "The Modern Era", start: 2010, end: null, ongoing: true,
    record: { wins: 90, losses: 69, ties: 1 } },
  { id: "ghost", label: "Before The Data", start: 1950, end: 1960 },
];
const eraBoxes = buildEraBoxes({ eras: eraRows, layout: eraLayout });

ok(eraBoxes.length === 4, `eras outside the data are dropped (got ${eraBoxes.length})`);
ok(!eraBoxes.some((b) => b.id === "ghost"), "the pre-data era is the one dropped");

const byId = Object.fromEntries(eraBoxes.map((b) => [b.id, b]));
ok(byId.early.x0 === eraLayout.byYear.get(1990).offseason.x0,
  "a frame opens at its first year's OFFSEASON edge");
ok(byId.early.x1 === eraLayout.byYear.get(1999).season.x1,
  "a frame closes at its last year's SEASON edge");
// An ongoing era stops at the last season played, not off the end of the
// timeline — the curated `end: null` is resolved against the data.
ok(byId.late.lastYear === 2019 && byId.late.x1 === eraLayout.byYear.get(2019).season.x1,
  `an ongoing era clamps to the last played season (got ${byId.late.lastYear})`);
ok(byId.late.x1 <= eraLayout.totalWidth, "no frame runs past the timeline");

// Frames never overlap, because the curated file forbids overlapping eras
// (eras.py enforces it) — so the boxes must come out in order and disjoint.
const ordered = [...eraBoxes].sort((a, b) => a.x0 - b.x0);
for (let i = 1; i < ordered.length; i++) {
  ok(ordered[i].x0 >= ordered[i - 1].x1,
    `era frames stay disjoint (${ordered[i - 1].id} -> ${ordered[i].id})`);
}
for (const b of eraBoxes) ok(b.width > 0, `${b.id} frame has width`);

// Title fit: a wide frame keeps its full label; a one-season frame can't hold
// either the label or the short form, but still shows its years.
ok(byId.early.labelText === "The Early Years", "a wide frame keeps its full title");
// At the coarsest band a single season is ~50px wide: too narrow for the
// title AND for the short form, so the frame carries only its years.
ok(byId.one.labelText === null,
  `a one-season frame at Eras drops the title entirely (got ${JSON.stringify(byId.one.labelText)})`);
ok(byId.nano.labelText === null,
  `…short form or not (got ${JSON.stringify(byId.nano.labelText)})`);
// …and at that width the standardized 26px gutter leaves no room for the years
// either, so a single season at the coarsest zoom is a bare tinted frame. It
// gets its label back one rung down (asserted below). Standardising the gutter
// is worth this: the alternative was every frame indenting differently.
ok(!byId.nano.showYears, "a one-season frame at Eras carries no caption at all");
ok(byId.one.yearsText === "2003", "a one-season era reads as a single year");
ok(byId.late.yearsText === "2010–now", "an ongoing era reads as -now");
ok(eraYearsLabel({ start: 1998, end: 2010 }) === "1998–2010", "closed eras read start-end");
// Whatever fits is measured the same way the renderer will draw it.
for (const b of eraBoxes) {
  if (b.labelText) {
    ok(estimateTextWidth(b.labelText, ERA_LABEL_FS, "serif") <= b.width,
      `${b.id} title fits inside its frame`);
  }
}

// The frames follow the layout, so they still line up one rung down (Seasons).
const eraLayout2 = buildDesktopLayout({
  seasons, modules: [], moduleData: {}, reserveByYear: {}, detailBand: "SEASON_LINES",
});
const eraBoxes2 = buildEraBoxes({ eras: eraRows, layout: eraLayout2 });
ok(eraBoxes2.length === 4, "same eras survive at the Seasons band");
ok(eraBoxes2[0].x0 === eraLayout2.byYear.get(1990).offseason.x0,
  "frames re-solve against the Seasons-band layout");
ok(eraBoxes2[0].width > byId.early.width,
  "a wider band gives the same era a wider frame");
// The label -> short -> nothing fallback, exercised where it actually bites:
// one Seasons-band season is wide enough for "Lost" but not for the full name.
const byId2 = Object.fromEntries(eraBoxes2.map((b) => [b.id, b]));
ok(byId2.one.labelText === "Lost",
  `a narrow frame falls back to the authored short form (got ${JSON.stringify(byId2.one.labelText)})`);
ok(byId2.nano.labelText === null,
  `…and to nothing when no short form was authored (got ${JSON.stringify(byId2.nano.labelText)})`);
ok(byId2.one.showYears && byId2.nano.showYears,
  "one-season frames get their years back at the Seasons band");

// THE standardized gutter: every line of era text starts exactly
// ERA_TEXT_INSET from its own frame's left border — no proportional drift —
// and still ends inside the frame.
for (const b of [...eraBoxes, ...eraBoxes2]) {
  ok(b.textX === b.x0 + ERA_TEXT_INSET, `${b.id} text hangs off the standard gutter`);
  if (b.labelText) {
    ok(b.labelX === b.textX, `${b.id} title shares the gutter`);
    ok(b.labelX + estimateTextWidth(b.labelText, ERA_LABEL_FS, "serif") <= b.x1 + 0.01,
      `${b.id} title stays inside its frame`);
  }
  if (b.showYears) ok(b.yearsX === b.textX, `${b.id} years share the gutter`);
}
// ---- the record line ----
// Ties are punctuated only when they exist, matching recordStr() in the
// timeline layer — every modern chapter would otherwise carry a bare "-0".
ok(eraRecordLabel({ record: { wins: 84, losses: 76, ties: 0 } }) === "84-76",
  "a tieless record reads W-L");
ok(eraRecordLabel({ record: { wins: 43, losses: 113, ties: 4 } }) === "43-113-4",
  "a record with ties reads W-L-T");
ok(eraRecordLabel({}) === "", "no record, no line");
ok(byId.early.recordText === "84-76" && byId.early.showRecord,
  "a wide frame shows its record");
// Inline with the title where the pair fits; its own line only when it can't.
ok(byId.early.recordInline, "a wide frame puts the record beside the title");
ok(byId.early.recordX > byId.early.labelX,
  "an inline record sits to the RIGHT of the title");
ok(byId.early.recordBaseline === ERA_LABEL_BASELINE,
  "an inline record shares the title's baseline");
// An inline record must clear the REAL glyphs of the title, not the optimistic
// fit estimate — placing it off the tight measure printed it through the tail
// of "Grant's Twilight". The placement measure is the pessimistic one.
ok(estimateTextWidth("Grant's Twilight", ERA_LABEL_FS, "serifWide") >
   estimateTextWidth("Grant's Twilight", ERA_LABEL_FS, "serif"),
  "the placement measure is wider than the fit measure");
for (const b of [...eraBoxes, ...eraBoxes2]) {
  if (!b.recordInline) continue;
  const titleEnd =
    b.labelX + estimateTextWidth(b.labelText, ERA_LABEL_FS, "serifWide");
  ok(b.recordX >= titleEnd, `${b.id} inline record clears the title's glyphs`);
  ok(b.recordX + estimateTextWidth(b.recordText, 12.5, "sans") <= b.x1,
    `${b.id} inline record still lands inside the frame`);
}
{
  // A frame just wide enough for its title but not for title + record.
  const tight = buildEraBoxes({
    eras: [{ id: "tight", label: "The Early Years", start: 1990, end: 1993,
             record: { wins: 30, losses: 34, ties: 0 } }],
    layout: eraLayout2,
  })[0];
  if (tight?.showRecord && !tight.recordInline) {
    ok(tight.recordX === tight.textX, "a stacked record returns to the gutter");
    ok(tight.recordBaseline > ERA_LABEL_BASELINE, "…on the line below the title");
  }
}
ok(byId.late.recordText === "90-69-1", "the ongoing era carries its ties");
// The record captions the TITLE, so a frame with no name doesn't get one — a
// bare number under a date range reads as a stray figure.
ok(byId.nano.labelText === null && !byId.nano.showRecord,
  "a nameless frame shows no record either");
// …and it hangs off the same gutter as everything else.
for (const b of [...eraBoxes, ...eraBoxes2]) {
  if (b.showRecord && !b.recordInline) {
    ok(b.recordX === b.textX, `${b.id} stacked record shares the gutter`);
  }
}

// The width estimate is per-character, not per-glyph-count: a string of narrow
// letters must measure narrower than the same number of wide ones, or short
// chapter names get dropped from frames they comfortably fit.
ok(estimateTextWidth("IIIIII", ERA_LABEL_FS, "serif") <
   estimateTextWidth("MMMMMM", ERA_LABEL_FS, "serif"),
  "narrow glyphs measure narrower than wide ones at equal length");
// …and tracking counts toward the fit, which is what keeps a spaced-out date
// line inside its own frame.
ok(estimateTextWidth("1970–1972", ERA_YEARS_FS, "sans", 2) >
   estimateTextWidth("1970–1972", ERA_YEARS_FS, "sans"),
  "letter tracking counts toward the fit");

// Two frames of different widths put their text the same distance in — the
// property a proportional anchor could never give.
ok(byId.early.labelX - byId.early.x0 === byId2.early.labelX - byId2.early.x0,
  "the gutter is identical across bands and frame widths");
// Adjacent eras never share a palette slot.
for (let i = 1; i < eraBoxes.length; i++) {
  ok(eraBoxes[i].tone !== eraBoxes[i - 1].tone, `era ${i} has its own tone`);
}

// ---- zoom band picking over desktop widths ----
const LAST = widths.length - 1;
let committed = 2;
committed = pickBand(widths[0], committed, widths);
ok(committed === 0, `pickBand walks to most detail (got ${committed})`);
committed = pickBand(widths[LAST], committed, widths);
ok(committed === LAST, `pickBand walks to least detail (got ${committed})`);
committed = pickBand(Math.sqrt(widths[2] * widths[LAST]), 2, widths);
ok(committed === 2, "hysteresis holds at a boundary");
// Every rung is reachable from every other, in both directions — the property
// the removed fifth band broke when its width converged on ERA_SUMMARY's.
for (let from = 0; from <= LAST; from++) {
  for (let to = 0; to <= LAST; to++) {
    ok(pickBand(widths[to], from, widths) === to,
      `rung ${from} -> ${to} reachable (got ${pickBand(widths[to], from, widths)})`);
  }
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL SIMS PASS");
process.exit(failures ? 1 : 0);
