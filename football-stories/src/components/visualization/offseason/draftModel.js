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
