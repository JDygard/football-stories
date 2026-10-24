// The zoom HUD's "go deeper" nudge, and the one fact it needs to retire itself:
// the deepest zoom level this reader has ever reached. Shared by the phone and
// desktop HUDs (each supplies its own gesture wording).
//
// Stored per browser. It is a convenience, not state anything depends on, so
// every access tolerates storage being unavailable (private windows, blocked
// site data): the nudge then simply shows until the reader goes deeper in this
// session's memory.

const KEY = "fs.deepestZoom";
let fallback = 0;

export function deepestZoomSeen() {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) ? Math.max(v, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function noteZoomSeen(zoom) {
  if (!(zoom > deepestZoomSeen())) return;
  fallback = zoom;
  try {
    window.localStorage.setItem(KEY, String(zoom));
  } catch {
    /* storage unavailable: the in-memory fallback carries this session */
  }
}

// Nudge toward more detail on any level the reader has never gone past. Once
// they have been deeper than here, they know the gesture.
export const wantsZoomNudge = (zoom, levels, seen) => zoom < levels && seen <= zoom;
