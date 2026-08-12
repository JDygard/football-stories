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
export const CHIP_COL_W = 18; // compact mode: a narrow vertical chip strip
export const FULL_COL_W = 176; // full mode: label + name + score bar + chip
export const BOTTOM_PAD = 4;

// Module WIDTH for a given year + render mode. 0 => nothing to show, so the
// offseason block stays at its minimum. (Mobile's measure returns height; the
// desktop layout engine stacks along x, so this returns width.)
export function measureDraftDesktop({ year, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return 0;
  if (mode === "compact" && !isExpandedYear(data, year)) return CHIP_COL_W;
  return FULL_COL_W;
}
