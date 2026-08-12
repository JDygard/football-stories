// Desktop (landscape) detail geometry — the 90°-rotated sibling of
// components/visualization/detail.js.
//
// The BAND MODEL is shared with mobile (same 5 semantic-zoom bands, same
// ordering, same hysteresis helpers, same user-facing zoom labels) — only the
// per-band GEOMETRY is orientation-specific: on desktop, zoom changes how much
// horizontal WIDTH each timeline block reveals (time flows left→right), so
// every mobile height constant becomes a width here.
//
// Deliberately a separate file from the mobile geometry so desktop tuning
// never touches the phone layout.

import { DEFAULT_BAND } from "../components/visualization/detail.js";

// Shared, orientation-agnostic band machinery re-exported for desktop callers
// so they never need to import from the mobile tree directly.
export {
  DETAIL_BANDS,
  DEFAULT_BAND,
  ZOOM_LEVELS,
  ZOOM_LABELS,
  zoomLabelFor,
  bandRank,
  bandAtLeast,
} from "../components/visualization/detail.js";

// Per-band geometry consumed by buildDesktopLayout.
//   season.mode: "cols" -> one column per game, width = games * gameColWidth
//                "line" -> single collapsed column of fixed `width`
//   offseason:   "full" | "compact" | "hidden" (same meaning as mobile)
export const DESKTOP_GEOMETRY = {
  GAME_DETAIL: { season: { mode: "cols", gameColWidth: 22 }, offseason: "full" },
  GAME_BANDS: { season: { mode: "cols", gameColWidth: 9 }, offseason: "full" },
  SEASON_LINES: { season: { mode: "line", width: 26 }, offseason: "compact" },
  ERA_SUMMARY: { season: { mode: "line", width: 12 }, offseason: "hidden" },
  FRANCHISE_OVERVIEW: { season: { mode: "line", width: 5 }, offseason: "hidden" },
};

export const desktopGeometryFor = (band) =>
  DESKTOP_GEOMETRY[band] || DESKTOP_GEOMETRY[DEFAULT_BAND];
