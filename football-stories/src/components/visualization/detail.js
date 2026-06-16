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
//                "line"  -> single collapsed band of fixed `height`
//   offseason:   "full" | "compact" | "hidden"  (how modules render / whether they do)
export const DETAIL_GEOMETRY = {
  GAME_DETAIL: { season: { mode: "rows", gameRowHeight: 18 }, offseason: "full" },
  GAME_BANDS: { season: { mode: "rows", gameRowHeight: 9 }, offseason: "full" },
  SEASON_LINES: { season: { mode: "line", height: 26 }, offseason: "compact" },
  ERA_SUMMARY: { season: { mode: "line", height: 12 }, offseason: "hidden" },
  FRANCHISE_OVERVIEW: { season: { mode: "line", height: 5 }, offseason: "hidden" },
};

export const DEFAULT_BAND = "GAME_DETAIL";

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
