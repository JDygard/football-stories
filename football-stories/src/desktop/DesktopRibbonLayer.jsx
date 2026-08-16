// Renders desktop personnel tenure ribbons as single opaque paths whose black
// border follows every bend: entry connector (dropping in FROM THE TOP pill
// zone at the hire year) -> across the timeline lane into the horizontal
// tenure band riding the BOTTOM RAIL -> exit connector LEAVING DOWNWARD
// through the rail's peek to the exit pill zone. Geometry from
// desktopRibbonModel; this layer lives inside the scrolled <g>, so everything
// is content coordinates.
//
// The band carries the person's name/title/years; because the rail is always
// on-screen, the label simply clamps to the viewport's left edge while any of
// the tenure is in view (no pinned-stack machinery — see the model's header).
//
// Career-follow pills are ALWAYS visible (no drag reveal — landscape has the
// room): entry pills in the margin above the lane ("From"), exit pills below
// the rail ("To"). Row assignment comes precomputed in pillPlan (greedy
// packing; a pill that fit nowhere is hidden but its connector still shows).
// Same neutral, uniform treatments as mobile (no team colors/marks — IP):
//   - DESTINATION: dark pill, the ribbon continues past it and fades out;
//     tappable -> follow the career.
//   - TERMINAL ("Retired" / "Left NFL" / "Drafted"): light pill, the ribbon
//     terminates behind it, not tappable.
//
// Tapping a ribbon opens its info card (onSelect), guarded by tapGuard so the
// click that trails a drag is ignored.

import { CONN_W, PEEK, PILL_H, LABEL_MIN_BAND_H } from "./desktopRibbonModel.js";
import { onColor } from "../palette.js";

const PX_PER_CHAR = 5.8; // rough advance for fontSize 10
const FADE_LEN = 26; // how far a destination ribbon bleeds past its pill

// Neutral, uniform label palette (no team colors).
const DEST_BG = "#2e333a";
const DEST_FG = "#ffffff";
const TERM_BG = "#c3c8ce";
const TERM_FG = "#2a2d31";

// A career-follow pill, centered on its connector column.
//
// `dir` is which way along the career this pill points: +1 for an EXIT pill
// (where they went next) and -1 for an ENTRY pill (where they came from). It
// rides along to onFollow so the shell can sweep the timeline to match the
// pill's own position — an exit pill sits BELOW the rail, so its team is
// "down there" and the view travels down to reach it; an entry pill sits above
// the lane, so its team is up. See .desktop-sweep-* in desktop.css.
function FollowTag({ x, y, pill, person, conf, dir, onFollow, tapGuard }) {
  const info = pill.info;
  const dest = info.kind === "dest";
  const navigable = dest && !!info.fid && conf !== "approx" && conf !== "low";
  const onClick = navigable
    ? (e) => {
        e.stopPropagation();
        if (tapGuard && tapGuard()) return;
        onFollow?.(info.fid, info.year, person, dir);
      }
    : undefined;
  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={onClick}
      style={navigable ? { cursor: "pointer" } : { pointerEvents: "none" }}
    >
      <rect x={-pill.w / 2} y={-PILL_H / 2} width={pill.w} height={PILL_H} rx={PILL_H / 2} fill={dest ? DEST_BG : TERM_BG} />
      <text
        x={0} y={0.5} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight={700}
        fill={dest ? DEST_FG : TERM_FG} style={{ userSelect: "none" }}
      >
        {info.text}
      </text>
    </g>
  );
}

// One continuous polygon per ribbon: entry connector down from topY, band
// across the rail, exit connector down to botY. topY/botY stop behind the
// pill for labeled ribbons, at a bare stub otherwise.
function ribbonPath({ x0, bandY, bandH, exitX, tailEnd, topY, botY, hasExit }) {
  const cb = bandY + bandH;
  if (hasExit && x0 < exitX) {
    return [
      `M ${x0} ${topY}`, `H ${x0 + CONN_W}`, `V ${bandY}`, `H ${tailEnd}`,
      `V ${botY}`, `H ${exitX}`, `V ${cb}`, `H ${x0}`, "Z",
    ].join(" ");
  }
  if (hasExit) {
    return `M ${x0} ${topY} H ${x0 + CONN_W} V ${botY} H ${x0} Z`;
  }
  return [
    `M ${x0} ${topY}`, `H ${x0 + CONN_W}`, `V ${bandY}`, `H ${tailEnd}`,
    `V ${cb}`, `H ${x0}`, "Z",
  ].join(" ");
}

