// SINGLE SOURCE OF TRUTH for every semantic color in the app.
//
// Before this file existed the same hex literals were declared independently in
// the mobile tree and the desktop tree (WIN/LOSS/TIE and the MEDALS table were
// each written out three times), so a palette change meant hunting the same
// value through a dozen files and the two trees drifted apart in between. Every
// color that MEANS something now lives here; the render files import a name.
//
// Purely local chrome — a card's hairline, a hover tint, a placeholder grey —
// deliberately stays where it is used. Hoisting it would turn this file into an
// undifferentiated bag of greys and hide the part that carries meaning.
//
// ---------------------------------------------------------------------------
// THE ONE RULE: RED AND GREEN MEAN WIN AND LOSS.
//
// The app used to spend red and green three different ways at once — wins and
// losses, coach (green) and owner (red) ribbons, and the draft grade ramp — so
// a red band next to a red game row said nothing in particular. Red and green
// are now reserved for RESULT and TREND below, plus the draft grade ramp, which
// is also a good/bad judgement and deliberately keeps them (see TIER_COLORS).
//
// PERSONNEL COLORS MUST NEVER BE RED OR GREEN. When adding one, run
// `node sims/palette.sim.mjs` — it enforces the reservation numerically
// (CIEDE2000 distance from the result colors) along with label contrast and
// within-palette separation, so "it looked fine to me" can't reintroduce a
// collision.
// ---------------------------------------------------------------------------

// --- results: the reserved red/green ---------------------------------------
// Game outcomes. Vivid but not neon; the strokes are the same hue darkened, for
// marks that need a border (SeasonPage's W/L chips).
export const RESULT = {
  WIN: "#2e9d51",
  LOSS: "#d0423f",
  TIE: "#b9bdc4",
  WIN_STROKE: "#20713a",
  LOSS_STROKE: "#9c322f",
  TIE_STROKE: "#8f959d",
  BORDER: "#d9d9d9", // hairline separator between the win/loss fills
};

// Directional text tone — point differential, division finish, streak arrows.
// Same red/green language as RESULT because it means the same thing; kept
// separate because these are small text/arrow marks and need more contrast
// against paper than the large fills do.
export const TREND = {
  GOOD: "#3f8f2e",
  BAD: "#c0492b",
  NEUTRAL: "#8a857c",
  UP: "#4ade80", // streak arrow on the navy win-rate pill — light, for dark bg
  DOWN: "#ff6b6b",
};

// --- personnel: no red, no green -------------------------------------------
// Three families, because the groups are three different KINDS of thing:
//
//   FRONT OFFICE — one umber hue in three values. They are one kind of thing
//     (who runs the team), so they read as one band of color; the value step
//     carries the distinction. Owner is darkest because owner tenures are the
//     longest and most numerous bands on the rail and want to recede; the coach
//     is the figure people actually scan for, so it is the brightest.
//
//   OFFENSE — individuated hues. This is where fans think in single positions
//     ("the quarterback years"), so each gets its own identity. WR and TE are
//     deliberately one hue at two values: they are the same job.
//
//   DEFENSE — one plum hue in three values, mirroring the front office. Defense
//     is read as a unit far more often than as separate position groups, and
//     three more distinct hues would not survive the red/green reservation
//     anyway.
//
// Every value is checked for >=4.5:1 against its own label color (see onColor)
// and for CIEDE2000 distance from RESULT/TREND.
export const ROLE_COLORS = {
  // front office — umber, dark to bright
  owner: "#453619",
  gm: "#7d6420",
  coach: "#bb8722",

  // offense
  qb: "#6d35ab", // violet
  rb: "#0b7a88", // cyan-teal. Sleeper's RB teal was the starting point; it is
  // pushed off green far enough that a back's ribbon can never
  // be mistaken for a win (dE 30.9 from RESULT.WIN).
  wr: "#2563d0", // blue
  te: "#6f93d6", // the same blue, lighter — receivers are one family
  ol: "#3f4a5a", // dark slate; the trenches stay quiet

  // defense — plum, dark to bright
  dl: "#7a2b58",
  lb: "#b03a8f",
  db: "#c886cf",

  // support
  st: "#6b7079",
  unknown: "#a2a8b0",
};

