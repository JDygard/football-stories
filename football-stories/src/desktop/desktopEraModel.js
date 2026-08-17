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
// The chapter's aggregate record, on its own line under the title — the wall
// label's "medium and dimensions" line. It's the one number that makes a
// chapter's name mean something at a glance ("The Aints, 43-113-4"), and the
// pipeline has computed it since day one; it just wasn't being drawn. The band
// is 132 tall with the title baseline at 68, so this sits in air that already
// existed.
export const ERA_RECORD_BASELINE = 92;

// ---- the blurb, shown only on the SELECTED chapter -------------------------
// The wall label gains its paragraph when you pick the chapter, and only then:
// every frame carrying its prose at all times would turn the timeline into a
// page of text.
export const ERA_BLURB_FS = 12.5;
export const ERA_BLURB_LH = 15.5;
// The paragraph is a COLUMN to the RIGHT of the wall label, not a band under
// it. Set across the frame it becomes a 3,900px line — technically inside the
// box and unreadable, because measure, not width, is what makes prose legible.
// So it gets a fixed measure and uses the plaque's HEIGHT instead, which is
// also why a wide chapter and a narrow one read the same.
export const ERA_BLURB_COL_W = 380;    // ~60 characters at 12.5px
export const ERA_BLURB_GUTTER = 36;    // clear air after the title zone
export const ERA_BLURB_BASELINE = 30;  // first baseline, level with the eyebrow
// A column narrower than this is a stack of two-word lines; better to reserve
// width (blurbPadFor) than to print that.
export const ERA_BLURB_MIN_COL_W = 200;
// However many lines the band's height actually holds — the paragraph fills the
// plaque and stops, rather than the plaque growing to fit the paragraph.
export const ERA_BLURB_MAX_LINES =
  Math.floor((ERA_HEADER_H - ERA_BLURB_BASELINE - 10) / ERA_BLURB_LH) + 1;
// A chapter narrower than this can't hold a readable line, so the layout
// reserves whitespace after its last season to make up the difference (see
// blurbPadFor). Below ~300px the prose wraps to a column of two-word lines,
// which reads worse than not showing it.

export const ERA_RECORD_FS = 12.5;
// Gap between the title and the record when the two share a line.
const RECORD_INLINE_GAP = 12;

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
// Two serif numbers on purpose, because the estimate is asked two different
// questions and the safe answer differs:
//   "serif"     — DOES IT FIT? Under-measure. A title dropped for being 2px too
//                 wide costs a chapter its name; one that overhangs a couple of
//                 px into the right pad costs nothing.
//   "serifWide" — WHERE DOES IT END? Over-measure. Anything positioned AFTER
//                 the title has to clear the real glyphs, and under-measuring
//                 here printed the record straight through the tail of
//                 "Grant's Twilight".
const CHAR_W = { serif: 0.5, serifWide: 0.62, sans: 0.55, bold: 0.58 };

// …and per CHARACTER, relative to that base. Counting every glyph the same
// made "Unitas" (four narrow letters) measure wider than a frame it fits in
// with room to spare, while "Mmm" would have measured short. Rough classes are
// enough — this only has to decide whether a string fits, not lay it out.
const charUnits = (ch) => {
  // An EM DASH is a full em wide and an en dash half of one — they were in
  // this narrow class with commas and periods, which made any line containing
  // one measure ~0.7em short. Harmless in a title; in a wrapped paragraph it
  // put the line through the frame's right border.
  if (ch === "—") return 1.5;
  if (ch === "–") return 0.9;
  if (" .,'’!:;|-".includes(ch)) return 0.32;
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

// "141-67", or "43-113-4" when the era has ties. Ties are dropped when zero —
// every modern chapter would otherwise carry a meaningless "-0". Matches
// recordStr() in DesktopTimelineLayer so a chapter's record and a season's
// record are punctuated the same way.
export function eraRecordLabel(era) {
  const r = era?.record;
  if (!r) return "";
  const { wins, losses, ties } = r;
  if (wins == null || losses == null) return "";
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
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
// The estimator's `sans` constant is tuned for "does this fit" on SHORT
// strings, where under-measuring by a few px costs nothing. Wrapping a
// paragraph compounds that error along the whole line, and the failure mode is
// text running out through the frame's right border. So wrapping measures
// pessimistically — the same two-constants-for-two-questions rule the title
// and record already follow (see estimateTextWidth's note).
// 1.22, not 1.14. The estimator is calibrated against the UI sans the app gets
// on Windows (Segoe UI); `system-ui` resolves to something appreciably wider on
// other platforms, and a wrapped paragraph has no ellipsis to hide behind — the
// line simply crosses the frame's right border into the next chapter. Losing a
// word per line is the cheap side of that trade.
const BLURB_WRAP_PESSIMISM = 1.22;

// Greedy word wrap against the estimator. Returns [] when there's no room.
export function wrapBlurb(text, innerW, maxLines = ERA_BLURB_MAX_LINES) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length || !(innerW > 0)) return [];
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    const nextW = estimateTextWidth(next, ERA_BLURB_FS, "sans") * BLURB_WRAP_PESSIMISM;
    if (nextW <= innerW || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = w;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  // Ran out of lines with words left: mark the truncation rather than ending
  // the paragraph mid-sentence as if that were the whole thought.
  const used = lines.join(" ").split(/\s+/).length;
  if (used < words.length && lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[,;:]?$/, "") + "…";
  }
  return lines;
}

