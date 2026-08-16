// Named Eras -> pixel bands on the MOBILE (vertical) timeline.
//
// "Named Eras" are the hand-curated narrative chapters of a franchise ("The
// Peyton Manning Era") authored in dataset_generation/curated/eras.json and
// shipped as segments/teams_eras/{FID}.json. They are NOT the "Eras" ZOOM
// LEVEL (the ERA_SUMMARY band) — the two just share a word. See ERAS_PLAN.md.
//
// The desktop tree solved this problem first (src/desktop/desktopEraModel.js)
// with the timeline running LEFT-TO-RIGHT: an era is an x-range and its title
// plaque is a band across the top of the frame. Here the timeline runs
// TOP-TO-BOTTOM, so an era is a y-range and the plaque is a row that the era's
// first year buys out of the layout — see ERA_HEADER_H.
//
// Kept JSX-free so sims/mobile_layout.sim.mjs can assert it in node (vite build
// can't run in the sandbox — see the build-constraint note in the repo docs).

// Bands that show Named Eras at all — i.e. the bands whose layout reserves a
// plaque row.
export const ERA_BANDS = new Set(["ERA_SUMMARY", "SEASON_LINES", "GAME_BANDS"]);

// …and the subset that draws the FRAME around them: the two most zoomed-out
// rungs, where a multi-decade chapter is compressed enough to read as one
// shape. At Season by season a single era runs many screens tall, so a box
// around it stops being a box and becomes a pair of unrelated horizontal rules
// you meet minutes apart. There the plaque appears alone — the title still
// tells you which chapter you are in, with no chrome pretending to contain it —
// and it needs no closing foot either, since there is no border to clear.
export const ERA_FRAMED_BANDS = new Set(["ERA_SUMMARY", "SEASON_LINES"]);

// The plaque row: a museum wall label introducing the chapter beneath it. This
// is a REAL ROW in the layout, not an overlay — buildTimelineLayout adds it to
// the top of the era's first offseason block, so the title can never land on
// top of a season, a card, or a ribbon.
//
// Most of this is the AIR under the title (the baselines below run out at 64),
// and that air is the whole point: a wall label earns its authority from the
// empty space around the words, not from the size of the type. An early 84 put
// the first season almost directly under the title and the two read as one
// stacked block instead of a caption and the thing it captions; 120 overshot
// and left the chapters looking sparse. 100 is the settled value — ~36px of
// air, a little over half the title's own height.
export const ERA_HEADER_H = 100;

// …and the matching air at the other end: clear space between the last season
// of a chapter and the frame's bottom border, bought the same way (added to
// that season's block, see buildTimelineLayout). Without it the border sits
// flush against the final season and reads as a clipping edge rather than as
// the close of a chapter.
export const ERA_FOOT_H = 16;

// THE standardized left gutter, measured from the frame's own left border.
// Every line of era text starts here — the dates eyebrow, the accent rule, the
// title — so a run of chapters down the page shares one crisp vertical edge.
// Sized so the text clears the zoom-2 timeline stripe and lands exactly on the
// season cards' left edge (see STRIPE_X / CARD_L in TeamTimelineLayer).
export const ERA_TEXT_INSET = 28;

// Baselines inside the plaque row, from its top. The dates sit ABOVE the title
// as an eyebrow, the way a wall label leads with the years and then names the
// work.
export const ERA_YEARS_BASELINE = 26;
export const ERA_RULE_Y = 38; // short accent rule between the two lines
export const ERA_RULE_W = 28;
export const ERA_LABEL_BASELINE = 64;

export const ERA_LABEL_FS = 19;
export const ERA_YEARS_FS = 10.5;
// The dates are set wide, the way a wall label spaces a date line. Tracking is
// exported because the FIT CHECK has to know about it: a nine-character date
// range is meaningfully wider than its glyphs once it's spaced.
export const ERA_YEARS_TRACKING = 1.6;

// The chapter's border. Thicker than a hairline and drawn in the era's own
// colour: at 1px neutral grey the frames read as gridlines rather than as the
// boundaries of a chapter.
export const ERA_BORDER_W = 2;

