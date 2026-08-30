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
//
// Desktop reached the same conclusion later and independently — see
// DESKTOP_BANDS in desktop/desktopDetail.js, which filters the same band out,
// because its Eras band now sizes itself to the viewport and leaves a coarser
// band nothing left to show. FRANCHISE_OVERVIEW is therefore on NEITHER ladder
// today; it stays in DETAIL_BANDS only because bandForYearsVisible still
// returns it and the rank/hysteresis helpers are defined over the full list.
export const MOBILE_BANDS = DETAIL_BANDS.filter((b) => b !== "FRANCHISE_OVERVIEW");

// ---- the MENU rung -------------------------------------------------------
//
// One stop further out than Eras there is no franchise left to draw, and the
// surface becomes the app's own start page and onboarding tour (src/menu/).
// It is a ZOOM RUNG, not a mode: the app opens on it, and you leave it by
// pinching or scrolling in like at any other level — which is what makes
// "pinch out to skip the tour" a plain statement of the zoom model rather than
// a special case bolted onto it.
//
// It deliberately stays OUT of DETAIL_BANDS and DETAIL_GEOMETRY: nothing about
// it is a way of drawing seasons, and every builder that walks the band list
// would otherwise lay a whole franchise out for it. The zoom LADDERS append it
// instead (MOBILE_ZOOM_BANDS here, DESKTOP_ZOOM_BANDS in desktopDetail.js) and
// the three lookups below special-case it — because their shared fallback is
// DEFAULT_BAND, which would have claimed the menu was the MOST detailed band
// in the app and rendered every module onto it.
export const MENU_BAND = "MENU";

export const isMenuBand = (band) => band === MENU_BAND;

// The mobile zoom ladder: the four timeline bands, then the menu.
export const MOBILE_ZOOM_BANDS = [...MOBILE_BANDS, MENU_BAND];

// Nothing renders at the menu rung. `offseason: "hidden"` is the answer the
// consumers that ask about its geometry already understand (Main resets any
// expanded draft class when offseasons stop being shown).
const MENU_GEOMETRY = { season: { mode: "line", height: 0 }, offseason: "hidden" };

// Total user-facing zoom rungs (1 = most years on screen … 4 = every game).
// The menu is NOT one of them: it is where the ladder starts rather than a
// level of detail, and the HUD doesn't caption it (see ZoomHud).
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
  // zoom 0 = off the rung ladder entirely; LevelBars lights nothing for it and
  // the HUD suppresses the caption anyway.
  [MENU_BAND]: { zoom: 0, name: "Menu" },
};

export const zoomLabelFor = (band) => ZOOM_LABELS[band] || ZOOM_LABELS[DEFAULT_BAND];

export const bandRank = (band) => {
  // The menu sits one past the least detailed band, so `bandAtLeast` says no to
  // every module there without any of them having to know it exists.
  if (band === MENU_BAND) return DETAIL_BANDS.length;
  const i = DETAIL_BANDS.indexOf(band);
  return i === -1 ? 0 : i;
};

// True when `band` is at least as detailed as `minBand`
// (lower rank index = more detail).
export const bandAtLeast = (band, minBand) =>
  bandRank(band) <= bandRank(minBand || DEFAULT_BAND);

export const geometryFor = (band) =>
  band === MENU_BAND
    ? MENU_GEOMETRY
    : DETAIL_GEOMETRY[band] || DETAIL_GEOMETRY[DEFAULT_BAND];

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
