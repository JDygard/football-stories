// Pure model for personnel tenure ribbons in the content-stacked scroll model.
//
// A ribbon is one continuous opaque shape with a black border that follows
// its bends:
//   - ENTRY BAND: horizontal, originates at the far LEFT edge of the screen
//     (x=0 — later a navigation affordance into other phases of the person's
//     career), runs across the timeline at the year they entered service,
//     and bends into the tail. Carries the person's info. Pins to the
//     viewport top when its anchor scrolls off-screen mid-tenure.
//   - TAIL: vertical band in the right gutter spanning the tenure. Tails are
//     exactly STRIP_H wide and pack adjacent (global slot allocation with
//     slot reuse — no per-role lanes, no gaps) to minimize horizontal
//     real estate.
//   - EXIT BAND: horizontal, at the end of the tenure, trailing off the
//     RIGHT edge of the viewport (later: follow the career elsewhere).
//     Exit bands sharing a row are staggered (the tail extends to reach the
//     pushed-down row), and whole groups shift down off entry rows, so no
//     two bands ever superimpose.
//
// The timeline layout reserves vertical space for entry bands (see
// stripReserveByYear + buildTimelineLayout's reserveByYear), so anchored
// bands occupy real layout space instead of overlaying content.
//
// Kept JSX-free so it can be unit-tested in node (vite build can't run in
// the sandbox). The presentational side lives in StaffRibbonLayer.jsx.

import { allocateTailSlots } from "./allocateTailSlots.js";

// Personnel colors live in ../../palette.js — one table shared with the desktop
// tree, and the place the "no red, no green outside results" rule is enforced.
// Re-exported here so the many existing `from "./staffRibbonModel.js"` imports
// keep working.
import { roleColor } from "../../palette.js";
export { ROLE_COLORS, roleColor } from "../../palette.js";

// Position string -> ribbon role/color group for player spans.
const POSITION_GROUPS = {
  QB: "qb",
  RB: "rb", FB: "rb", HB: "rb",
  WR: "wr",
  TE: "te",
  C: "ol", G: "ol", T: "ol", OG: "ol", OT: "ol", OL: "ol",
  DE: "dl", DT: "dl", NT: "dl", DL: "dl",
  LB: "lb", OLB: "lb", ILB: "lb", MLB: "lb", EDGE: "lb",
  CB: "db", S: "db", FS: "db", SS: "db", DB: "db",
  K: "st", P: "st", LS: "st",
};

export function positionGroup(position) {
  return POSITION_GROUPS[String(position || "").toUpperCase()] || "unknown";
}

export const STRIP_H = 16; // band thickness (horizontal AND vertical)
export const STRIP_GAP = 0; // stacked bands sit flush; borders delineate
// Vertical-tail squish. Tails stay full STRIP_H wide through SQUISH_FULL_SLOTS
// concurrent ribbons; beyond that they taper (capped just under full width so
// the squish is visible from the very next ribbon) so the whole gutter stays
// under ~6 full ribbons (SQUISH_BUDGET) and barely dents the draft columns.
// Past MAX_TAIL_SLOTS the gutter is too crowded, so we stop adding columns and
// drop the most-overlapping ribbons.
export const MIN_TAIL_W = 6;
const SQUISH_FULL_SLOTS = 4;
const SQUISH_BUDGET = 6 * STRIP_H; // 96px ≈ width of 6 unadjusted ribbons
const MAX_TAIL_SLOTS = Math.floor(SQUISH_BUDGET / MIN_TAIL_W); // 16
// Resting inset of the tail gutter from the right screen edge: a 3px sliver
// that exposes the "leaving" stub of exit bands (they still run to the true
// edge) and seeds the drag-to-follow-a-career affordance.
export const PEEK = 3;

const entryOrder = (a, b) =>
  String(a.name).localeCompare(String(b.name)) ||
  String(a.key || "").localeCompare(String(b.key || ""));

// Vertical space the layout must reserve at the top of each year's offseason
// block for entry bands anchored there. Plain object { year: px }.
export function stripReserveByYear(staff, stripHeight = STRIP_H, gap = STRIP_GAP) {
  const out = {};
  for (const s of staff || []) {
    if (s.from == null || s.to == null) continue;
    out[s.from] = (out[s.from] || 0) + stripHeight + gap;
  }
  return out;
}

// Tallest the pinned stack can ever get, in px: the most people in post at
// once. The timeline is pushed down by the LIVE stack height (see
// resolveRibbonStrips), so the scroll range needs this much extra slack at the
// bottom or the final rows become unreachable.
export function maxStackHeight(staff, stripHeight = STRIP_H, gap = STRIP_GAP) {
  const edges = [];
  for (const s of staff || []) {
    if (s.from == null || s.to == null) continue;
    edges.push([s.from, 1], [s.to + 1, -1]);
  }
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let max = 0;
  for (const [, d] of edges) {
    cur += d;
    if (cur > max) max = cur;
  }
  return max * (stripHeight + gap);
}