// How far the frame insets from the screen edges. The left edge sits outside
// the zoom-2 timeline stripe so the whole apparatus — stripe, dots, cards — is
// enclosed by the chapter that contains it. ERA_EDGE_R only applies when there
// is no personnel rail; when there is, the frame runs out to the rail's far
// edge instead (see buildEraBoxes).
export const ERA_EDGE_L = 4;
export const ERA_EDGE_R = 6;

// Right-hand breathing room before text reaches the far border.
const LABEL_PAD_R = 12;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
// Muted hues, evenly spread but never fully saturated — the point is that two
// neighbours are TELLABLE APART, not that any one of them is colourful.
// Deliberately no team colours: an era is an editorial layer over the whole
// franchise, and tinting it in team colours would make it compete with the
// timeline's own marks instead of framing them.
//
// These values (and estimateTextWidth below) are duplicated from
// src/desktop/DesktopEraLayer.jsx + desktopEraModel.js, which shipped first.
// This module is the intended shared home — it lives in components/, which the
// desktop tree already imports from (see desktopDetail.js) while the reverse
// never happens — so the P4 design pass should collapse desktop's copies into
// these rather than the other way round. Until then, keep them in sync.
export const ERA_HUES = [212, 168, 96, 32, 284, 246, 138, 8];
export const ERA_TONE_COUNT = ERA_HUES.length;

// One tone = five values off the same hue. The wash and the plaque band are
// almost white (a franchise with nine eras should not look like a paint chart);
// the border and the title carry the identity.
export function eraTone(i) {
  const h = ERA_HUES[((i % ERA_TONE_COUNT) + ERA_TONE_COUNT) % ERA_TONE_COUNT];
  return {
    wash: `hsl(${h} 44% 98.4%)`,
    header: `hsl(${h} 38% 96.4%)`,
    border: `hsl(${h} 30% 58%)`,
    label: `hsl(${h} 32% 26%)`,
    years: `hsl(${h} 20% 45%)`,
  };
}

// ---------------------------------------------------------------------------
// Text measurement
// ---------------------------------------------------------------------------
// Rough advance width per character, in ems. An SVG <text> can't be measured
// before it's in the DOM, and fit has to be decided BEFORE rendering.
//
// Per FACE, because the era title is set in a book serif and those run
// appreciably narrower than UI sans at the same size — and per CHARACTER,
// because counting every glyph the same made short chapter names like "Unitas"
// measure wider than a frame they fit in comfortably. Rough classes are enough:
// this only has to decide whether a string fits, not lay it out.
const CHAR_W = { serif: 0.5, sans: 0.55, bold: 0.58 };

const charUnits = (ch) => {
  if (" .,'’!:;|-–—".includes(ch)) return 0.32;
  if ("iljI".includes(ch)) return 0.36;
  if ("ftr".includes(ch)) return 0.44;
  if ("MW".includes(ch)) return 1.55;
  if ("mw".includes(ch)) return 1.35;
  if (ch >= "A" && ch <= "Z") return 1.22;
  return 1;
};

export function estimateTextWidth(text, fontSize, face = "sans", tracking = 0) {
  const str = text == null ? "" : String(text);
  if (!str) return 0;
  let units = 0;
  for (const ch of str) units += charUnits(ch);
  return units * fontSize * (CHAR_W[face] ?? CHAR_W.sans) + str.length * tracking;
}

// "1998–2010", "2011" for a single season, "2019–now" for an ongoing era.
export function eraYearsLabel(era) {
  if (!era) return "";
  if (era.ongoing) return `${era.start}–now`;
  if (era.end == null || era.end === era.start) return `${era.start}`;
  return `${era.start}–${era.end}`;
}

