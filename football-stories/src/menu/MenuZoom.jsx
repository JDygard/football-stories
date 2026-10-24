// MENU-ZOOM — the fully-zoomed-out rung, shared by both trees.
//
// One component serves the phone and the landscape window because the only
// real difference between them is the AXIS: the strip of slides runs down on a
// phone and across in landscape, which is the direction each platform's
// scroller already moves in. Everything else — the menu page, the tour, the
// callouts pointing at live chrome — is identical, and duplicating it into
// src/desktop/ would have meant maintaining the onboarding copy twice.
//
// It renders INSIDE the timeline pane's existing scroll container (Main /
// DesktopMain hand it the spacer). That is deliberate and load-bearing: the
// zoom listeners (wheel, pinch) are bound once to that element, so unmounting
// it to show a menu would take the way back OUT of the menu with it. The
// container stays; only its contents and its scroll extent change.
//
// EVERYTHING IS IN THE FLOW. An earlier cut drew the tour's two labels in a
// fixed overlay over the app frame, with curved arrows measured out to the real
// team tab and the real Personnel bar. It read well standing still and wrong in
// motion: an element pinned to chrome outside the pane cannot travel with the
// strip, so those labels faded in place while their slide slid past, and
// reaching the tour never felt like reaching a slide. They are ordinary cards
// on the page now, over a faint illustration.

import SettingsDrawer from "../components/SettingsDrawer.jsx";
import { MENU_SLIDES, MENU_SLIDE_COUNT, hintFor, slideIndexFor, slidePresence } from "./menuModel.js";
import { eraTone } from "../components/visualization/eraModel.js";

const NAVY = "#0f2036";
const NAVY_SOFT = "#1b3454";
const ACCENT = "#2d6cdf";
const CARD_BORDER = "#e4e7ee";

// The tour slide's backdrop: a watercolour of a ball carrier between two
// defenders, laid in faintly so it reads as the paper the page is printed on
// rather than as a picture on it.
//
// It is its OWN absolutely-positioned layer rather than a background on the
// section, because the fade has to come from `opacity` and an opacity on the
// section would take the text down with it. Sitting under the content also
// means it TRAVELS WITH THE SLIDE, which is the whole point of moving the
// tour's furniture into the flow — nothing on this rung is pinned to the
// window any more.
//
// `cover` in both orientations. `contain` was tried on the phone so all three
// figures would fit, and it put the picture in a band exactly where the cards
// are; covering crops to the ball carrier, who is the subject anyway.
//
const ART_URL = "/art/tour-players.jpg";
const ART_OPACITY = 0.15;