// staff: collapsed spans from the team segment:
//   { admin_person_id, name, role, franchise_id, from, to }
// layout: result of buildTimelineLayout, built WITH the matching
//   reserveByYear so entry bands have reserved room.
//
// Returns { ribbons, railWidth }.
//   ribbon: { key, id, name, role, color, from, to, y0, y1, x, width,
//             hasExit, exitY, tailEnd }
//   y0 = anchored entry-band top (inside the reserved area, stacked for
//   same-year entries). y1 = end of last season (data end). exitY = top of
//   the exit band after staggering. tailEnd = visual bottom of the tail
//   (exitY + STRIP_H when exiting, else y1). x = tail offset from the rail's
//   left edge; width = STRIP_H.
export function buildStaffRibbons({
  staff,
  layout,
  stripHeight = STRIP_H,
  gap = STRIP_GAP,
} = {}) {
  if (!staff?.length || !layout?.blocks?.length) {
    return { ribbons: [], railWidth: 0, slotCount: 0, tailW: STRIP_H };
  }

  const first = layout.blocks[0];
  const last = layout.blocks[layout.blocks.length - 1];

  // ---- group by entry year so same-year bands stack in reserved space ----
  const byFrom = new Map();
  const spans = [];
  for (const s of staff) {
    if (s.from == null || s.to == null) continue;
    if (s.to < layout.firstYear || s.from > layout.lastYear) continue;
    const span = {
      key: `${s.admin_person_id}:${s.role}:${s.from}`,
      id: s.admin_person_id,
      name: s.name,
      role: s.role,
      color: roleColor(s.role),
      from: s.from,
      to: s.to,
      kind: s.kind || "staff",
      approx: !!s.approx,
      position: s.position || null,
      // Career-follow links (To/From <team>), computed in the pipeline.
      prevTeam: s.prev_team || null,
      nextTeam: s.next_team || null,
      entry: s.entry || null,
      exit: s.exit || null,
      conf: s.conf || null,
    };
    spans.push(span);
    if (!byFrom.has(s.from)) byFrom.set(s.from, []);
    byFrom.get(s.from).push(span);
  }

  for (const group of byFrom.values()) group.sort(entryOrder);

  const ribbons = [];
  for (const r of spans) {
    const fromB = layout.byYear.get(r.from);
    const toB = layout.byYear.get(r.to);

    const idx = byFrom.get(r.from).indexOf(r);
    // Anchor entry bands below the offseason's year-marker header (ribbonTop),
    // so the year sits above the incoming-ribbons area.
    let y0 = fromB
      ? fromB.offseason.ribbonTop ?? fromB.offseason.y0
      : layout.tToY(r.from);
    y0 += idx * (stripHeight + gap);
    let y1 = toB ? toB.season.y1 : layout.tToY(r.to + 1);

    y0 = Math.max(first.y0, Math.min(y0, last.y1 - stripHeight));
    y1 = Math.max(first.y0, Math.min(y1, last.y1));
    if (y1 <= y0) continue;

    // Exit band fits when the tenure is tall enough to bend twice.
    const hasExit = y1 - y0 >= 2 * stripHeight;
    ribbons.push({
      ...r,
      y0,
      y1,
      hasExit,
      exitY: y1 - stripHeight,
      tailEnd: y1,
    });
  }

  // ---- exit staggering ----
  // Exits sharing a base row fan out UPWARD (latest entrant stays lowest, on
  // the true end-of-tenure row), the tail stopping short to reach its row.
  // Then each group shifts up in STRIP_H steps until no exit sits on an
  // entry-band row.
  //
  // Upward, not downward: a downward fan pushes tailEnd PAST the end of the
  // tenure's last season and into the following year — where the next hire's
  // entry band anchors. The tail-slot allocator then sees the departed person
  // as still occupying a column when the successor starts, so the successor
  // gets pushed to a fresh column and the rail grows empty gaps between
  // ribbons. That is invisible at the game-row bands (the year's header band
  // absorbs the overhang) but glaring at zoom 3, where a season page is a
  // whole viewport tall and entry bands anchor exactly at the page boundary.
  // Fanning up keeps every tail inside its own tenure, so slots are released
  // the moment the tenure ends.
  const entryRows = new Set(ribbons.map((r) => r.y0));
  const exitGroups = new Map();
  for (const r of ribbons) {
    if (!r.hasExit) continue;
    if (!exitGroups.has(r.exitY)) exitGroups.set(r.exitY, []);
    exitGroups.get(r.exitY).push(r);
  }
  for (const group of exitGroups.values()) {
    group.sort((a, b) => a.y0 - b.y0);
    group.forEach((r, i) => {
      r.exitY -= (group.length - 1 - i) * stripHeight;
    });
    let extra = 0;
    while (group.some((r) => entryRows.has(r.exitY - extra))) {
      extra += stripHeight;
    }
    for (const r of group) {
      // Never ride up onto (or above) the ribbon's own entry band: the path
      // needs stripY < exitY to draw the tail between the two bends.
      r.exitY = Math.max(r.y0 + stripHeight, r.exitY - extra);
      r.tailEnd = r.exitY + stripHeight;
    }
  }

  // ---- global tail slots: adjacent columns, slots reused ----
  const slotMap = allocateTailSlots(
    ribbons.map((r) => ({ id: r.key, startY: r.y0, endY: r.tailEnd })),
  );
  const slotCount = ribbons.length
    ? Math.max(...slotMap.values()) + 1
    : 0;

  // Too crowded: past MAX_TAIL_SLOTS columns the squished gutter can't fit any
  // more usefully, so drop the highest-slot (most-overlapping) ribbons.
  let shown = ribbons;
  let slots = slotCount;
  if (slotCount > MAX_TAIL_SLOTS) {
    shown = ribbons.filter((r) => (slotMap.get(r.key) ?? 0) < MAX_TAIL_SLOTS);
    slots = MAX_TAIL_SLOTS;
  }

  // Progressive width: full STRIP_H through SQUISH_FULL_SLOTS ribbons; beyond
  // that, squeeze toward MIN_TAIL_W so the gutter stays under SQUISH_BUDGET.
  // Capping the squished width at STRIP_H-1 makes the taper visible from the
  // very first squished ribbon (the 5th).
  let tailW = stripHeight;
  if (slots > SQUISH_FULL_SLOTS) {
    tailW = Math.max(
      MIN_TAIL_W,
      Math.min(stripHeight - 1, Math.floor(SQUISH_BUDGET / slots)),
    );
  }
  const railWidth = slots * tailW;

  // Slot 0 sits rightmost (longest-running ribbons hug the screen edge). Keep
  // the slot index on each ribbon so the render layer can re-derive positions
  // at a different tail width (e.g. expanded to full width on drag).
  for (const r of shown) {
    const slot = slotMap.get(r.key) ?? 0;
    r.slot = slot;
    r.x = railWidth - (slot + 1) * tailW;
    r.width = tailW;
  }

  return { ribbons: shown, railWidth, slotCount: slots, tailW };
}

