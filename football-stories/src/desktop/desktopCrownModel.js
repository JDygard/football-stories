// CROWNS — the desktop timeline's loudest marks.
//
// At the two line-mode zooms (Eras, Seasons) a season is one thin column and a
// playoff finish is just the color of the outline around it. That made a title
// year a slightly different shade of frame from a divisional exit, which is not
// how anyone experiences a Super Bowl. So a season that WON something breaks
// out of the lane and is capped by a plaque naming what it won.
//
// THREE TIERS, and a season only ever wears its highest (user, 2026-08-28):
//
//   SB    gold    won the Super Bowl
//   CONF  silver  won the conference — which in this data is exactly "Lost SB",
//                 the season you reached the final and lost it
//   DIV   copper  won the division, read off `division_finish`, not the
//                 playoff result
//
// The top two RISE: their frame keeps going up out of the lane, as the gold
// always has. The copper does not — it is a cap on a column that keeps its own
// frame, and that is not only a matter of degree. A division winner's playoff
// EXIT can be anything (a wild-card loss, a divisional loss, nothing at all),
// and that exit is what the frame's color says. Letting copper take the frame
// over would overwrite a fact with a different fact. Gold and silver have no
// such problem: "Won SB" and "Lost SB" are already gold and silver in the
// MEDALS table, so cap and frame cannot disagree.
//
// WHERE THE HEIGHT COMES FROM. With Named Eras on, the era header band is 132px
// tall and its text stops at the record line's baseline (92). The remaining ~36px
// is deliberate air — see desktopEraModel's note — and the crown lives in it, so
// the mark costs NO extra vertical budget. With eras off there is no header, and
// DesktopTimelineLayer reserves CROWN_ZONE explicitly instead.
//
// MERGING. Back-to-back wins at the Eras zoom put two plaques on columns that
// can be 16px wide, and a label needs about 30. Rather than let them overlap or
// nudge them off their own years, consecutive seasons whose plaques would
// collide MERGE into one plaque over one frame, labelled "SB x2". Merging is
// COLLISION-DRIVEN, not unconditional: at the Seasons zoom the columns are far
// enough apart (40px plus an offseason block between them) that every win keeps
// its own plaque, which is the right answer when there is room for it.
//
// A run may only merge if it is all ONE TIER. "DIV x3" has to mean three
// division titles running; a division title followed by a Super Bowl is two
// different sentences and gets two plaques (de-collided by separate() below).
//
// Kept JSX-free so it can be simulated in node — vite can't build in the
// sandbox. The presentational side lives in DesktopCrownLayer.jsx.

import { estimateTextWidth } from "./desktopEraModel.js";

// Only "Won SB". Deliberately NARROWER than the gold entry in palette.js's
// MEDALS table, which also matches "won champ" so a pre-merger NFL Championship
// still earns a gold frame. Those are not Super Bowls and must not be labelled
// "SB"; the finish vocabulary in the data is Won SB / Lost SB / Lost Conf /
// Lost Div / Lost WC, so this is exact today and defensive for later.
export const SB_WIN_RE = /won\s*(sb|super)\b/i;

export function wonSuperBowl(playoffs) {
  return typeof playoffs === "string" && SB_WIN_RE.test(playoffs);
}

// Reaching the Super Bowl and losing it IS winning the conference. There is no
// "won conference" in the data — the vocabulary tops out at the result of the
// last game played — so this is the whole of it. Deliberately does not match
// "lost champ": a pre-merger championship game is not a conference final, and
// the same reasoning that keeps "Won Champ" off the gold plaque keeps it off
// this one. Those seasons still take their MEDALS frame color.
export const CONF_WIN_RE = /lost\s*(sb|super)\b/i;

export function wonConference(playoffs) {
  return typeof playoffs === "string" && CONF_WIN_RE.test(playoffs);
}

// Division titles come from a different field entirely: `division_finish`,
// formatted "1st of 4". First place is the title. (divisionLabel in
// DesktopTimelineLayer parses the same string for the year-header facts; the
// format is asserted in the sim so the two cannot drift.)
export const DIVISION_FINISH_RE = /^\s*(\d+)\w*\s+of\s+(\d+)\s*$/;

export function wonDivision(divisionFinish) {
  if (typeof divisionFinish !== "string") return false;
  const m = DIVISION_FINISH_RE.exec(divisionFinish);
  return !!m && Number(m[1]) === 1;
}

