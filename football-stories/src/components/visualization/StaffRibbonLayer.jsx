// Renders personnel tenure ribbons as single opaque paths whose black border
// follows every bend: entry band (from the far left screen edge) -> vertical
// tail in the right gutter -> exit band trailing off the right edge at the
// end of the tenure. Geometry from staffRibbonModel; this layer lives inside
// the scrolled <g>, so everything is content coordinates.
//
// Tapping a ribbon opens its staff info card (onSelect), guarded by tapGuard
// so the click that trails a pan is ignored.

import { STRIP_H, resolveRibbonStrips } from "./staffRibbonModel.js";

const PX_PER_CHAR = 5.8; // rough advance for fontSize 10

// One continuous polygon per ribbon. Shapes:
//   entry+tail+exit : Z-shape (bends at the tail top-right and bottom-left)
//   entry+tail      : L-shape (tenure too short for an exit bend)
//   slid onto exit  : single full-width band (pinned band riding off with
//                     the end of the tenure)
function ribbonPath({ stripY, tailX, tailW, exitY, tailEnd, width, hasExit, h }) {
  const tr = tailX + tailW;
  if (hasExit && stripY < exitY) {
    return [
      `M 0 ${stripY}`,
      `H ${tr}`,
      `V ${exitY}`,
      `H ${width}`,
      `V ${exitY + h}`,
      `H ${tailX}`,
      `V ${stripY + h}`,
      `H 0`,
      "Z",
    ].join(" ");
  }
  if (hasExit) {
    return `M 0 ${stripY} H ${width} V ${stripY + h} H 0 Z`;
  }
  return [
    `M 0 ${stripY}`,
    `H ${tr}`,
    `V ${tailEnd}`,
    `H ${tailX}`,
    `V ${stripY + h}`,
    `H 0`,
    "Z",
  ].join(" ");
}

function stripLabel(r, title, maxChars) {
  const approx = r.approx ? "~" : "";
  const roleLabel =
    r.kind === "player"
      ? String(r.position || r.role).toUpperCase()
      : String(r.role).toUpperCase();
  const full = title
    ? `${r.name} · ${title} · ${r.from}–${r.to}${approx}`
    : `${r.name} · ${roleLabel} · ${r.from}–${r.to}${approx}`;
  if (full.length <= maxChars) return full;
  const short = `${r.name} · ${r.from}–${r.to}`;
  if (short.length <= maxChars) return short;
  return short.slice(0, Math.max(1, maxChars - 1)) + "…";
}

export default function StaffRibbonLayer({
  ribbons = [],
  railLeft = 0,
  width = 0,
  scrollY = 0,
  viewBottom = Infinity,
  adminById,
  onSelect,
  tapGuard,
}) {
  if (!ribbons.length || !width) return null;

  const strips = resolveRibbonStrips({ ribbons, scrollY });

  // Paint order: anchored (in the timeline) under departing (sliding off)
  // under pinned (the solid stack) — a band still on the timeline can never
  // appear in front of the pinned stack.
  const RANK = { anchored: 0, departing: 1, pinned: 2 };
  const items = ribbons
    .map((r) => ({ r, s: strips.get(r.key) }))
    .filter(({ s }) => s && s.y <= viewBottom)
    .sort((a, b) => RANK[a.s.mode] - RANK[b.s.mode]);

  return (
    <g>
      {items.map(({ r, s }) => {
        const stripY = s.y;

        const tailX = railLeft + r.x;
        const title = adminById?.get?.(r.id)?.title;
        const maxChars = Math.floor((tailX + r.width - 14) / PX_PER_CHAR);
        const d = ribbonPath({
          stripY,
          tailX,
          tailW: r.width,
          exitY: r.exitY,
          tailEnd: r.tailEnd,
          width,
          hasExit: r.hasExit,
          h: STRIP_H,
        });

        const handleClick =
          typeof onSelect === "function"
            ? (e) => {
                e.stopPropagation();
                if (tapGuard && tapGuard()) return;
                onSelect(r);
              }
            : undefined;

        return (
          <g key={r.key}>
            <path
              d={d}
              fill={r.color}
              stroke="#111"
              strokeWidth={1}
              strokeDasharray={r.approx ? "4 3" : undefined}
              strokeLinejoin="miter"
              onClick={handleClick}
              style={handleClick ? { cursor: "pointer" } : undefined}
            >
              <title>
                {title
                  ? `${r.name} · ${title} · ${r.from}–${r.to}`
                  : `${r.name} · ${r.from}–${r.to}`}
              </title>
            </path>
            <text
              x={6}
              y={stripY + STRIP_H / 2 + 0.5}
              fontSize={10}
              fontWeight={600}
              dominantBaseline="middle"
              fill="#fff"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {stripLabel(r, title, maxChars)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
