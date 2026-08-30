// Node simulation of the semantic palette (vite build can't run in the sandbox).
//
// This sim exists because the palette's central rule — RED AND GREEN MEAN WIN
// AND LOSS, so no personnel color may be red or green — is not something the
// eye can police. "That plum looks nothing like the loss red to me" was exactly
// how the old palette ended up with an owner ribbon at #b03a3c sitting beside a
// loss row at #d0423f, and a coach at #2e8b45 beside a win at #2e9d51.
//
// So the rule is enforced numerically, in CIEDE2000 (perceptual) distance:
//
//   1. RESERVATION  — every personnel color is far from every result color.
//   2. LEGIBILITY   — every personnel color clears WCAG AA against the label
//                     color onColor() picks for it. Ribbon labels are drawn ON
//                     these fills, so a color that fails here ships unreadable
//                     names, not merely an ugly ribbon.
//   3. SEPARATION   — colors meant to be told apart are far enough apart.
//                     Colors meant to READ AS A FAMILY (front office, defense,
//                     WR/TE) are checked for the opposite: close in hue, clearly
//                     stepped in lightness. A family that drifts apart in hue
//                     stops saying "these are one kind of thing".
//
// Run: node sims/palette.sim.mjs

import {
  RESULT, TREND, ROLE_COLORS, TIER_COLORS, onColor, INK, PAPER,
  MEDALS, MEDAL_SB, MEDAL_SB_INK, MEDAL_CONF, MEDAL_CONF_INK,
  MEDAL_DIV, MEDAL_DIV_INK,
} from "../src/palette.js";

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) { failures++; console.log("FAIL:", msg); }
};

