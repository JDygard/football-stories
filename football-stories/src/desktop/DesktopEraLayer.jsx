// Named Eras, drawn as big framed chapters around the years they cover.
//
// One rectangle per era enclosing all of its years, with a tall header band
// across the top carrying the title and the year range. Each era gets its own
// TONE — a muted hue rotated by position — so adjacent chapters read as
// separate things at a glance. Deliberately no team colors: an era is an
// editorial layer over the whole franchise, and tinting it in team colors would
// make it compete with the timeline's own marks instead of framing them.
//
// Painted in TWO PASSES, one under the timeline and one over it (`layer`):
//   "wash"   — the era's interior tint plus the plaque's own band. Goes UNDER
//              the year columns, the win-rate curve and the rail. The tint is
//              barely-there on purpose, just enough that you can see where one
//              chapter ends and the next begins.
//   "plaque" — the BORDER and the label (dates, rule, title). Goes over
//              EVERYTHING, including the personnel ribbons, with every mark
//              haloed in white.
//
// Why the border is in the OVER pass: a chapter now encloses the personnel
// rail's horizontal bands, and those bands are opaque — a border painted under
// them would break wherever a tenure crossed a chapter boundary, which is
// exactly where you most want to see the line. The label needs the same
// treatment for the same reason at the other end: incoming ribbons enter from
// above and drop straight down through the plaque band, and an opaque
// connector painted over a title strikes it clean through. This is the call
// the year axis already makes — see DesktopTimelineLayer's header.
//
// Only rendered at the two coarsest zooms (Eras / Seasons), where a
// multi-decade span is compressed enough to read as one shape. The box math
// lives in desktopEraModel.js so it can be simulated in node.

import { memo } from "react";
import {
  ERA_HEADER_H,
  ERA_HEADER_COMPACT_H,
  ERA_COMPACT_YEARS_BASELINE,
  ERA_COMPACT_LABEL_BASELINE,
  ERA_LABEL_BASELINE,
  ERA_RECORD_FS,
  ERA_YEARS_BASELINE,
  ERA_RULE_Y,
  ERA_RULE_W,
  ERA_LABEL_FS,
  ERA_YEARS_FS,
  ERA_YEARS_TRACKING,
  ERA_BORDER_W,
  ERA_TONE_COUNT,
} from "./desktopEraModel.js";

// A wall label is set in a book face, not in UI type. The rest of the app is
// system-ui by design — this one surface is deliberately not, because that
// contrast is most of what makes an era read as a caption ABOUT the timeline
// rather than another control on it.
const LABEL_FAMILY = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

// Muted hues, evenly spread but never fully saturated — the point is that two
// neighbours are TELLABLE APART, not that any one of them is colorful. Length
// must match ERA_TONE_COUNT.
const ERA_HUES = [212, 168, 96, 32, 284, 246, 138, 8];

// One tone = three values off the same hue. The wash and the header band are
// almost white (a franchise with twelve eras should not look like a paint
// chart); the border carries the identity.
//
// The TEXT is deliberately not in the tone. A wall label is black ink on a
// mount, and tinting the words made each chapter's title read as a different
// kind of thing rather than the same kind of thing about a different era.
// Hierarchy inside the label comes from size and weight, not hue — which is
// also what keeps the small type legible over a ribbon passing behind it.
const tone = (i) => {
  const h = ERA_HUES[i % ERA_HUES.length];
  return {
    wash: `hsl(${h} 44% 98.4%)`,
    header: `hsl(${h} 38% 96.4%)`,
    border: `hsl(${h} 30% 58%)`,
  };
};

const ERA_INK = "#111111";

// Thicker than a hairline and drawn in the era's own color: at 1.5px neutral
// grey the frames read as gridlines rather than as the boundaries of a chapter.
// Lives in the model because the layout has to reason about it too — the gap
// the frame keeps below the rail is measured to this stroke's near edge.
const BORDER_W = ERA_BORDER_W;

// Air kept between a sliding label and the far end of its own chapter.
const LABEL_SLIDE_PAD = 8;