// Ordered best-first; the first match wins and a season wears only that one.
//
// ONE OBJECT, THREE SIZES. Every tier is the same plaque — light metal, dark
// engraving, a darker border, the same corner radius and the same white halo.
// Only the metal and the SIZE change, and the size is what carries the rank:
// each step down loses 4px of height and half a point of type. Width cannot
// carry it, because "CONF" is four letters and "SB" is two, so the silver cap
// is a few px wider than the gold one however the type is set — a shorter,
// quieter plaque still reads as the lesser thing.
//
// `pad` and `minW` are per-tier because the tightest case on the ladder is
// per-tier: at the Eras zoom two wins one year apart sit 2 x
// ERA_FIT_MIN_SEASON_W apart, and a plaque plus CROWN_GAP has to fit inside
// that or the pair gets nudged off its own years.
//
// GOLD CLEARS IT AND SILVER DOES NOT, deliberately. "SB" is two letters and
// fits with 2px to spare; "CONF" is four and cannot be made to fit at any size
// anyone could read — squeezing it there needs 7px type. So alternating
// conference wins overlap by ~2px and separate() nudges them apart with a stem,
// which at that size is invisible. The rule the sim actually enforces is the
// one that matters: the gold keeps its margin, and no cap drifts far enough
// from its own column for the stem to stop explaining it.
//
// `rises` decides whether the tier takes the season's frame up out of the lane
// with it (see the header note on why copper does not).
export const CROWN_TIERS = [
  { id: "sb", label: "SB", rises: true, fs: 12, pad: 5, minW: 26, h: 24, sentence: "Won the Super Bowl" },
  { id: "conf", label: "CONF", rises: true, fs: 9.5, pad: 4, minW: 24, h: 20, sentence: "Won the conference" },
  { id: "div", label: "DIV", rises: false, fs: 9, pad: 4, minW: 20, h: 17, sentence: "Won the division" },
];

export const tierById = (id) => CROWN_TIERS.find((t) => t.id === id) || CROWN_TIERS[0];

// The highest thing this season won, or null. Takes the season row as the data
// has it, so the caller never has to know which field each tier reads.
export function crownTierFor(season) {
  if (!season) return null;
  if (wonSuperBowl(season.playoffs)) return CROWN_TIERS[0];
  if (wonConference(season.playoffs)) return CROWN_TIERS[1];
  if (wonDivision(season.division_finish)) return CROWN_TIERS[2];
  return null;
}

// The crown's vertical budget ABOVE the lane, and how it is spent:
//   plaque       [laneTop - CROWN_ZONE, laneTop - CROWN_ZONE + CROWN_H]
//   frame rises  to laneTop - CROWN_RISE, tucking under the plaque's lower edge
// so the two read as one continuous mark rather than a badge floating over a box.
export const CROWN_ZONE = 30;
// The tallest tier's plaque. Each tier has its own `h` and they share a BOTTOM
// edge, so a bigger win wears a taller cap and the hierarchy is legible before
// a single word is read.
export const CROWN_H = 24;
export const CROWN_RISE = 8;
// THE PLAQUE IS SIZED BY THE TIGHTEST CASE ON THE LADDER, not by taste. At the
// Eras zoom a season column can be ERA_FIT_MIN_SEASON_W (16px), so two titles
// separated by a single ordinary year sit just 32px apart. A plaque of
// CROWN_MIN_W plus CROWN_GAP has to fit inside that or every alternating pair
// gets nudged off its own year — which is the ugly, common case, not the rare
// one. 27 + 3 = 30 against 32 leaves 2px. If you grow the type or the padding,
// sims/desktop_crown.sim.mjs will tell you immediately.
export const CROWN_FS = 12; // the SB tier's size; each tier carries its own
export const CROWN_PAD = 5; // the SB tier's padding; likewise per-tier
export const CROWN_MIN_W = 26;
export const CROWN_GAP = 3; // clear space demanded between two plaques

// The medal frame's width for a season column. Exported because the crown and
// the ordinary (non-title) medal frame in DesktopTimelineLayer have to agree —
// a title year's frame is the SAME frame, just taller.
export function medalFrameWidth(block) {
  return Math.max(4, Math.min(block.width - 2, 22));
}

const labelFor = (tier, count) => (count > 1 ? `${tier.label} ×${count}` : tier.label);

export function plaqueWidth(tier, label, frameSpan = 0) {
  const text = estimateTextWidth(label, tier.fs, "sans");
  return Math.max(tier.minW, frameSpan, Math.ceil(text) + tier.pad * 2);
}

