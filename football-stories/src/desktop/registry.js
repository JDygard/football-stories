// Desktop offseason module registry — mirrors the mobile registry with
// desktop-geometry modules. The moduleData assembly (buildModuleData) is pure
// data plumbing with no orientation in it, so it's re-exported from the mobile
// registry rather than duplicated.
//
// Adding desktop offseason content (trades, UDFAs, narrative, …) = register
// another module here implementing { id, label, minBand, enabledByDefault,
// measure(ctx)->WIDTH px, render(ctx)->jsx }.

import DesktopDraftModule from "./DesktopDraftModule.jsx";

export { buildModuleData } from "../components/visualization/offseason/registry.js";

export const DESKTOP_OFFSEASON_MODULES = [DesktopDraftModule];

// Modules to render given the user's settings toggles. A module shows when its
// id isn't explicitly disabled; absent from settings => use enabledByDefault.
// (Same ids as mobile, so one Settings toggle governs both orientations.)
export function getEnabledDesktopModules(settings = {}) {
  return DESKTOP_OFFSEASON_MODULES.filter((m) => {
    const v = settings[m.id];
    return v === undefined ? m.enabledByDefault : !!v;
  });
}
