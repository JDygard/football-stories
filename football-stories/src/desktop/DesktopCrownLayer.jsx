// The Super Bowl crown, drawn in TWO PASSES for the same reason the era frame
// is (see DesktopEraLayer's note):
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
// The crown is painted AFTER the era plaque pass, so where a title year sits on
// a chapter boundary the crown wins and the era border passes behind it. A
// chapter border is structure; this is the one moment the timeline is allowed to
// shout, and a 2.5px rule cutting the word in half would read as a bug.
//
// Geometry and merging live in desktopCrownModel.js so they can be simulated.

import { memo } from "react";
import { CROWN_H, CROWN_RISE, CROWN_FS } from "./desktopCrownModel.js";
import { MEDAL_SB, MEDAL_SB_DARK, MEDAL_SB_INK, MEDAL_SB_WASH } from "../palette.js";

const HALO = "#ffffff";

const DesktopCrownLayer = memo(function DesktopCrownLayer({
  crowns,
  laneTop,
  laneBottom,
  layer = "crown",
}) {
  if (!crowns?.length) return null;

  const frameTop = laneTop - CROWN_RISE;
  const plaqueTop = laneTop - CROWN_RISE - CROWN_H + 4; // 4px tuck under the plaque
  const frameH = Math.max(0, laneBottom - frameTop);

  if (layer === "wash") {
    return (
      <g style={{ pointerEvents: "none" }}>
        {crowns.map((c) => (
          <rect
            key={`cw-${c.key}`}
            x={c.frameX0}
            y={frameTop}
            width={Math.max(0, c.frameX1 - c.frameX0)}
            height={frameH}
            rx={3}
            fill={MEDAL_SB_WASH}
          />
        ))}
      </g>
    );
  }

  return (
    <g style={{ pointerEvents: "none" }}>
      {crowns.map((c) => {
        const w = Math.max(0, c.frameX1 - c.frameX0);
        const px = c.plaqueCx - c.plaqueW / 2;
        return (
          <g key={`cr-${c.key}`}>
            {/* halo, then the mark — the pattern the year axis and the era
                plaque both use to survive an opaque ribbon crossing them */}
            <rect
              x={c.frameX0} y={frameTop} width={w} height={frameH} rx={3}
              fill="none" stroke={HALO} strokeWidth={5}
            />
            <rect
              x={c.frameX0} y={frameTop} width={w} height={frameH} rx={3}
              fill="none" stroke={MEDAL_SB} strokeWidth={2.5}
            />

            {/* When a plaque had to be pushed off its own frame to clear a
                neighbour, a stem keeps the attribution unambiguous. Normally
                zero-length and invisible. */}
            {c.nudged && (
              <>
                <line
                  x1={c.cx} x2={c.plaqueCx} y1={frameTop} y2={plaqueTop + CROWN_H}
                  stroke={HALO} strokeWidth={4}
                />
                <line
                  x1={c.cx} x2={c.plaqueCx} y1={frameTop} y2={plaqueTop + CROWN_H}
                  stroke={MEDAL_SB_DARK} strokeWidth={1.25}
                />
              </>
            )}

            <rect
              x={px} y={plaqueTop} width={c.plaqueW} height={CROWN_H} rx={4}
              fill={HALO} stroke={HALO} strokeWidth={4}
            />
            <rect
              x={px} y={plaqueTop} width={c.plaqueW} height={CROWN_H} rx={4}
              fill={MEDAL_SB} stroke={MEDAL_SB_DARK} strokeWidth={1.5}
            />
            <text
              x={c.plaqueCx}
              y={plaqueTop + CROWN_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CROWN_FS}
              fontWeight={800}
              letterSpacing={0.4}
              fill={MEDAL_SB_INK}
            >
              {c.label}
            </text>
            <title>
              {c.count > 1
                ? `Won the Super Bowl ${c.count} seasons running · ${c.years[0]}–${c.years[c.years.length - 1]}`
                : `Won the Super Bowl · ${c.years[0]}`}
            </title>
          </g>
        );
      })}
    </g>
  );
});

export default DesktopCrownLayer;