// ---------------------------------------------------------------------------
// Spans: which YEARS each era actually covers
// ---------------------------------------------------------------------------
// Resolved before any pixels exist, because buildTimelineLayout needs to know
// which year opens a chapter (and therefore buys the plaque row) while it is
// still stacking blocks.
//
// An era is clamped to the years the franchise data actually has: a curated
// range can legitimately run past the last played season (an ongoing era) or
// start before the data does, and neither should produce a frame hanging off
// the end of the timeline. An era with no seasons on screen at all is dropped.
export function eraSpans({ eras, years }) {
  if (!eras?.length || !years?.length) return [];
  const sorted = [...years].sort((a, b) => a - b);
  const lastData = sorted[sorted.length - 1];
  const out = [];

  for (const era of eras) {
    const start = era.start;
    const end = era.end == null ? lastData : era.end;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;

    const firstYear = sorted.find((y) => y >= start && y <= end);
    if (firstYear === undefined) continue;
    let lastYear = firstYear;
    for (const y of sorted) if (y >= start && y <= end) lastYear = y;

    out.push({
      id: era.id || `${start}-${end}`,
      label: era.label,
      short: era.short || null,
      blurb: era.blurb || null,
      start,
      end: era.end,
      ongoing: era.end == null || era.ongoing === true,
      firstYear,
      lastYear,
      // Palette slot. Assigned by POSITION, not by id, so neighbouring eras are
      // always different tones no matter what the curated file happens to be
      // called.
      tone: out.length % ERA_TONE_COUNT,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Boxes: the drawable frame
// ---------------------------------------------------------------------------
// Takes the era boxes the layout produced (which own the y coordinates, since
// only the layout knows where it put the plaque row) and adds the x extents and
// the text fit — the two things that depend on the viewport rather than on the
// stack of blocks.
//
// Vertical fit is not a question here the way it is on desktop: the plaque row
// is reserved space, so every chapter has room for its label no matter how few
// seasons it covers. A one-season era on a phone gets the same wall label as a
// twenty-season one, which is the one place this orientation is strictly better
// than the desktop's (where a narrow chapter goes wordless).
// `railRight` is the FAR edge of the personnel tail gutter (not its near edge).
// The frame runs all the way out to it, so the vertical tails are INSIDE the
// chapter: a tail is a person who is with the team through those years, which
// makes them part of the era, exactly as the desktop frame runs down through
// its rail to enclose the tenure bands.
//
// What stays outside is arrival and departure, at both ends and for the same
// reason. Entry bands come in from off-screen left, crossing the frame's left
// edge — a person arrives INTO a chapter from outside it. Exit bands run out
// past the gutter to the true screen edge, crossing the right edge on the way;
// the leaving belongs to the person, not to the chapter they are walking out of.
// `textLeft` overrides the gutter for UNFRAMED bands. ERA_TEXT_INSET is measured
// from a frame's own left border, which is the right anchor only when there is
// a border to measure from; with the frame gone the plaque has to line up with
// whatever the band's content already lines up with (the season page's own left
// margin), or it reads as an arbitrary indent.
export function buildEraBoxes({ eras, width, railRight = null, textLeft = null }) {
  if (!eras?.length || !width) return [];

  const x0 = ERA_EDGE_L;
  const x1 = Math.max(x0 + 1, railRight ?? width - ERA_EDGE_R);
  const textX = textLeft ?? x0 + ERA_TEXT_INSET;
  const inner = x1 - textX - LABEL_PAD_R;

  return eras.map((e) => {
    // Fit the title, then fall back to the authored short form, then to
    // nothing. The dates are the more important of the two lines — they're what
    // makes the frame legible as a span — so they're allowed to survive alone.
    let labelText = null;
    if (estimateTextWidth(e.label, ERA_LABEL_FS, "serif") <= inner) labelText = e.label;
    else if (e.short && estimateTextWidth(e.short, ERA_LABEL_FS, "serif") <= inner) {
      labelText = e.short;
    }
    const yearsText = eraYearsLabel(e);
    const showYears =
      estimateTextWidth(yearsText, ERA_YEARS_FS, "sans", ERA_YEARS_TRACKING) <= inner;

    return {
      ...e,
      x0,
      x1,
      width: x1 - x0,
      // One x for every line — see ERA_TEXT_INSET. Text is start-anchored, so
      // this IS the left edge of the glyphs, not their centre.
      textX,
      labelText,
      yearsText,
      showYears,
    };
  });
}
