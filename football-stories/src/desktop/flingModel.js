// The desktop timeline's drag MOMENTUM — pure, JSX-free, node-simulatable.
//
// Mobile never needed this: its timeline scroll is native, so the OS supplies
// momentum, rubber-band and ProMotion for free (see the note at the top of
// useTimelineViewport). Desktop's lateral navigation is a MOUSE DRAG, which the
// browser knows nothing about — useDesktopViewport moves the scroller by
// assigning `scrollLeft` on every pointermove. That means the timeline used to
// stop dead the instant the button came up, however hard it had been thrown.
// Sixty years of football is a long way to travel a screen at a time.
//
// WHAT LIVES WHERE. Measuring a gesture (`trackSample` / `velocityOf`) and
// deciding what a released swipe MEANS (`slideTargetFor`) are not desktop
// concerns: the menu strip pages on both platforms and the two must agree about
// what a swipe is. Those live in the shared `menu/menuModel.js` and are
// re-exported here so a desktop caller still has one import. What is genuinely
// desktop-only, and all that is actually defined below, is the COAST: stepping
// a thrown timeline along under friction, frame by frame, because nothing else
// will do it for us.
//
// The decay curve is menuModel's `COAST_TAU`, deliberately the same one the
// page-turn projection uses, so a throw of a given speed behaves identically
// whether it lands on the timeline or on a slide.

import { COAST_TAU, coastDistance } from "../menu/menuModel.js";

export {
  IDLE_MS,
  MAX_SAMPLES,
  SLIDE_COMMIT_V,
  VELOCITY_WINDOW_MS,
  slideTargetFor,
  trackSample,
  velocityOf,
} from "../menu/menuModel.js";

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The shared decay, under this module's own name for desktop readers.
export const FLING_TAU = COAST_TAU;
export const flingDistance = coastDistance;

// Below this the coast is over; a fraction of a pixel per frame is not motion.
export const FLING_STOP_V = 0.02; // px/ms
// Below this a release is a STOP, not a throw. Deliberately far under
// SLIDE_COMMIT_V: coasting the timeline a little is harmless, so it can afford
// a low bar, while committing to a different page is a decision and should
// have to be meant.
export const MIN_FLING_V = 0.08; // px/ms

// Velocity after `dtMs` of friction.
export function flingStep(v, dtMs, tau = FLING_TAU) {
  return v * Math.exp(-Math.max(0, dtMs) / tau);
}
