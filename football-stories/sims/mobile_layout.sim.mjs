// Node simulation of the mobile pure-logic modules.
//
// Covers the zoom redesign (2026-07-31: Seasons cards at zoom 2, season pages
// at zoom 3, renamed labels) and the Named Eras mobile render (2026-08-15),
// which also removed the zoom-3 snap paging — pages are content-height now, so
// the gesture-height ladder is naturally monotone and no longer corrected.
// Run: node sims/mobile_layout.sim.mjs
import { buildTimelineLayout } from "../src/components/visualization/buildTimelineLayout.js";
import { DETAIL_BANDS, MOBILE_BANDS, ZOOM_LABELS, geometryFor } from "../src/components/visualization/detail.js";
import {
  buildEraBoxes, eraSpans, eraTone, estimateTextWidth,
  ERA_BANDS, ERA_FRAMED_BANDS, ERA_HEADER_H, ERA_FOOT_H,
  ERA_TEXT_INSET, ERA_EDGE_L, ERA_EDGE_R,
  ERA_LABEL_FS, ERA_TONE_COUNT,
} from "../src/components/visualization/eraModel.js";
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
// Named Eras: two adjacent chapters, a gap, an ongoing one, plus a chapter
// whose title is far too long for a phone (exercising the short-form fallback)
// and one that starts before the data does (clamped to the first season).
const eras = [
  { id: "founding", label: "The Founding", short: "Founding", start: 1985, end: 1994 },
  { id: "the-run", label: "The Long Run", short: "Run", start: 1995, end: 1999 },
  { id: "wilderness", label: "An Extravagantly Overlong Chapter Title Nobody Would Author",
    short: "Wilderness", start: 2004, end: 2009 },
  { id: "now", label: "The Modern Era", start: 2012, end: null },
];

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
    reserveByYear, detailBand: band }));
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

// ---- zoom 3 pages: content height, no snap paging ----
// The pages used to be padded to a full viewport and scroll-snapped one per
// screen. Now a page is exactly as tall as its own sections, so a year with a
// big draft class is a tall page and a thin year is a short one — and NOTHING
// in the layout depends on the viewport height any more.
const P = layouts[1]; // GAME_BANDS
ok(geometryFor("GAME_BANDS").season.mode === "page", "GAME_BANDS is page mode");
for (const y of [1990, 1992, 2005, 2019]) {
  const { offseason: off, season: sea } = P.byYear.get(y);
  // the page ends where its last section ends (playoffs), plus the section pad
  const lastSectionEnd = sea.postseason.chipsY != null
    ? sea.postseason.chipsY + sea.postseason.chipsH
    : sea.postseason.resultY + 22;
  ok(sea.y1 - lastSectionEnd < 20,
    `${y}: page ends on its content, no viewport padding (slack ${Math.round(sea.y1 - lastSectionEnd)})`);
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
// an oversized draft class makes a TALLER page — the only thing that varies a
// page's height now that the viewport doesn't
const p92 = P.byYear.get(1992);
const p93 = P.byYear.get(1993);
ok(p92.season.y1 - p92.offseason.y0 > p93.season.y1 - p93.offseason.y0,
  "1992 (25 picks) is a taller page than 1993 (7 picks)");
// playoffs off -> no playoffs section anywhere
const noPost = buildTimelineLayout({ seasons, modules: [draftModule], moduleData: modData,
  reserveByYear, detailBand: "GAME_BANDS", showPlayoffs: false });
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
    reserveByYear: stripReserveByYear(relay), detailBand: band });
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

// ---- Named Eras ----
const eraLayouts = MOBILE_BANDS.map((band) =>
  buildTimelineLayout({ seasons, modules: [draftModule], moduleData: modData,
    reserveByYear, detailBand: band, eras }));
const eraHeights = eraLayouts.map((l) => l.totalHeight);
console.log("band heights (eras on):",
  MOBILE_BANDS.map((b, i) => `${b}=${Math.round(eraHeights[i])}`).join("  "));

