// Named Eras, drawn as framed chapters down the mobile timeline.
//
// One rectangle per era enclosing all of its years, opened by a plaque row
// across the top carrying the title and the year range. Each era gets its own
// TONE — a muted hue rotated by position — so adjacent chapters read as
// separate things at a glance.
//
// Painted in TWO PASSES, one under the timeline and one over it (`layer`):
//   "wash"   — the era's interior tint plus the plaque's own band. Goes UNDER
//              the win-rate curve, the season cards and the blocks. The tint is
//              barely-there on purpose, just enough that you can see where one
//              chapter ends and the next begins.
//   "plaque" — the BORDER and the label (dates, rule, title). Goes over
//              EVERYTHING, including the personnel ribbons, with every mark
//              haloed in white.
//
// On an UNFRAMED band (`framed={false}` — see ERA_FRAMED_BANDS) the caller skips
// the wash pass entirely and the plaque drops its border, leaving just the
// lettering in its chapter's colour: a title card you scroll past, not a
// container. It needs no surface of its own there, because the season page
// beneath it already paints one.
//
// Why the border is in the OVER pass: a chapter encloses the ribbon layer's
// opaque entry bands, and a border painted under them would break wherever a
// tenure crossed a chapter boundary — which is exactly where you most want to
// see the line. The label needs the same treatment for the same reason:
// arriving personnel land on the reserved rows immediately below the plaque and
// an opaque band painted over a title strikes it clean through.
//
// The plaque row is REAL LAYOUT SPACE, bought by the era's first year in
// buildTimelineLayout — this file only draws into it. Box math and every tuning
// constant live in eraModel.js so they can be simulated in node (vite build
// can't run in the sandbox).
//
// TAPPING A PLAQUE selects the chapter, which does two things: the wall label
// gains its paragraph, and the shell highlights the people who made the era
// (App fetches their tenures and turns their personnel ribbons on). Both are
// the desktop behaviour, transposed. Two differences worth knowing:
//
//   The paragraph sits UNDER the title rather than in a column beside it, and
//   the plaque row GROWS to hold it — real layout, so the seasons below slide
//   down instead of being covered. Desktop reserves width for the same reason;
//   a phone has the measure already and has to buy the height.
//
//   Tapping the selected plaque again CLEARS it. On desktop you dismiss a
//   selection by clicking another one; on a phone the plaque you would tap to
//   undo is often the one you can see, and a grown plaque you cannot put back
//   is a trap.

import { memo } from "react";
import {
  ERA_HEADER_H,
  ERA_BLURB_FS,
  ERA_BLURB_LH,
  ERA_BLURB_BASELINE,
  ERA_LABEL_BASELINE,
  ERA_YEARS_BASELINE,
  ERA_RULE_Y,
  ERA_RULE_W,
  ERA_LABEL_FS,
  ERA_YEARS_FS,
  ERA_YEARS_TRACKING,
  ERA_BORDER_W,
  eraTone,
} from "./eraModel.js";

// A wall label is set in a book face, not in UI type. The rest of the app is
// system-ui by design — this one surface is deliberately not, because that
// contrast is most of what makes an era read as a caption ABOUT the timeline
// rather than another control on it. (Same stack as the desktop layer.)
const LABEL_FAMILY = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

const BORDER_W = ERA_BORDER_W;

