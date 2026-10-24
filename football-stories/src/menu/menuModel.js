// The MENU-ZOOM model — pure, JSX-free, node-simulatable.
//
// Menu-zoom is the fifth stop on the semantic-zoom ladder: one rung further out
// than Eras, where there is no franchise left to draw and the surface becomes
// the app's own start page. It is where the app opens.
//
// THE SLIDE STRIP is this model's job. The rung is not one page but a short
// instagram-style run of full-viewport presentations, swapped between along the
// platform's own scroll axis (a phone scrolls down, a landscape window swipes
// sideways). Slide geometry is a pure function of the viewport span and the
// scroll offset — `slideOffset`, `slideIndexFor`, `slideProgress` — so the same
// arithmetic serves both orientations and can be asserted in node. Reading a
// released swipe, further down, is the other half.
//
// It used to carry CALLOUT GEOMETRY as well: the tour slide drew curved arrows
// out to the real team tab and the real Personnel bar, measured live from the
// DOM through a fixed overlay. That is gone, and the reason is worth keeping.
// Anything pinned to chrome OUTSIDE the pane cannot travel with the strip, so
// it had to fade in place while its slide slid past underneath — which is
// exactly why scrolling to the tour never felt like reaching another slide.
// The tour is a composed page now, and everything on it is an ordinary element
// in the flow.

// ---- the slides ----------------------------------------------------------
//
// Slide 0 is the MENU proper: the display toggles that used to sit in the
// footer's Settings drawer, plus the way into the league / methodology / about
// views, plus the tease that teaches this rung's two gestures.
//
// Slide 1 is the tour. It is ONE slide covering three things rather than three
// slides covering one each: the point is to show that the controls are all
// already on screen, which a single frame says and a sequence doesn't.
export const MENU_SLIDES = [
  {
    id: "menu",
    kind: "menu",
    // The header is the title and nothing else. It had an eyebrow and a
    // paragraph of blurb; both went, because the height they took is what
    // forced the display toggles into a scroll — and a start page that has to
    // be scrolled before it can be swiped is not a start page.
    title: "Every franchise, end to end.",
    // One line under it, saying what the page is a start page FOR. Affordable
    // again because the display toggles went compact (labels only), which gave
    // back far more height than this takes.
    lede: "Every season, draft class and coach on one timeline you zoom through.",
  },
  {
    id: "controls",
    kind: "tour",
    eyebrow: "Getting around",
    title: "Three things worth knowing.",
    body: "The whole app is three controls and a zoom.",
    // Three CARDS, in the flow of the slide. They were two arrows pointing at
    // live chrome plus one note about something off-screen — which made the
    // first two special, the third an afterthought, and two of the three
    // impossible to move with the strip. Level them: on a page titled "three
    // things", three things is the layout.
    cards: [
      {
        icon: "🏈",
        title: "Pick a franchise",
        body: "The team tab up top swaps the whole timeline. All 32, plus the ones that moved.",
      },
      {
        icon: "👥",
        title: "Put people on the timeline",
        body:
          "Personnel draws a band for anyone who was here — players, coaches, GMs, owners — " +
          "for as long as they were.",
      },
      {
        icon: "⚑",
        title: "Era headers are clickable",
        body:
          "Zoom out to Eras and each chapter gets a plaque. Tap one to read it and to " +
          "light up the people who made it.",
      },
    ],
  },
];

export const MENU_SLIDE_COUNT = MENU_SLIDES.length;

// ---- slide geometry ------------------------------------------------------
// `span` is the viewport measurement along the scroll axis: the pane's HEIGHT
// on a phone (slides stack downward) and its WIDTH in landscape (slides sit
// side by side). Everything below is written in that one dimension so the two
// orientations share it.

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Total scroll extent of the strip — what the viewport hooks hand the native
// scroller as its content size at this rung.
export const menuScrollExtent = (span) => Math.max(1, span) * MENU_SLIDE_COUNT;

// Where slide `i` starts.
export const slideOffset = (i, span) => i * Math.max(1, span);

// Continuous position in slides (2.5 = halfway between the third and fourth).
export function slideProgress(offset, span) {
  const s = Math.max(1, span);
  return clamp(offset / s, 0, MENU_SLIDE_COUNT - 1);
}

// The committed slide — the one snapped to, or nearest to it mid-swipe.
export function slideIndexFor(offset, span) {
  return clamp(Math.round(slideProgress(offset, span)), 0, MENU_SLIDE_COUNT - 1);
}

// How present slide `i` is, 1 when it fills the viewport and 0 once a whole
// slide-width away. Drives the callout layer's opacity: arrows to real chrome
// are drawn OUTSIDE the scrolling strip (they have to reach the header and the
// footer), so they cannot ride along with their slide and must fade with it
// instead.
export function slidePresence(offset, span, i) {
  const d = Math.abs(slideProgress(offset, span) - i);
  return clamp(1 - d, 0, 1);
}

// ---- reading a released swipe --------------------------------------------
//
// A strip that pages only when you drag it more than HALF A SCREEN is not a
// strip you can swipe: nobody swipes instagram by dragging the whole viewport,
// they flick it. Distance alone reads a confident flick and a resting hand as
// the same gesture, so the release is judged on INTENT — how fast it was going
// when it was let go — with distance as the fallback when it was going nowhere.
//
// This lives HERE, in the shared menu model, because both trees page the same
// strip and must agree about what a swipe means. (desktop/flingModel.js builds
// its timeline coast on the same measurement and the same decay curve, so a
// throw behaves identically on both surfaces.)