// Spans resolve against the DATA, not the curated range: an era starting before
// the first season clamps to it, and an open-ended one runs to the last season.
const spans = eraSpans({ eras, years: seasons.map((s) => s.year) });
ok(spans.length === 4, `every era has seasons on screen (${spans.length})`);
ok(spans[0].firstYear === 1990, "era starting before the data clamps to the first season");
ok(spans[3].lastYear === 2019 && spans[3].ongoing, "open-ended era runs to the last season");
ok(spans[1].lastYear === 1999 && spans[2].firstYear === 2004, "the gap between chapters is respected");
// an era entirely outside the data is dropped, not drawn off the end
ok(eraSpans({ eras: [{ id: "x", label: "X", start: 1950, end: 1960 }],
  years: seasons.map((s) => s.year) }).length === 0, "era outside the data is dropped");
// tones rotate by POSITION, so neighbours always differ
for (let i = 1; i < spans.length; i++) ok(spans[i].tone !== spans[i - 1].tone, `tone differs @${i}`);
ok(eraTone(0).border !== eraTone(1).border, "tones are visually distinct");
ok(eraTone(ERA_TONE_COUNT).wash === eraTone(0).wash, "tone palette wraps");

// Season by season shows the headers with no box, so it reserves plaque rows
// but no closing feet; the two coarsest rungs do both; Every Game does neither.
ok(ERA_BANDS.has("GAME_BANDS") && !ERA_FRAMED_BANDS.has("GAME_BANDS"),
  "Season by season: era headers, no frame");
ok(!ERA_BANDS.has("GAME_DETAIL"), "Every Game shows no eras at all");
for (const b of ERA_FRAMED_BANDS) ok(ERA_BANDS.has(b), `${b}: framed implies shown`);

for (const [i, L] of eraLayouts.entries()) {
  const band = MOBILE_BANDS[i];
  const shown = ERA_BANDS.has(band);
  const framed = ERA_FRAMED_BANDS.has(band);
  ok(L.eras.length === (shown ? 4 : 0), `${band}: ${shown ? "reserves its eras" : "shows no eras"}`);

  // the stack stays CONTIGUOUS with plaque rows in it — tToY/yToYear (and the
  // zoom anchor that calls them) would otherwise land in a hole
  let lastY1 = 0;
  for (const b of L.blocks) {
    ok(Math.abs(b.y0 - lastY1) < 1e-9, `${band}+eras: contiguous at ${b.type} ${b.year}`);
    lastY1 = b.y1;
  }
  for (const t of [1990, 1995.3, 2007.77, 2019.5]) {
    ok(Math.abs(L.yToYear(L.tToY(t)) - t) < 1e-6, `${band}+eras: t roundtrip ${t}`);
  }

  // exactly the era-opening years carry a plaque row and exactly the closing
  // years carry the foot, and those are the ONLY things that grew: the band is
  // taller by one plaque + one foot per era, nothing else moved
  const openers = new Set(shown ? spans.map((e) => e.firstYear) : []);
  // only a FRAMED band buys the closing foot — no border, nothing to clear
  const closers = new Set(framed ? spans.map((e) => e.lastYear) : []);
  for (const { offseason: off, season: sea } of L.byYear.values()) {
    const want = openers.has(off.year) ? ERA_HEADER_H : 0;
    ok(off.eraHeaderHeight === want, `${band}: ${off.year} plaque row = ${want}`);
    ok(off.contentY === off.y0 + want, `${band}: ${off.year} content starts under the plaque`);
    // everything inside the block measures from contentY, never from y0
    ok(off.headerY >= off.contentY - 1e-9, `${band}: ${off.year} year header below the plaque`);
    ok(off.ribbonTop >= off.contentY - 1e-9, `${band}: ${off.year} arrivals below the plaque`);
    for (const m of off.modules) ok(m.y >= off.contentY, `${band}: ${off.year} module below the plaque`);

    const foot = closers.has(sea.year) ? ERA_FOOT_H : 0;
    ok(sea.eraFootHeight === foot, `${band}: ${sea.year} closing clear space = ${foot}`);
    ok(sea.contentY1 === sea.y1 - foot, `${band}: ${sea.year} content ends above the foot`);
    ok(sea.height - sea.contentHeight === foot, `${band}: ${sea.year} foot is the whole difference`);
    // the foot pads the FRAME, it must not push the season's own marks down
    for (const g of sea.games) ok(g.y <= sea.contentY1, `${band}: ${sea.year} games stay above the foot`);
  }
  ok(Math.abs(L.totalHeight - heights[i]
      - openers.size * ERA_HEADER_H - closers.size * ERA_FOOT_H) < 1e-9,
    `${band}: taller by exactly its plaques + feet (${Math.round(L.totalHeight - heights[i])})`);

  if (!shown) continue;
  // boxes line up with the blocks they were reserved by, and never overlap
  let prevEnd = -1;
  for (const [k, box] of L.eras.entries()) {
    const first = L.byYear.get(box.firstYear).offseason;
    const last = L.byYear.get(box.lastYear).season;
    ok(box.y0 === first.y0, `${band}: ${box.id} opens at its first offseason`);
    ok(box.contentY === first.contentY, `${band}: ${box.id} content top matches the block`);
    ok(box.contentY - box.y0 === ERA_HEADER_H, `${band}: ${box.id} carries a full plaque row`);
    ok(box.y1 === last.y1, `${band}: ${box.id} closes on its last season`);
    ok(box.y1 - last.contentY1 === (framed ? ERA_FOOT_H : 0),
      `${band}: ${box.id} clears the last season by the foot iff it has a border`);
    ok(box.y1 > box.contentY, `${band}: ${box.id} frames real content, not just its label`);
    ok(box.y0 >= prevEnd, `${band}: ${box.id} disjoint from the chapter before it`);
    prevEnd = box.y1;
    ok(k === 0 || L.eras[k - 1].firstYear < box.firstYear, `${band}: eras in order`);
  }
}