const DesktopEraLayer = memo(function DesktopEraLayer({
  boxes,
  top,
  bottom,
  layer = "frame",
  // false on the two GAME bands, where an era is several windows wide and its
  // border would only ever be one vertical line with nothing to relate it to.
  // The plaque still draws: the chapter is still named, it just has no box.
  framed = true,
  // Short window: the plaque is two tight lines (years, title) instead of the
  // full wall label. No rule, no record, no blurb — see ERA_HEADER_COMPACT_H.
  //
  // This MUST agree with the height the assembly reserved (eraZoneFor). It
  // arrives as a flag rather than being re-derived here because the two
  // deciding it separately is how the band ended up 132 tall inside a 40px
  // zone, printing a chapter title straight through the year row.
  compact = false,
  // Horizontal scroll offset — the sticky wall label reads it, see below.
  scrollX = 0,
  onFocusEra = null,
  focusedEraId = null,
  tapGuard = null,
}) {
  if (!boxes?.length) return null;
  const height = Math.max(0, bottom - top);
  if (height <= 0) return null;
  // The plaque's own height, which is what the assembly actually reserved.
  const bandH = compact ? ERA_HEADER_COMPACT_H : ERA_HEADER_H;

  // ---- pass 1: interior tint + plaque band, under everything ----
  if (layer === "wash") {
    return (
      <g style={{ pointerEvents: "none" }}>
        {boxes.map((b) => (
          <rect
            key={b.id}
            x={b.x0}
            y={top}
            width={b.width}
            height={height}
            data-era-wash={b.id}
            fill={tone(b.tone % ERA_TONE_COUNT).wash}
          />
        ))}
        {/* The plaque band, in the same pass: nothing in the timeline reaches
            up into it (the year columns start exactly where it ends), so it
            only has to sit above the wash. Its LABEL is another matter — that
            goes in the over pass. */}
        {boxes.map((b) => {
          const t = tone(b.tone % ERA_TONE_COUNT);
          return (
            <g key={`band-${b.id}`}>
              <rect
                x={b.x0}
                y={top}
                width={b.width}
                height={bandH}
                data-era-header={b.id}
                fill={t.header}
              />
              <line
                x1={b.x0}
                x2={b.x1}
                y1={top + bandH - 0.5}
                y2={top + bandH - 0.5}
                stroke={t.border}
                strokeWidth={1}
                strokeOpacity={0.5}
              />
            </g>
          );
        })}
      </g>
    );
  }

  // ---- pass 3: the label, over the ribbons, haloed ----
  if (layer === "plaque") {
    return (
      <g style={{ pointerEvents: "none" }}>
        {boxes.map((b) => {
          const t = tone(b.tone % ERA_TONE_COUNT);
          const focused = focusedEraId === b.id;
          // STICKY WALL LABEL.
          //
          // At the game zooms a chapter is several windows wide. A label pinned
          // to its own left edge is therefore on screen for a few percent of the
          // time you spend inside that chapter, which makes the plaque a thing
          // you glimpse once and then scroll past — not much use if the point is
          // knowing which chapter you are in. So it slides with the viewport,
          // bounded by the chapter's own two ends: it starts moving when its
          // left edge would go off screen and stops before it can cross into
          // the next chapter. (DesktopRibbonLayer clamps its band labels the
          // same way; this one also clamps at the far end, which that one does
          // not.)
          //
          // Driven by SCROLL, not by band. While a chapter's left edge is on
          // screen the label sits exactly on its frame's gutter — which is what
          // makes a run of chapters share one vertical edge, and is always the
          // case at the Eras rung, where the whole franchise fits and nothing
          // scrolls. It only starts moving once that edge has gone past you.
          const labelBlockW = b.blurbLines?.length
            ? b.blurbX + b.blurbW - b.x0
            : b.textX - b.x0 + b.titleZoneW;
          const slideMax = Math.max(b.x0, b.x1 - labelBlockW - LABEL_SLIDE_PAD);
          const dx = Math.min(Math.max(b.x0, scrollX), slideMax) - b.x0;
          return (
            <g key={b.id}>
              {/* HIT TARGET for focusing the chapter. It lives in this pass
                  because this pass paints last — a target under the ribbons
                  would be shadowed by every tenure band crossing the plaque.
                  Only the plaque band is clickable, not the whole frame: the
                  frame's interior is the timeline, and stealing clicks there
                  would break every draft box and ribbon inside it. */}
              {onFocusEra && (
                <rect
                  x={b.x0}
                  y={top}
                  width={b.width}
                  height={bandH}
                  data-era-hit={b.id}
                  fill="transparent"
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={(e) => {
                    if (tapGuard && tapGuard()) return;
                    e.stopPropagation();
                    // Toggle, not set. Opening a chapter now also narrows the
                    // personnel rail to that chapter's cast, so there has to be
                    // a direct way to put the rail back — clicking the open
                    // plaque again. (Mobile has done this since it shipped.)
                    onFocusEra(focusedEraId === b.id ? null : b);
                  }}
                >
                  <title>
                    {focused ? "Close chapter" : `Open ${b.label || b.yearsText}`}
                  </title>
                </rect>
              )}
              {focused && (
                <rect
                  x={b.x0 + BORDER_W / 2}
                  y={top + BORDER_W / 2}
                  width={Math.max(0, b.width - BORDER_W)}
                  height={Math.max(0, bandH - BORDER_W / 2)}
                  data-era-focused={b.id}
                  rx={6}
                  fill={t.border}
                  fillOpacity={0.14}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {/* The frame itself, over the content it encloses — including
                  the rail's opaque tenure bands at the bottom. Unfilled: the
                  wash pass already laid the tint down underneath. Absent on the
                  game bands, where the plaque stands on its own. */}
              {framed && (
                <rect
                  x={b.x0 + BORDER_W / 2}
                  y={top + BORDER_W / 2}
                  width={Math.max(0, b.width - BORDER_W)}
                  height={Math.max(0, height - BORDER_W)}
                  data-era-frame={b.id}
                  rx={6}
                  fill="none"
                  stroke={t.border}
                  strokeWidth={BORDER_W}
                />
              )}
              <g transform={dx ? `translate(${dx} 0)` : undefined}>
                {compact ? (
                  <>
                    {/* Two lines and nothing else. The accent rule, the
                        record and the blurb are for the coarse rungs,
                        where you are reading a chapter rather than
                        tracking games inside one. */}
                    {b.showYears && (
                      <text
                        x={b.yearsX}
                        y={top + ERA_COMPACT_YEARS_BASELINE}
                        data-era-years={b.id}
                        fontSize={ERA_YEARS_FS}
                        fontWeight={600}
                        textAnchor="start"
                        fill={ERA_INK}
                        stroke="#ffffff"
                        strokeWidth={3}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        style={{ letterSpacing: ERA_YEARS_TRACKING }}
                      >
                        {b.yearsText}
                      </text>
                    )}
                    {b.labelText && (
                      <text
                        x={b.labelX}
                        y={top + ERA_COMPACT_LABEL_BASELINE}
                        data-era-title={b.id}
                        fontSize={ERA_LABEL_FS}
                        fontWeight={600}
                        textAnchor="start"
                        fill={ERA_INK}
                        stroke="#ffffff"
                        strokeWidth={4.5}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        style={{ fontFamily: LABEL_FAMILY, letterSpacing: 0.2 }}
                      >
                        {b.labelText}
                      </text>
                    )}
                  </>
                ) : (
                  <>
                  {b.showYears && (
                    <text
                      x={b.yearsX}
                      y={top + ERA_YEARS_BASELINE}
                      data-era-years={b.id}
                      fontSize={ERA_YEARS_FS}
                      fontWeight={600}
                      textAnchor="start"
                      fill={ERA_INK}
                      stroke="#ffffff"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      paintOrder="stroke"
                      style={{ letterSpacing: ERA_YEARS_TRACKING }}
                    >
                      {b.yearsText}
                    </text>
                  )}
                  {/* The rule belongs to the LABEL, not to the frame: a chapter too
                      narrow for any words shouldn't carry an orphan tick. White
                      underlay first, so it survives a connector crossing it. */}
                  {(b.showYears || b.labelText) && (
                    <g>
                      <line
                        x1={b.textX}
                        x2={Math.min(b.textX + ERA_RULE_W, b.x1 - 6)}
                        y1={top + ERA_RULE_Y + 0.5}
                        y2={top + ERA_RULE_Y + 0.5}
                        stroke="#ffffff"
                        strokeWidth={4}
                      />
                      <line
                        x1={b.textX}
                        x2={Math.min(b.textX + ERA_RULE_W, b.x1 - 6)}
                        y1={top + ERA_RULE_Y + 0.5}
                        y2={top + ERA_RULE_Y + 0.5}
                        data-era-rule={b.id}
                        stroke={t.border}
                        strokeWidth={1.25}
                        strokeOpacity={0.75}
                      />
                    </g>
                  )}
                  {b.showRecord && (
                    <text
                      x={b.recordX}
                      y={top + b.recordBaseline}
                      data-era-record={b.id}
                      fontSize={ERA_RECORD_FS}
                      fontWeight={600}
                      textAnchor="start"
                      fill={ERA_INK}
                      stroke="#ffffff"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      paintOrder="stroke"
                      style={{ letterSpacing: 0.6 }}
                    >
                      {b.recordText}
                    </text>
                  )}
                  {b.labelText && (
                    <text
                      x={b.labelX}
                      y={top + ERA_LABEL_BASELINE}
                      data-era-title={b.id}
                      fontSize={ERA_LABEL_FS}
                      fontWeight={600}
                      textAnchor="start"
                      fill={ERA_INK}
                      stroke="#ffffff"
                      strokeWidth={4.5}
                      strokeLinejoin="round"
                      paintOrder="stroke"
                      style={{ fontFamily: LABEL_FAMILY, letterSpacing: 0.2 }}
                    >
                      {b.labelText}
                    </text>
                  )}

                  </>
                )}
              </g>
            </g>
          );
        })}
      </g>
    );
  }

  return null;
});

export default DesktopEraLayer;
