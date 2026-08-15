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
  ERA_LABEL_BASELINE,
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

// One tone = four values off the same hue. The wash and the header are almost
// white (a franchise with nine eras should not look like a paint chart); the
// border and the title carry the identity.
const tone = (i) => {
  const h = ERA_HUES[i % ERA_HUES.length];
  return {
    wash: `hsl(${h} 44% 98.4%)`,
    header: `hsl(${h} 38% 96.4%)`,
    border: `hsl(${h} 30% 58%)`,
    label: `hsl(${h} 32% 26%)`,
    years: `hsl(${h} 20% 45%)`,
  };
};

// Thicker than a hairline and drawn in the era's own color: at 1.5px neutral
// grey the frames read as gridlines rather than as the boundaries of a chapter.
// Lives in the model because the layout has to reason about it too — the gap
// the frame keeps below the rail is measured to this stroke's near edge.
const BORDER_W = ERA_BORDER_W;

const DesktopEraLayer = memo(function DesktopEraLayer({
  boxes,
  top,
  bottom,
  layer = "frame",
}) {
  if (!boxes?.length) return null;
  const height = Math.max(0, bottom - top);
  if (height <= 0) return null;

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
                height={ERA_HEADER_H}
                data-era-header={b.id}
                fill={t.header}
              />
              <line
                x1={b.x0}
                x2={b.x1}
                y1={top + ERA_HEADER_H - 0.5}
                y2={top + ERA_HEADER_H - 0.5}
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
          return (
            <g key={b.id}>
              {/* The frame itself, over the content it encloses — including
                  the rail's opaque tenure bands at the bottom. Unfilled: the
                  wash pass already laid the tint down underneath. */}
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
              {b.showYears && (
                <text
                  x={b.yearsX}
                  y={top + ERA_YEARS_BASELINE}
                  data-era-years={b.id}
                  fontSize={ERA_YEARS_FS}
                  fontWeight={600}
                  textAnchor="start"
                  fill={t.years}
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
              {b.labelText && (
                <text
                  x={b.labelX}
                  y={top + ERA_LABEL_BASELINE}
                  data-era-title={b.id}
                  fontSize={ERA_LABEL_FS}
                  fontWeight={600}
                  textAnchor="start"
                  fill={t.label}
                  stroke="#ffffff"
                  strokeWidth={4.5}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  style={{ fontFamily: LABEL_FAMILY, letterSpacing: 0.2 }}
                >
                  {b.labelText}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  return null;
});

export default DesktopEraLayer;
