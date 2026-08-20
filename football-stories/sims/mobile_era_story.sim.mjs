// Guard for the mobile "story" interaction: tapping an era plaque opens the
// chapter, which prints its blurb inside a plaque row that GREW to hold it.
//
// The thing that can silently break here is the agreement between two
// measurements taken at different moments by different code:
//
//   Main measures the paragraph BEFORE the layout exists, to buy the taller
//   plaque row (eraBlurbLayout -> eraHeaderExtra -> buildTimelineLayout).
//   buildEraBoxes measures it AGAIN afterwards, to lay the lines out.
//
// If those two ever disagree the failure is quiet and ugly: prose running out
// through the bottom border of its own frame, or a band of empty plaque under a
// short paragraph. Nothing about either symptom throws. So this sim asserts the
// agreement directly, at several widths, and asserts that the last baseline
// lands inside the row that was actually bought.
//
//     node sims/mobile_era_story.sim.mjs

import { buildTimelineLayout } from "../src/components/visualization/buildTimelineLayout.js";
import { MOBILE_BANDS } from "../src/components/visualization/detail.js";
import {
  buildEraBoxes,
  eraBlurbLayout,
  eraBlurbMeasure,
  eraBlurbExtraH,
  estimateTextWidth,
  wrapEraBlurb,
  ERA_HEADER_H,
  ERA_BLURB_BASELINE,
  ERA_BLURB_LH,
  ERA_BLURB_FS,
  ERA_BLURB_MAX_LINES,
} from "../src/components/visualization/eraModel.js";

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log("  FAIL: " + msg); } };

// A franchise shaped like a real one: three chapters, one of them a single
// season, over thirty years of seasons.
const seasons = [];
for (let y = 1990; y <= 2019; y++) {
  seasons.push({ year: y, games: Array.from({ length: 16 }, (_, i) => ({ week: i + 1, result: "W" })),
    season: { wins: 9, losses: 7, ties: 0 } });
}
const LONG =
  "Jim Mora and Jim Finks arrived in 1986 and produced the first winning season in franchise history " +
  "the following year, 12-3 in the strike-shortened 1987. The identity was the linebackers — Rickey " +
  "Jackson, Sam Mills, Vaughan Johnson and Pat Swilling, the only foursome ever to make a Pro Bowl " +
  "together. New Orleans reached the playoffs four times in six years and lost all four games.";
const SHORT = "One season, and the best the franchise has had.";
const eras = [
  { id: "first",  label: "The First Chapter",  start: 1990, end: 1999, blurb: LONG },
  { id: "single", label: "One Season",         start: 2000, end: 2000, blurb: SHORT },
  { id: "now",    label: "The Modern Era",     start: 2001, end: null, ongoing: true, blurb: LONG },
];

const WIDTHS = [320, 390, 430, 768];
const build = (extra) =>
  buildTimelineLayout({ seasons, modules: [], moduleData: {}, detailBand: "SEASON_LINES",
    eras, eraHeaderExtra: extra });

console.log("width  measure  lines  extraH  plaque");
for (const width of WIDTHS) {
  const { lines, extraH } = eraBlurbLayout(LONG, width);
  const measure = eraBlurbMeasure(width);
  console.log(`${String(width).padStart(5)}  ${String(Math.round(measure)).padStart(7)}  ` +
    `${String(lines.length).padStart(5)}  ${String(extraH).padStart(6)}  ${ERA_HEADER_H + extraH}`);

  // 1. every line fits the measure it was wrapped to
  for (const l of lines) {
    ok(estimateTextWidth(l, ERA_BLURB_FS, "sans") <= measure + 1e-6,
      `w=${width}: line overflows the ${Math.round(measure)}px measure: "${l}"`);
  }
  ok(lines.length > 0, `w=${width}: a 70-word blurb produced no lines`);
  ok(lines.length <= ERA_BLURB_MAX_LINES, `w=${width}: ${lines.length} lines exceeds the cap`);
  // narrower screen => same or more lines; never fewer
  ok(measure > 0 && measure < width, `w=${width}: measure ${measure} is not inside the screen`);

  // 2. the layout buys EXACTLY what was measured, on the right chapter only
  const base = build(null);
  const open = build({ first: extraH });
  const plaque = (l, id) => l.eras.find((e) => e.id === id).headerH;
  ok(plaque(base, "first") === ERA_HEADER_H, `w=${width}: unselected plaque should be ERA_HEADER_H`);
  ok(plaque(open, "first") === ERA_HEADER_H + extraH,
    `w=${width}: open plaque is ${plaque(open, "first")}, expected ${ERA_HEADER_H + extraH}`);
  ok(plaque(open, "single") === ERA_HEADER_H && plaque(open, "now") === ERA_HEADER_H,
    `w=${width}: opening one chapter grew another`);
  ok(open.totalHeight - base.totalHeight === extraH,
    `w=${width}: timeline grew by ${open.totalHeight - base.totalHeight}, expected ${extraH}`);

  // 3. the last baseline lands INSIDE the row that was bought
  const boxes = buildEraBoxes({ eras: open.eras, width, selectedId: "first" });
  const b = boxes.find((x) => x.id === "first");
  ok(b.blurbLines.length > 0, `w=${width}: selected box has no blurb lines`);
  ok(boxes.filter((x) => x.blurbLines.length).length === 1,
    `w=${width}: an unselected chapter is printing prose`);
  ok(b.selected === true, `w=${width}: selected flag not set`);
  const lastBaseline = ERA_BLURB_BASELINE + (b.blurbLines.length - 1) * ERA_BLURB_LH;
  ok(lastBaseline <= b.headerH, `w=${width}: last baseline ${lastBaseline} overruns the ${b.headerH}px plaque`);
  ok(b.headerH - lastBaseline >= 4, `w=${width}: descenders clipped (${b.headerH - lastBaseline}px left)`);
  // the box's own inner width may be narrower than the screen measure; the
  // lines must still fit it, which is the clamp buildEraBoxes applies
  const inner = b.x1 - b.textX - 12;
  for (const l of b.blurbLines) {
    ok(estimateTextWidth(l, ERA_BLURB_FS, "sans") <= inner + 1e-6,
      `w=${width}: line overflows the box's own ${Math.round(inner)}px: "${l}"`);
  }
}

