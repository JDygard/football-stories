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

import {
  picksForYear,
  isExpandedYear,
  pickLabel,
  textWidth,
} from "../components/visualization/offseason/draftModel.js";

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
  textWidth,
  fitText,
  shortName,
} from "../components/visualization/offseason/draftModel.js";

// --- ONE PICK ROW, EVERY ZOOM ----------------------------------------------
//
// The draft column used to render two unrelated things depending on the band:
//   zoom 2 (compact) — a stack of full-width TIER-COLORED boxes, player name
//     inside, grade letter at the right edge. No pick number, no position.
//   zoom 3 / 4 (expanded) — transparent rows with a pick label at the left
//     ("R1 #4"), the name mid-row, and a small colored grade CHIP at the right.
//
// So the same pick changed shape, color-weight and vocabulary as you zoomed,
// and neither form carried the whole story: the coloured form omitted where
// the player was taken, the detailed form buried the grade in a 20px chip and
// left the row itself blank.
//
// There is now ONE row. It is the compact form's full-width tier fill — that
// block of colour is the fastest read of a class in the whole app — carrying
// all four facts the row is about, in fixed columns so a class reads down as a
// table rather than a ragged list:
//
//   ┌────────────────────────────────────────────┐
//   │ R1 #4   Ja'Marr Chase              WR   A+ │   <- tier-coloured fill
//   └────────────────────────────────────────────┘
//     pick     name (fits/abbrevs)      pos  grade
//
// Zoom changes only how much ROOM the row has, never what it is: the wider
// column at zoom 3/4 buys the round prefix and unabbreviated names, and that
// is the entire difference.
export const ROW_H = 16; // one pick
export const ROW_GAP = 2; // gap between rows, so the fills read as separate
export const ROW_PITCH = ROW_H + ROW_GAP;
export const HEADER_ROW_H = 18; // "DRAFT" + class-grade chip + summary

// Row internals. These are the only numbers the renderer is allowed to know
// about the row's horizontal structure — everything else comes out of
// layoutPickRow() below, so measure and render cannot drift apart.
// These are tight on purpose. Every px here comes straight out of the player's
// name, and the compact column can't grow to pay for them (see COMPACT_COL_W).
export const ROW_INSET = 2; // gap between the column's edge and the row fill
export const ROW_PAD_L = 4;
export const ROW_PAD_R = 2;
export const SLOT_GAP = 2;
export const POS_SLOT_W = 18; // right-aligned; "OLB" is the widest real one
export const TIER_SLOT_W = 12; // right-aligned; widest is "A+" (or "S*")
export const NAME_FS = 9.5;
export const PICK_FS = 9;
export const POS_FS = 8.5;
export const TIER_FS = 8.5;

// Below this the name is being squeezed hard enough that the round prefix is
// no longer worth its width — the pick label degrades to the overall number
// alone ("#4") and the name gets the difference. This is what makes zoom 2
// show "#4" and zoom 3/4 show "R1 #4" without either being a special case.
export const MIN_NAME_W = 80;

// Fixed cost, measured against the COLUMN width, of everything in a row that
// is neither the pick gutter nor the name.
const ROW_FIXED_W =
  ROW_INSET * 2 + ROW_PAD_L + SLOT_GAP + POS_SLOT_W + SLOT_GAP + TIER_SLOT_W + ROW_PAD_R;

// Overall-pick-only form of the pick label, the fallback rung of the gutter.
export function overallLabel(p) {
  if (p && p.pick_overall != null) return `#${p.pick_overall}`;
  if (p && p.round != null) return `R${p.round}`;
  return "—";
}

// The pick gutter is measured ONCE PER CLASS, not per row: every row in a
// column indents its name to the same x, so the names form a straight edge and
// the eye can run down them. Measuring per row would ragged them by a few px
// each ("#4" vs "#245") for no gain.
export function pickGutter(picks, width) {
  const list = picks || [];
  const widest = (fn, fs) =>
    list.reduce((w, p) => Math.max(w, textWidth(fn(p), fs)), 0);
  const fullW = widest(pickLabel, PICK_FS);
  if (width - ROW_FIXED_W - fullW >= MIN_NAME_W) {
    return { form: "full", width: fullW, label: pickLabel };
  }
  return { form: "overall", width: widest(overallLabel, PICK_FS), label: overallLabel };
}

// Room left for the player's name once the pick gutter, the position slot and
// the grade slot have taken theirs.
export function nameBudget(width, gutterW) {
  return width - ROW_FIXED_W - gutterW;
}

// Where the row's fill sits and where each of its four fields lands inside it.
// `x`/`width` are the COLUMN's, not the fill's. `pickX` and `nameX` are left
// edges; `posRight` and `tierRight` are right edges (both slots are
// right-aligned so they stay in column no matter the string).
export function layoutPickRow(x, width, gutterW) {
  const boxX = x + ROW_INSET;
  const boxW = Math.max(8, width - ROW_INSET * 2);
  const pickX = boxX + ROW_PAD_L;
  const nameX = pickX + gutterW + SLOT_GAP;
  const tierRight = boxX + boxW - ROW_PAD_R;
  // A gap, not just adjacency: an "A+" grade is nearly the full tier slot, so
  // without it a two-letter position printed flush against it ("QBA+").
  const posRight = tierRight - TIER_SLOT_W - SLOT_GAP;
  return {
    boxX,
    boxW,
    pickX,
    nameX,
    posRight,
    tierRight,
    nameW: nameBudget(width, gutterW),
  };
}

// --- column widths ---------------------------------------------------------
//
// Both widths are set by what the row has to hold, and both grew when the pick
// number and position joined it: compact 116 -> 132, full 176 -> 190 (enough
// that the gutter can afford the round prefix — see MIN_NAME_W).
//
// COMPACT IS CAPPED BY THE ZOOM LADDER, NOT BY TASTE. At SEASON_LINES the
// season is a 40px line, so the offseason block — banner + reserve + this
// column — is most of the band's total width; widening it walks SEASON_LINES
// toward GAME_BANDS until pickBand's log-space hysteresis can no longer step
// between the two and the zoom sticks. Measured on the sim's synthetic
// franchise, GAME_BANDS/SEASON_LINES runs 1.383 at 116 and 1.264 at 156 —
// under the ~1.271 the algebra needs. 132 holds it at 1.358, which is why the
// compact name budget is what it is. Growing it further means retuning
// DESKTOP_GEOMETRY's season widths too; sims/desktop_logic.sim.mjs is the
// check that will tell you.
export const COMPACT_COL_W = 132;
export const FULL_COL_W = 190;
export const BOTTOM_PAD = 4;

// Legacy aliases. The compact and expanded rows are the same row now, so these
// all resolve to the one spec; kept as named exports because the mobile module
// and older call sites still reach for them by these names.
export const PICK_ROW_H = ROW_PITCH;
export const COMPACT_HEADER_H = HEADER_ROW_H;
export const COMPACT_ROW_H = ROW_H;
export const COMPACT_GAP = ROW_GAP;

// shortName moved to draftModel.js (re-exported above) so mobile can reach the
// same abbreviation ladder — it is the fallback rung of fitText, not a
// desktop-only flourish.

// Module WIDTH for a given year + render mode. 0 => nothing to show, so the
// offseason block stays at its minimum. (Mobile's measure returns height; the
// desktop layout engine stacks along x, so this returns width.)
export function measureDraftDesktop({ year, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return 0;
  if (mode === "compact" && !isExpandedYear(data, year)) return COMPACT_COL_W;
  return FULL_COL_W;
}
