// Guard for the draft row's text budget — TODO #21 ("full player names in the
// draft area"), re-aimed for the row that now carries FOUR fields.
//
// History, because the assertions below reverse an earlier one:
//   - Originally the rows fitted names by counting CHARACTERS against a flat
//     per-char average. Wrong in both directions: it clipped narrow names that
//     would have fitted and let wide ones overflow, and the compact column
//     abbreviated every name to "J. Chase" whether or not it had to.
//   - `fitText` replaced that with a proportional estimate over an ordered list
//     of candidates, most informative first. At that point the position was a
//     SUFFIX on the name ("Ja'Marr Chase · WR") and the ladder dropped it
//     first, so this sim asserted "the position suffix goes before the name
//     does".
//   - The row now gives the position its OWN right-aligned slot, alongside the
//     pick number and the grade. So the position is no longer negotiable and
//     that assertion is inverted here: the NAME abbreviates and the position
//     survives. This is the deliberate trade — the old ladder meant the longest
//     names, the ones you're most likely to be squinting at, were exactly the
//     ones rendered without a position.
//
// What this pins now:
//   1. a name that fits is rendered WHOLE (still the actual ask),
//   2. nothing rendered ever exceeds its slot,
//   3. the position is ALWAYS present when the data has one,
//   4. the pick gutter degrades from "R1 #4" to "#4" rather than eating the
//      name, and does so at compact width but not at full width,
//   5. it all degrades sanely when even the short name won't fit.
//
// Pure model only — no JSX — so it runs in plain node:
//     node sims/draft_name_fit.sim.mjs

import {
  textWidth,
  fitText,
  shortName,
} from "../src/components/visualization/offseason/draftModel.js";
import {
  COMPACT_COL_W,
  FULL_COL_W,
  NAME_FS,
  POS_FS,
  POS_SLOT_W,
  pickGutter,
  nameBudget,
  layoutPickRow,
} from "../src/desktop/desktopDraftModel.js";

let fail = 0;
const ok = (cond, msg) => {
  if (!cond) {
    fail++;
    console.log("  FAIL: " + msg);
  }
};

const SAFETY = 1.04; // must match FIT_SAFETY in draftModel.js
const fits = (s, size, w) => textWidth(s, size) * SAFETY <= w + 1e-6;

// A realistic class: seven rounds, so the gutter has to hold "#245".
const PICKS = [4, 36, 68, 101, 140, 183, 245].map((o, i) => ({
  round: i + 1,
  pick_overall: o,
}));

const compactG = pickGutter(PICKS, COMPACT_COL_W);
const fullG = pickGutter(PICKS, FULL_COL_W);
const COMPACT_W = nameBudget(COMPACT_COL_W, compactG.width);
const ROW_W = nameBudget(FULL_COL_W, fullG.width);

console.log(
  `compact ${COMPACT_COL_W}px col -> "${compactG.label(PICKS[0])}" gutter, ${COMPACT_W.toFixed(1)}px for the name\n` +
  `full    ${FULL_COL_W}px col -> "${fullG.label(PICKS[0])}" gutter, ${ROW_W.toFixed(1)}px for the name\n`,
);

// --- 4: the gutter is what flexes with zoom, not the fields ---------------
ok(compactG.form === "overall", `compact gutter should drop the round, got "${compactG.form}"`);
ok(fullG.form === "full", `full gutter should keep the round, got "${fullG.form}"`);
ok(compactG.label(PICKS[0]) === "#4", `compact pick label "${compactG.label(PICKS[0])}"`);
ok(fullG.label(PICKS[0]) === "R1 #4", `full pick label "${fullG.label(PICKS[0])}"`);
ok(ROW_W > COMPACT_W, "the full column must buy the name more room, not less");