// ---- era frame geometry + text fit (the renderer's half) ----
// A 390px phone with a personnel rail: tails occupy [330, 387] and the 3px PEEK
// sliver past them exposes departing careers.
const RAIL_NEAR = 330, RAIL_FAR = 387;
const boxes = buildEraBoxes({ eras: eraLayouts[3].eras, width: 390, railRight: RAIL_FAR });
ok(boxes.length === 4, "boxes built for every era");
for (const b of boxes) {
  ok(b.x0 === ERA_EDGE_L, `${b.id}: frame opens at the screen inset`);
  // the tails are people WITH the team, so the chapter encloses them…
  ok(b.x1 === RAIL_FAR, `${b.id}: frame runs out through the tail gutter`);
  ok(b.x1 > RAIL_NEAR, `${b.id}: vertical tails are inside the chapter`);
  // …but the peek past the gutter, where a career leaves, stays outside
  ok(b.x1 < 390, `${b.id}: the leaving stub stays outside the chapter`);
  ok(b.textX === b.x0 + ERA_TEXT_INSET, `${b.id}: text on the standard gutter`);
  ok(b.textX > 18, `${b.id}: text clears the zoom-2 timeline stripe`);
  ok(b.showYears, `${b.id}: dates always fit on a phone`);
  ok(estimateTextWidth(b.labelText || "", ERA_LABEL_FS, "serif") <= b.x1 - b.textX,
    `${b.id}: title stays inside its frame`);
}
ok(boxes[0].labelText === "The Founding", "a title that fits is used in full");
ok(boxes[2].labelText === "Wilderness", "an overlong title falls back to the short form");
// every real IND chapter name fits at full length on a 390px phone once the
// frame runs out through the rail — the fallback is a safety net, not a norm
for (const label of ["The Bert Jones Renaissance", "Finding a Home in Indianapolis",
  "The Peyton Manning Era", "The Quarterback Carousel"]) {
  ok(estimateTextWidth(label, ERA_LABEL_FS, "serif") <= RAIL_FAR - (ERA_EDGE_L + ERA_TEXT_INSET) - 12,
    `real chapter name fits in full: ${label}`);
}
ok(boxes[3].yearsText === "2012–now", "an ongoing chapter reads as ongoing");
// no rail (every personnel track toggled off): nothing to enclose, so the frame
// falls back to a plain inset from the screen edge
ok(buildEraBoxes({ eras: eraLayouts[3].eras, width: 390 })[0].x1 === 390 - ERA_EDGE_R,
  "no tail gutter -> frame insets from the screen edge");

