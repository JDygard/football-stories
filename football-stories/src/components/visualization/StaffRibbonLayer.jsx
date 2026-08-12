// Renders personnel tenure ribbons as single opaque paths whose black border
// follows every bend: entry band (from the far left screen edge) -> vertical
// tail in the right gutter -> exit band trailing off the right edge at the
// end of the tenure. Geometry from staffRibbonModel; this layer lives inside
// the scrolled <g>, so everything is content coordinates.
//
// Tapping a ribbon opens its staff info card (onSelect), guarded by tapGuard
// so the click that trails a pan is ignored.
//
// Career-follow labels live in the horizontal reveal zone (the canvas is
// dragged sideways, see Main). They are deliberately UNIFORM and NEUTRAL — no
// team colors/marks — to avoid any IP concerns. Two neutral treatments:
//   - DESTINATION ("Team →" / "← Team"): the ribbon continues past the pill and
//     fades out (the career goes on elsewhere). Tappable -> follow the career.
//   - TERMINAL ("Retired" / "Left NFL" / "Drafted"): the timeline ends here, so
//     the ribbon terminates behind the pill. A lighter neutral, not tappable.

import { STRIP_H, PEEK } from "./staffRibbonModel.js";
import { teamName } from "./teamMeta.js";

const PX_PER_CHAR = 5.8; // rough advance for fontSize 10
// How far the gutter must be dragged open before compressed tails have grown
// all the way back to full STRIP_H width (better tap targets).
const EXPAND_FULL_AT = 40;
// Destination ribbons bleed this far past the screen edge so the fade has room;
// must exceed the max horizontal drag in the viewport hook.
const OVERHANG = 220;
// How far the canvas must be dragged before career-follow labels appear.
const LABEL_SHOW_AT = 22;
const PILL_GAP = 8; // pill offset from the screen edge

// Neutral, uniform label palette (no team colors).
const DEST_BG = "#2e333a"; // destination pill — dark neutral, tappable
const DEST_FG = "#ffffff";
const TERM_BG = "#c3c8ce"; // terminal pill — light neutral, informational
const TERM_FG = "#2a2d31";

const pillW = (text) => Math.round(text.length * 6.6) + 18;

// Classify the right (exit) boundary into a label. Only meaningful when the
// ribbon actually has an exit band reaching the edge.
function exitLabel(r) {
  if (!r.hasExit) return null;
  if (r.exit === "to_team" && r.nextTeam)
    return { text: `${teamName(r.nextTeam)} →`, fid: r.nextTeam, year: (r.to || 0) + 1, kind: "dest" };
  if (r.exit === "retired") return { text: "Retired", kind: "term" };
  if (r.exit === "left_league") return { text: "Left NFL", kind: "term" };
  return null; // active / unknown -> no claim
}
function entryLabel(r) {
  // Arrow points in the direction the career is HEADED (rightward, onto this
  // team), not back at the team they came from.
  if (r.entry === "from_team" && r.prevTeam)
    return { text: `${teamName(r.prevTeam)} →`, fid: r.prevTeam, year: Math.max(0, (r.from || 0) - 1), kind: "dest" };
  if (r.entry === "drafted") return { text: "Drafted", kind: "term" };
  return null; // undrafted / origin -> no claim
}

// A reveal-zone label: a dark neutral tappable pill for a destination, or a
// light neutral informational pill for a terminal outcome.
function FollowTag({ x, y, anchor, info, person, conf, onFollow, tapGuard }) {
  if (!info) return null;
  const dest = info.kind === "dest";
  const navigable = dest && !!info.fid && conf !== "approx" && conf !== "low";
  const w = pillW(info.text);
  const rx = anchor === "end" ? -w : 0;
  const onClick = navigable
    ? (e) => {
        e.stopPropagation();
        if (tapGuard && tapGuard()) return;
        // Hand the followed person to the destination so it lands with them
        // selected and scrolled into view.
        onFollow?.(info.fid, info.year, person);
      }
    : undefined;
  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={onClick}
      style={navigable ? { cursor: "pointer" } : { pointerEvents: "none" }}
    >
      <rect x={rx} y={-9} width={w} height={18} rx={9} fill={dest ? DEST_BG : TERM_BG} />
      <text
        x={anchor === "end" ? -9 : 9} y={0.5} textAnchor={anchor}
        dominantBaseline="middle" fontSize={11} fontWeight={700}
        fill={dest ? DEST_FG : TERM_FG} style={{ userSelect: "none" }}
      >
        {info.text}
      </text>
    </g>
  );
}