// --- 1 + 2: real names, whole where possible, never overflowing ------------
const NAMES = [
  "Joe Burrow", "Bo Nix", "Will Levis", "Ja'Marr Chase", "Amon-Ra St. Brown",
  "Quinnen Williams", "Christian McCaffrey", "Odell Beckham Jr.",
  "Sauce Gardner", "Trevon Diggs", "C.J. Stroud", "Puka Nacua",
];
for (const [w, label, size] of [[COMPACT_W, "compact", NAME_FS], [ROW_W, "full", NAME_FS]]) {
  let whole = 0;
  for (const n of NAMES) {
    const out = fitText([n, shortName(n)], w, size);
    if (out === n) whole++;
    ok(fits(out, size, w), `${label}: "${n}" -> "${out}" overflows the ${w.toFixed(1)}px slot`);
    ok(!(out !== n && fits(n, size, w)),
      `${label}: "${n}" was abbreviated to "${out}" despite fitting whole`);
  }
  const floor = label === "compact" ? 7 : 10;
  ok(whole >= floor, `${label}: expected >= ${floor} names whole, got ${whole}/${NAMES.length}`);
  console.log(`  ${label}: ${whole}/${NAMES.length} names render in full`);
}

// --- 3: the position always survives --------------------------------------
// It has its own slot, so no name — however long — can push it out. The only
// thing that can is the data not having one.
const POSITIONS = ["QB", "RB", "WR", "TE", "OT", "OLB", "ILB", "CB", "FS", "NT", "LS", "P", "K"];
for (const pos of POSITIONS) {
  const out = fitText([pos], POS_SLOT_W, POS_FS);
  ok(out === pos, `position "${pos}" should render whole in its ${POS_SLOT_W}px slot, got "${out}"`);
}
console.log(`  position slot holds all ${POSITIONS.length} common positions whole`);

// --- the row's four fields never collide ----------------------------------
for (const [colW, g] of [[COMPACT_COL_W, compactG], [FULL_COL_W, fullG]]) {
  const L = layoutPickRow(0, colW, g.width);
  const pickEnd = L.pickX + Math.max(...PICKS.map((p) => textWidth(g.label(p), 9)));
  ok(pickEnd <= L.nameX + 1e-6, `pick gutter runs into the name at ${colW}px`);
  ok(L.nameX + L.nameW <= L.posRight - POS_SLOT_W + 1e-6,
    `name slot runs into the position slot at ${colW}px`);
  ok(L.posRight <= L.tierRight - 0, `position slot runs into the grade at ${colW}px`);
  ok(L.tierRight <= L.boxX + L.boxW + 1e-6, `grade sits outside the row fill at ${colW}px`);
}

// --- 5: degenerate inputs -------------------------------------------------
ok(fitText([], 100, 10) === "", "empty candidate list yields empty string");
ok(fitText([null, undefined, "", "Fits"], 100, 10) === "Fits", "empty candidates skipped");
ok(fitText(["Anything"], 2, 10) === "", "no room even for an ellipsis yields empty string");
const monster = "Chukwuemeka Ndukwe-Wallace";
const cut = fitText([monster, shortName(monster)], COMPACT_W, NAME_FS);
ok(fits(cut, NAME_FS, COMPACT_W), `elided "${cut}" still overflows`);
console.log(`  overflow: "${monster}" -> "${cut}"`);
ok(pickGutter([], COMPACT_COL_W).width === 0, "an empty class has no gutter");

// --- textWidth is proportional, which is the whole point ------------------
ok(textWidth("iiiiiiiiii", 10) < textWidth("WWWWWWWWWW", 10) / 3,
  "narrow glyphs must cost far less than wide ones");
ok(textWidth("", 10) === 0, "empty string has no width");

// --- shortName ------------------------------------------------------------
ok(shortName("Odell Beckham Jr.") === "O. Beckham", "generational suffix skipped");
ok(shortName("Pele") === "Pele", "single-token name left alone");
ok(shortName("") === "—", "empty name has a placeholder");

console.log(fail ? `\n${fail} FAILURE(S)` : "\nALL SIMS PASS");
process.exit(fail ? 1 : 0);