// 4. the plaque's bottom padding is CONSTANT, whatever the paragraph's length.
//
// A one-line blurb still costs a little height (ERA_BLURB_BASELINE + PAD_B
// exceeds the standard row), and that is deliberate rather than a rounding
// artefact: a closed plaque is a wall label whose authority comes from the air
// under the title, and an open one is a text panel. When the chapter opens it
// stops being the first thing and the air is spent on the prose. What must NOT
// vary is the gap under the last line — that is what makes a two-line chapter
// and a nine-line chapter look like the same object.
{
  const PAD_B = 18; // must match ERA_BLURB_PAD_B
  for (const [text, w] of [[SHORT, 390], [LONG, 390], [LONG, 320], [LONG, 768]]) {
    const { lines, extraH } = eraBlurbLayout(text, w);
    const plaque = ERA_HEADER_H + extraH;
    const last = ERA_BLURB_BASELINE + (lines.length - 1) * ERA_BLURB_LH;
    ok(plaque - last === PAD_B,
      `w=${w}/${lines.length} lines: ${plaque - last}px under the last line, expected ${PAD_B}`);
    ok(plaque >= ERA_HEADER_H, `w=${w}: an open plaque shrank below the standard row`);
  }
  const one = eraBlurbLayout(SHORT, 390);
  ok(one.lines.length === 1, `short blurb wrapped to ${one.lines.length} lines`);
  console.log(`\n  one-line blurb: +${one.extraH}px, plaque ${ERA_HEADER_H + one.extraH}` +
    `  (constant ${18}px under the last line at every length)`);
}

// 5. nothing selected == the layout as it was before the feature
{
  const before = build(null);
  const nulls = build({});
  ok(before.totalHeight === nulls.totalHeight, "an empty extra map changed the layout");
  const boxes = buildEraBoxes({ eras: before.eras, width: 390, selectedId: null });
  ok(boxes.every((b) => b.blurbLines.length === 0), "prose printed with nothing selected");
  ok(boxes.every((b) => b.selected === false), "selected flag set with nothing selected");
}

// 6. an open chapter must not collapse the ZOOM LADDER.
//
// The plaque grows in three of the four bands (GAME_DETAIL reserves no plaque
// at all), which nudges their total heights toward each other. pickBand's
// log-space hysteresis needs adjacent bands to stay a ratio apart or the zoom
// sticks — the same constraint the desktop draft column ran into. A single
// chapter's paragraph is small against a band's height, but assert it, because
// the failure mode is a zoom that quietly stops responding.
{
  const heights = (extra) =>
    MOBILE_BANDS.map(
      (b) =>
        buildTimelineLayout({ seasons, modules: [], moduleData: {}, detailBand: b, eras,
          eraHeaderExtra: extra }).totalHeight,
    );
  const { extraH } = eraBlurbLayout(LONG, 390);
  const closed = heights(null);
  const open = heights({ first: extraH });
  const ratios = (a) => a.slice(1).map((v, i) => a[i] / v);
  for (const [name, arr] of [["closed", closed], ["open", open]]) {
    for (let i = 0; i < arr.length - 1; i++) {
      ok(arr[i] > arr[i + 1], `${name}: band heights not monotonic at ${MOBILE_BANDS[i + 1]}`);
    }
    for (const r of ratios(arr)) {
      ok(r > 1.35, `${name}: adjacent bands only ${r.toFixed(3)} apart — pickBand cannot walk`);
    }
  }
  // Every band reserves a plaque row now, so every band grows by the same
  // amount when a chapter opens — including the most detailed one, which used
  // to show no eras at all.
  for (const [i, b] of MOBILE_BANDS.entries()) {
    ok(open[i] - closed[i] === extraH,
      `${b}: grew by ${open[i] - closed[i]} when the chapter opened, expected ${extraH}`);
  }
  console.log(`\n  zoom ladder: closed [${ratios(closed).map((r) => r.toFixed(2)).join(" ")}]  ` +
    `open [${ratios(open).map((r) => r.toFixed(2)).join(" ")}]`);
}

// 7. degenerate inputs
ok(eraBlurbLayout("", 390).lines.length === 0, "empty blurb yields no lines");
ok(eraBlurbLayout(LONG, 0).lines.length === 0, "zero width yields no lines");
ok(eraBlurbExtraH(0) === 0, "zero lines costs nothing");
ok(wrapEraBlurb(LONG, 60).length <= ERA_BLURB_MAX_LINES, "a hopeless measure still respects the cap");
ok(wrapEraBlurb(LONG, 60).slice(-1)[0].endsWith("…"), "truncation is marked");

console.log(fail ? `\n${fail} FAILURE(S)` : "\nALL SIMS PASS");
process.exit(fail ? 1 : 0);
