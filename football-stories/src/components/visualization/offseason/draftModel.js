// Pure model + geometry for the offseason DRAFT module.
//
// Kept JSX-free so it can be unit-tested in node and imported by the layout
// engine's measure path. The presentational side lives in DraftModule.jsx.
//
// The per-pick `value` (from compute_player_value.py) is a percentile score
// of era-normalized surplus career AV — actual minus the expected AV for that
// pick slot — so it already expresses draft-capital effectiveness: a high
// score is a steal, a low score a reach/bust. Picks whose class is too recent
// to grade have value === null (UI shows the grey "–" chip).
//
// Expansion: in compact mode (Zoom 2 / SEASON_LINES) a year renders as a chip
// row, but years present in data.expandedYears render their full pick rows.
// measure() and render() both honor this, so tapping a class reflows the
// content stack.

// --- geometry (measure and render must agree on these) ---
export const HEADER_H = 18;
export const PICK_ROW_H = 16;
export const COMPACT_H = 20; // single chip row (Seasons-card chip strip)
export const BOTTOM_PAD = 4;

// The tier ramp lives in ../../../palette.js. It DELIBERATELY keeps green->red:
// a grade is a good/bad judgement, and the personnel ribbons that used to
// compete for those colors have moved off them.
// Ladder (percentile cuts): S 96+, A+ 91, A 78, B 58, C 38, D 15, F 0.
export { TIER_COLORS, NO_VALUE_COLOR, tierColor } from "../../../palette.js";
import { tierColor as _tierColor, onColor } from "../../../palette.js";

// Resolve the active grade for a pick's `value`, honoring the
// availability-adjusted lens. When `adjusted` is true and the adjusted fields
// are present, return them; otherwise fall back to the realized-value grade.
// (The adjusted score prorates the slot's expectation toward games actually
// played, so a productive-but-short career isn't graded as a bust.)
export function gradeOf(value, adjusted = false) {
  if (!value) return { score: null, tier: null, percentile: null, provisional: false };
  if (adjusted && typeof value.score_adj === "number") {
    return {
      score: value.score_adj,
      tier: value.tier_adj,
      percentile: value.percentile_adj,
      provisional: !!value.provisional,
    };
  }
  return {
    score: typeof value.score === "number" ? value.score : null,
    tier: value.tier ?? null,
    percentile: value.percentile ?? null,
    provisional: !!value.provisional,
  };
}

// WCAG-aware foreground for a tier chip. The ramp runs from dark green through
// pale yellow (C) to orange/red, so white text fails badly on the light middle
// tiers; onColor picks near-black or white by whichever wins on contrast —
// both >=4.5:1 (AA) across the ramp.
export function tierTextColor(tier) {
  return onColor(_tierColor(tier));
}

// Group a team draft segment's flat picks list into { [year]: picks[] }.
export function groupPicksByYear(picks) {
  const out = {};
  for (const p of picks || []) {
    const y = p.year;
    if (y == null) continue;
    (out[y] || (out[y] = [])).push(p);
  }
  for (const y of Object.keys(out)) {
    out[y].sort(
      (a, b) =>
        (a.pick_overall ?? 9999) - (b.pick_overall ?? 9999),
    );
  }
  return out;
}

export function picksForYear(data, year) {
  return (data && data.draftByYear && data.draftByYear[year]) || [];
}

// League-wide percentile grade for one (team, year) class, or null.
export function classGradeFor(data, year) {
  const g = data && data.classGrades;
  if (!g) return null;
  return g[year] || g[String(year)] || null;
}

export function isExpandedYear(data, year) {
  return !!(data && data.expandedYears && data.expandedYears.has(year));
}

