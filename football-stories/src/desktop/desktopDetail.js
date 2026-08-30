// Desktop (landscape) detail geometry — the 90°-rotated sibling of
// components/visualization/detail.js.
//
// The BAND MODEL is shared with mobile (same semantic-zoom bands, same
// ordering, same hysteresis helpers, same user-facing zoom labels) — only the
// per-band GEOMETRY is orientation-specific: on desktop, zoom changes how much
// horizontal WIDTH each timeline block reveals (time flows left→right), so
// every mobile height constant becomes a width here.
//
// Deliberately a separate file from the mobile geometry so desktop tuning
// never touches the phone layout.

import {
  DETAIL_BANDS,
  DEFAULT_BAND,
  MENU_BAND,
} from "../components/visualization/detail.js";

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
  MENU_BAND,
  isMenuBand,
} from "../components/visualization/detail.js";

// The DESKTOP ZOOM LADDER. The glossary defines exactly four user-facing rungs
// — Eras / Seasons / Season by season / Every game — but DETAIL_BANDS carries a
// fifth internal band (FRANCHISE_OVERVIEW) that shares rung 1 with ERA_SUMMARY.
// Desktop used to expose both, which gave the ladder two consecutive "Eras"
// stops that differed only in tick width. Now that ERA_SUMMARY sizes itself to
// fit the viewport exactly (see `fit` below), a coarser band has nothing left to
// show, so desktop stops at ERA_SUMMARY — the same call mobile makes via
// MOBILE_BANDS, for the same reason. Everything that walks the ladder (band
// layouts, zoom picking, the HUD) must iterate THIS list, not DETAIL_BANDS.
export const DESKTOP_BANDS = DETAIL_BANDS.filter((b) => b !== "FRANCHISE_OVERVIEW");

// The full desktop ZOOM LADDER: the four timeline bands, then the menu rung
// (src/menu/) that the window opens on. Kept separate from DESKTOP_BANDS
// because the two lists answer different questions — DESKTOP_BANDS is "which
// layouts exist", DESKTOP_ZOOM_BANDS is "which stops the gesture walks". Only
// useDesktopViewport wants the second one; everything that builds or reads a
// layout still wants the first. See MENU_BAND in the mobile detail module for
// why the menu is not simply appended to DETAIL_BANDS.
export const DESKTOP_ZOOM_BANDS = [...DESKTOP_BANDS, MENU_BAND];

// Per-band geometry consumed by buildDesktopLayout.
//   season.mode: "rows" -> a fixed-width COLUMN holding one horizontal row per
//                          game, stacking downward — a game log read the normal
//                          way. `width` is the column; `gameRowHeight` is the
//                          nominal row pitch (the renderer shrinks it to fit a
//                          short lane rather than truncating the log).
//                "line" -> single collapsed column of fixed `width`
//   season.fit:  line mode only — ignore `width` and derive the season column
//                from the VIEWPORT so the whole franchise lands edge to edge
//                (buildDesktopLayout's fitWidth). `width` stays as the fallback
//                for the pre-measure frame, when the viewport width is 0.
//   offseason:   "full" | "compact" | "hidden" (same meaning as mobile)
//
// NOTE ON THE TWO ROW BANDS. Because a row-mode season column is a FIXED width,
// the two game bands no longer separate themselves by game count the way
// one-column-per-game did — the whole ladder's width separation now rides on
// these two `width` values. They must stay far enough apart that pickBand's
// log-space hysteresis can walk between them: the boundary math needs a ratio
// over ~1.27 in TOTAL band width, and the offseason block (banner + draft) is a
// large constant added to both. sims/desktop_logic.sim.mjs asserts this with
// margin — if you retune either width, run it.
export const DESKTOP_GEOMETRY = {
  GAME_DETAIL: { season: { mode: "rows", width: 240, gameRowHeight: 16 }, offseason: "full" },
  GAME_BANDS: { season: { mode: "rows", width: 90, gameRowHeight: 7 }, offseason: "full" },
  SEASON_LINES: { season: { mode: "line", width: 40 }, offseason: "compact" },
  ERA_SUMMARY: { season: { mode: "line", width: 12, fit: true }, offseason: "hidden" },
};

export const desktopGeometryFor = (band) =>
  DESKTOP_GEOMETRY[band] || DESKTOP_GEOMETRY[DEFAULT_BAND];
