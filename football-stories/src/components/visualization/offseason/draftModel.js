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
export const COMPACT_H = 16; // single chip row
export const BOTTOM_PAD = 4;

// Tier ramp: green (exceeded expectation) -> red (fell short). null = no value.
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

export function tierColor(tier) {
  return TIER_COLORS[tier] || NO_VALUE_COLOR;
}

// WCAG-aware foreground for a tier chip. The ramp runs from dark green through
// pale yellow (C = #fee08b) to orange/red, so white text fails badly on the
// light middle tiers. Pick near-black or white by whichever has the higher
// contrast ratio against the chip color — both ≥4.5:1 (AA) across the ramp.
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
export function tierTextColor(tier) {
  const L = _luminance(tierColor(tier));
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastBlack >= contrastWhite ? "#1a1a1a" : "#ffffff";
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
export function measureDraft({ year, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return 0;
  if (mode === "compact" && !isExpandedYear(data, year)) {
    return HEADER_H + COMPACT_H + BOTTOM_PAD;
  }
  return HEADER_H + picks.length * PICK_ROW_H + BOTTOM_PAD;
}

// Aggregate readout for the class header.
export function classSummary(picks) {
  const list = picks || [];
  const scored = list.filter((p) => p.value && typeof p.value.score === "number");
  const avgScore = scored.length
    ? scored.reduce((a, p) => a + p.value.score, 0) / scored.length
    : null;
  const hits = list.filter((p) => p.value && ["S", "A+", "A", "B"].includes(p.value.tier)).length;
  const busts = list.filter((p) => p.value && ["D", "F"].includes(p.value.tier)).length;
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
