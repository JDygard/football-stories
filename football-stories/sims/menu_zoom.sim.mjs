// Node simulation of the MENU-ZOOM rung (2026-08-23).
//
// Two things are worth asserting here and neither needs a browser:
//
//   1. THE LADDER. The menu is a fifth stop appended to both zoom ladders, and
//      the whole feature rests on it being REACHABLE — pickBand walks in log
//      space with a hysteresis dead zone, so a rung that isn't far enough from
//      its neighbour simply cannot be pinched into (or, worse, cannot be left).
//      The desktop case is the sharp one: its Eras band is fit-to-viewport, so
//      its natural width is about one window — the same measure the menu takes.
//      Uncorrected, those two are one rung.
//
//   2. THE PURE GEOMETRY: slide paging arithmetic, and the rule that decides
//      where a released swipe leaves the strip.
//
// Run: node sims/menu_zoom.sim.mjs
import { buildTimelineLayout } from "../src/components/visualization/buildTimelineLayout.js";
import {
  MENU_BAND, MOBILE_BANDS, MOBILE_ZOOM_BANDS, ZOOM_LABELS,
  bandAtLeast, bandRank, geometryFor, isMenuBand, DETAIL_BANDS,
} from "../src/components/visualization/detail.js";
import { DESKTOP_BANDS, DESKTOP_ZOOM_BANDS } from "../src/desktop/desktopDetail.js";
import { buildDesktopLayout } from "../src/desktop/buildDesktopLayout.js";
import { measureDraft } from "../src/components/visualization/offseason/draftModel.js";
import { pickBand } from "../src/hooks/zoomMath.js";
import {
  MENU_SLIDES, MENU_SLIDE_COUNT, hintFor, menuScrollExtent,
  slideIndexFor, slideOffset, slideProgress, slidePresence,
  IDLE_MS, SLIDE_COMMIT_V, coastDistance, slideTargetFor, trackSample, velocityOf,
} from "../src/menu/menuModel.js";

let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log("FAIL:", m); } };
const near = (a, b, eps = 0.51) => Math.abs(a - b) <= eps;

// ---- the band is off the detail ladder, and says so consistently ----------
ok(!DETAIL_BANDS.includes(MENU_BAND), "MENU stays out of DETAIL_BANDS");
ok(isMenuBand(MENU_BAND) && !isMenuBand("ERA_SUMMARY"), "isMenuBand");
ok(bandRank(MENU_BAND) === DETAIL_BANDS.length, "MENU ranks past the least detailed band");
// The trap this guards: bandRank's fallback for an unknown band is 0 = MOST
// detail, so without the special case every module would have rendered here.
ok(!bandAtLeast(MENU_BAND, "ERA_SUMMARY"), "no module clears its minBand at the menu");
ok(!bandAtLeast(MENU_BAND, "GAME_DETAIL"), "not even the coarsest-gated module");
ok(geometryFor(MENU_BAND).offseason === "hidden", "menu geometry hides offseasons");
ok(geometryFor(MENU_BAND) !== geometryFor("GAME_DETAIL"), "menu geometry is not the default fallback");
ok(ZOOM_LABELS[MENU_BAND].zoom === 0, "menu is off the numbered rungs");

// ---- both ladders end on it ----------------------------------------------
ok(MOBILE_ZOOM_BANDS.length === MOBILE_BANDS.length + 1, "mobile ladder = timeline bands + menu");
ok(MOBILE_ZOOM_BANDS[MOBILE_ZOOM_BANDS.length - 1] === MENU_BAND, "mobile menu is the last rung");
ok(DESKTOP_ZOOM_BANDS.length === DESKTOP_BANDS.length + 1, "desktop ladder = timeline bands + menu");
ok(DESKTOP_ZOOM_BANDS[DESKTOP_ZOOM_BANDS.length - 1] === MENU_BAND, "desktop menu is the last rung");
ok(
  MOBILE_ZOOM_BANDS.slice(0, -1).every((b, i) => b === MOBILE_BANDS[i]),
  "appending the menu didn't reorder the timeline bands",
);

