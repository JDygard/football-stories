// Pure model for personnel tenure ribbons in the desktop (landscape) layout —
// the 90°-rotated sibling of components/visualization/staffRibbonModel.js.
//
// A ribbon is one continuous opaque shape with a black border that follows
// its bends:
//   - TENURE BAND: horizontal, rides the BOTTOM RAIL (the gutter under the
//     timeline lane), spanning the tenure left→right. This is where the
//     person's name/title/years live — always on-screen wherever the tenure
//     is in view, so the mobile "pin the entry band to the viewport top"
//     stack machinery has no desktop counterpart; labels just clamp to the
//     viewport edge (see DesktopRibbonLayer).
//   - ENTRY CONNECTOR: vertical, ENTERS FROM THE TOP — drops from the entry
//     pill zone above the lane, down across the timeline at the year they
//     entered service, into the band. It occupies reserved horizontal space
//     in the entry year's offseason block (stripReserveByYear +
//     buildDesktopLayout's reserveByYear), so it takes real layout space
//     instead of overlaying content.
//   - EXIT CONNECTOR: vertical, LEAVES DOWNWARD — drops from the band at the
//     end of the tenure, through the rail's bottom peek, to the exit pill
//     zone (career future — "To <team>"). Exits sharing a column are
//     staggered rightward (the band extends to reach the pushed-over
//     column), and whole groups shift right off entry columns, so no two
//     connectors ever superimpose.
//
// Bands pack into rail slots (global allocation with slot reuse — no per-role
// lanes, no gaps) to minimize VERTICAL real estate; past SQUISH_FULL_SLOTS
// concurrent ribbons the band thickness tapers (same squish budget as
// mobile's tail gutter) so the rail stays shallow and barely dents the
// timeline lane.
//
// CAREER-FOLLOW PILLS are always visible on desktop (no drag reveal — the
// landscape viewport has the room): entry pills ride the margin above the
// lane, exit pills the margin below the rail. Because pills are far wider
// than their 16px connector columns, nearby pills can collide; layoutPillRows
// packs them into up to PILL_MAX_ROWS rows greedily (rare stragglers hide,
// their connector still shows and the ribbon stays tappable).
//
// Kept JSX-free so it can be unit-simulated in node. Presentation lives in
// DesktopRibbonLayer.jsx.

import { allocateTailSlots } from "../components/visualization/allocateTailSlots.js";
import { teamName } from "../components/visualization/teamMeta.js";

// Shared, orientation-agnostic pieces reused from the mobile model: role/
// position colors and the per-entry-year reserve accumulator (identical math —
// mobile reserves vertical px for horizontal entry bands, desktop reserves
// horizontal px for vertical entry connectors; both are CONN thickness per
// same-year entrant).
export {
  ROLE_COLORS,
  roleColor,
  positionGroup,
  stripReserveByYear,
} from "../components/visualization/staffRibbonModel.js";
import { roleColor } from "../components/visualization/staffRibbonModel.js";

export const BAND_H = 16; // tenure-band thickness in the rail (squishable)
export const CONN_W = 16; // entry/exit connector width (fixed, == reserve unit)
export const BAND_GAP = 0; // bands sit flush; borders delineate
// Rail squish: full BAND_H through SQUISH_FULL_SLOTS concurrent ribbons; beyond
// that taper toward MIN_BAND_H (capped just under full so the squish is visible
// from the very next ribbon) keeping the whole rail under ~6 full bands. Past
// MAX_RAIL_SLOTS the rail is too crowded: stop adding rows, drop the
// most-overlapping ribbons.
export const MIN_BAND_H = 6;
const SQUISH_FULL_SLOTS = 4;
const SQUISH_BUDGET = 6 * BAND_H; // 96px ≈ 6 unsquished bands
const MAX_RAIL_SLOTS = Math.floor(SQUISH_BUDGET / MIN_BAND_H); // 16
// Sliver between the rail's bottom row and the exit pill zone that the
// "leaving" stubs of exit connectors drop through — the visual cue that a
// career continues past the rail.
export const PEEK = 3;

// ---- always-visible career-follow pills ----
export const PILL_H = 18;
export const PILL_ROW_H = 22; // vertical pitch between stacked pill rows
export const PILL_MAX_ROWS = 2;
export const pillWidth = (text) => Math.round(String(text).length * 6.6) + 18;

