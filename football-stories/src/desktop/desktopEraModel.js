// Named Eras -> pixel boxes on the desktop timeline.
//
// "Named Eras" are the hand-curated narrative chapters of a franchise ("The
// Peyton Manning Era") authored in dataset_generation/curated/eras.json and
// shipped as segments/teams_eras/{FID}.json. They are NOT the "Eras" ZOOM
// LEVEL (the ERA_SUMMARY band) — the two just share a word. See ERAS_PLAN.md.
//
// This module is the pure math: given the era rows and a built desktop layout,
// where does each era's frame start and stop, and does its title fit inside?
// Kept JSX-free so sims/desktop_logic.sim.mjs can assert it in node (vite build
// can't run in the sandbox).

// The header strip above the timeline that carries each era's title and years.
// It's a real zone in the vertical composition — DesktopTimelineLayer adds it
// to the assembly height — so the frames sit ABOVE the content rather than
// over it.
// It's TALL on purpose: this is a museum wall label for the chapter beneath
// it, and a wall label earns its authority from the empty space around the
// words, not from the size of the type. The text block sits in the TOP of the
// band (baselines below) and the rest is deliberate air between the label and
// the chart it introduces.
export const ERA_HEADER_H = 132;

// THE standardized left gutter. Every line of era text starts here — the years
// eyebrow, the rule, the title — measured from the frame's own left border, so
// a run of eras down the timeline shares one crisp vertical edge no matter how
// wide or narrow each chapter happens to be. This replaced a proportional
// anchor (a fraction of each frame's width), which put every label in a
// slightly different place and read as sloppy across a franchise.
export const ERA_TEXT_INSET = 20;

// Baselines inside the strip, from its top. Years sit ABOVE the title as an
// eyebrow, the way a wall label leads with the dates and then names the work.
export const ERA_YEARS_BASELINE = 30;
export const ERA_RULE_Y = 44; // short accent rule between the two lines
export const ERA_RULE_W = 34;
export const ERA_LABEL_BASELINE = 68;

export const ERA_LABEL_FS = 21;
export const ERA_YEARS_FS = 11;
// The dates are set wide, the way a wall label spaces a date line. Tracking is
// exported because the FIT CHECK has to know about it: at 2px a nine-character
// date range is ~18px wider than its glyphs, which is the difference between a
// caption sitting inside its frame and one crossing the border.
export const ERA_YEARS_TRACKING = 2;

// Right-hand breathing room before text reaches the far border. The title
// keeps a real margin; the years — a short caption — only need to stay inside
// the frame, which is what keeps a three-season chapter from going completely
// wordless.
const LABEL_PAD_R = 10;
const YEARS_PAD_R = 4;

// The chapter's border, and the CLEAR SPACE it keeps below the personnel
// rail's last tenure band. A frame encloses the bands — the people who served
// in an era belong to it — but a border drawn flush against them reads as a
// clipping edge rather than a container. The gap is measured to the stroke's
// NEAR edge, so DesktopTimelineLayer has to add the stroke width on top when
// it solves for the frame's bottom (see eraBottom).
export const ERA_BORDER_W = 2.5;
export const ERA_RAIL_GAP = 4;

// How many distinct tones the palette rotates through. Eras are tinted so
// adjacent chapters read as separate things; the actual colors live in
// DesktopEraLayer (this module stays presentation-free), and this is the count
// the two agree on.
export const ERA_TONE_COUNT = 8;

// Rough advance width per character, in ems. An SVG <text> can't be measured
// before it's in the DOM, and the whole point of this module is to decide fit
// BEFORE rendering, so we estimate.
//
// Per FACE, because the era title is set in a book serif (see LABEL_FAMILY in
// DesktopEraLayer) and those run appreciably narrower than UI sans at the same
// size — Palatino/Iowan lowercase sits near 0.5em. Estimating the serif at the
// bold-sans rate is what made short chapter names like "Unitas" get dropped
// from frames they comfortably fit in.
const CHAR_W = { serif: 0.5, sans: 0.55, bold: 0.58 };

// …and per CHARACTER, relative to that base. Counting every glyph the same
// made "Unitas" (four narrow letters) measure wider than a frame it fits in
// with room to spare, while "Mmm" would have measured short. Rough classes are
// enough — this only has to decide whether a string fits, not lay it out.
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

// Where an era's frame starts and stops, in LAYOUT (unscrolled) pixels.
//
// The frame opens at the left edge of its first year's OFFSEASON block and
// closes at the right edge of its last year's SEASON block, so it encloses
// whole years — including the draft class that opens each one — rather than
// cutting through the middle of a year's content.
//
// An era is clamped to the years the franchise data actually has: a curated
// range can legitimately run past the last played season (an ongoing era) or
// start before the data does, and neither should produce a frame hanging off
// the end of the timeline. An era with no seasons on screen at all is dropped.
export function buildEraBoxes({ eras, layout }) {
  if (!eras?.length || !layout?.byYear?.size) return [];

  const years = [...layout.byYear.keys()].sort((a, b) => a - b);
  const boxes = [];

  for (const era of eras) {
    const start = era.start;
    const end = era.end == null ? years[years.length - 1] : era.end;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;

    const firstYear = years.find((y) => y >= start && y <= end);
    if (firstYear === undefined) continue;
    let lastYear = firstYear;
    for (const y of years) if (y >= start && y <= end) lastYear = y;

    const x0 = layout.byYear.get(firstYear).offseason.x0;
    const x1 = layout.byYear.get(lastYear).season.x1;
    const width = x1 - x0;

    // Fit the title, then fall back to the authored short form, then to
    // nothing. The years are the more important of the two lines — they're
    // what makes the frame legible as a span — so they're allowed to survive
    // on their own in a narrow frame.
    const inner = width - ERA_TEXT_INSET - LABEL_PAD_R;
    let labelText = null;
    if (estimateTextWidth(era.label, ERA_LABEL_FS, "serif") <= inner) labelText = era.label;
    else if (era.short && estimateTextWidth(era.short, ERA_LABEL_FS, "serif") <= inner) {
      labelText = era.short;
    }
    const yearsText = eraYearsLabel(era);
    const showYears =
      estimateTextWidth(yearsText, ERA_YEARS_FS, "sans", ERA_YEARS_TRACKING) <=
      width - ERA_TEXT_INSET - YEARS_PAD_R;

    boxes.push({
      id: era.id || `${era.start}-${end}`,
      label: era.label,
      labelText,
      yearsText,
      showYears,
      start,
      end,
      firstYear,
      lastYear,
      x0,
      x1,
      width,
      cx: x0 + width / 2,
      // One x for every line — see ERA_TEXT_INSET. Text is start-anchored, so
      // this IS the left edge of the glyphs, not their centre.
      textX: x0 + ERA_TEXT_INSET,
      labelX: labelText ? x0 + ERA_TEXT_INSET : null,
      yearsX: showYears ? x0 + ERA_TEXT_INSET : null,
      // Palette slot. Assigned by POSITION, not by id, so neighbouring eras are
      // always different tones no matter what the curated file happens to be
      // called.
      tone: boxes.length % ERA_TONE_COUNT,
    });
  }

  return boxes;
}