// ---- synthetic franchise --------------------------------------------------
const seasons = [];
for (let y = 1960; y < 2026; y++) {
  const games = [];
  for (let i = 0; i < 16; i++) {
    games.push({ game_id: `${y}-${i}`, season: y, is_playoff: false, result: i % 3 ? "W" : "L",
      points_for: 24, points_against: 17, franchise_id: "TST", opponent_id: "OPP" });
  }
  seasons.push({ year: y, games, season: { wins: 11, losses: 5, ties: 0, playoffs: null,
    point_diff: 40, division_finish: "2nd of 4" } });
}
const draftByYear = {};
for (let y = 1960; y < 2026; y++) {
  draftByYear[y] = Array.from({ length: 7 }, (_, i) => ({
    player_id: `p${y}-${i}`, year: y, round: 1 + i, pick_overall: i * 20 + 3,
    name: `P${i}`, position: "QB", value: { score: 50, tier: "B" } }));
}
const moduleData = { draftByYear, expandedYears: new Set() };
const modules = [{ id: "draft", minBand: "SEASON_LINES", measure: measureDraft, render: () => null }];

const MIN_BAND_RATIO = 1.3; // must match both viewport hooks

// Mirror of the gesture-space height/width ladders the hooks build.
function correct(list) {
  const out = list.slice();
  for (let i = out.length - 2; i >= 0; i--) out[i] = Math.max(out[i], out[i + 1] * MIN_BAND_RATIO);
  return out;
}

// A rung is REACHABLE when the walk can actually stop on it; the walk is the
// same pickBand both hooks use, so this is the real test and not a restatement
// of the ratio.
function walkReaches(sizes) {
  const n = sizes.length;
  const reached = new Set();
  let b = 0;
  for (let i = 0; i < n; i++) { b = pickBand(sizes[i], b, sizes); reached.add(b); }
  for (let i = n - 1; i >= 0; i--) { b = pickBand(sizes[i], b, sizes); reached.add(b); }
  return reached;
}

// ---- MOBILE: the menu is one screenful, and stays a rung of its own -------
for (const viewportH of [575, 752, 1024]) {
  const heights = MOBILE_BANDS.map(
    (band) => buildTimelineLayout({ seasons, modules, moduleData, detailBand: band, top: 0 }).totalHeight,
  );
  const ladder = correct([...heights, viewportH]);
  ok(
    ladder[ladder.length - 1] === viewportH,
    `mobile menu rung = one viewport (${viewportH}), not the whole slide strip`,
  );
  const reached = walkReaches(ladder);
  ok(reached.size === ladder.length, `mobile: every rung reachable at ${viewportH} (got ${reached.size}/${ladder.length})`);
  ok(
    ladder.every((h, i) => i === 0 || ladder[i - 1] > h),
    `mobile ladder strictly ordered at ${viewportH}`,
  );
}

// ---- DESKTOP: the case that needs the correction --------------------------
// ERA_SUMMARY is fit-to-viewport, so its raw width lands near the menu's own
// measure. Assert the collision is REAL at some window size before asserting
// the fix — otherwise this test would keep passing after someone deleted the
// correction, which is the failure mode it exists for.
let sawRawCollision = false;
const ratios = [];
for (const viewportW of [1024, 1280, 1440, 1920, 2560]) {
  const widths = DESKTOP_BANDS.map(
    (band) => buildDesktopLayout({ seasons, modules, moduleData, detailBand: band, left: 0, fitWidth: viewportW }).totalWidth,
  );
  const raw = [...widths, viewportW];
  const erasVsMenu = raw[raw.length - 2] / raw[raw.length - 1];
  ratios.push(`${viewportW}:${erasVsMenu.toFixed(3)}`);
  if (erasVsMenu < 1.271) {
    sawRawCollision = true;
    ok(walkReaches(raw).size < raw.length, `desktop: the raw ladder is short a rung at ${viewportW}`);
  }

  const ladder = correct(raw);
  const reached = walkReaches(ladder);
  ok(reached.size === ladder.length, `desktop: every rung reachable at ${viewportW} (got ${reached.size}/${ladder.length})`);
  ok(ladder[ladder.length - 1] === viewportW, `desktop menu rung = one window (${viewportW})`);
}
ok(sawRawCollision, `desktop: Eras/menu collide raw at some window size (ratios ${ratios.join(" ")})`);