// Classify the entry (top) boundary. Arrow points the direction the career is
// HEADED (onto this team). null => no claim, connector shows a bare stub.
export function entryInfo(r) {
  if (r.entry === "from_team" && r.prevTeam)
    return {
      text: `${teamName(r.prevTeam)} →`,
      fid: r.prevTeam,
      year: Math.max(0, (r.from || 0) - 1),
      kind: "dest",
    };
  if (r.entry === "drafted") return { text: "Drafted", kind: "term" };
  return null;
}

// Classify the exit (bottom) boundary. Only meaningful with an exit connector.
export function exitInfo(r) {
  if (!r.hasExit) return null;
  if (r.exit === "to_team" && r.nextTeam)
    return {
      text: `${teamName(r.nextTeam)} →`,
      fid: r.nextTeam,
      year: (r.to || 0) + 1,
      kind: "dest",
    };
  if (r.exit === "retired") return { text: "Retired", kind: "term" };
  if (r.exit === "left_league") return { text: "Left NFL", kind: "term" };
  return null;
}

// Greedy row packing for always-visible pills: pills sorted by left edge each
// take the first row whose last pill they clear. Returns Map<key, row> with
// row === -1 for pills that fit nowhere (hidden; the connector still shows).
export function layoutPillRows(pills, maxRows = PILL_MAX_ROWS, gap = 6) {
  const rowEnds = [];
  const out = new Map();
  const sorted = [...(pills || [])].sort(
    (a, b) => a.x - a.w / 2 - (b.x - b.w / 2),
  );
  for (const p of sorted) {
    const left = p.x - p.w / 2;
    let placed = -1;
    for (let i = 0; i < maxRows; i++) {
      if (rowEnds[i] === undefined || left >= rowEnds[i] + gap) {
        rowEnds[i] = p.x + p.w / 2;
        placed = i;
        break;
      }
    }
    out.set(p.key, placed);
  }
  return out;
}

// Assemble the full pill plan for a ribbon set: entry pills (centered on the
// entry connector) and exit pills (centered on the staggered exit connector),
// each packed into rows. rows counts only what actually placed, so an empty
// side reserves no margin.
export function buildPillPlan(ribbons) {
  const entries = [];
  const exits = [];
  for (const r of ribbons || []) {
    const en = entryInfo(r);
    if (en) entries.push({ key: r.key, x: r.x0 + CONN_W / 2, w: pillWidth(en.text), info: en });
    const ex = exitInfo(r);
    if (ex) exits.push({ key: r.key, x: r.exitX + CONN_W / 2, w: pillWidth(ex.text), info: ex });
  }
  const entryRowsMap = layoutPillRows(entries);
  const exitRowsMap = layoutPillRows(exits);
  let entryRows = 0;
  let exitRows = 0;
  for (const p of entries) {
    p.row = entryRowsMap.get(p.key) ?? -1;
    if (p.row >= 0) entryRows = Math.max(entryRows, p.row + 1);
  }
  for (const p of exits) {
    p.row = exitRowsMap.get(p.key) ?? -1;
    if (p.row >= 0) exitRows = Math.max(exitRows, p.row + 1);
  }
  return {
    entryByKey: new Map(entries.map((p) => [p.key, p])),
    exitByKey: new Map(exits.map((p) => [p.key, p])),
    entryRows,
    exitRows,
  };
}

const entryOrder = (a, b) =>
  String(a.name).localeCompare(String(b.name)) ||
  String(a.key || "").localeCompare(String(b.key || ""));

