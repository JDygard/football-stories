// Offseason module registry.
//
// Each module implements the contract consumed by buildTimelineLayout:
//   { id, label, minBand, enabledByDefault, measure(ctx)->px, render(ctx)->jsx }
// Adding offseason content (trades, UDFAs, narrative, images, …) is just a
// matter of registering another module here.

import DraftModule from "./DraftModule.jsx";
import { groupPicksByYear } from "./draftModel.js";

export const OFFSEASON_MODULES = [DraftModule];

// Modules to render given the user's settings toggles. A module shows when its
// id isn't explicitly disabled; absent from settings => use enabledByDefault.
export function getEnabledModules(settings = {}) {
  return OFFSEASON_MODULES.filter((m) => {
    const v = settings[m.id];
    return v === undefined ? m.enabledByDefault : !!v;
  });
}

// Assemble the moduleData bag passed to buildTimelineLayout from raw sources
// (segments fetched by the data layer) plus interaction state/handlers from
// Main: expandedYears (Set of draft years shown as full rows in compact
// mode), onToggleYear, onSelectPick, and tapGuard (returns true when the
// just-finished gesture was a pan, so trailing clicks are ignored).
export function buildModuleData({
  draftSegment,
  expandedDraftYears,
  onToggleDraftYear,
  onSelectPick,
  tapGuard,
} = {}) {
  return {
    draftByYear: draftSegment ? groupPicksByYear(draftSegment.picks) : {},
    classGrades: draftSegment?.class_grades ?? {},
    teamGrade: draftSegment?.team_grade ?? null, // unused in UI; kept for the future control panel
    expandedYears: expandedDraftYears,
    onToggleYear: onToggleDraftYear,
    onSelectPick,
    tapGuard,
  };
}
