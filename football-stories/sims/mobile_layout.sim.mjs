// Node simulation of the mobile pure-logic modules after the zoom redesign
// (2026-07-31): Seasons cards (zoom 2), snap season pages (zoom 3), renamed
// labels, monotone gesture heights. Run: node sims/mobile_layout.sim.mjs
import { buildTimelineLayout } from "../src/components/visualization/buildTimelineLayout.js";
import { DETAIL_BANDS, MOBILE_BANDS, ZOOM_LABELS, geometryFor } from "../src/components/visualization/detail.js";
import { measureDraft, COMPACT_H, PICK_ROW_H, HEADER_H, BOTTOM_PAD } from "../src/components/visualization/offseason/draftModel.js";
import {
  stripReserveByYear, buildStaffRibbons, resolveRibbonStrips, maxStackHeight, STRIP_H,
} from "../src/components/visualization/staffRibbonModel.js";
import { pickBand } from "../src/hooks/zoomMath.js";

let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log("FAIL:", m); } };

// ---- labels ----
ok(ZOOM_LABELS.GAME_DETAIL.name === "Every Game", "zoom 4 = Every Game");
ok(ZOOM_LABELS.GAME_BANDS.name === "Season by season", "zoom 3 = Season by season");
ok(ZOOM_LABELS.SEASON_LINES.name === "Seasons", "zoom 2 = Seasons");
ok(ZOOM_LABELS.ERA_SUMMARY.name === "Eras" && ZOOM_LABELS.FRANCHISE_OVERVIEW.name === "Eras", "zoom 1 = Eras");

// ---- the phone ladder has exactly one stop per user-facing rung ----
ok(DETAIL_BANDS.length === 5, "shared band model still has 5 bands (desktop uses all)");
ok(MOBILE_BANDS.length === 4, "mobile ladder = 4 stops");
ok(!MOBILE_BANDS.includes("FRANCHISE_OVERVIEW"), "mobile stops at ERA_SUMMARY");
ok(new Set(MOBILE_BANDS.map((b) => ZOOM_LABELS[b].name)).size === 4, "no duplicate mobile zoom names");

// ---- synthetic data ----
const seasons = [];
for (let y = 1990; y < 2020; y++) {
  const games = [];
  for (let i = 0; i < 16; i++) {
    const win = (i + y) % 3 !== 0;
    games.push({ game_id: `${y}-${i}`, season: y, is_playoff: false, result: win ? "W" : "L",
      points_for: 24, points_against: 17, franchise_id: "TST", opponent_id: "OPP" });
  }
  if (y % 4 === 0) games.push({ game_id: `${y}-p`, season: y, is_playoff: true, result: "L",
    points_for: 20, points_against: 30, franchise_id: "TST", opponent_id: "OPP" });
  seasons.push({ year: y, games, season: { wins: 11, losses: 5, ties: 0,
    playoffs: y % 4 === 0 ? "Lost WC" : null, point_diff: 40, division_finish: "2nd of 4" } });
}
const draftByYear = {};
for (let y = 1990; y < 2020; y++) {
  draftByYear[y] = Array.from({ length: y === 1992 ? 25 : 7 }, (_, i) => ({
    player_id: `p${y}-${i}`, year: y, round: 1 + (i % 7), pick_overall: i * 20 + 3,
    name: `P${i}`, position: "QB", value: { score: 50, tier: "B" } }));
}
const modData = { draftByYear, expandedYears: new Set([1995]) };
const draftModule = { id: "draft", minBand: "SEASON_LINES", measure: measureDraft, render: () => null };
const staff = [
  { admin_person_id: "a", name: "Alice", role: "coach", from: 1990, to: 1999 },
  { admin_person_id: "b", name: "Bob", role: "gm", from: 1990, to: 2005 },
];
const reserveByYear = stripReserveByYear(staff);
const PAGE_H = 750;

// ---- draft measure modes ----
ok(measureDraft({ year: 1991, mode: "compact", data: modData }) === COMPACT_H + BOTTOM_PAD,
  "compact = bare chip strip");
