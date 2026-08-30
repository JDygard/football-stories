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
  onOpenLeague,
  onOpenMethodology,
  onOpenAbout,
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
                  onOpenLeague={onOpenLeague}
                  onOpenMethodology={onOpenMethodology}
                  onOpenAbout={onOpenAbout}
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
  onOpenLeague,
  onOpenMethodology,
  onOpenAbout,
  onStart,
  onTour,
  desktop,
}) {
  const hero = (
    <header
      style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_SOFT} 100%)`,
        color: "#fff",
        padding: desktop ? "22px 26px" : "18px 20px",
        borderRadius: desktop ? 14 : 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        // In landscape the hero IS the flex item — there is no wrapper to do
        // the shrinking for it. Without an explicit basis and `minWidth: 0` its
        // hypothetical size is the headline's MAX-CONTENT, one long unbroken
        // line, and the row hands it that width; the navy box then ends where
        // the column does and the last word is cut off mid-letter.
        flex: desktop ? "1 1 380px" : "0 0 auto",
        minWidth: desktop ? 240 : undefined,
        overflow: "hidden",
      }}
    >
      {/* The title and nothing else. An eyebrow and a paragraph of blurb used
          to sit here; the height they took is what forced the display toggles
          into a scroll of their own, and a nested scroller on a phone swallows
          the swipe that was supposed to reach the slide strip. */}
      <h1
        style={{
          margin: 0,
          fontSize: desktop ? 28 : 22,
          lineHeight: 1.18,
          fontWeight: 700,
          letterSpacing: -0.3,
        }}
      >
        {slide.title}
      </h1>
    </header>
  );

  const display = (
    // STATIC, and headerless. Four self-describing toggles do not need a
    // caption reading "Display", and the card must not be a scroll container:
    // on a phone it covers most of the slide, and a nested scroller SWALLOWS
    // THE SWIPE — the gesture went to this list and the strip never moved.
    <Card static flex={desktop ? "1.15 1 420px" : undefined} flush={desktop}>
      <SettingsDrawer
        desktop={desktop}
        scroll={false}
        settings={settings}
        onChange={onSettingsChange}
      />
    </Card>
  );

  const elsewhere = (
    <Card title="Elsewhere" width={desktop ? 250 : undefined} flush={desktop}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "10px 12px 12px",
          alignItems: "flex-start",
        }}
      >
        <LinkChip icon="🏆" label="League leaderboards" onClick={onOpenLeague} />
        <LinkChip icon="ⓘ" label="How grades work" onClick={onOpenMethodology} />
        <LinkChip icon="✎" label="About this project" onClick={onOpenAbout} />
      </div>
    </Card>
  );

  // ---- LANDSCAPE: the window is the layout ----
  //
  // This pane runs the full width of the display and the start page should read
  // that way. An earlier cut centred everything in a 720px column, which on a
  // 1440px window is a phone screenshot with two empty margins — and the app it
  // introduces is the widest thing in the product.
  //
  // So: three columns across the top, the CTA spanning under them, and the tour
  // invitation on its own rail at the RIGHT EDGE, which is where the tour
  // actually is. The Display card gets full pane height as a side effect, so
  // every toggle finally fits without a hidden scroll.
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
            {display}
            {elsewhere}
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
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: 10,
          marginTop: 10,
        }}
      >
        {display}
        {elsewhere}
      </div>
      <StartCta hint={hint} onStart={onStart} />
      <TourInvite hint={hint} onTour={onTour} />
    </Column>
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

function LinkChip({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: "1px solid #d9dee7",
        borderRadius: 999,
        background: "#fff",
        color: "#33405a",
        fontSize: 12.5,
        fontWeight: 600,
        padding: "7px 13px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = ACCENT;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#d9dee7";
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
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
