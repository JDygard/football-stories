// Node simulation of the desktop pure-logic modules (vite build can't run in
// the sandbox). Synthetic franchise: 30 seasons, playoffs, staff, draft data.
import { buildDesktopLayout } from "../src/desktop/buildDesktopLayout.js";
import { DETAIL_BANDS, desktopGeometryFor } from "../src/desktop/desktopDetail.js";
import {
  buildDesktopRibbons, stripReserveByYear, CONN_W, BAND_H, MIN_BAND_H,
  buildPillPlan, layoutPillRows, pillWidth,
} from "../src/desktop/desktopRibbonModel.js";
import { measureDraftDesktop, CHIP_COL_W, FULL_COL_W } from "../src/desktop/desktopDraftModel.js";
import { pickBand } from "../src/hooks/zoomMath.js";

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

// ---- layouts per band ----
const layouts = DETAIL_BANDS.map((band) =>
  buildDesktopLayout({ seasons, modules: [fakeDraftModule], moduleData: modData, reserveByYear, detailBand: band }),
);
const widths = layouts.map((l) => l.totalWidth);
console.log("band widths:", DETAIL_BANDS.map((b, i) => `${b}=${widths[i]}`).join("  "));
for (let i = 1; i < widths.length; i++) {
  ok(widths[i] < widths[i - 1], `totalWidth monotonic decreasing at ${DETAIL_BANDS[i]}`);
}

for (const [i, L] of layouts.entries()) {
  const band = DETAIL_BANDS[i];
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
  // game columns inside season block, ordered
  const sea = L.byYear.get(1992).season;
  if (sea.mode === "cols") {
    let px = -Infinity;
    for (const { x } of sea.games) {
      ok(x > px, `${band}: game cols ordered`);
      px = x;
      ok(x > sea.x0 && x < sea.x1, `${band}: game col inside block`);
    }
    if (band === "GAME_DETAIL") {
      ok(sea.postseason && sea.postseason.kind === "cols", `${band}: postseason cols in playoff year`);
      ok(sea.postseason.games.every(({ x }) => x < sea.x1), `${band}: playoff cols inside block`);
    } else {
      ok(sea.postseason && sea.postseason.kind === "result", `${band}: postseason result strip`);
    }
  }
}

// draft measure modes
ok(measureDraftDesktop({ year: 1991, mode: "compact", data: modData }) === CHIP_COL_W, "compact class = chip column");
ok(measureDraftDesktop({ year: 1995, mode: "compact", data: modData }) === FULL_COL_W, "expanded compact class = full column");
ok(measureDraftDesktop({ year: 1991, mode: "full", data: modData }) === FULL_COL_W, "full mode = full column");
ok(measureDraftDesktop({ year: 1975, mode: "full", data: modData }) === 0, "no picks = 0 width");

// ---- ribbons on the SEASON_LINES layout ----
const L2 = layouts[2];
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

// squish: 12 concurrent ribbons
const crowd = Array.from({ length: 12 }, (_, i) => ({
  admin_person_id: `x${i}`, name: `X${i}`, role: "coach", from: 1991, to: 2018,
}));
const rb2 = buildDesktopRibbons({
  staff: crowd,
  layout: buildDesktopLayout({ seasons, modules: [], moduleData: {}, reserveByYear: stripReserveByYear(crowd), detailBand: "SEASON_LINES" }),
});
ok(rb2.slotCount === 12, `crowd slots = 12 (got ${rb2.slotCount})`);
ok(rb2.bandH < BAND_H && rb2.bandH >= MIN_BAND_H, `crowd bands squished (bandH=${rb2.bandH})`);
ok(rb2.railHeight <= 6 * BAND_H, `rail within squish budget (${rb2.railHeight})`);

// ---- zoom band picking over desktop widths ----
let committed = 2;
committed = pickBand(widths[0], committed, widths);
ok(committed === 0, `pickBand walks to most detail (got ${committed})`);
committed = pickBand(widths[4], committed, widths);
ok(committed === 4, `pickBand walks to least detail (got ${committed})`);
committed = pickBand(Math.sqrt(widths[2] * widths[3]), 2, widths);
ok(committed === 2, "hysteresis holds at a boundary");

console.log(failures ? `\n${failures} FAILURES` : "\nALL SIMS PASS");
process.exit(failures ? 1 : 0);
