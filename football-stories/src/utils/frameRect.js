// The app renders inside a portrait "device frame" (.app-frame, see index.css)
// that carries a transform, which makes it the containing block for every
// `position: fixed` descendant. So a fixed overlay placed from a measured
// getBoundingClientRect must be expressed relative to the FRAME's origin, not
// the viewport's — on a phone the two coincide, on desktop they don't.
//
// frameRect() returns the frame's viewport rect (falling back to the viewport
// itself if the frame isn't mounted, e.g. during tests).

export const FRAME_ID = "app-frame";

export function frameRect() {
  const el = typeof document !== "undefined" && document.getElementById(FRAME_ID);
  if (el) return el.getBoundingClientRect();
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const h = typeof window !== "undefined" ? window.innerHeight : 0;
  return { top: 0, left: 0, right: w, bottom: h, width: w, height: h };
}
