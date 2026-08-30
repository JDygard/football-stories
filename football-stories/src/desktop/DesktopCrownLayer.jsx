// The crowns — gold SB, silver CONF, copper DIV — drawn in TWO PASSES for the
// same reason the era frame is (see DesktopEraLayer's note):
//
//   "wash"  — the gold tint inside the frame. Goes UNDER the year columns, the
//             win-rate curve, the rail and the ribbons, so it lifts the title
//             year's column without washing anything that crosses it.
//   "crown" — the frame's OUTLINE and the plaque. Goes over EVERYTHING, every
//             mark haloed in white. Personnel ribbons enter from above and drop
//             straight down through exactly this band on their way to the rail;
//             an outline painted under them breaks wherever a tenure crosses a
//             title year, and a plaque painted under them gets struck through.
//
// ALL THREE CAPS ARE THE SAME OBJECT: light metal, dark engraving, a darker
// border, the same corner radius, the same white halo, the same weight of type.
// Only the metal and the SIZE change — each tier is shorter and set smaller
// than the one above it, and they share a plaque BOTTOM edge so the step is
// visible along one line. Nothing here branches on tier except the paint and
// the numbers the tier itself carries.
//
// A NON-RISING tier (copper) draws NEITHER frame nor wash: its season keeps the
// frame its own playoff exit earned, and the cap is joined to the column by a
// short stem. That is a difference of MEANING, not of style — see the model.
//
// The crown is painted AFTER the era plaque pass, so where a title year sits on
// a chapter boundary the crown wins and the era border passes behind it. A
// chapter border is structure; this is the one moment the timeline is allowed to
// shout, and a 2.5px rule cutting the word in half would read as a bug.
//
// Geometry and merging live in desktopCrownModel.js so they can be simulated.

import { memo } from "react";
import { CROWN_H, CROWN_RISE } from "./desktopCrownModel.js";
import {
  MEDAL_SB, MEDAL_SB_DARK, MEDAL_SB_INK, MEDAL_SB_WASH,
  MEDAL_CONF, MEDAL_CONF_DARK, MEDAL_CONF_INK, MEDAL_CONF_WASH,
  MEDAL_DIV, MEDAL_DIV_DARK, MEDAL_DIV_INK, MEDAL_DIV_WASH,
} from "../palette.js";

const HALO = "#ffffff";

const TIER_PAINT = {
  sb: { fill: MEDAL_SB, dark: MEDAL_SB_DARK, ink: MEDAL_SB_INK, wash: MEDAL_SB_WASH },
  conf: { fill: MEDAL_CONF, dark: MEDAL_CONF_DARK, ink: MEDAL_CONF_INK, wash: MEDAL_CONF_WASH },
  div: { fill: MEDAL_DIV, dark: MEDAL_DIV_DARK, ink: MEDAL_DIV_INK, wash: MEDAL_DIV_WASH },
};
const paintFor = (c) => TIER_PAINT[c.tier] || TIER_PAINT.sb;

const DesktopCrownLayer = memo(function DesktopCrownLayer({
  crowns,
  laneTop,
  laneBottom,
  layer = "crown",
}) {
  if (!crowns?.length) return null;

  const frameTop = laneTop - CROWN_RISE;
  const frameH = Math.max(0, laneBottom - frameTop);
  // Every plaque hangs from the SAME BOTTOM edge — the one the tallest tier
  // would have — so caps of different heights line up along the lane instead of
  // floating at unrelated altitudes.
  const plaqueBottom = laneTop - CROWN_RISE - CROWN_H + 4 + CROWN_H; // 4px tuck
  const topOf = (c) => plaqueBottom - (c.h || CROWN_H);

  if (layer === "wash") {
    return (
      <g style={{ pointerEvents: "none" }}>
        {crowns.filter((c) => c.rises).map((c) => (
          <rect
            key={`cw-${c.key}`}
            x={c.frameX0}
            y={frameTop}
            width={Math.max(0, c.frameX1 - c.frameX0)}
            height={frameH}
            rx={3}
            fill={paintFor(c).wash}
          />
        ))}
      </g>
    );
  }

  return (
    <g style={{ pointerEvents: "none" }}>
      {crowns.map((c) => {
        const paint = paintFor(c);
        const w = Math.max(0, c.frameX1 - c.frameX0);
        const px = c.plaqueCx - c.plaqueW / 2;
        const h = c.h || CROWN_H;
        const plaqueTop = topOf(c);
        // A rising tier's frame reaches the plaque already. A cap-only tier
        // needs a stem to say which column it belongs to — and the same stem
        // covers the nudged case for every tier.
        const stem = c.nudged || !c.rises;
        return (
          <g key={`cr-${c.key}`}>
            {/* halo, then the mark — the pattern the year axis and the era
                plaque both use to survive an opaque ribbon crossing them */}
            {c.rises && (
              <>
                <rect
                  x={c.frameX0} y={frameTop} width={w} height={frameH} rx={3}
                  fill="none" stroke={HALO} strokeWidth={5}
                />
                <rect
                  x={c.frameX0} y={frameTop} width={w} height={frameH} rx={3}
                  fill="none" stroke={c.medal || paint.fill} strokeWidth={2.5}
                />
              </>
            )}

            {stem && (
              <>
                <line
                  x1={c.cx} x2={c.plaqueCx} y1={laneTop} y2={plaqueTop + h}
                  stroke={HALO} strokeWidth={4}
                />
                <line
                  x1={c.cx} x2={c.plaqueCx} y1={laneTop} y2={plaqueTop + h}
                  stroke={paint.dark} strokeWidth={1.25}
                />
              </>
            )}

            <rect
              x={px} y={plaqueTop} width={c.plaqueW} height={h} rx={4}
              fill={HALO} stroke={HALO} strokeWidth={4}
            />
            <rect
              x={px} y={plaqueTop} width={c.plaqueW} height={h} rx={4}
              fill={paint.fill} stroke={paint.dark} strokeWidth={1.5}
            />
            <text
              x={c.plaqueCx}
              y={plaqueTop + h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={c.fs}
              fontWeight={800}
              letterSpacing={0.4}
              fill={paint.ink}
            >
              {c.label}
            </text>
            <title>
              {c.count > 1
                ? `${c.sentence} ${c.count} seasons running · ${c.years[0]}–${c.years[c.years.length - 1]}`
                : `${c.sentence} · ${c.years[0]}`}
            </title>
          </g>
        );
      })}
    </g>
  );
});

export default DesktopCrownLayer;
