// SUPER BOWL CROWNS — the desktop timeline's loudest mark.
//
// At the two line-mode zooms (Eras, Seasons) a season is one thin column and a
// playoff finish is just the color of the outline around it. That made a title
// year a slightly different shade of frame from a divisional exit, which is not
// how anyone experiences a Super Bowl. So a title BREAKS OUT of the lane: its
// frame keeps going up past the top of the timeline and is capped by a gold
// plaque reading "SB".
//
// WHERE THE HEIGHT COMES FROM. With Named Eras on, the era header band is 132px
// tall and its text stops at the record line's baseline (92). The remaining ~36px
// is deliberate air — see desktopEraModel's note — and the crown lives in it, so
// the mark costs NO extra vertical budget. With eras off there is no header, and
// DesktopTimelineLayer reserves CROWN_ZONE explicitly instead.
//
// MERGING. Back-to-back titles at the Eras zoom put two plaques on columns that
// can be 16px wide, and "SB" needs about 30. Rather than let them overlap or
// nudge them off their own years, consecutive title seasons whose plaques would
// collide MERGE into one plaque over one frame, labelled "SB x2". Merging is
// COLLISION-DRIVEN, not unconditional: at the Seasons zoom the columns are far
// enough apart (40px plus an offseason block between them) that every title
// keeps its own plaque, which is the right answer when there is room for it.
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

// The crown's vertical budget ABOVE the lane, and how it is spent:
//   plaque       [laneTop - CROWN_ZONE, laneTop - CROWN_ZONE + CROWN_H]
//   frame rises  to laneTop - CROWN_RISE, tucking under the plaque's lower edge
// so the two read as one continuous mark rather than a badge floating over a box.
export const CROWN_ZONE = 30;
export const CROWN_H = 24;
export const CROWN_RISE = 8;
// THE PLAQUE IS SIZED BY THE TIGHTEST CASE ON THE LADDER, not by taste. At the
// Eras zoom a season column can be ERA_FIT_MIN_SEASON_W (16px), so two titles
// separated by a single ordinary year sit just 32px apart. A plaque of
// CROWN_MIN_W plus CROWN_GAP has to fit inside that or every alternating pair
// gets nudged off its own year — which is the ugly, common case, not the rare
// one. 27 + 3 = 30 against 32 leaves 2px. If you grow the type or the padding,
// sims/desktop_crown.sim.mjs will tell you immediately.
export const CROWN_FS = 12;
export const CROWN_PAD = 5; // horizontal padding inside the plaque
export const CROWN_MIN_W = 26;
export const CROWN_GAP = 3; // clear space demanded between two plaques

// The medal frame's width for a season column. Exported because the crown and
// the ordinary (non-title) medal frame in DesktopTimelineLayer have to agree —
// a title year's frame is the SAME frame, just taller.
export function medalFrameWidth(block) {
  return Math.max(4, Math.min(block.width - 2, 22));
}

const labelFor = (count) => (count > 1 ? `SB ×${count}` : "SB");

function plaqueWidth(label, frameSpan) {
  const text = estimateTextWidth(label, CROWN_FS, "sans");
  return Math.max(CROWN_MIN_W, frameSpan, Math.ceil(text) + CROWN_PAD * 2);
}

function makeCluster(items) {
  const first = items[0];
  const last = items[items.length - 1];
  const x0 = first.cx - first.frameW / 2;
  const x1 = last.cx + last.frameW / 2;
  const label = labelFor(items.length);
  return {
    key: `sb-${first.year}`,
    years: items.map((it) => it.year),
    count: items.length,
    // The FRAME spans the merged years; the PLAQUE is centred on it and may be
    // wider (a short label still needs a legible plaque).
    frameX0: x0,
    frameX1: x1,
    cx: (x0 + x1) / 2,
    label,
    plaqueW: plaqueWidth(label, x1 - x0),
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
export function buildSuperBowlCrowns({ blocks, showPlayoffs = true } = {}) {
  if (!showPlayoffs || !blocks?.length) return [];

  const titles = [];
  for (const b of blocks) {
    if (b.type !== "season") continue;
    if (!wonSuperBowl(b.season?.season?.playoffs)) continue;
    titles.push({
      year: b.year,
      cx: b.x0 + b.width / 2,
      frameW: medalFrameWidth(b),
    });
  }
  if (!titles.length) return [];

  // Group into runs of CONSECUTIVE seasons. Only a run may merge, because
  // "SB x2" has to mean back-to-back.
  const runs = [];
  for (const t of titles) {
    const run = runs[runs.length - 1];
    if (run && t.year === run[run.length - 1].year + 1) run.push(t);
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

// Every year that is inside a crown, so the ordinary per-season medal frame can
// stand down and let the crown draw the taller one instead of both drawing.
export function crownedYears(crowns) {
  const out = new Set();
  for (const c of crowns || []) for (const y of c.years) out.add(y);
  return out;
}