ok(measureDraft({ year: 1995, mode: "compact", data: modData }) === 7 * PICK_ROW_H + BOTTOM_PAD,
  "expanded compact = bare rows (no header)");
ok(measureDraft({ year: 1991, mode: "full", data: modData }) === HEADER_H + 7 * PICK_ROW_H + BOTTOM_PAD,
  "full = header + rows (zoom 3/4)");

// ---- layouts across bands ----
const layouts = MOBILE_BANDS.map((band) =>
  buildTimelineLayout({ seasons, modules: [draftModule], moduleData: modData,
    reserveByYear, detailBand: band, pageHeight: PAGE_H }));
const heights = layouts.map((l) => l.totalHeight);
console.log("band heights:", MOBILE_BANDS.map((b, i) => `${b}=${Math.round(heights[i])}`).join("  "));

for (const [i, L] of layouts.entries()) {
  const band = MOBILE_BANDS[i];
  let lastY1 = 0;
  for (const b of L.blocks) {
    ok(Math.abs(b.y0 - lastY1) < 1e-9, `${band}: contiguous at ${b.type} ${b.year}`);
    lastY1 = b.y1;
  }
  for (const t of [1990, 1995.3, 2007.77, 2019.5]) {
    ok(Math.abs(L.yToYear(L.tToY(t)) - t) < 1e-6, `${band}: t roundtrip ${t}`);
  }
}

// ---- zoom 3 page mode ----
const P = layouts[1]; // GAME_BANDS
ok(geometryFor("GAME_BANDS").season.mode === "page", "GAME_BANDS is page mode");
for (const y of [1990, 1992, 2005, 2019]) {
  const { offseason: off, season: sea } = P.byYear.get(y);
  const pageH = sea.y1 - off.y0;
  ok(pageH >= PAGE_H - 1e-9, `${y}: page fills viewport (${Math.round(pageH)})`);
  // Page top: this year's arrivals, then the year/win-rate header. The
  // carried-over stack is NOT reserved here — the renderer pushes the whole
  // timeline down by the live stack height instead.
  ok(off.ribbonTop === off.y0, `${y}: arrivals ride the page top`);
  ok(off.headerY === off.y0 + off.reserve, `${y}: year header below the arrivals`);
  ok(off.modules.length === 0, `${y}: no modules in the page offseason`);
  ok(sea.mode === "page" && sea.page, `${y}: season block carries page offsets`);
  // section order: regular season -> chips -> draft -> playoffs
  ok(sea.page.regularLabelY < sea.page.chipsY, `${y}: record above chips`);
  if (sea.page.draftLabelY != null) {
    ok(sea.page.chipsY < sea.page.draftLabelY, `${y}: chips above draft`);
    ok(sea.modules.length === 1, `${y}: draft module on the season block`);
    ok(sea.modules[0].y > sea.page.draftLabelY, `${y}: rows under the DRAFT CLASS label`);
  }
  ok(sea.postseason && sea.postseason.kind === "pageSection", `${y}: playoffs section present`);
  if (sea.page.draftLabelY != null)
    ok(sea.postseason.labelY > sea.modules[0].y + sea.modules[0].height - 1e-9, `${y}: playoffs last`);
  if (y % 4 === 0) ok(sea.postseason.chipsY != null, `${y}: playoff chips row in playoff year`);
  else ok(sea.postseason.chipsY == null && sea.postseason.result == null, `${y}: missed playoffs -> result line only`);
}
// oversized class page grows past the viewport instead of clipping
const p92 = P.byYear.get(1992);
ok(p92.season.y1 - p92.offseason.y0 >= PAGE_H, "1992 (25 picks) page >= viewport");
// playoffs off -> no playoffs section anywhere
const noPost = buildTimelineLayout({ seasons, modules: [draftModule], moduleData: modData,
  reserveByYear, detailBand: "GAME_BANDS", pageHeight: PAGE_H, showPlayoffs: false });
