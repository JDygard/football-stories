// Detail levels for the "zoom = detail level" model.
//
// Zoom no longer changes a visible year-domain; it changes how much each
// timeline block reveals. Far out, seasons collapse to thin lines and
// offseasons disappear; up close, each game gets a row and offseasons
// expand to hold their content modules (draft, trades, …).
//
// Bands are ordered MOST-detailed -> LEAST-detailed. A module declares the
// least-detailed band at which it still renders (`minBand`); use
// `bandAtLeast` to test visibility.

export const DETAIL_BANDS = [
  "GAME_DETAIL",
  "GAME_BANDS",
  "SEASON_LINES",
  "ERA_SUMMARY",
  "FRANCHISE_OVERVIEW",
];

// Per-band geometry consumed by buildTimelineLayout.
//   season.mode: "rows"  -> one row per game, height = games * gameRowHeight
//                "page"  -> the season is one full-viewport "story page"
//                           (record + W/L chips + draft class + playoffs
//                           sections; see the page branch in the builder)
//                "line"  -> single collapsed band of fixed `height`
//   offseason:   "full" | "compact" | "hidden"  (how modules render / whether they do)
export const DETAIL_GEOMETRY = {
  GAME_DETAIL: { season: { mode: "rows", gameRowHeight: 18 }, offseason: "full" },
  GAME_BANDS: { season: { mode: "page" }, offseason: "full" },
  SEASON_LINES: { season: { mode: "line", height: 4 }, offseason: "compact" },
  ERA_SUMMARY: { season: { mode: "line", height: 12 }, offseason: "hidden" },
  FRANCHISE_OVERVIEW: { season: { mode: "line", height: 5 }, offseason: "hidden" },
};

export const DEFAULT_BAND = "GAME_DETAIL";

// Bands the MOBILE (portrait) zoom ladder actually stops at. The glossary puts
// both coarse bands on rung 1, so exposing them as two separate stops gave the
// phone two consecutive "Eras" levels; mobile stops at ERA_SUMMARY instead.
// FRANCHISE_OVERVIEW stays in DETAIL_BANDS because the desktop tree, with far
// more horizontal room, still uses it as its own rung.
export const MOBILE_BANDS = DETAIL_BANDS.filter((b) => b !== "FRANCHISE_OVERVIEW");

// Total user-facing zoom rungs (1 = most years on screen … 4 = every game).
export const ZOOM_LEVELS = 4;

// User-facing label for each internal band: the "Zoom N" rung (per the
// glossary, the two least-detailed bands share rung 1) plus a plain-language
// name. Consumed by the zoom HUD so the on-screen label always matches the
// band that actually rendered (post-hysteresis).
export const ZOOM_LABELS = {
  GAME_DETAIL: { zoom: 4, name: "Every Game" },
  GAME_BANDS: { zoom: 3, name: "Season by season" },
  SEASON_LINES: { zoom: 2, name: "Seasons" },
  ERA_SUMMARY: { zoom: 1, name: "Eras" },
  FRANCHISE_OVERVIEW: { zoom: 1, name: "Eras" },
};

export const zoomLabelFor = (band) => ZOOM_LABELS[band] || ZOOM_LABELS[DEFAULT_BAND];

export const bandRank = (band) => {
  const i = DETAIL_BANDS.indexOf(band);
  return i === -1 ? 0 : i;
};

// True when `band` is at least as detailed as `minBand`
// (lower rank index = more detail).
export const bandAtLeast = (band, minBand) =>
  bandRank(band) <= bandRank(minBand || DEFAULT_BAND);

export const geometryFor = (band) =>
  DETAIL_GEOMETRY[band] || DETAIL_GEOMETRY[DEFAULT_BAND];

// Resolve a continuous zoom position (`zoomF`, a float index into DETAIL_BANDS
// where 0 = most detailed) to a committed band index, with hysteresis so
// jittering the wheel near a boundary doesn't flicker the representation.
// `committed` is the currently-shown band index.
export function resolveBandIndex(zoomF, committed, hyst = 0.18) {
  const max = DETAIL_BANDS.length - 1;
  const target = Math.max(0, Math.min(max, Math.round(zoomF)));
  if (target === committed) return committed;
  if (Math.abs(zoomF - committed) > 0.5 + hyst) return target;
  return committed;
}

// Map a continuous "years visible in the viewport" measure to a band.
// Used by the viewport layer to translate a zoom scalar into a detail band.
export function bandForYearsVisible(yearsVisible) {
  const v = yearsVisible ?? 0;
  if (v < 3) return "GAME_DETAIL";
  if (v < 8) return "GAME_BANDS";
  if (v < 20) return "SEASON_LINES";
  if (v < 45) return "ERA_SUMMARY";
  return "FRANCHISE_OVERVIEW";
}