// ---- slide paging arithmetic ---------------------------------------------
ok(MENU_SLIDE_COUNT === MENU_SLIDES.length && MENU_SLIDE_COUNT >= 2, "at least a menu page and a tour page");
ok(MENU_SLIDES[0].kind === "menu", "the app opens on the menu page, not the tour");
// The menu page's header is the TITLE ALONE. The eyebrow and blurb that used to
// sit with it cost enough height to push the display toggles into a scroller of
// their own — and a nested scroller covering most of a phone slide SWALLOWS THE
// SWIPE, which is what made this page unswipeable. Keeping the header to one
// line is what keeps every toggle on screen without one.
ok(!MENU_SLIDES[0].eyebrow && !MENU_SLIDES[0].body,
   "the menu header carries the title and nothing else");
ok(!!MENU_SLIDES[0].title, "…and it does carry the title");
ok(MENU_SLIDES.filter((s) => s.kind === "tour").length >= 1, "there is a tour page");
for (const span of [1, 320, 752, 1440]) {
  ok(menuScrollExtent(span) === span * MENU_SLIDE_COUNT, `extent = slides x span (${span})`);
  for (let i = 0; i < MENU_SLIDE_COUNT; i++) {
    const at = slideOffset(i, span);
    ok(slideIndexFor(at, span) === i, `slide ${i} snaps to itself at span ${span}`);
    ok(near(slideProgress(at, span), i), `progress is exact on a snap point (${i}/${span})`);
    ok(near(slidePresence(at, span, i), 1), `slide ${i} is fully present when snapped`);
    for (let j = 0; j < MENU_SLIDE_COUNT; j++) {
      if (j !== i) ok(slidePresence(at, span, j) < 0.01, `slide ${j} is gone while ${i} is snapped`);
    }
  }
  // Halfway between two slides both are half present, and the index has to
  // resolve to ONE of them — that is what keeps the pager from flickering.
  const mid = slideOffset(0, span) + span / 2;
  ok(near(slidePresence(mid, span, 0), 0.5, 0.02), `half-swiped: outgoing at 50% (${span})`);
  ok(near(slidePresence(mid, span, 1), 0.5, 0.02), `half-swiped: incoming at 50% (${span})`);
  ok([0, 1].includes(slideIndexFor(mid, span)), `half-swiped index is a real slide (${span})`);
}
// Overscroll (rubber-band) must not index past the ends.
ok(slideIndexFor(-400, 752) === 0, "overscroll before the first slide clamps");
ok(slideIndexFor(99999, 752) === MENU_SLIDE_COUNT - 1, "overscroll past the last slide clamps");
ok(slidePresence(-400, 752, 0) === 1, "the first slide stays present while rubber-banding");

// ---- the tour is a page, not an overlay ----------------------------------
//
// It used to pin two of its three items to real chrome — the team tab and the
// Personnel bar — with arrows measured out of the DOM. Anything anchored
// OUTSIDE the pane cannot travel with the strip, so those two faded in place
// while their slide slid, and reaching the tour never felt like reaching a
// slide. Everything on it is an ordinary element in the flow now, and these
// assertions are what stop that quietly regressing.
const tour = MENU_SLIDES.find((s) => s.kind === "tour");
ok((tour.cards || []).length === 3, "the tour titled 'three things' carries three things");
for (const c of tour.cards) {
  ok(!!c.title && !!c.body && !!c.icon, `tour card "${c.title}" is complete`);
}
ok(new Set(tour.cards.map((c) => c.title)).size === tour.cards.length, "no duplicate cards");
ok(!!tour.title && !!tour.eyebrow && !!tour.body, "the tour slide has its own heading");
// NOTHING on any slide reaches outside the pane any more.
for (const s of MENU_SLIDES) {
  ok(!s.callouts, `slide "${s.id}" has no callouts pinned to chrome`);
  ok(!(s.cards || []).some((c) => c.anchor), `slide "${s.id}" anchors nothing outside itself`);
}