// ---- color math (self-contained; the app never needs this at runtime) ----
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255), c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(h) {
  const [r, g, b] = hex2rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const L1 = luminance(a), L2 = luminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
function rgb2lab(h) {
  let [r, g, b] = hex2rgb(h).map(lin);
  let x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function de2000(h1, h2) {
  const [L1, a1, b1] = rgb2lab(h1), [L2, a2, b2] = rgb2lab(h2);
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const A1 = (1 + G) * a1, A2 = (1 + G) * a2;
  const Cp1 = Math.hypot(A1, b1), Cp2 = Math.hypot(A2, b2);
  const hp = (b, a) => {
    if (b === 0 && a === 0) return 0;
    const h = (Math.atan2(b, a) * 180) / Math.PI;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hp(b1, A1), h2p = hp(b2, A2);
  const dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) {
    dh = h2p - h1p;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh * Math.PI) / 360);
  const Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb;
  if (Cp1 * Cp2 === 0) hb = h1p + h2p;
  else {
    hb = h1p + h2p;
    if (Math.abs(h1p - h2p) > 180) hb += hb < 360 ? 360 : -360;
    hb /= 2;
  }
  const T = 1 - 0.17 * Math.cos(((hb - 30) * Math.PI) / 180)
    + 0.24 * Math.cos((2 * hb * Math.PI) / 180)
    + 0.32 * Math.cos(((3 * hb + 6) * Math.PI) / 180)
    - 0.2 * Math.cos(((4 * hb - 63) * Math.PI) / 180);
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const Sc = 1 + 0.045 * Cpb;
  const Sh = 1 + 0.015 * Cpb * T;
  const Rt = -2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7))
    * Math.sin((60 * Math.exp(-(((hb - 275) / 25) ** 2)) * Math.PI) / 180);
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2
    + Rt * (dC / Sc) * (dH / Sh));
}
const labHue = (h) => {
  const [, a, b] = rgb2lab(h);
  const d = (Math.atan2(b, a) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};
const labL = (h) => rgb2lab(h)[0];

// ---------------------------------------------------------------------------
// 1. RESERVATION — personnel colors must not be confusable with results.
// ---------------------------------------------------------------------------
// The result colors a personnel color could actually be mistaken for. TIE and
// TREND.NEUTRAL are excluded on purpose: they are greys, and the palette's own
// greys (st, unknown, ol) are ALLOWED to be grey — the rule is about red and
// green, not about every color the timeline draws.
const RESERVED = {
  WIN: RESULT.WIN,
  LOSS: RESULT.LOSS,
  "TREND.GOOD": TREND.GOOD,
  "TREND.BAD": TREND.BAD,
  "TREND.UP": TREND.UP,
  "TREND.DOWN": TREND.DOWN,
};
const RESERVE_MIN_DE = 25;

console.log("-- reservation: personnel vs result colors --");
for (const [role, color] of Object.entries(ROLE_COLORS)) {
  let worst = Infinity, who = null;
  for (const [rk, rc] of Object.entries(RESERVED)) {
    const d = de2000(color, rc);
    if (d < worst) { worst = d; who = rk; }
  }
  ok(
    worst >= RESERVE_MIN_DE,
    `ROLE_COLORS.${role} (${color}) is only dE ${worst.toFixed(1)} from ${who}`
    + ` — red and green are reserved for results (min ${RESERVE_MIN_DE})`,
  );
  console.log(`   ${role.padEnd(8)} ${color}  nearest ${who.padEnd(11)} dE ${worst.toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// 2. LEGIBILITY — labels are drawn ON these fills.
// ---------------------------------------------------------------------------
console.log("\n-- legibility: onColor() label on each fill --");
for (const [role, color] of Object.entries(ROLE_COLORS)) {
  const label = onColor(color);
  const ratio = contrast(color, label);
  ok(
    ratio >= 4.5,
    `ROLE_COLORS.${role} (${color}) labels at only ${ratio.toFixed(2)}:1 — below WCAG AA`,
  );
  console.log(`   ${role.padEnd(8)} ${color}  ${(label === INK ? "ink" : "paper").padEnd(5)} ${ratio.toFixed(2)}:1`);
}
// The tier ramp keeps green->red, so its light middle is exactly where a
// hardcoded white label used to fail.
for (const [tier, color] of Object.entries(TIER_COLORS)) {
  const ratio = contrast(color, onColor(color));
  ok(ratio >= 4.5, `TIER_COLORS["${tier}"] (${color}) labels at ${ratio.toFixed(2)}:1`);
}
// onColor must never hand back something unreadable for a malformed input.
ok(onColor(undefined) === INK, "onColor(undefined) should fall back to INK");
ok(onColor("nonsense") === INK, "onColor(garbage) should fall back to INK");
ok(onColor("#ffffff") === INK && onColor("#000000") === PAPER, "onColor extremes");

// ---------------------------------------------------------------------------
// 3a. SEPARATION — things meant to be told apart.
// ---------------------------------------------------------------------------
// Members of the same family are exempt: they are SUPPOSED to look related,
// and 3b checks that they do.
const FAMILIES = [
  ["owner", "gm", "coach"],
  ["dl", "lb", "db"],
  ["wr", "te"],
];
const sameFamily = (a, b) => FAMILIES.some((f) => f.includes(a) && f.includes(b));
const SEPARATE_MIN_DE = 12;

console.log("\n-- separation: cross-family nearest neighbours --");
const roles = Object.keys(ROLE_COLORS);
for (const a of roles) {
  let worst = Infinity, who = null;
  for (const b of roles) {
    if (a === b || sameFamily(a, b)) continue;
    const d = de2000(ROLE_COLORS[a], ROLE_COLORS[b]);
    if (d < worst) { worst = d; who = b; }
  }
  ok(
    worst >= SEPARATE_MIN_DE,
    `ROLE_COLORS.${a} and .${who} are only dE ${worst.toFixed(1)} apart`
    + ` and are not one family (min ${SEPARATE_MIN_DE})`,
  );
  console.log(`   ${a.padEnd(8)} nearest ${who.padEnd(8)} dE ${worst.toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// 3b. COHESION — things meant to read as one family.
// ---------------------------------------------------------------------------
// A family is one hue at several lightnesses. Both halves matter: drift in hue
// and it stops reading as a family; skip the lightness step and its members
// become indistinguishable.
const FAMILY_HUE_SPREAD_MAX = 40; // degrees
const FAMILY_L_STEP_MIN = 8; // CIE L* between adjacent members

console.log("\n-- cohesion: families are one hue, stepped in lightness --");
for (const fam of FAMILIES) {
  const hues = fam.map((k) => labHue(ROLE_COLORS[k]));
  const spread = Math.max(...hues) - Math.min(...hues);
  ok(
    spread <= FAMILY_HUE_SPREAD_MAX,
    `family [${fam.join(", ")}] spans ${spread.toFixed(0)}deg of hue`
    + ` — too wide to read as one kind of thing (max ${FAMILY_HUE_SPREAD_MAX})`,
  );
  const Ls = fam.map((k) => labL(ROLE_COLORS[k]));
  const sorted = [...Ls].sort((x, y) => x - y);
  let minStep = Infinity;
  for (let i = 1; i < sorted.length; i++) minStep = Math.min(minStep, sorted[i] - sorted[i - 1]);
  ok(
    minStep >= FAMILY_L_STEP_MIN,
    `family [${fam.join(", ")}] has adjacent members only ${minStep.toFixed(1)} L* apart`
    + ` (min ${FAMILY_L_STEP_MIN})`,
  );
  console.log(
    `   [${fam.join(", ").padEnd(20)}] hue spread ${spread.toFixed(0).padStart(3)}deg`
    + `  min L* step ${minStep.toFixed(1)}`,
  );
}

// The front office is one family and the defense is another; they must not
// collapse into each other.
ok(
  de2000(ROLE_COLORS.coach, ROLE_COLORS.lb) >= 25,
  "the front-office and defense families should not converge at their bright ends",
);

// ---------------------------------------------------------------------------
// 4. The grade ramp deliberately KEEPS green->red, and must stay monotonic.
// ---------------------------------------------------------------------------
console.log("\n-- grade ramp stays ordered --");
const ladder = ["S", "A+", "A", "B", "C", "D", "F"];
for (let i = 1; i < ladder.length; i++) {
  const prev = labHue(TIER_COLORS[ladder[i - 1]]);
  const cur = labHue(TIER_COLORS[ladder[i]]);
  ok(
    cur <= prev + 1,
    `tier ramp reverses direction at ${ladder[i - 1]} -> ${ladder[i]}`
    + ` (hue ${prev.toFixed(0)} -> ${cur.toFixed(0)}); it must run green to red`,
  );
}
ok(
  de2000(TIER_COLORS.S, RESULT.WIN) < 40 && de2000(TIER_COLORS.F, RESULT.LOSS) < 40,
  "the grade ramp is supposed to share the result language — check TIER_COLORS",
);

// ---------------------------------------------------------------------------
// THE CROWN METALS
// ---------------------------------------------------------------------------
// Three caps hang above the lane — gold SB, silver CONF, copper DIV — and each
// one sits inches from a FRAME whose color means something else. Two of the
// three are meant to match their frame exactly (a Super Bowl win is gold in
// both places, a conference win is the same silver MEDALS gives "lost the big
// one"), and the third must NOT be confusable with the bronze that means "lost
// in the divisional round" — which is the nearest color on the timeline to it
// and the easiest thing in this palette to misread.
{
  const medalOf = (finish) => MEDALS.find(([re]) => re.test(finish))?.[1];
  ok(MEDAL_SB === medalOf("Won SB"), "the gold cap and a title's frame must be one value");
  ok(MEDAL_CONF === medalOf("Lost SB"),
     "the silver cap and the frame of the season it describes must be one value —"
     + " winning the conference and losing the Super Bowl are the same season");

  const metals = [["SB", MEDAL_SB], ["CONF", MEDAL_CONF], ["DIV", MEDAL_DIV]];
  for (let i = 0; i < metals.length; i++) {
    for (let j = i + 1; j < metals.length; j++) {
      const d = de2000(metals[i][1], metals[j][1]);
      ok(d >= 14, `${metals[i][0]} and ${metals[j][0]} caps are only dE ${d.toFixed(1)} apart`
        + " — the three tiers have to be told apart at a glance, at 16px wide");
    }
  }
  // The one that has no frame to agree with, against the frame it will sit on.
  const bronze = medalOf("Lost Div");
  const dDiv = de2000(MEDAL_DIV, bronze);
  ok(dDiv >= 14,
    `the copper DIV cap is only dE ${dDiv.toFixed(1)} from the bronze that means`
    + " \"lost in the divisional round\" — a division winner often wears exactly"
    + " that frame, so the cap and the frame under it would read as one mark");
  console.log(`   crown metals: DIV vs divisional-round bronze dE ${dDiv.toFixed(1)}`);

  // Ink legibility on each cap.
  for (const [name, bg, ink] of [
    ["SB", MEDAL_SB, MEDAL_SB_INK],
    ["CONF", MEDAL_CONF, MEDAL_CONF_INK],
    ["DIV", MEDAL_DIV, MEDAL_DIV_INK],
  ]) {
    const c = contrast(ink, bg);
    ok(c >= 4.5, `${name} cap label is ${c.toFixed(2)}:1 on its metal — needs 4.5:1`);
  }
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL SIMS PASS");
process.exit(failures ? 1 : 0);
