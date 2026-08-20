// Per-team player tenure spans for the ribbon selection panel.
//
// ONE ROW PER STINT, not one per player. A player can leave a franchise and
// come back — Cam Newton is CAR 2011-2019, then NE, then CAR 2021 — and each
// stint is its own track on the timeline, with its own entry/exit bands and
// its own career-follow links.
//
// This used to dedupe by player_id, which silently dropped every stint after
// the first one in FILE order. For Cam that meant the only selectable row was
// the 2021 cameo: his draft year and the whole Superman run were unreachable
// from the panel (fixed 2026-08-15). 37 of CAR's 661 players are multi-stint,
// so it was never just him.
//
// Rows therefore carry a `key` (`${player_id}:${from}:${to}`) — THAT is what
// selection, dedup and React keys must use. `player_id` alone is not unique
// in this list.
//
// Preferred source: segments/teams_tenures/{FID}.json (real per-season
// rosters 1999+, written once the tenure pipeline has run:
// fetch_nflverse_rosters.py -> ingest.py -> segment.py).
//
// Fallback until then: approximate spans derived from the team's draft
// segment — drafting franchise holds the player from draft year through
// last_year. Approximate spans carry source="approx" and render dashed
// with a "~" so nobody mistakes them for roster truth.

import { useEffect, useMemo, useState } from "react";

// Stable identity of one stint. Falls back to composing it, so a selection
// entry saved before rows carried a key still resolves.
export const tenureKey = (t) =>
  t?.key || `${t?.player_id ?? ""}:${t?.from ?? ""}:${t?.to ?? ""}`;

const spanSeasons = (t) =>
  t.from == null ? 0 : (t.to == null ? t.from : t.to) - t.from + 1;

// Staff rows, shaped like tenure rows so the panel can treat them identically.
// The ORIGINAL segment row is spread in whole: the ribbon layer needs its
// entry/exit and prev_team/next_team to draw arrival bands and career-follow
// pills, and the selection entry is what the timeline is rebuilt from.
export function staffTrackRow(s) {
  const id = s?.admin_person_id;
  if (!id || s.from == null) return null;
  const to = s.to == null ? s.from : s.to;
  return {
    ...s,
    kind: "staff",
    player_id: id,
    // Namespaced, because an admin id and a player id are different id spaces
    // and a collision would make one person toggle the other.
    key: `staff:${id}:${s.from}:${to}`,
    to,
    seasons: to - s.from + 1,
  };
}

function staffRows(staff) {
  const out = [];
  for (const s of staff || []) {
    const row = staffTrackRow(s);
    if (row) out.push(row);
  }
  return out;
}

export default function useTeamTenures(teamId, draftSegment, staff = null) {
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    setFetched(null);
    fetch(`/data/segments/teams_tenures/${teamId}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setFetched(json);
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return useMemo(() => {
    if (fetched?.tenures?.length) {
      // Pipeline rows carry the id as player_id_internal; the rest of the UI
      // keys on player_id, so normalize here.
      const seen = new Set();
      const tenures = [];
      for (const t of fetched.tenures) {
        const id = t.player_id ?? t.player_id_internal;
        if (!id) continue;
        // conf:"low" rows are id-collision artifacts — the internal id is a
        // name hash, so a different person of the same name lands on someone
        // else's stint (Cam Newton picks up a phantom 2006 CAR season from a
        // 2005 ATL namesake). They'd read as real gaps in a career; drop them.
        if (t.conf === "low") continue;
        const row = { ...t, player_id: id };
        row.key = `${id}:${row.from}:${row.to}`;
        if (seen.has(row.key)) continue; // exact duplicate rows only
        seen.add(row.key);
        row.seasons = spanSeasons(row);
        tenures.push(row);
      }
      return { tenures: staffRows(staff).concat(tenures), source: "pipeline" };
    }
    // Approx fallback: one span per drafted player, so player_id IS unique
    // here — but key/seasons are still set so consumers need only one shape.
    const seen = new Set();
    const out = [];
    for (const p of draftSegment?.picks || []) {
      if (!p.player_id || seen.has(p.player_id)) continue;
      seen.add(p.player_id);
      const from = p.year;
      if (!from) continue;
      const to = Math.max(from, Math.round(p.career?.last_year || from));
      out.push({
        key: `${p.player_id}:${from}:${to}`,
        player_id: p.player_id,
        name: p.name,
        position: p.position,
        from,
        to,
        seasons: to - from + 1,
        games: p.career?.games ?? 0,
        source: "approx",
      });
    }
    return { tenures: staffRows(staff).concat(out), source: "approx-derived" };
  }, [fetched, draftSegment, staff]);
}