// ---- ONE gesture each, and the right one ---------------------------------
// The rule this guards: a mouse has no pinch and a phone has no wheel, so
// naming both only asks the reader to work out which half is theirs. Each
// platform's copy must name its own gesture and NOT the other's.
for (const axis of ["y", "x"]) {
  const h = hintFor(axis);
  ok(h.axis === axis, `hint axis ${axis}`);
  ok(!!h.start && !!h.startGlyph, `${axis}: the CTA names a gesture`);
  ok(!!h.tour && !!h.tourShort && !!h.glyph, `${axis}: the tour offer names a direction`);
}
const portrait = hintFor("y");
const landscape = hintFor("x");
ok(/pinch/i.test(portrait.start), "portrait starts on a pinch");
ok(!/wheel/i.test(portrait.start), "portrait never mentions a mouse wheel");
ok(/wheel/i.test(landscape.start), "landscape starts on the mouse wheel");
ok(!/pinch/i.test(landscape.start), "landscape never mentions a pinch");
ok(portrait.glyph !== landscape.glyph, "the two platforms point different ways");
ok(landscape.glyph === "→", "landscape points at the right edge, where its tour rail is");
ok(portrait.glyph === "↓", "portrait points down the page, where its tour is");
ok(hintFor("nonsense").axis === "y", "unknown axis falls back to portrait");

// ---- reading a released swipe, on BOTH orientations ----------------------
//
// The rule that made this strip swipeable at all. It lives in the shared model
// because a phone and a landscape window page the same strip and have to agree
// about what a swipe means; these spans are the two real ones.
for (const [name, span] of [["portrait pane", 752], ["landscape pane", 1440]]) {
  const nudge = { scroll: span * 0.18, span, startSlide: 0, count: 2 };
  ok(slideTargetFor({ ...nudge, velocity: 0 }) === 0,
     `${name}: a fifth of a page with no speed settles back`);
  ok(slideTargetFor({ ...nudge, velocity: SLIDE_COMMIT_V * 1.2 }) === 1,
     `${name}: THE FIX — the same distance, flicked, turns the page`);
  ok(slideTargetFor({ ...nudge, velocity: SLIDE_COMMIT_V * 0.5 }) === 0,
     `${name}: a half-hearted push does not`);
  ok(slideTargetFor({ scroll: span * 0.7, span, startSlide: 0, velocity: 0, count: 2 }) === 1,
     `${name}: past halfway with no speed still commits`);
  ok(slideTargetFor({ scroll: span * 0.85, span, startSlide: 1, velocity: -SLIDE_COMMIT_V * 1.2, count: 2 }) === 0,
     `${name}: a flick backwards turns back a page`);
  ok(slideTargetFor({ scroll: span * 1.9, span, startSlide: 1, velocity: 40, count: 2 }) === 1,
     `${name}: a throw past the last page clamps`);
  // `count` defaults to this strip's own length, which is how the hooks call it.
  ok(
    slideTargetFor({ scroll: 0, span, startSlide: 0, velocity: 0 }) ===
      slideTargetFor({ scroll: 0, span, startSlide: 0, velocity: 0, count: MENU_SLIDE_COUNT }),
    `${name}: count defaults to the strip length`,
  );
}
// A HUMAN-SIZED SWIPE: 150px in 60ms on an 844px phone is a normal flick and
// used to do nothing, because it never came near the halfway line.
{
  const span = 752;
  const s = [];
  for (let t = 0; t <= 60; t += 10) trackSample(s, t * 2.5, t);
  const v = velocityOf(s);
  ok(v > SLIDE_COMMIT_V, `a 150px/60ms flick clears the commit threshold (${v.toFixed(2)} px/ms)`);
  ok(slideTargetFor({ scroll: 150, span, startSlide: 0, velocity: v, count: 2 }) === 1,
     "a human-sized flick pages a phone-sized slide");
  ok(150 + coastDistance(v) > span / 2, "…and its projected landing really is past halfway");
}
ok(IDLE_MS > 0, "the pause rule has a threshold");

console.log("");
console.log(failures ? `${failures} FAILURE(S)` : "ALL SIMS PASS");
process.exit(failures ? 1 : 0);
