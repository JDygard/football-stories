// Desktop geometry for the offseason DRAFT module.
//
// All the pure draft semantics (tier ramp, grade lens, class summaries,
// grouping, labels) are shared with mobile via re-export — only the measure
// geometry is orientation-specific: on desktop a draft class is a COLUMN whose
// measured value is its WIDTH; the pick rows stack vertically inside it (a
// draft class is naturally a vertical list, so the row internals need no
// transposition — landscape simply gives them room).
//
// Kept JSX-free so it can be unit-simulated in node and imported by the
// desktop layout engine's measure path. Presentation lives in
// DesktopDraftModule.jsx.

import { picksForYear, isExpandedYear } from "../components/visualization/offseason/draftModel.js";

export {
  TIER_COLORS,
  NO_VALUE_COLOR,
  tierColor,
  tierTextColor,
  gradeOf,
  groupPicksByYear,
  picksForYear,
  classGradeFor,
  isExpandedYear,
  classSummary,
  pickLabel,
  truncate,
} from "../components/visualization/offseason/draftModel.js";

// --- column geometry (measure and render must agree on these) ---
export const HEADER_ROW_H = 18; // header strip at the top of the column
export const PICK_ROW_H = 16; // one pick per row, stacked down the column
export const FULL_COL_W = 176; // full mode: label + name + grade chip

// Compact mode (zoom 2, "Seasons"). This used to be an unlabeled 18px strip of
// bare tier-colored squares: you could see that a class graded well, with no
// way to tell you were looking at the draft at all, let alone who was in it.
// It's now a labeled section — a "DRAFT" header carrying the class grade, then
// one tier-colored box per pick with the player's name inside it. Wider, but
// landscape at this zoom has the room, and the column stops being a riddle.
export const COMPACT_COL_W = 116;
export const COMPACT_HEADER_H = 16; // "DRAFT" + class-grade chip
export const COMPACT_ROW_H = 15; // one named grade box per pick
export const COMPACT_GAP = 2; // gap between boxes
export const BOTTOM_PAD = 4;

// "Jamarr Chase" -> "J. Chase". A generational suffix isn't the name anyone
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

// Module WIDTH for a given year + render mode. 0 => nothing to show, so the
// offseason block stays at its minimum. (Mobile's measure returns height; the
// desktop layout engine stacks along x, so this returns width.)
export function measureDraftDesktop({ year, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return 0;
  if (mode === "compact" && !isExpandedYear(data, year)) return COMPACT_COL_W;
  return FULL_COL_W;
}