function makeCluster(items) {
  const first = items[0];
  const last = items[items.length - 1];
  const tier = first.tier;
  const x0 = first.cx - first.frameW / 2;
  const x1 = last.cx + last.frameW / 2;
  const label = labelFor(tier, items.length);
  return {
    key: `${tier.id}-${first.year}`,
    tier: tier.id,
    // Denormalised so the layer never has to look the tier up again.
    label0: tier.label,
    rises: tier.rises,
    fs: tier.fs,
    h: tier.h,
    sentence: tier.sentence,
    // The frame color a RISING cluster draws. Single seasons keep the medal
    // their own playoff exit earned (identical to the tier color for these two
    // tiers, by construction); a merged run has several and takes the tier's.
    medal: items.length === 1 ? first.medal : null,
    years: items.map((it) => it.year),
    count: items.length,
    // The FRAME spans the merged years; the PLAQUE is centred on it and may be
    // wider (a short label still needs a legible plaque).
    frameX0: x0,
    frameX1: x1,
    cx: (x0 + x1) / 2,
    label,
    plaqueW: plaqueWidth(tier, label, x1 - x0),
    // Set by separate() when a plaque had to be pushed off its own centre.
    plaqueCx: (x0 + x1) / 2,
    nudged: false,
    items,
  };
}

// Push apart any plaques that still overlap after merging. Only reachable
// between clusters that are NOT consecutive seasons (those merge instead), and
// at the Eras zoom's minimum column width even that can't happen — two titles
// separated by one ordinary year sit 2*16 = 32px apart against a 30px plaque.
// It exists so the invariant is guaranteed rather than argued: the sim asserts
// no two plaques overlap, and this is what makes that true at any width.
function separate(clusters) {
  for (let i = 1; i < clusters.length; i++) {
    const prev = clusters[i - 1];
    const cur = clusters[i];
    const minCx = prev.plaqueCx + prev.plaqueW / 2 + CROWN_GAP + cur.plaqueW / 2;
    if (cur.plaqueCx < minCx) {
      cur.plaqueCx = minCx;
      cur.nudged = true;
    }
  }
  return clusters;
}

// Build the crowns for a laid-out timeline.
//
//   blocks — layout.blocks (season + offseason), in timeline order
//
// The playoff finish is read straight off each block, the same place
// SeasonBlock reads it to color its own medal frame, so the crown and the frame
// can never disagree about which season won. (It deliberately does NOT take the
// layer's derived seasonMeta map: that is declared below the layout math that
// needs this result, and threading it up would mean moving a memo for no gain.)
//
// Returns [] when playoff finishes are switched off or the franchise has never
// won one — which is also the signal DesktopTimelineLayer uses to skip
// reserving the crown zone at all.
export function buildCrowns({ blocks, showPlayoffs = true, medalFor = null } = {}) {
  if (!showPlayoffs || !blocks?.length) return [];

  const wins = [];
  for (const b of blocks) {
    if (b.type !== "season") continue;
    const season = b.season?.season;
    const tier = crownTierFor(season);
    if (!tier) continue;
    wins.push({
      year: b.year,
      tier,
      cx: b.x0 + b.width / 2,
      frameW: medalFrameWidth(b),
      medal: medalFor ? medalFor(season) : null,
    });
  }
  if (!wins.length) return [];

  // Group into runs of CONSECUTIVE seasons OF ONE TIER. Only such a run may
  // merge: "SB x2" has to mean back-to-back, and a division title next to a
  // Super Bowl is two different claims that must stay two plaques.
  const runs = [];
  for (const t of wins) {
    const run = runs[runs.length - 1];
    const prev = run && run[run.length - 1];
    if (prev && t.year === prev.year + 1 && t.tier.id === prev.tier.id) run.push(t);
    else runs.push([t]);
  }

  // Within each run, merge neighbours whose plaques would collide, and keep
  // merging until nothing does — a four-peat collapses stepwise, not just
  // pairwise.
  const clusters = [];
  for (const run of runs) {
    let parts = run.map((t) => makeCluster([t]));
    let merged = true;
    while (merged && parts.length > 1) {
      merged = false;
      for (let i = 1; i < parts.length; i++) {
        const a = parts[i - 1];
        const b = parts[i];
        const gap = b.cx - b.plaqueW / 2 - (a.cx + a.plaqueW / 2);
        if (gap < CROWN_GAP) {
          parts.splice(i - 1, 2, makeCluster([...a.items, ...b.items]));
          merged = true;
          break;
        }
      }
    }
    clusters.push(...parts);
  }

  return separate(clusters);
}

// Every year whose frame the crown has TAKEN OVER, so the ordinary per-season
// medal frame stands down and lets the crown draw the taller one instead of
// both drawing. Only the rising tiers qualify: a copper cap sits above a column
// that still draws its own frame, because that frame is saying something the
// cap is not (see the header note).
export function crownedYears(crowns) {
  const out = new Set();
  for (const c of crowns || []) {
    if (!c.rises) continue;
    for (const y of c.years) out.add(y);
  }
  return out;
}