/**
 * Extra width a chapter needs before its blurb column will fit.
 *
 * Returns px to reserve AFTER the era's last season — the layout grows into
 * whitespace rather than the frame overlapping its neighbour, so the chapter
 * still reads as covering exactly the years it covers. The requirement is the
 * wall label's own width plus a gutter plus a full measure; anything less and
 * the prose would set too narrow to read.
 */
export function blurbPadFor(box) {
  if (!box?.blurb) return 0;
  const need =
    ERA_TEXT_INSET +
    (box.titleZoneW || 0) +
    ERA_BLURB_GUTTER +
    ERA_BLURB_COL_W +
    LABEL_PAD_R;
  return box.width >= need ? 0 : Math.ceil(need - box.width);
}

export function buildEraBoxes({ eras, layout, selectedId = null }) {
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
    // Reach across any whitespace reserved after the last season: that paper
    // was added FOR this frame's blurb, so it belongs inside the frame.
    const lastSeason = layout.byYear.get(lastYear).season;
    const x1 = lastSeason.x1 + (lastSeason.padAfter || 0);
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

    // The record only appears where the TITLE is, to caption it. On a frame too
    // narrow for a name, a bare "43-113-4" under a date range reads as a stray
    // number rather than as a chapter's record.
    //
    // It sits IN LINE with the title when both fit on one line — a wall label
    // reads "The Dome Patrol   69-42" as one statement, and the stacked version
    // spends a whole line on five characters. It drops to its own line only
    // when the pair won't fit.
    const recordText = eraRecordLabel(era);
    const recordW = estimateTextWidth(recordText, ERA_RECORD_FS, "sans");
    // The PESSIMISTIC title width — this one decides both whether the record
    // fits beside the title and where it starts, so the two can never disagree.
    const labelEndW = labelText
      ? estimateTextWidth(labelText, ERA_LABEL_FS, "serifWide")
      : 0;
    const recordInline =
      !!labelText && !!recordText &&
      labelEndW + RECORD_INLINE_GAP + recordW <= inner;
    const showRecord =
      !!labelText && !!recordText &&
      (recordInline || recordW <= width - ERA_TEXT_INSET - YEARS_PAD_R);

    const boxId = era.id || `${era.start}-${end}`;

    // How much horizontal room the WALL LABEL occupies, measured
    // pessimistically — the blurb column starts after this, so under-measuring
    // would set the paragraph on top of the title.
    const yearsW = showYears
      ? estimateTextWidth(yearsText, ERA_YEARS_FS, "sans", ERA_YEARS_TRACKING)
      : 0;
    const titleRowW = recordInline
      ? labelEndW + RECORD_INLINE_GAP + recordW
      : Math.max(labelEndW, showRecord ? recordW : 0);
    const titleZoneW = Math.max(yearsW, titleRowW, ERA_RULE_W);

    // The blurb column: to the RIGHT of the label, at a fixed measure, using
    // the plaque's height. It is never set wider than ERA_BLURB_COL_W however
    // wide the chapter is — a 60-character line is the readable unit, and a
    // 3,900px one is not a paragraph.
    const blurbX = x0 + ERA_TEXT_INSET + titleZoneW + ERA_BLURB_GUTTER;
    const blurbW = Math.min(ERA_BLURB_COL_W, x1 - LABEL_PAD_R - blurbX);
    const selected = selectedId && boxId === selectedId;
    const blurbLines =
      selected && era.blurb && blurbW >= ERA_BLURB_MIN_COL_W
        ? wrapBlurb(era.blurb, blurbW)
        : [];

    boxes.push({
      blurb: era.blurb || null,
      blurbLines,
      titleZoneW,
      blurbX,
      blurbW,
      id: boxId,
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
      recordText,
      showRecord,
      recordInline: showRecord && recordInline,
      // Inline: to the right of the title, on its baseline. Stacked: back on
      // the standard gutter, a line below.
      recordX: !showRecord
        ? null
        : recordInline
          ? x0 + ERA_TEXT_INSET + labelEndW + RECORD_INLINE_GAP
          : x0 + ERA_TEXT_INSET,
      recordBaseline: recordInline ? ERA_LABEL_BASELINE : ERA_RECORD_BASELINE,
      // Palette slot. Assigned by POSITION, not by id, so neighbouring eras are
      // always different tones no matter what the curated file happens to be
      // called.
      tone: boxes.length % ERA_TONE_COUNT,
    });
  }

  return boxes;
}