function bandLabel(r, title, maxChars) {
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

export default function DesktopRibbonLayer({
  ribbons = [],
  pillPlan,
  width = 0,
  scrollX = 0,
  laneTop = 0,
  railTop = 0,
  slotCount = 0,
  bandH = 16,
  dropped = 0,
  entryPillY, // (row) => center y of an entry pill row (above the lane)
  exitPillY, // (row) => center y of an exit pill row (below the rail)
  adminById,
  onSelect,
  onFollow,
  tapGuard,
}) {
  if (!ribbons.length || !width) return null;

  const railBottom = railTop + slotCount * bandH;
  // The rail caps concurrent ribbons so every band can still hold its name.
  // Say what was left out: a cap that silently swallows the track you just
  // added is indistinguishable from a bug.
  const overflowNote = dropped > 0 ? `+${dropped} more overlapping — not shown` : null;
  // Slot 0 sits BOTTOM-most (longest tenures hug the outer edge, the desktop
  // counterpart of mobile's rightmost tail slot).
  const bandYOf = (slot) => railTop + (slotCount - 1 - (slot ?? 0)) * bandH;

  // Virtualize on the tenure's x-range (connectors live inside it).
  const viewL = scrollX - 60;
  const viewR = scrollX + width + 60;
  const items = ribbons
    .filter((r) => r.tailEnd > viewL && r.x0 < viewR)
    // Paint lower slots (bottom rows, longest tenures) LAST so the rail reads
    // as clean unbroken rows and connectors dive behind the rows they cross.
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

  return (
    <g>
      <defs>
        {/* reusable alpha masks: fade a colored rect to transparent toward the
            top/bottom. Used so destination ribbons dissolve past their pill. */}
        <linearGradient id="ribFadeUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="ribFadeDown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id="ribMaskUp" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#ribFadeUp)" />
        </mask>
        <mask id="ribMaskDown" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#ribFadeDown)" />
        </mask>
      </defs>
      {items.map((r) => {
        const bandY = bandYOf(r.slot);
        const title = adminById?.get?.(r.id)?.title;

        const enP = pillPlan?.entryByKey?.get(r.key) || null;
        const exP = pillPlan?.exitByKey?.get(r.key) || null;
        const enShown = enP && enP.row >= 0;
        const exShown = exP && exP.row >= 0;

        // Entry (top) extent: behind its pill when one is placed, else a
        // short stub above the lane. Exit (bottom): behind its pill, else the
        // leaving stub through the rail's peek.
        const topY = enShown ? entryPillY(enP.row) : laneTop - 6;
        const botY = exShown ? exitPillY(exP.row) : railBottom + PEEK;

        const d = ribbonPath({
          x0: r.x0, bandY, bandH, exitX: r.exitX, tailEnd: r.tailEnd,
          topY, botY, hasExit: r.hasExit,
        });

        const handleClick =
          typeof onSelect === "function"
            ? (e) => {
                e.stopPropagation();
                if (tapGuard && tapGuard()) return;
                onSelect(r);
              }
            : undefined;

        // Identity handed to onFollow so the destination team can re-select
        // and scroll to this same person.
        const person = { id: r.id, kind: r.kind, role: r.role, name: r.name, position: r.position };

        // Band label, clamped to the viewport's left edge while in view.
        const labelX = Math.max(r.x0, scrollX) + 6;
        const labelEnd = (r.hasExit && r.x0 < r.exitX ? r.exitX : r.tailEnd) - 4;
        const maxChars = Math.floor((Math.min(labelEnd, scrollX + width - 8) - labelX) / PX_PER_CHAR);

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
            {enShown && enP.info.kind === "dest" && (
              <rect
                x={r.x0} y={topY - FADE_LEN} width={CONN_W} height={FADE_LEN}
                fill={r.color} mask="url(#ribMaskUp)" style={{ pointerEvents: "none" }}
              />
            )}
            {exShown && exP.info.kind === "dest" && (
              <rect
                x={r.exitX} y={botY} width={CONN_W} height={FADE_LEN}
                fill={r.color} mask="url(#ribMaskDown)" style={{ pointerEvents: "none" }}
              />
            )}

            {/* The floor the model squishes to IS this gate — importing it
                keeps the two from drifting apart again (they did: a 6px
                squish floor against an 11px gate silently blanked every
                label on the rail past 8 concurrent ribbons). */}
            {bandH >= LABEL_MIN_BAND_H && maxChars > 3 && (
              <text
                x={labelX}
                y={bandY + bandH / 2 + 0.5}
                fontSize={10}
                fontWeight={600}
                dominantBaseline="middle"
                // Follows the ribbon color instead of being hardcoded white —
                // see the same note in the mobile StaffRibbonLayer.
                fill={onColor(r.color)}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {bandLabel(r, title, maxChars)}
              </text>
            )}

            {enShown && (
              <FollowTag
                x={enP.x} y={topY} dir={-1}
                pill={enP} person={person} conf={r.conf} onFollow={onFollow} tapGuard={tapGuard}
              />
            )}
            {exShown && (
              <FollowTag
                x={exP.x} y={botY} dir={1}
                pill={exP} person={person} conf={r.conf} onFollow={onFollow} tapGuard={tapGuard}
              />
            )}
          </g>
        );
      })}

      {/* Overflow notice. Pinned to the viewport's left edge (scrollX) rather
          than to content, so it stays put while the timeline scrolls — it is a
          statement about the rail, not about any year. */}
      {overflowNote && (
        <g style={{ pointerEvents: "none" }}>
          <rect
            x={scrollX + 8}
            y={railBottom + 3}
            width={overflowNote.length * 6.0 + 18}
            height={14}
            rx={3}
            fill="#3a3f47"
            opacity={0.86}
          />
          <text
            x={scrollX + 14}
            y={railBottom + 13}
            fontSize={9.5}
            fontWeight={600}
            fill="#fff"
          >
            {overflowNote}
          </text>
        </g>
      )}
    </g>
  );
}