const EraLayer = memo(function EraLayer({
  boxes,
  layer = "wash",
  framed = true,
  onFocusEra = null,
  focusedEraId = null,
  tapGuard = null,
}) {
  if (!boxes?.length) return null;

  // ---- pass 1: interior tint + plaque band, under everything ----
  if (layer === "wash") {
    return (
      <g style={{ pointerEvents: "none" }}>
        {boxes.map((b) => {
          const h = Math.max(0, b.y1 - b.y0);
          if (h <= 0) return null;
          const t = eraTone(b.tone);
          return (
            <g key={`wash-${b.id}`}>
              <rect
                x={b.x0}
                y={b.y0}
                width={b.width}
                height={h}
                data-era-wash={b.id}
                fill={t.wash}
              />
              {/* The plaque band, in the same pass: nothing in the timeline
                  reaches up into it (the block's own content starts exactly
                  where it ends), so it only has to sit above the wash. Its
                  LABEL is another matter — that goes in the over pass.
                  Deliberately UNRULED at its lower edge: the band is a shade of
                  the chapter's own tint against that chapter's own wash, and a
                  line across it turned the label into a titlebar sitting on the
                  seasons rather than a caption floating above them. The change
                  in tone is all the separation it needs. */}
              <rect
                x={b.x0}
                y={b.y0}
                width={b.width}
                height={b.headerH || ERA_HEADER_H}
                data-era-header={b.id}
                fill={t.header}
              />
            </g>
          );
        })}
      </g>
    );
  }

  // ---- pass 2: the frame and the label, over the ribbons, haloed ----
  if (layer === "plaque") {
    // pointerEvents is set per-mark here rather than on the group: the hit
    // target below needs them, and every painted mark must not have them.
    return (
      <g style={{ pointerEvents: "none" }}>
        {boxes.map((b) => {
          const h = Math.max(0, b.y1 - b.y0);
          if (h <= 0) return null;
          const t = eraTone(b.tone);
          const ruleX2 = Math.min(b.textX + ERA_RULE_W, b.x1 - 6);
          const headerH = b.headerH || ERA_HEADER_H;
          const focused = focusedEraId != null && focusedEraId === b.id;
          return (
            <g key={`frame-${b.id}`}>
              {/* HIT TARGET. It lives in this pass because this pass paints
                  last — a target under the ribbons would be shadowed by every
                  tenure band that crosses the plaque. Only the plaque row is
                  tappable, never the frame's interior: that interior IS the
                  timeline, and swallowing taps there would break every season
                  card, draft box and ribbon inside the chapter. */}
              {onFocusEra && (
                <rect
                  x={b.x0}
                  y={b.y0}
                  width={b.width}
                  height={headerH}
                  data-era-hit={b.id}
                  fill="transparent"
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={(e) => {
                    // A tap that ends a scroll or a rail-reveal drag is not a
                    // tap. Same guard the ribbons and draft boxes use.
                    if (tapGuard && tapGuard()) return;
                    e.stopPropagation();
                    onFocusEra(focused ? null : b);
                  }}
                >
                  <title>{focused ? "Close chapter" : `Open ${b.label || b.yearsText}`}</title>
                </rect>
              )}
              {focused && (
                <rect
                  x={b.x0 + BORDER_W / 2}
                  y={b.y0 + BORDER_W / 2}
                  width={Math.max(0, b.width - BORDER_W)}
                  height={Math.max(0, headerH - BORDER_W / 2)}
                  data-era-focused={b.id}
                  rx={8}
                  fill={t.border}
                  fillOpacity={0.13}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {/* The frame itself, over the content it encloses — including the
                  ribbon layer's opaque bands. Unfilled: the wash pass already
                  laid the tint down underneath. Absent on unframed bands, where
                  the plaque stands on its own (see ERA_FRAMED_BANDS). */}
              {framed && (
                <rect
                  x={b.x0 + BORDER_W / 2}
                  y={b.y0 + BORDER_W / 2}
                  width={Math.max(0, b.width - BORDER_W)}
                  height={Math.max(0, h - BORDER_W)}
                  data-era-frame={b.id}
                  rx={8}
                  fill="none"
                  stroke={t.border}
                  strokeWidth={BORDER_W}
                />
              )}
              {b.showYears && (
                <text
                  x={b.textX}
                  y={b.y0 + ERA_YEARS_BASELINE}
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
              {/* The rule belongs to the LABEL, not to the frame: a chapter with
                  no words shouldn't carry an orphan tick. White underlay first,
                  so it survives a ribbon crossing it. */}
              {(b.showYears || b.labelText) && (
                <g>
                  <line
                    x1={b.textX}
                    x2={ruleX2}
                    y1={b.y0 + ERA_RULE_Y + 0.5}
                    y2={b.y0 + ERA_RULE_Y + 0.5}
                    stroke="#ffffff"
                    strokeWidth={4}
                  />
                  <line
                    x1={b.textX}
                    x2={ruleX2}
                    y1={b.y0 + ERA_RULE_Y + 0.5}
                    y2={b.y0 + ERA_RULE_Y + 0.5}
                    data-era-rule={b.id}
                    stroke={t.border}
                    strokeWidth={1.25}
                    strokeOpacity={0.75}
                  />
                </g>
              )}
              {b.labelText && (
                <text
                  x={b.textX}
                  y={b.y0 + ERA_LABEL_BASELINE}
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

              {/* THE BLURB — only on the selected chapter, and only ever as
                  many lines as the layout bought room for (buildEraBoxes wraps
                  to the same measure Main reserved against). Haloed in the
                  plaque's own tint, like the rest of the label: entry bands for
                  personnel arriving in the era's first year land on the rows
                  immediately below, and connectors cross this band. */}
              {focused &&
                b.blurbLines?.map((line, i) => (
                  <text
                    key={i}
                    x={b.textX}
                    y={b.y0 + ERA_BLURB_BASELINE + i * ERA_BLURB_LH}
                    data-era-blurb={b.id}
                    fontSize={ERA_BLURB_FS}
                    textAnchor="start"
                    fill="#1f2430"
                    stroke={t.header}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    style={{ letterSpacing: 0.1 }}
                  >
                    {line}
                  </text>
                ))}
            </g>
          );
        })}
      </g>
    );
  }

  return null;
});

export default EraLayer;
