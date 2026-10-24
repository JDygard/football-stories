// Guard for the two ways era text escaped its frame.
//
// 1. TITLES BLED. The fit test measured with the OPTIMISTIC serif rate (0.5/char)
//    while titleZoneW, the record's inline test and the blurb column origin all
//    used the pessimistic one (0.62) — a flat 1.24x gap. On a 200px frame that
//    is ~48px of overhang into a 10px pad, i.e. straight through the border and
//    into the next chapter's title. 60-67 labels per width band were painted
//    outside their own frame.
//
// 2. BLURBS TRUNCATED. The desktop plaque's height is fixed on purpose, so one
//    380px column held ~6 lines / ~270 chars against a 393-char median: 265 of
//    359 authored blurbs (74%) were cut off mid-thought.
//
// Pure model, plain node, no JSX and no build — see the build-constraint note.
// Run: node sims/era_text_fit.sim.mjs
import { readFileSync } from "fs";
import * as D from "../src/desktop/desktopEraModel.js";
import * as Mo from "../src/components/visualization/eraModel.js";

const eras = JSON.parse(
  readFileSync(new URL("../../dataset_generation/curated/eras.json", import.meta.url), "utf8"),
);
const ALL = [];
for (const list of Object.values(eras)) for (const e of list) ALL.push(e);

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log("FAIL:", m); } else console.log("  ok:", m); };

ok(ALL.length > 300, `loaded the authored eras (${ALL.length})`);

// --- 1. a title is never accepted wider than the frame will paint it --------
// The rule: whatever the fit test accepts must still end inside the frame when
// measured the way the RENDERER positions things. The label may spend the right
// pad and no more.
for (const [PAD_R, M, tree] of [[10, D, "desktop"], [12, Mo, "mobile"]]) {
  let over = 0, shown = 0;
  for (const inner of [100, 120, 160, 200, 260, 320, 400]) {
    const fitW = inner + PAD_R;
    for (const e of ALL) {
      let t = null;
      if (M.estimateTextWidth(e.label, M.ERA_LABEL_FS, "serifWide") <= fitW) t = e.label;
      else if (e.short && M.estimateTextWidth(e.short, M.ERA_LABEL_FS, "serifWide") <= fitW) t = e.short;
      if (!t) continue;
      shown++;
      if (M.estimateTextWidth(t, M.ERA_LABEL_FS, "serifWide") > fitW) over++;
    }
  }
  ok(over === 0, `${tree}: no accepted title exceeds its frame (${over} of ${shown} would spill)`);
  ok(
    M.estimateTextWidth("The Long Goodbye", M.ERA_LABEL_FS, "serifWide") >
      M.estimateTextWidth("The Long Goodbye", M.ERA_LABEL_FS, "serif"),
    `${tree}: serifWide over-measures relative to serif (both rates exist)`,
  );
}

// The em dash is a full em. Classed with commas it made any line holding one
// measure ~0.7em short, which walked wrapped prose through the right border.
for (const [M, tree] of [[D, "desktop"], [Mo, "mobile"]]) {
  const w = (s) => M.estimateTextWidth(s, 12.5, "sans");
  ok(w("a—b") > w("a.b") * 1.3, `${tree}: an em dash measures far wider than a period`);
}

// --- 2. the blurb still fits its plaque ------------------------------------
// One column, one continuous paragraph — the column experiment was reverted:
// a wall label that reads in newspaper columns is not a wall label.
const capacity = D.ERA_BLURB_MAX_LINES;
ok(capacity >= 5, `a column holds ${capacity} lines`);

const needed = ALL.filter((e) => e.blurb)
  .map((e) => D.wrapBlurb(e.blurb, D.ERA_BLURB_COL_W, 9999).length)
  .sort((a, b) => a - b);
const over = needed.filter((n) => n > capacity).length;
console.log(`  note: ${over} of ${needed.length} authored blurbs exceed ${capacity} lines ` +
            `at the ${D.ERA_BLURB_COL_W}px measure (median ${needed[Math.floor(needed.length / 2)]} lines)`);

// Whatever is shown must be marked as cut, never end mid-thought as if it were
// the whole paragraph.
const long = ALL.find((e) => e.blurb && D.wrapBlurb(e.blurb, D.ERA_BLURB_COL_W, 9999).length > capacity);
if (long) {
  const shown = D.wrapBlurb(long.blurb, D.ERA_BLURB_COL_W);
  ok(shown.length <= capacity, `a long blurb is clamped to ${capacity} lines (got ${shown.length})`);
  ok(shown[shown.length - 1].endsWith("\u2026"), "a truncated blurb ends in an ellipsis");
}

// The pad reserves for exactly one readable measure.
const pad = D.blurbPadFor({ blurb: "x", titleZoneW: 100, width: 200 });
ok(pad > 0, `blurbPadFor reserves width for the one column (${pad}px)`);

console.log(bad ? `\n${bad} FAILURES` : "\nera text fit: ALL PASS");
process.exit(bad ? 1 : 0);