// UNFRAMED band (Season by season): the plaque has no border to hang its gutter
// off, so it lines up with the page's own left margin instead of the inset
const PAGE_LEFT = 14; // contentLeft at GAME_BANDS in TeamTimelineLayer
const bare = buildEraBoxes({
  eras: eraLayouts[1].eras, width: 390, railRight: RAIL_FAR, textLeft: PAGE_LEFT,
});
ok(bare.length === 4, "Season by season still gets a box per era to label");
for (const b of bare) {
  ok(b.textX === PAGE_LEFT, `${b.id}: unframed plaque aligns with the page margin`);
  ok(b.labelText, `${b.id}: unframed plaque still carries its title`);
}
ok(bare[0].textX !== boxes[0].textX, "framed and unframed gutters really do differ");
ok(buildEraBoxes({ eras: [], width: 390 }).length === 0, "no eras -> nothing to draw");

// ---- gesture heights: ordering is free now, reachability still isn't ----
// Dropping the full-viewport page fill fixed the ORDERING (zoom 3 could
// previously out-grow zoom 4 on a tall screen and invert the ladder). It did
// NOT fix REACHABILITY: pickBand walks in log space with a hysteresis dead zone
// of `hyst` ln-units around each geometric-mean boundary, so a rung is only
// reachable when it exceeds e^(2*hyst) ≈ 1.271x its neighbour — and zoom 4 vs
// zoom 3 lands right on that line naturally. So useTimelineViewport still feeds
// pickBand a MIN_BAND_RATIO-corrected copy. Both halves are asserted here, with
// Named Eras off and on (their plaque rows grow the two coarsest bands).
const MIN_BAND_RATIO = 1.3; // mirror of useTimelineViewport's constant
for (const [tag, hs] of [["eras off", heights], ["eras on", eraHeights]]) {
  // raw heights: ordered, which is what the page-fill removal bought
  for (let i = 1; i < hs.length; i++) {
    ok(hs[i] < hs[i - 1],
      `${tag}: raw band heights decreasing @${i} (${(hs[i - 1] / hs[i]).toFixed(2)}x)`);
  }
  const gesture = [...hs];
  for (let i = gesture.length - 2; i >= 0; i--) {
    gesture[i] = Math.max(gesture[i], gesture[i + 1] * MIN_BAND_RATIO);
  }
  for (let i = 1; i < gesture.length; i++) {
    ok(gesture[i - 1] / gesture[i] > Math.exp(2 * 0.12),
      `${tag}: corrected rung ${i} clears the hysteresis dead zone`);
  }
  // every band is stable: resting at its own gesture height re-picks itself
  for (let b = 0; b < gesture.length; b++) {
    ok(pickBand(gesture[b], b, gesture) === b, `${tag}: band ${b} stable at rest`);
  }
  // and reachable: walking from the ends lands on the extremes
  const LAST = gesture.length - 1;
  ok(pickBand(gesture[0], LAST, gesture) === 0, `${tag}: walk to most detail`);
  ok(pickBand(gesture[LAST], 0, gesture) === LAST, `${tag}: walk to least detail`);
}

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
    reserveByYear: stripReserveByYear(busy), detailBand: band });
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
    reserveByYear: stripReserveByYear(busy), detailBand: "GAME_DETAIL" });
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
