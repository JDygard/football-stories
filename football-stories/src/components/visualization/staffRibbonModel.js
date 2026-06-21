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

export const ROLE_COLORS = {
  owner: "#1f77b4",
  gm: "#ff7f0e",
  coach: "#2ca02c",
  // player ribbons color by position group
  qb: "#8e44ad",
  rb: "#0e8f76",
  wr: "#2d6cdf",
  te: "#6c8fd6",
  ol: "#8a6d3b",
  dl: "#b03a3a",
  lb: "#5e7c1e",
  db: "#17a2b8",
  st: "#777777",
  unknown: "#999",
};

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
// Tail columns stay full STRIP_H wide until the gutter they'd need
// (slotCount * STRIP_H) overflows the width budget; past that they shrink
// *continuously* toward MIN_TAIL_W (≈2px of visible color inside the 1px
// borders) — no hard breakpoint, so we only reach the thin floor when the
// count genuinely demands it.
export const MIN_TAIL_W = 4;
// Resting inset of the tail gutter from the right screen edge: a 3px sliver
// that exposes the "leaving" stub of exit bands (they still run to the true
// edge) and seeds the drag-to-follow-a-career affordance.
export const PEEK = 3;

export function roleColor(role) {
  return ROLE_COLORS[role] || ROLE_COLORS.unknown;
}

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
  // Horizontal budget for the whole tail gutter. Tails stay full width until
  // they'd collectively exceed this, then shrink. Infinity = never compress.
  maxRailWidth = Infinity,
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
  // Exits sharing a base row fan out downward (latest entrant stays highest,
  // mirroring the original layout), the tail extending to reach its row.
  // Then each group shifts down in STRIP_H steps until no exit sits on an
  // entry-band row.
  const entryRows = new Set(ribbons.map((r) => r.y0));
  const exitGroups = new Map();
  for (const r of ribbons) {
    if (!r.hasExit) continue;
    if (!exitGroups.has(r.exitY)) exitGroups.set(r.exitY, []);
    exitGroups.get(r.exitY).push(r);
  }
  for (const group of exitGroups.values()) {
    group.sort((a, b) => b.y0 - a.y0);
    group.forEach((r, i) => {
      r.exitY += (group.length - 1 - i) * stripHeight;
    });
    let extra = 0;
    while (group.some((r) => entryRows.has(r.exitY + extra))) {
      extra += stripHeight;
    }
    if (extra) {
      for (const r of group) r.exitY += extra;
    }
    for (const r of group) r.tailEnd = r.exitY + stripHeight;
  }

  // ---- global tail slots: adjacent columns, slots reused ----
  const slotMap = allocateTailSlots(
    ribbons.map((r) => ({ id: r.key, startY: r.y0, endY: r.tailEnd })),
  );
  const slotCount = ribbons.length
    ? Math.max(...slotMap.values()) + 1
    : 0;

  // Progressive width: full STRIP_H until the gutter overflows its budget,
  // then shrink smoothly (floor MIN_TAIL_W). floor(budget/slotCount) makes the
  // taper continuous in slotCount instead of snapping at a threshold.
  const fullRail = slotCount * stripHeight;
  let tailW = stripHeight;
  if (slotCount > 0 && fullRail > maxRailWidth) {
    tailW = Math.max(
      MIN_TAIL_W,
      Math.min(stripHeight, Math.floor(maxRailWidth / slotCount)),
    );
  }
  const railWidth = slotCount * tailW;

  // Slot 0 sits rightmost (longest-running ribbons hug the screen edge),
  // matching the original svgRight - (slot+1)*stripHeight scheme. Keep the
  // slot index on each ribbon so the render layer can re-derive positions at a
  // different tail width (e.g. expanded to full width while the gutter is
  // dragged open).
  for (const r of ribbons) {
    const slot = slotMap.get(r.key) ?? 0;
    r.slot = slot;
    r.x = railWidth - (slot + 1) * tailW;
    r.width = tailW;
  }

  return { ribbons, railWidth, slotCount, tailW };
}

// Scroll-dependent entry-band placement. Returns Map<ribbon.key,
// { y, mode }> where mode is "anchored" | "pinned" | "departing".
//
// Stack model (fixes pass-through and top-of-timeline occlusion):
//   - Candidates are walked in anchor order. The k-th pinned band's slot is
//     scrollY + k*(STRIP_H+gap). An incoming anchored band PINS the moment
//     its anchor reaches its future slot (bottom of the current stack), not
//     when it crosses the viewport top — so it can never scroll up "through"
//     the stack.
//   - At scrollY=0 every slot equals the band's reserved anchor position,
//     so the stack and the timeline's reserved rows coincide: nothing at the
//     top of the timeline is covered.
//   - A band whose exit row has risen to its slot is DEPARTING: it leaves
//     the stack (the bands below compact up) and rides its fixed exit row
//     up and off. Render order: anchored under departing under pinned.
export function resolveRibbonStrips({
  ribbons,
  scrollY = 0,
  stripHeight = STRIP_H,
  gap = STRIP_GAP,
} = {}) {
  const strips = new Map();
  if (!ribbons?.length) return strips;

  const order = ribbons
    .filter((r) => r.tailEnd > scrollY)
    .slice()
    .sort(
      (a, b) =>
        a.y0 - b.y0 ||
        a.from - b.from ||
        String(a.name).localeCompare(String(b.name)),
    );

  let k = 0;
  for (const r of order) {
    const slot = scrollY + k * (stripHeight + gap);
    const rest = r.hasExit ? r.exitY : r.tailEnd - stripHeight;
    if (rest <= slot) {
      // leaving: off the stack, rides its exit row up and away
      strips.set(r.key, { y: rest, mode: "departing" });
      continue;
    }
    if (r.y0 <= slot) {
      strips.set(r.key, { y: slot, mode: "pinned" });
      k += 1;
    } else {
      strips.set(r.key, { y: r.y0, mode: "anchored" });
    }
  }
  return strips;
}