function SlideArt() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: ART_OPACITY,
        backgroundImage: `url(${ART_URL})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    />
  );
}

export default function MenuZoom({
  // "y" = phone (slides stack downward), "x" = landscape (side by side).
  axis = "y",
  width = 0,
  height = 0,
  // Scroll offset along `axis`, from the viewport hook.
  offset = 0,
  settings,
  onSettingsChange,
  onGoToSlide,
  // Leave the menu for the timeline — the page's call to action. It names the
  // platform's zoom gesture AND accepts a click, because a call to action that
  // cannot be actioned is a caption.
  onStart,
  // The zoom tween's scale. The menu is HTML, not the SVG the tween normally
  // scales, so it applies the same factor itself — which is what makes a pinch
  // out of the menu grow the page away instead of cutting to the timeline.
  visualScale = 1,
}) {
  const vertical = axis === "y";
  const span = Math.max(1, vertical ? height : width);
  const index = slideIndexFor(offset, span);
  const hint = hintFor(axis);
  const scale = visualScale;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          height: vertical ? "auto" : "100%",
          width: vertical ? "100%" : "auto",
        }}
      >
        {MENU_SLIDES.map((slide, i) => (
          <section
            key={slide.id}
            // `.menu-slide` re-enables scroll CHAINING for everything inside a
            // slide — see App.css. This is the second thing to trip over it, so
            // the exemption now covers the whole slide rather than one card.
            className="menu-slide"
            style={{
              flex: "0 0 auto",
              position: "relative",
              width: vertical ? "100%" : span,
              height: vertical ? span : "100%",
              overflow: "hidden",
              background: "#f6f7fa",
            }}
          >
            {slide.kind === "tour" && <SlideArt />}
            {/* The zoom tween lives on an inner wrapper so it never moves the
                snap box itself — snap positions are layout, and a transformed
                scroll child would snap to somewhere it isn't. */}
            <div
              style={{
                height: "100%",
                position: "relative", // above the slide's own artwork layer
                transform: scale === 1 ? undefined : `scale(${scale})`,
                transformOrigin: "center center",
                opacity: fadeFor(scale),
                willChange: scale === 1 ? undefined : "transform",
              }}
            >
              {slide.kind === "menu" ? (
                <MenuSlide
                  slide={slide}
                  hint={hint}
                  settings={settings}
                  onSettingsChange={onSettingsChange}
                  onStart={onStart}
                  onTour={() => onGoToSlide && onGoToSlide(i + 1)}
                  desktop={!vertical}
                />
              ) : (
                <TourSlide slide={slide} hint={hint} onStart={onStart} desktop={!vertical} />
              )}
            </div>
            {/* Pager: also the affordance a mouse-only reader needs, since a
                wheel zooms at this rung rather than paging. */}
            <Pager
              count={MENU_SLIDE_COUNT}
              index={index}
              vertical={vertical}
              presence={slidePresence(offset, span, i)}
              onPick={(n) => onGoToSlide && onGoToSlide(n)}
            />
          </section>
        ))}
      </div>
    </>
  );
}

// The tween's scale doubles as its own crossfade: at rest it is 1 and the page
// is solid; a pinch in either direction pushes it away from 1 and the page
// dissolves as it goes, so the swap to (or from) the timeline lands on air
// rather than on a hard cut.
function fadeFor(scale) {
  const d = Math.abs(Math.log(Math.max(0.05, scale)));
  return Math.max(0, Math.min(1, 1 - d * 1.9));
}

// ---- slide 0: the menu ---------------------------------------------------

function MenuSlide({
  slide,
  hint,
  settings,
  onSettingsChange,
  onStart,
  onTour,
  desktop,
}) {
  // THE HERO IS THE LESSON. The app's one unusual idea is that zoom changes
  // what you see rather than how big it is, and nobody guesses that from a
  // button. So the navy panel carries a looping demonstration of the gesture
  // over a miniature of the very thing it opens (GestureCoach), and the page
  // around it is cut down to what a first visit needs: the CTA, the display
  // toggles in their compact form, and the way to the tour. The "Elsewhere"
  // links that used to sit here are all in the header's ☰ menu, which is where
  // a returning reader looks for them anyway.
  const hero = (
    <header
      style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_SOFT} 100%)`,
        color: "#fff",
        padding: desktop ? "24px 28px" : "20px 20px 18px",
        borderRadius: desktop ? 14 : 0,
        display: "flex",
        flexDirection: desktop ? "row" : "column",
        alignItems: desktop ? "center" : "stretch",
        gap: desktop ? 28 : 14,
        // Portrait: the hero takes whatever the slide has left, so the coach
        // gets the room and the cards below keep their natural height.
        // Landscape: it is the wide flex item of the top row; `minWidth: 0`
        // stops the headline's max-content width from sizing it.
        flex: desktop ? "1 1 520px" : "1 1 auto",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: desktop ? "1 1 0" : "0 0 auto", minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: desktop ? 30 : 24,
            lineHeight: 1.15,
            fontWeight: 700,
            letterSpacing: -0.3,
          }}
        >
          {slide.title}
        </h1>
        {slide.lede && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: desktop ? 15 : 13.5,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.74)",
              maxWidth: 420,
            }}
          >
            {slide.lede}
          </p>
        )}
      </div>
      <GestureCoach hint={hint} desktop={desktop} />
    </header>
  );

  const display = (
    // STATIC, and never a scroll container: on a phone a nested scroller
    // SWALLOWS THE SWIPE meant for the slide strip. Compact rows (labels only,
    // the explanation on hover) keep all four toggles on screen with room to
    // spare.
    <Card title="Display" static width={desktop ? 280 : undefined} flush={desktop}>
      <SettingsDrawer
        desktop={desktop}
        scroll={false}
        compact
        settings={settings}
        onChange={onSettingsChange}
      />
    </Card>
  );

  // ---- LANDSCAPE: the window is the layout ----
  //
  // The hero spans the row with the display card beside it, the CTA spans
  // under both, and the tour invitation keeps its rail at the RIGHT EDGE,
  // which is where the tour actually is.
  if (desktop) {
    return (
      <div style={{ height: "100%", display: "flex", boxSizing: "border-box" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            padding: "14px 0 14px 20px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 12, alignItems: "stretch" }}>
            {hero}
            {/* Natural height: four compact rows do not need a pane-tall card. */}
            <div style={{ flexShrink: 0, alignSelf: "flex-start" }}>{display}</div>
          </div>
          <StartCta hint={hint} onStart={onStart} />
        </div>
        <TourRail hint={hint} onTour={onTour} />
      </div>
    );
  }

  // ---- PORTRAIT: one column, because the screen is one column ----
  return (
    <Column desktop={false}>
      {hero}
      <div style={{ flexShrink: 0, marginTop: 10 }}>{display}</div>
      <div style={{ flexShrink: 0, padding: "0 12px" }}>
        <StartCta hint={hint} onStart={onStart} />
      </div>
      <TourInvite hint={hint} onTour={onTour} />
    </Column>
  );
}

// THE GESTURE COACH: a miniature of the Eras view (four chapter plaques with
// their season bars) that grows on a loop while two fingertips spread over it,
// or, in landscape, while a mouse wheel rolls up beside it. It is the page's
// demonstration of its own CTA, and it plays the moment the app opens, so the
// first gesture a reader tries is the one that works. Pure CSS (App.css,
// `.coach-*`); reduced motion holds it still at the spread position.
const COACH_PLAQUES = [
  { tone: 0, flex: 1.3, bars: [-6, 10, -14, 8, 12, -9] },
  { tone: 1, flex: 0.9, bars: [14, 18, 9, -5] },
  { tone: 2, flex: 1.6, bars: [-10, -14, 4, -8, 6, 10, -12, -6] },
  { tone: 3, flex: 1, bars: [-12, 6, -8, 16, 10] },
];

function GestureCoach({ hint, desktop }) {
  const w = desktop ? 360 : 290;
  const h = desktop ? 180 : 148;
  const barK = desktop ? 1.6 : 1.3;
  return (
    <div
      aria-hidden="true"
      style={{
        flex: "0 0 auto",
        alignSelf: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        margin: desktop ? 0 : "auto 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: w, height: h }}>
        <div
          className="coach-zoom"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            gap: 3,
            padding: 5,
            boxSizing: "border-box",
            background: "#fbfcfe",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          }}
        >
          {COACH_PLAQUES.map((p, i) => {
            const tone = eraTone(p.tone);
            return (
              <div
                key={i}
                style={{
                  flex: `${p.flex} 1 0`,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  border: `1.5px solid ${tone.border}`,
                  borderRadius: 5,
                  background: tone.wash,
                  overflow: "hidden",
                }}
              >
                <div style={{ background: tone.header, padding: "5px 5px 4px" }}>
                  <div style={{ width: "55%", height: 2.5, borderRadius: 2, background: tone.years, opacity: 0.6 }} />
                  <div style={{ width: "80%", height: 5, borderRadius: 2, background: tone.label, marginTop: 4 }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-evenly",
                    padding: "0 3px",
                  }}
                >
                  {p.bars.map((b, j) => (
                    <span
                      key={j}
                      style={{
                        width: 3,
                        height: Math.abs(b) * barK,
                        borderRadius: 1,
                        background: b > 0 ? "#2f9e55" : "#d64545",
                        // wins rise from the midline, losses hang below it
                        transform: `translateY(${b > 0 ? -50 : 50}%)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {!desktop && (
          <>
            <span className="coach-finger coach-finger-a" />
            <span className="coach-finger coach-finger-b" />
          </>
        )}
      </div>
      {desktop && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span className="coach-arrow">↑</span>
          <div className="coach-mouse" style={{ position: "relative" }}>
            <span className="coach-wheel" />
          </div>
        </div>
      )}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.66)",
          textAlign: "center",
        }}
      >
        {hint.coach}
      </div>
    </div>
  );
}

// ---- slide 1: the tour ---------------------------------------------------

function TourSlide({ slide, hint, onStart, desktop }) {
  // A composed page, and nothing on it reaches outside the pane. Its three
  // cards used to be two labels pinned to live chrome with arrows drawn to
  // them, which meant they could not move when the slide did — see the note at
  // the top of this file. In the flow they simply travel with everything else,
  // and the slide reads as a slide.
  return (
    <Column desktop={desktop}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
          padding: desktop ? "0 28px" : "0 20px",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: "#8b93a1",
            }}
          >
            {slide.eyebrow}
          </div>
          <h2
            style={{
              margin: "8px 0 0",
              fontSize: desktop ? 26 : 20,
              lineHeight: 1.2,
              fontWeight: 700,
              color: NAVY,
            }}
          >
            {slide.title}
          </h2>
          <p
            style={{
              margin: "7px 0 0",
              fontSize: 13,
              lineHeight: 1.5,
              color: "#5b6472",
            }}
          >
            {slide.body}
          </p>
        </div>

        {/* Landscape puts the three side by side and portrait stacks them —
            the same transpose the rest of this rung makes, for the same
            reason: one pane is wide and short, the other tall and narrow. */}
        <div
          style={{
            display: "flex",
            flexDirection: desktop ? "row" : "column",
            alignItems: "stretch",
            gap: 10,
            marginTop: 14,
            flexShrink: 0,
          }}
        >
          {(slide.cards || []).map((c) => (
            <div
              key={c.title}
              style={{
                flex: desktop ? "1 1 0" : "0 0 auto",
                minWidth: 0,
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
                // Slightly translucent: the illustration behind the slide
                // should read through the page, not be blocked out by it.
                background: "rgba(255,255,255,0.86)",
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: 12,
                padding: "13px 15px",
                boxShadow: "0 1px 2px rgba(16,24,40,0.05)",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1.2 }} aria-hidden="true">
                {c.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{c.title}</div>
                <div
                  style={{ fontSize: 12.5, lineHeight: 1.5, color: "#5b6472", marginTop: 3 }}
                >
                  {c.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* The CTA rides along to the last slide: having read the tour, the
            next thing anyone wants is the show. */}
        <StartCta hint={hint} onStart={onStart} compact />
      </div>
    </Column>
  );
}

// ---- shared furniture ----------------------------------------------------

function Column({ desktop, children }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        // Landscape gives the pane the whole window width; a start page that
        // ran edge to edge on it would be a line of text a metre long.
        padding: desktop ? "12px 24px" : 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: desktop ? 720 : "none",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Card({ title, grow = false, width, flex, flush = false, static: isStatic = false, children }) {
  return (
    <section
      // `.menu-card` re-enables scroll CHAINING inside the card — see App.css.
      // The app sets `overscroll-behavior: none` on everything, and the display
      // list inside this card is a scroll container, so a swipe that started
      // over it died there instead of reaching the slide strip. On the phone
      // that is most of the slide's surface: the tour was unreachable by the
      // one gesture the start page teaches.
      style={{
        background: "#fff",
        border: "1px solid #e4e7ee",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        flex: flex || (grow ? 1 : "0 0 auto"),
        width,
        // Portrait insets each card from the screen edge; landscape lays them
        // out in a row whose own gap does that job.
        margin: flush ? 0 : "0 12px",
        // A static card is sized by its contents and never clips them — with no
        // scroller of its own there would be no way to reach anything it cut.
        overflow: isStatic ? "visible" : "hidden",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "#6b7482",
            padding: "9px 13px 7px",
            borderBottom: "1px solid #eef0f4",
            flexShrink: 0,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ flex: isStatic ? "0 0 auto" : 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

// THE CALL TO ACTION. The loudest thing on the page, because starting is the
// point of the page — the tour is the fallback for whoever needs it.
//
// It names the ONE gesture that belongs to this platform (a mouse has no pinch;
// a phone has no wheel) and it is also a real button. Naming a gesture and then
// refusing the obvious click would be a sign, not a call to action.
function StartCta({ hint, onStart, compact = false }) {
  return (
    <button
      onClick={onStart}
      className="menu-cta"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        border: "none",
        borderRadius: compact ? 10 : 12,
        background: ACCENT,
        color: "#fff",
        fontSize: compact ? 14 : 15.5,
        fontWeight: 700,
        letterSpacing: 0.2,
        padding: compact ? "11px 16px" : "15px 20px",
        marginTop: 12,
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(45,108,223,0.28)",
      }}
    >
      <span className="menu-cta-glyph" style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">
        {hint.startGlyph}
      </span>
      {hint.start}
    </button>
  );
}

// LANDSCAPE tour invitation: a rail down the RIGHT EDGE of the pane, because
// that is literally where the tour is — the strip runs sideways and the next
// slide is off that edge. An arrow pointing at the thing it will fetch beats
// any wording about which direction to drag.
function TourRail({ hint, onTour }) {
  return (
    <button
      onClick={onTour}
      className="menu-tour-rail"
      style={{
        flexShrink: 0,
        width: 186,
        height: "100%",
        border: "none",
        borderLeft: "1px solid #e2e6ee",
        background: "linear-gradient(90deg, rgba(15,32,54,0) 0%, rgba(15,32,54,0.045) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 16px",
        boxSizing: "border-box",
        cursor: "pointer",
        color: NAVY,
        textAlign: "center",
      }}
    >
      <span
        className="menu-hint-x"
        style={{ fontSize: 26, lineHeight: 1, display: "inline-block", color: ACCENT }}
        aria-hidden="true"
      >
        {hint.glyph}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{hint.tourShort}</span>
      <span style={{ fontSize: 11.5, lineHeight: 1.4, color: "#6b7482" }}>{hint.tourAction}</span>
    </button>
  );
}

// PORTRAIT tour invitation: the bottom edge, for the same reason the rail is on
// the right in landscape — it points where the strip travels.
function TourInvite({ hint, onTour }) {
  return (
    <button
      onClick={onTour}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        border: "none",
        background: "none",
        color: "#5b6472",
        padding: "10px 16px 14px",
        cursor: "pointer",
      }}
    >
      <span
        className="menu-hint-y"
        style={{ fontSize: 14, lineHeight: 1, display: "inline-block" }}
        aria-hidden="true"
      >
        {hint.glyph}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{hint.tour}</span>
    </button>
  );
}

function Pager({ count, index, vertical, presence, onPick }) {
  return (
    <div
      style={{
        position: "absolute",
        // Sits on the trailing edge of the axis the strip runs along, so it
        // reads as "there is more that way".
        // Portrait: down the right-hand edge. Landscape: bottom-right, beside
        // the tour rail rather than under the middle — the CTA owns the full
        // width along the bottom there and the dots were sitting on top of it.
        ...(vertical
          ? { right: 10, top: "50%", transform: "translateY(-50%)", flexDirection: "column" }
          : { bottom: 12, right: 62, flexDirection: "row" }),
        display: "flex",
        gap: 7,
        opacity: 0.25 + presence * 0.75,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          aria-label={`Go to page ${i + 1}`}
          onClick={() => onPick(i)}
          style={{
            width: i === index ? 9 : 7,
            height: i === index ? 9 : 7,
            padding: 0,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: i === index ? NAVY : "rgba(15,32,54,0.26)",
            transition: "background 0.15s, width 0.15s, height 0.15s",
          }}
        />
      ))}
    </div>
  );
}