// --- draft grades ----------------------------------------------------------
// DELIBERATELY still red/green: a grade is a good/bad judgement, and the ramp
// is the one place outside RESULT where that reading is wanted. It survives the
// reservation because nothing else nearby competes for it any more — the
// personnel ribbons that used to sit in the same colors have moved out.
// Ladder (percentile cuts): S 96+, A+ 91, A 78, B 58, C 38, D 15, F 0.
export const TIER_COLORS = {
  S: "#006837",
  "A+": "#1a9850",
  A: "#66bd63",
  B: "#a6d96a",
  C: "#fee08b",
  D: "#fdae61",
  F: "#d73027",
};
export const NO_VALUE_COLOR = "#d9d9d9";

// --- playoff finish --------------------------------------------------------
// The Super Bowl gold, broken out on its own because a title is no longer just
// another frame color: at the two line-mode desktop zooms it becomes a CROWN
// that breaks out of the lane and is capped by a plaque (see
// desktop/desktopCrownModel.js). MEDALS[0] uses this same value — the gold is
// declared once so a title's frame and its plaque can never drift apart.
export const MEDAL_SB = "#d4af37";
export const MEDAL_SB_DARK = "#7d6115"; // plaque border + stem
export const MEDAL_SB_INK = "#3a2c05"; // "SB" on the plaque (12.5:1 on the gold)
export const MEDAL_SB_WASH = "rgba(212,175,55,0.13)"; // the lit column behind it

// Ordered; first regex to match wins. Gold / silver / steel / bronze / black.
// NOTE the gold row also matches "won champ", so a pre-merger NFL Championship
// earns the gold frame. That is deliberate, and it is exactly why the crown has
// its OWN, narrower predicate — those seasons must not be labelled "SB". See
// SB_WIN_RE in desktopCrownModel.js.
export const MEDALS = [
  [/won (sb|super|champ)/i, MEDAL_SB], // gold — won it all
  [/lost (sb|super)/i, "#b9bec7"], // silver — lost the big one
  [/lost conf|lost champ/i, "#8d99ae"], // steel — lost conference
  [/lost div/i, "#cd7f32"], // bronze — lost divisional
  [/lost wc/i, "#2b2b2b"], // black — lost wild card
];

export function playoffMedal(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS) {
    if (re.test(playoffs)) return color;
  }
  return null;
}

// --- win-rate curve --------------------------------------------------------
// NOTE: the two trees have always used slightly different navies here. That
// difference is preserved rather than silently unified — pick one and delete
// the other when you decide which.
export const CURVE = {
  mobile: "#3f5d9e",
  desktop: "#4a6fa5",
};

// --- label contrast --------------------------------------------------------
// Pick near-black or white for text sitting ON one of these colors, by whichever
// has the higher WCAG contrast ratio. Ribbon labels used to be hardcoded white,
// which quietly forced every personnel color to be dark; routing them through
// this instead is what lets the palette use a light step (db, unknown) at all.
function _srgbToLin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function _luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * _srgbToLin(r) + 0.7152 * _srgbToLin(g) + 0.0722 * _srgbToLin(b);
}
export const INK = "#1a1a1a";
export const PAPER = "#ffffff";

// NOTE: the ratios are computed against INK and PAPER themselves, not against
// pure black and white. The version this replaced decided using pure black
// while actually rendering #1a1a1a, so near the crossover it could pick the
// side that measured WORSE once drawn — which is how a mid-grey ends up with a
// label at 3.8:1 while the check claims 4.9:1.
function _ratio(a, b) {
  const La = _luminance(a);
  const Lb = _luminance(b);
  return La > Lb ? (La + 0.05) / (Lb + 0.05) : (Lb + 0.05) / (La + 0.05);
}
export function onColor(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return INK;
  return _ratio(hex, INK) >= _ratio(hex, PAPER) ? INK : PAPER;
}

export function roleColor(role) {
  return ROLE_COLORS[role] || ROLE_COLORS.unknown;
}

export function tierColor(tier) {
  return TIER_COLORS[tier] || NO_VALUE_COLOR;
}