// One continuous polygon per ribbon. leftX / rightX are where the entry and
// exit bands stop: at the screen edge for ribbons that end here, behind a pill
// for terminal/destination ones (the fade past a destination pill is drawn
// separately).
function ribbonPath({ stripY, tailX, tailW, exitY, tailEnd, leftX, rightX, hasExit, h }) {
  const tr = tailX + tailW;
  if (hasExit && stripY < exitY) {
    return [
      `M ${leftX} ${stripY}`, `H ${tr}`, `V ${exitY}`, `H ${rightX}`, `V ${exitY + h}`,
      `H ${tailX}`, `V ${stripY + h}`, `H ${leftX}`, "Z",
    ].join(" ");
  }
  if (hasExit) {
    return `M ${leftX} ${stripY} H ${rightX} V ${stripY + h} H ${leftX} Z`;
  }
  return [
    `M ${leftX} ${stripY}`, `H ${tr}`, `V ${tailEnd}`, `H ${tailX}`,
    `V ${stripY + h}`, `H ${leftX}`, "Z",
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

// `strips` comes from resolveRibbonStrips, resolved by TeamTimelineLayer — it
// needs the stack height for its own content transform, so the layer owns the
// call and hands the placement down rather than both computing it.
export default function StaffRibbonLayer({
  ribbons = [],
  strips,
  width = 0,
  slotCount = 0,
  tailWidth = STRIP_H,
  railPan = 0,
  viewBottom = Infinity,
  adminById,
  onSelect,
  onFollow,
  tapGuard,
}) {
  if (!ribbons.length || !width || !strips) return null;

  const expandT = Math.min(1, Math.abs(railPan) / EXPAND_FULL_AT);
  const tailW = tailWidth + (STRIP_H - tailWidth) * expandT;
  const railWidth = slotCount * tailW;
  const railLeft = width - railWidth - PEEK;

  // Drag direction decides which career-follow labels are revealed: pulling the
  // canvas left exposes the right edge (where careers exit -> "To"), pulling it
  // right exposes the left edge (where they entered -> "From").
  const showRight = railPan < -LABEL_SHOW_AT;
  const showLeft = railPan > LABEL_SHOW_AT;

  const RANK = { anchored: 0, departing: 1, pinned: 2 };
  const items = ribbons
    .map((r) => ({ r, s: strips.get(r.key) }))
    .filter(({ s }) => s && s.y <= viewBottom)
    .sort((a, b) => RANK[a.s.mode] - RANK[b.s.mode]);

  return (
    <g>
      <defs>
        {/* reusable alpha masks: fade a colored rect to transparent toward one
            side. Used so destination ribbons dissolve past their pill. */}
        <linearGradient id="ribFadeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id="ribFadeL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask id="ribMaskR" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#ribFadeR)" />
        </mask>
        <mask id="ribMaskL" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#ribFadeL)" />
        </mask>
      </defs>
      {items.map(({ r, s }) => {
        const stripY = s.y;
        const tailX = railLeft + railWidth - ((r.slot ?? 0) + 1) * tailW;
        const title = adminById?.get?.(r.id)?.title;
        const maxChars = Math.floor((tailX + tailW - 14) / PX_PER_CHAR);

        // Right (exit) extent: destination & terminal ribbons run behind their
        // pill; everything else stops at the screen edge (no off-screen trail).
        const exI = exitLabel(r);
        const capRightX = exI ? width + PILL_GAP + pillW(exI.text) : width;
        const rightX = exI ? capRightX : width;

        // Left (entry) extent, mirror image.
        const enI = entryLabel(r);
        const capLeftX = enI ? -PILL_GAP - pillW(enI.text) : 0;
        const leftX = enI ? capLeftX : 0;

        const d = ribbonPath({
          stripY, tailX, tailW, exitY: r.exitY, tailEnd: r.tailEnd,
          leftX, rightX, hasExit: r.hasExit, h: STRIP_H,
        });

        const handleClick =
          typeof onSelect === "function"
            ? (e) => {
                e.stopPropagation();
                if (tapGuard && tapGuard()) return;
                onSelect(r);
              }
            : undefined;

        const exitRowY = (r.hasExit ? r.exitY : r.tailEnd - STRIP_H);
        // Identity handed to onFollow so the destination team can re-select and
        // scroll to this same person.
        const person = { id: r.id, kind: r.kind, role: r.role, name: r.name, position: r.position };

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

            {/* destination fade: the ribbon dissolves past the pill */}
            {showRight && exI && exI.kind === "dest" && (
              <rect
                x={capRightX} y={exitRowY} width={width + OVERHANG - capRightX}
                height={STRIP_H} fill={r.color} mask="url(#ribMaskR)"
              />
            )}
            {showLeft && enI && enI.kind === "dest" && (
              <rect
                x={-OVERHANG} y={stripY} width={capLeftX + OVERHANG}
                height={STRIP_H} fill={r.color} mask="url(#ribMaskL)"
              />
            )}

            <text
              x={6}
              y={stripY + STRIP_H / 2 + 0.5}
              fontSize={10.5}
              fontWeight={700}
              dominantBaseline="middle"
              fill="#fff"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {stripLabel(r, title, maxChars)}
            </text>

            {showRight && exI && (
              <FollowTag
                x={width + PILL_GAP} y={exitRowY + STRIP_H / 2} anchor="start"
                info={exI} person={person} conf={r.conf} onFollow={onFollow} tapGuard={tapGuard}
              />
            )}
            {showLeft && enI && (
              <FollowTag
                x={-PILL_GAP} y={stripY + STRIP_H / 2} anchor="end"
                info={enI} person={person} conf={r.conf} onFollow={onFollow} tapGuard={tapGuard}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