// Velocity is averaged over a trailing WINDOW rather than taken from the last
// two events. Scroll and pointer events arrive unevenly — a 2ms gap reports an
// absurd speed, a 30ms hitch reports none — and the last pair is exactly where
// that noise lands.
export const VELOCITY_WINDOW_MS = 90;
// The window does the real trimming; this only stops a slow drag from growing
// the buffer without bound.
export const MAX_SAMPLES = 12;
// A gesture that ENDED IN A PAUSE is not a throw. Holding still for a moment
// before letting go is how a person says "put it down here", and honouring the
// speed from before the pause would fling the page out from under them.
export const IDLE_MS = 90;

// Append a position sample, dropping anything older than the window. `samples`
// is mutated (it lives in a ref) and returned for convenience.
export function trackSample(samples, pos, t) {
  samples.push({ pos, t });
  while (samples.length > MAX_SAMPLES) samples.shift();
  while (samples.length > 2 && t - samples[0].t > VELOCITY_WINDOW_MS) samples.shift();
  return samples;
}

// Signed velocity in px/ms, measured in SCROLL-OFFSET SPACE — positive means
// the offset was growing (toward the later slides). Sampling the SCROLLER's own
// position rather than the pointer's gives one sign convention for every path
// into this: a native touch scroll, a mouse drag that assigns scrollLeft, a
// trackpad swipe. `now` is optional; pass it to apply the pause rule.
export function velocityOf(samples, now = null) {
  if (!samples || samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  if (now != null && now - last.t > IDLE_MS) return 0;
  let first = samples[0];
  for (const s of samples) {
    if (last.t - s.t <= VELOCITY_WINDOW_MS) {
      first = s;
      break;
    }
  }
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  const v = (last.pos - first.pos) / dt;
  return Number.isFinite(v) ? v : 0;
}

// Exponential friction: v(t) = v0 * e^(-t/TAU). Chosen over linear deceleration
// because it has no discontinuity at the end AND because the total distance is
// then simply v0 * TAU — a closed form, so a release can ask where a throw
// WOULD land without simulating it.
export const COAST_TAU = 260; // ms
export const coastDistance = (v, tau = COAST_TAU) => v * tau;

// The speed at which a gesture stops being a nudge and becomes a page turn.
// This is the "don't misunderstand an unintended gesture" dial: low enough that
// an understated flick is taken as a command, high enough to clear the jitter
// of a finger or a mouse button coming off.
export const SLIDE_COMMIT_V = 0.25; // px/ms

// Where a released gesture should leave the strip.
//
//   scroll     — the offset at the moment of release
//   span       — one slide (pane height in portrait, width in landscape)
//   startSlide — the slide the gesture BEGAN on, which is what "at least one
//                page" is measured from; using the current nearest slide would
//                let a fast flick that already crossed the boundary claim a
//                second page it was never thrown far enough for
//   velocity   — signed, scroll-offset space, px/ms
//   count      — slides in the strip (defaults to this strip's own length)
export function slideTargetFor({ scroll, span, startSlide, velocity, count = MENU_SLIDE_COUNT }) {
  const s = Math.max(1, span);
  const n = Math.max(1, count);
  // Where it would come to rest if simply left to coast.
  let target = Math.round((scroll + coastDistance(velocity)) / s);
  if (Math.abs(velocity) >= SLIDE_COMMIT_V) {
    const dir = velocity > 0 ? 1 : -1;
    const atLeast = clamp(startSlide, 0, n - 1) + dir;
    // AT LEAST one page in the direction thrown — never exactly one. A short
    // flick is promoted to a page turn; a long, fast drag that already carried
    // two pages keeps both, because clamping it back would be the app arguing
    // with a gesture it understood perfectly well.
    target = dir > 0 ? Math.max(target, atLeast) : Math.min(target, atLeast);
  }
  return clamp(target, 0, n - 1);
}

// ---- the two invitations -------------------------------------------------
//
// This rung offers exactly two things to do, and they are NOT equal:
//
//   START — the call to action. "If you're confused, scroll for more,
//           otherwise let's start the show." Zooming in is the whole point of
//           the page, so it gets the loud treatment and the primary position.
//   TOUR  — the secondary offer, for the confused. It sits in the direction the
//           strip actually travels: down the page on a phone, off the right
//           edge in landscape.
//
// Each platform names ONE gesture for each, never two. "Scroll or pinch out"
// was a menu of options where an instruction belonged: a mouse has no pinch and
// a phone has no wheel, so naming both only asks the reader to work out which
// half is theirs.
export const MENU_HINTS = {
  y: {
    axis: "y",
    // The CTA.
    start: "Pinch out to start",
    startGlyph: "⤢",
    // The gesture coach's caption: the CTA already teaches the way IN, so the
    // coach teaches the way back, which is the half nobody guesses.
    coach: "Pinch in any time to come back here",
    // The secondary offer, and the direction it lives in.
    tour: "Keep scrolling for a quick tour",
    tourShort: "Quick tour",
    tourAction: "Keep scrolling",
    glyph: "↓",
  },
  x: {
    axis: "x",
    start: "Mouse wheel up to start",
    startGlyph: "↑",
    coach: "Wheel down any time to come back here",
    tour: "Drag across for a quick tour",
    tourShort: "Quick tour",
    tourAction: "Drag or swipe across",
    glyph: "→",
  },
};

export const hintFor = (axis) => MENU_HINTS[axis] || MENU_HINTS.y;