ok([...noPost.byYear.values()].every(({ season: s }) => !s.postseason), "showPlayoffs=false drops the section");

// ---- ribbons still anchor correctly in page mode ----
const rb = buildStaffRibbons({ staff, layout: P });
ok(rb.ribbons.length === 2, "ribbons built on the page layout");
for (const r of rb.ribbons) {
  const off = P.byYear.get(r.from).offseason;
  ok(r.y0 >= off.ribbonTop && r.y0 < off.ribbonTop + off.reserve + 1e-9,
    `${r.name} entry band inside the page-top reserve`);
}

// ---- exit bands stagger UPWARD, so a tail never runs past its own tenure ----
// A downward fan leaked into the following year's entry rows, where the tail-
// slot allocator read it as still occupying a column and pushed the successor
// into a fresh one — empty gaps in the rail, worst at zoom 3 where a page is a
// whole viewport tall. Checked on every band.
for (const [i, L] of layouts.entries()) {
  for (const r of buildStaffRibbons({ staff, layout: L }).ribbons) {
    ok(r.tailEnd <= r.y1 + 1e-9, `${MOBILE_BANDS[i]}: ${r.name} tail stays inside the tenure`);
    ok(!r.hasExit || r.exitY >= r.y0 + 16, `${MOBILE_BANDS[i]}: ${r.name} exit below its entry band`);
  }
}
// Two ribbons that never overlap in time must share a tail column, at EVERY
// band — the page band used to fragment where the row bands did not.
const relay = [
  { admin_person_id: "x", name: "X", role: "coach", from: 1990, to: 1999 },
  { admin_person_id: "y", name: "Y", role: "coach", from: 2000, to: 2009 },
];
for (const band of MOBILE_BANDS) {
  const L = buildTimelineLayout({ seasons, modules: [draftModule], moduleData: modData,
    reserveByYear: stripReserveByYear(relay), detailBand: band, pageHeight: PAGE_H });
  const slots = buildStaffRibbons({ staff: relay, layout: L }).ribbons.map((r) => r.slot);
  ok(slots.length === 2 && slots[0] === slots[1], `${band}: consecutive tenures reuse one column`);
}

// ---- zoom 2 cards ----
const C = layouts[2]; // SEASON_LINES
for (const y of [1990, 1995, 2019]) {
  const { offseason: off, season: sea } = C.byYear.get(y);
  ok(off.headerHeight === 56, `${y}: card header height`);
  ok(sea.seasonHeaderHeight === 22, `${y}: record line height`);
}
// expanded 1995 card is taller than a chip-strip card by the row delta
const h95 = C.byYear.get(1995).offseason.height;
const h96 = C.byYear.get(1996).offseason.height;
ok(h95 - h96 === 7 * PICK_ROW_H - COMPACT_H, `expanded card grows by the rows (${h95 - h96})`);

// ---- monotone gesture heights (page mode can exceed zoom 4 on tall screens) ----
const gesture = [...heights];
for (let i = gesture.length - 2; i >= 0; i--) gesture[i] = Math.max(gesture[i], gesture[i + 1] * 1.3);
for (let i = 1; i < gesture.length; i++) ok(gesture[i] < gesture[i - 1], `gesture heights decreasing @${i}`);
// every band is stable: resting at its own gesture height re-picks itself
for (let b = 0; b < gesture.length; b++) {
  ok(pickBand(gesture[b], b, gesture) === b, `band ${b} stable at rest`);
}
// and reachable: walking from the ends lands on the extremes
const LAST = gesture.length - 1;
ok(pickBand(gesture[0], LAST, gesture) === 0, "walk to most detail");
ok(pickBand(gesture[LAST], 0, gesture) === LAST, "walk to least detail");