// Module height for a given year + render mode. 0 => nothing to show, so the
// offseason block stays at its minimum.
//
// Compact (Zoom 2 "Seasons" card): the class is a bare chip strip — the
// grade / summary now live in the card header (see OffseasonBlock), so the
// module renders no header of its own; expanding shows bare pick rows.
// Full (Zoom 3 pages + Zoom 4): header + rows, unchanged.
export function measureDraft({ year, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return 0;
  if (mode === "compact") {
    if (!isExpandedYear(data, year)) return COMPACT_H + BOTTOM_PAD;
    return picks.length * PICK_ROW_H + BOTTOM_PAD;
  }
  return HEADER_H + picks.length * PICK_ROW_H + BOTTOM_PAD;
}

// Aggregate readout for the class header. Lens-aware: with `adjusted` the
// avg/hits/busts reflect the availability-adjusted per-pick grades.
export function classSummary(picks, adjusted = false) {
  const list = picks || [];
  const g = (p) => gradeOf(p.value, adjusted);
  const scored = list.filter((p) => typeof g(p).score === "number");
  const avgScore = scored.length
    ? scored.reduce((a, p) => a + g(p).score, 0) / scored.length
    : null;
  const hits = list.filter((p) => ["S", "A+", "A", "B"].includes(g(p).tier)).length;
  const busts = list.filter((p) => ["D", "F"].includes(g(p).tier)).length;
  return {
    count: list.length,
    scored: scored.length,
    avgScore,
    hits,
    busts,
  };
}

export function pickLabel(p) {
  const r = p.round != null ? `R${p.round}` : "";
  const o = p.pick_overall != null ? `#${p.pick_overall}` : "";
  return [r, o].filter(Boolean).join(" ") || "—";
}

export function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

// --- name fitting -------------------------------------------------------
//
// Fitting a player's name into a draft row means estimating its width: SVG
// <text> can't be measured before it paints, and this module also has to run
// headless in the node sims. The estimate used to be a flat "~6px per
// character", which is wrong in BOTH directions — it clips "Amon-Ra St.
// Brown" (16 narrow glyphs that easily fit) while letting "Quinnen Williams"
// overflow (16 wide ones that don't). Per-glyph advances get close enough to
// choose between candidates honestly, which is the whole job here.
//
// Values are Helvetica/Arial advance widths per 1000 units, i.e. multiples of
// the font size. Anything unlisted falls back to a lowercase average.
const GLYPH_W = {
  " ": 0.278, "'": 0.191, "’": 0.191, "-": 0.333, "·": 0.333,
  ".": 0.278, ",": 0.278, "(": 0.333, ")": 0.333, "…": 1.0,
  a: 0.556, b: 0.556, c: 0.5, d: 0.556, e: 0.556, f: 0.278, g: 0.556,
  h: 0.556, i: 0.222, j: 0.222, k: 0.5, l: 0.222, m: 0.833, n: 0.556,
  o: 0.556, p: 0.556, q: 0.556, r: 0.333, s: 0.5, t: 0.278, u: 0.556,
  v: 0.5, w: 0.722, x: 0.5, y: 0.5, z: 0.5,
  A: 0.667, B: 0.667, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778,
  H: 0.722, I: 0.278, J: 0.5, K: 0.667, L: 0.556, M: 0.833, N: 0.722,
  O: 0.778, P: 0.667, Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722,
  V: 0.667, W: 0.944, X: 0.667, Y: 0.667, Z: 0.611,
};
const FALLBACK_GLYPH_W = 0.52;

export function textWidth(str, fontSize = 10) {
  let w = 0;
  for (const ch of String(str ?? "")) {
    w += GLYPH_W[ch] ?? (ch >= "0" && ch <= "9" ? 0.556 : FALLBACK_GLYPH_W);
  }
  return w * fontSize;
}

// "Ja'Marr Chase" -> "J. Chase". A generational suffix isn't the name anyone
// identifies a player by, so fall back to the token before it.
export function shortName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0];
  let last = parts[parts.length - 1];
  if (parts.length > 2 && /^(jr|sr|ii|iii|iv|v)\.?$/i.test(last)) {
    last = parts[parts.length - 2];
  }
  return `${parts[0][0]}. ${last}`;
}

// Pick the richest label that actually fits `maxWidth`.
//
// Callers pass candidates most- to least-informative ("Ja'Marr Chase · WR",
// "Ja'Marr Chase", "J. Chase") and get the first that fits, so a name is
// abbreviated only when the space genuinely demands it and only as far as it
// demands. That ordering is the point: the old code abbreviated or appended
// unconditionally, which meant a short name in a wide box still rendered as
// "J. Chase", and a long name lost its tail to a position suffix that could
// simply have been dropped instead.
//
// If nothing fits, the last candidate is cut to width — measured, not
// counted — with an ellipsis.
// The glyph table is Helvetica/Arial; the app may render in whatever the UI
// sans stack resolves to, which can run a few percent wider. Estimating a
// touch high is the cheap side of the error — a name that could have fitted
// gets abbreviated (mildly worse), rather than one that couldn't spilling out
// of its tier box (visibly broken).
const FIT_SAFETY = 1.04;

export function fitText(candidates, maxWidth, fontSize = 10) {
  const list = (Array.isArray(candidates) ? candidates : [candidates])
    .filter((c) => c != null && c !== "");
  if (!list.length) return "";
  for (const c of list) {
    if (textWidth(c, fontSize) * FIT_SAFETY <= maxWidth) return c;
  }
  const last = String(list[list.length - 1]);
  const budget = maxWidth / FIT_SAFETY;
  const ellipsisW = textWidth("…", fontSize);
  if (budget <= ellipsisW) return "";
  let w = 0;
  let out = "";
  for (const ch of last) {
    const next = w + textWidth(ch, fontSize);
    if (next + ellipsisW > budget) break;
    w = next;
    out += ch;
  }
  return out ? out + "…" : "";
}
