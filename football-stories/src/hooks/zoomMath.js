// Pure zoom math for the pinch/tween viewport. No React, no DOM — kept
// separate so it can be unit-simulated in node (the vite build can't run in
// the sandbox; correctness is verified by parse + node sims instead).
//
// Model: zoom is a *continuous apparent height* (`gestureH`, in px) that the
// gesture drives directly. The renderer can only draw discrete detail bands,
// so we (a) pick the band whose natural height is closest to gestureH, and
// (b) cosmetically scale the rendered band by `visualScale = gestureH /
// bandHeight` to bridge the gap. Because apparent height == gestureH on BOTH
// sides of a band switch, the switch is seamless regardless of how non-uniform
// the band heights are (rows vs lines differ by ~6x at one boundary).

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// How far visualScale is allowed to stray from 1 during a transition. The
// widest neighbour ratio in DETAIL_GEOMETRY is ~6x, so at that boundary the
// scale reaches sqrt(6) ≈ 2.45 mid-transition; the window must clear that or
// the clamp would bite and break continuity.
export const SCALE_LO = 0.32;
export const SCALE_HI = 3.1;

// Pick the committed band for a desired apparent height, walking one band at a
// time from the currently-committed band with log-space hysteresis so jitter
// near a boundary doesn't flicker the representation.
//
//   heights: natural totalHeight per band, MOST-detailed first (monotonic
//            decreasing — index 0 is tallest).
//   committed: currently-rendered band index.
//   hyst: half-width of the dead zone around each geometric-mean boundary,
//         in natural-log units (~0.12 ≈ 13%).
export function pickBand(gestureH, committed, heights, hyst = 0.12) {
  const n = heights.length;
  if (!n) return 0;
  const lnG = Math.log(Math.max(1, gestureH));
  let b = clamp(committed, 0, n - 1);

  // Toward MORE detail (lower index, taller band) when desired height climbs
  // past the boundary above the current band.
  while (b > 0) {
    const mid = Math.sqrt(heights[b] * heights[b - 1]);
    if (mid > 0 && lnG > Math.log(mid) + hyst) b -= 1;
    else break;
  }
  // Toward LESS detail (higher index, shorter band) when it drops below the
  // boundary below the current band.
  while (b < n - 1) {
    const mid = Math.sqrt(heights[b] * heights[b + 1]);
    if (mid > 0 && lnG < Math.log(mid) - hyst) b += 1;
    else break;
  }
  return b;
}

// Cosmetic vertical scale to apply to the committed band so its apparent
// height matches the gesture. 1 when gestureH equals the band's natural height.
export function visualScaleFor(gestureH, bandHeight) {
  if (!bandHeight) return 1;
  return clamp(gestureH / bandHeight, SCALE_LO, SCALE_HI);
}

// Frame-rate-independent exponential approach of `cur` toward `target`.
// tau is the time constant in ms (smaller = snappier). Returns the new value.
export function expSmooth(cur, target, dtMs, tau = 55) {
  if (tau <= 0) return target;
  const k = 1 - Math.exp(-Math.max(0, dtMs) / tau);
  return cur + (target - cur) * k;
}

// Euclidean distance between two {x, y} points (pinch finger spread).
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Where a RELEASED pinch should settle. Left to pickBand alone, a pinch only
// changes level once the fingers have travelled past the geometric midpoint
// between two bands plus the hysteresis — and neighbouring bands can be 3x
// apart (menu -> Eras on a phone), so a first-timer's modest spread sprang
// straight back and read as "pinching does nothing". This reads the release on
// INTENT, the way the menu strip reads a swipe: a pinch that never left its
// starting band but moved a clear `intent` factor away from that band's resting
// size is taken as a request for the next band in that direction. Anything that
// already crossed a band during the gesture keeps exactly what it reached.
//
//   gesture   — apparent size at release (gestureH / gestureW)
//   startBand — committed band when the pinch began
//   committed — committed band at release
//   heights   — gesture-space sizes, MOST detailed first
export const PINCH_INTENT = 1.2;
export function releaseBand({ gesture, startBand, committed, heights, intent = PINCH_INTENT }) {
  const n = heights.length;
  if (!n || committed !== startBand) return committed;
  const rest = heights[committed];
  if (gesture >= rest * intent && committed > 0) return committed - 1;
  if (gesture <= rest / intent && committed < n - 1) return committed + 1;
  return committed;
}