// ---- pinned stack sits at the top of the canvas and hides nothing ----
// Content is drawn at `y + stackHeight - scrollY`, so content y=scrollY lands
// at viewport y=stackHeight: the stack owns [0, stackHeight) and the timeline
// starts right below it. Swept across every band at many scroll positions.
const busy = [
  { admin_person_id: "o", name: "Owner", role: "owner", from: 1990, to: 2019 },
  { admin_person_id: "g", name: "GM", role: "gm", from: 1990, to: 2005 },
  { admin_person_id: "c1", name: "Coach One", role: "coach", from: 1990, to: 1996 },
  { admin_person_id: "c2", name: "Coach Two", role: "coach", from: 1997, to: 2004 },
  { admin_person_id: "c3", name: "Coach Three", role: "coach", from: 2005, to: 2019 },
  { admin_person_id: "g2", name: "GM Two", role: "gm", from: 2006, to: 2019 },
];
// Owner+GM+Coach One (1990), Owner+Coach Three+GM Two (2006-) -> 3 at once.
ok(maxStackHeight(busy) === 3 * STRIP_H, `max stack = 3 concurrent (${maxStackHeight(busy)})`);
for (const band of MOBILE_BANDS) {
  const L = buildTimelineLayout({ seasons, modules: [draftModule], moduleData: modData,
    reserveByYear: stripReserveByYear(busy), detailBand: band, pageHeight: PAGE_H });
  const { ribbons } = buildStaffRibbons({ staff: busy, layout: L });
  for (let s = 0; s <= L.totalHeight; s += Math.max(1, Math.round(L.totalHeight / 400))) {
    const { strips, stackHeight } = resolveRibbonStrips({ ribbons, scrollY: s });
    ok(stackHeight <= maxStackHeight(busy), `${band}@${s}: stack within its worst case`);
    for (const [key, st] of strips) {
      const vy = st.y + stackHeight - s; // viewport y of the band
      if (st.mode === "pinned") {
        // inside the stack region, on a row, never over the timeline below it
        ok(vy >= -1e-9 && vy + STRIP_H <= stackHeight + 1e-9,
          `${band}@${s}: pinned ${key} outside the stack (vy=${vy}, stack=${stackHeight})`);
      } else if (st.mode === "anchored") {
        // still riding the timeline, hence below the stack
        ok(vy >= stackHeight - 1e-9,
          `${band}@${s}: anchored ${key} under the stack (vy=${vy}, stack=${stackHeight})`);
      }
    }
    // rows are distinct and contiguous from the bottom edge up
    const rows = [...strips.values()].filter((v) => v.mode === "pinned").map((v) => v.y).sort((a, b) => a - b);
    ok(rows.length * STRIP_H === stackHeight, `${band}@${s}: stackHeight matches pinned count`);
    for (let i = 1; i < rows.length; i++)
      ok(Math.abs(rows[i] - rows[i - 1] - STRIP_H) < 1e-9, `${band}@${s}: stack rows contiguous`);
    if (rows.length) ok(Math.abs(rows[rows.length - 1] + STRIP_H - s) < 1e-9,
      `${band}@${s}: stack bottom edge meets the timeline`);
  }
}
// Handover is seamless: a band anchored at exactly scrollY and the same band
// one pixel later (pinned) draw at the same viewport row.
{
  const L = buildTimelineLayout({ seasons, modules: [draftModule], moduleData: modData,
    reserveByYear: stripReserveByYear(busy), detailBand: "GAME_DETAIL", pageHeight: PAGE_H });
  const { ribbons } = buildStaffRibbons({ staff: busy, layout: L });
  for (const r of ribbons) {
    const a = resolveRibbonStrips({ ribbons, scrollY: r.y0 });
    const b = resolveRibbonStrips({ ribbons, scrollY: r.y0 + 1 });
    const va = a.strips.get(r.key).y + a.stackHeight - r.y0;
    const vb = b.strips.get(r.key).y + b.stackHeight - (r.y0 + 1);
    ok(a.strips.get(r.key).mode === "anchored", `${r.name} anchored at its own row`);
    ok(Math.abs(va - vb) < 1e-9, `${r.name} pins without jumping (${va} -> ${vb})`);
  }
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL SIMS PASS");
process.exit(failures ? 1 : 0);