// staff: collapsed spans (staff + selected players, same shape as mobile).
// layout: result of buildDesktopLayout, built WITH the matching reserveByYear
//   so entry connectors have reserved room.
//
// Returns { ribbons, railHeight, slotCount, bandH }.
//   ribbon: { key, id, name, role, color, from, to, x0, x1, hasExit, exitX,
//             tailEnd, slot }
//   x0 = anchored entry-connector left (inside the reserved area, stacked for
//   same-year entries). x1 = end of last season (data end). exitX = left of
//   the exit connector after staggering. tailEnd = visual right end of the
//   band (exitX + CONN_W when exiting, else x1). slot = rail row index
//   (slot 0 is the TOPMOST row, hugging the screen edge — the desktop
//   counterpart of mobile's rightmost tail slot).
export function buildDesktopRibbons({
  staff,
  layout,
  connWidth = CONN_W,
  bandHeight = BAND_H,
} = {}) {
  if (!staff?.length || !layout?.blocks?.length) {
    return { ribbons: [], railHeight: 0, slotCount: 0, bandH: bandHeight };
  }

  const first = layout.blocks[0];
  const last = layout.blocks[layout.blocks.length - 1];

  // ---- group by entry year so same-year connectors stack in reserved space ----
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
    // Anchor entry connectors right of the offseason's banner column
    // (ribbonLeft), so the year marker stays left of the incoming connectors.
    let x0 = fromB
      ? fromB.offseason.ribbonLeft ?? fromB.offseason.x0
      : layout.tToX(r.from);
    x0 += idx * (connWidth + BAND_GAP);
    let x1 = toB ? toB.season.x1 : layout.tToX(r.to + 1);

    x0 = Math.max(first.x0, Math.min(x0, last.x1 - connWidth));
    x1 = Math.max(first.x0, Math.min(x1, last.x1));
    if (x1 <= x0) continue;

    // Exit connector fits when the tenure is wide enough to bend twice.
    const hasExit = x1 - x0 >= 2 * connWidth;
    ribbons.push({
      ...r,
      x0,
      x1,
      hasExit,
      exitX: x1 - connWidth,
      tailEnd: x1,
    });
  }

  // ---- exit staggering (mirror of mobile, along x) ----
  // Exits sharing a base column fan out rightward (latest entrant stays
  // leftmost, nearest its natural exit), the band extending to reach its
  // column. Then each group shifts right in CONN_W steps until no exit sits on
  // an entry-connector column.
  const entryCols = new Set(ribbons.map((r) => r.x0));
  const exitGroups = new Map();
  for (const r of ribbons) {
    if (!r.hasExit) continue;
    if (!exitGroups.has(r.exitX)) exitGroups.set(r.exitX, []);
    exitGroups.get(r.exitX).push(r);
  }
  for (const group of exitGroups.values()) {
    group.sort((a, b) => b.x0 - a.x0);
    group.forEach((r, i) => {
      r.exitX += (group.length - 1 - i) * connWidth;
    });
    let extra = 0;
    while (group.some((r) => entryCols.has(r.exitX + extra))) {
      extra += connWidth;
    }
    if (extra) {
      for (const r of group) r.exitX += extra;
    }
    for (const r of group) r.tailEnd = r.exitX + connWidth;
  }

  // ---- global rail slots: adjacent rows, slots reused ----
  // allocateTailSlots is axis-agnostic interval packing; feed it x-intervals.
  const slotMap = allocateTailSlots(
    ribbons.map((r) => ({ id: r.key, startY: r.x0, endY: r.tailEnd })),
  );
  const slotCount = ribbons.length ? Math.max(...slotMap.values()) + 1 : 0;

  // Too crowded: drop the highest-slot (most-overlapping) ribbons.
  let shown = ribbons;
  let slots = slotCount;
  if (slotCount > MAX_RAIL_SLOTS) {
    shown = ribbons.filter((r) => (slotMap.get(r.key) ?? 0) < MAX_RAIL_SLOTS);
    slots = MAX_RAIL_SLOTS;
  }

  // Progressive thickness: full BAND_H through SQUISH_FULL_SLOTS; beyond that
  // squeeze toward MIN_BAND_H so the rail stays under SQUISH_BUDGET.
  let bandH = bandHeight;
  if (slots > SQUISH_FULL_SLOTS) {
    bandH = Math.max(
      MIN_BAND_H,
      Math.min(bandHeight - 1, Math.floor(SQUISH_BUDGET / slots)),
    );
  }
  const railHeight = slots * bandH;

  // Keep the slot index on each ribbon so the render layer can re-derive row
  // positions at a different band thickness (e.g. expanded on drag).
  for (const r of shown) {
    r.slot = slotMap.get(r.key) ?? 0;
  }

  return { ribbons: shown, railHeight, slotCount: slots, bandH };
}
