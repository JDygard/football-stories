// Resolving a Named Era's CAST — the people a chapter names — and matching
// those names against the two very different sources that carry them.
//
// A curated era in dataset_generation/curated/eras.json lists its cast as
// `highlights`: [{ name, kind, why }]. Those names are written the way a person
// writing prose writes them, which is not the way either data source stores
// them:
//
//   PLAYERS come from segments/teams_tenures/{FID}.json, keyed by resolved
//     person id and carrying a full name ("Peyton Manning").
//   STAFF come from the team segment's own `staff` rows, where a coach is
//     usually a bare surname ("Mora", "Marchibroda") and an owner is usually
//     a full name ("James Irsay").
//
// And the highlights themselves mix the two conventions — the Colts' Manning
// era names its players in full and its coaches as "Dungy" and "Mora".
//
// So matching is deliberately loose in ONE direction only: a surname may stand
// in for a full name, but only as a WHOLE TOKEN. Substring matching would have
// "Mora" select "Moraine", and a chapter quietly gaining a person it never
// mentioned is worse than one losing a person it did.
//
// Shared by both shells (App.jsx and desktop/DesktopApp.jsx), which resolved
// this identically and separately until this module existed.

export function normName(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// True when `a` and `b` plausibly name the same person: equal outright, or one
// is a single token that appears as a whole token in the other.
export function nameMatches(a, b) {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xs = x.split(" ");
  const ys = y.split(" ");
  if (xs.length === 1 && ys.length > 1) return ys.includes(x);
  if (ys.length === 1 && xs.length > 1) return xs.includes(y);
  return false;
}

// Split a curated era's highlights into the two casts the shells resolve
// differently. `staffNames` is a list of names, not rows: staff ribbons are
// built from the team segment, so all the caller needs is the allowlist.
export function eraCast(era) {
  const highlights = era?.highlights || [];
  return {
    players: highlights.filter((h) => h.kind !== "staff"),
    staffNames: highlights.filter((h) => h.kind === "staff").map((h) => h.name),
  };
}

// NOTE ON WHAT USED TO LIVE HERE (removed 2026-08-18).
//
// This module also held followCast(), staffAllowed() and nextRibbonConfig() —
// the machinery for an allowlist of staff names that OVERRODE the personnel
// panel's role toggles while a chapter or a career was in focus. All of it is
// gone, along with the toggles themselves: coaches, GMs and owners are now
// selected one at a time exactly like players, so a focused view simply
// REPLACES the selection with its own cast and there is no second mechanism to
// reconcile. The bug that machinery produced — a role toggle hiding the very
// coach a chapter named — is not fixable in general when two systems decide
// the same thing; it is only fixable by there being one.
//
// What remains is the part that was never the problem: turning the prose names
// in eras.json into the people the data holds.

// ---------------------------------------------------------------------------
// Resolving a chapter's cast against the data
// ---------------------------------------------------------------------------
// Both shells did this inline and identically, which is how DesktopApp ended up
// referencing a `staffRef` it never declared: valid syntax, fine to esbuild,
// and a ReferenceError the moment anyone clicked an era plaque. Mobile worked
// because its copy of the same twenty lines happened to be complete. Two copies
// of one paragraph is a coin flip on whether a fix lands in both.
//
// Both resolvers take the ROWS, not a fetch or a ref, so they are pure and the
// sim can hold them to the rules that actually matter:
//   - a name must match (loosely, see nameMatches / exact for players),
//   - the stint must OVERLAP the chapter — a journeyman of the same name in
//     another decade is not who the chapter meant,
//   - failing an overlap, fall back to the person's first stint rather than
//     dropping them, because a chapter naming someone should show them.

const overlapsEra = (row, from, to) =>
  row.from != null && row.from <= to && (row.to ?? row.from) >= from;

// The years a chapter actually covers. firstYear/lastYear, not start/end: an
// ongoing chapter has end === null and every comparison against it is false.
// eraSpans already clamped these to the seasons the franchise has.
export function eraYears(box) {
  return {
    from: box?.firstYear ?? box?.start,
    to: box?.lastYear ?? box?.end ?? box?.start,
  };
}

// Staff: matched loosely, because highlights say "Dungy" and a segment row may
// say "Tony Dungy". `toRow` turns a matched segment row into a selection entry
// (staffTrackRow) — injected so this module needn't import the hook.
export function resolveEraStaff(staffRows, staffNames, box, toRow) {
  const { from, to } = eraYears(box);
  const out = [];
  for (const want of staffNames || []) {
    const rows = (staffRows || []).filter((r) => nameMatches(want, r.name));
    const hit = rows.find((r) => overlapsEra(r, from, to)) || rows[0];
    const row = hit && toRow(hit);
    if (row) out.push(row);
  }
  return out;
}

// Players: matched EXACTLY on the normalised name, not loosely. A surname
// standing in for a full name is right for staff, where the segment stores
// bare surnames; among 700 player stints it would put the wrong Smith in a
// chapter. conf:"low" rows are id-collision artifacts and never eligible.
export function resolveEraPlayers(tenureRows, wanted, box) {
  const { from, to } = eraYears(box);
  const out = [];
  for (const want of wanted || []) {
    const rows = (tenureRows || []).filter(
      (t) => normName(t.name) === normName(want.name) && t.conf !== "low",
    );
    const hit = rows.find((t) => t.to != null && overlapsEra(t, from, to)) || rows[0];
    if (!hit) continue;
    const id = hit.player_id_internal || hit.player_id;
    out.push({
      key: `${id}:${hit.from}:${hit.to}`,
      player_id: id,
      name: hit.name,
      position: hit.position,
      from: hit.from,
      to: hit.to,
      source: hit.source,
      prev_team: hit.prev_team,
      next_team: hit.next_team,
      entry: hit.entry,
      exit: hit.exit,
      conf: hit.conf,
    });
  }
  return out;
}