// Scroll-dependent entry-band placement. Returns
//   { strips: Map<ribbon.key, { y, mode }>, stackHeight }
// where mode is "anchored" | "pinned" | "departing" and every y is a CONTENT
// coordinate.
//
// Stack model — the stack hangs ABOVE the scroll position, and the timeline is
// pushed down past it:
//   - The renderer draws content at `y + stackHeight - scrollY`, so content
//     coordinate `scrollY` lands at viewport `stackHeight`: the stack occupies
//     the top `stackHeight` px of the canvas and the timeline starts directly
//     beneath it. Ribbons therefore cover nothing, at any zoom, at any scroll
//     position — no per-year layout reserve can do this, because how many
//     people are in post changes as you scroll through a year, not just at
//     year boundaries.
//   - A band PINS the moment its anchor row passes the stack's bottom edge
//     (content y = scrollY), so it can never scroll up "through" the stack.
//     Pinned bands fill upward from that edge in anchor order: the
//     longest-serving sits on top, the newest arrival on the bottom row,
//     immediately above the timeline.
//   - The handover is seamless: a band anchored at exactly y0 = scrollY draws
//     at viewport `stackHeight`, and one frame later — pinned at
//     scrollY - stripHeight with the stack one row taller — it draws at
//     `(stackHeight + stripHeight) - stripHeight`, the same pixel.
//   - A band whose exit row has passed the stack's bottom edge is DEPARTING:
//     it leaves the stack (the bands below compact up) and rides its fixed
//     exit row up and off. Render order: anchored under departing under pinned.
export function resolveRibbonStrips({
  ribbons,
  scrollY = 0,
  stripHeight = STRIP_H,
  gap = STRIP_GAP,
} = {}) {
  const strips = new Map();
  if (!ribbons?.length) return { strips, stackHeight: 0 };

  const order = ribbons
    .filter((r) => r.tailEnd > scrollY)
    .slice()
    .sort(
      (a, b) =>
        a.y0 - b.y0 ||
        a.from - b.from ||
        String(a.name).localeCompare(String(b.name)),
    );

  // Pass 1: classify. Pinning depends only on the band's own rows against the
  // stack's bottom edge, so the stack height falls out of the count — no
  // circular "how tall is the stack I'm sizing" problem.
  const pinned = [];
  for (const r of order) {
    const rest = r.hasExit ? r.exitY : r.tailEnd - stripHeight;
    if (rest < scrollY) {
      // leaving: off the stack, rides its exit row up and away
      strips.set(r.key, { y: rest, mode: "departing" });
    } else if (r.y0 < scrollY) {
      pinned.push(r);
    } else {
      strips.set(r.key, { y: r.y0, mode: "anchored" });
    }
  }

  // Pass 2: stack them upward from the bottom edge, in anchor order.
  const row = stripHeight + gap;
  const stackHeight = pinned.length * row;
  pinned.forEach((r, i) => {
    strips.set(r.key, { y: scrollY - (pinned.length - i) * row, mode: "pinned" });
  });

  return { strips, stackHeight };
}
