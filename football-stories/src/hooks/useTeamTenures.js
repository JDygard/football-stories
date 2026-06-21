// Per-team player tenure spans for the ribbon selection panel.
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

export default function useTeamTenures(teamId, draftSegment) {
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
      // (selection, dedup, React keys) keys on player_id, so normalize here.
      const seen = new Set();
      const tenures = [];
      for (const t of fetched.tenures) {
        const id = t.player_id ?? t.player_id_internal;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        tenures.push({ ...t, player_id: id });
      }
      return { tenures, source: "pipeline" };
    }
    const seen = new Set();
    const out = [];
    for (const p of draftSegment?.picks || []) {
      if (!p.player_id || seen.has(p.player_id)) continue;
      seen.add(p.player_id);
      const from = p.year;
      if (!from) continue;
      const to = Math.max(from, Math.round(p.career?.last_year || from));
      out.push({
        player_id: p.player_id,
        name: p.name,
        position: p.position,
        from,
        to,
        games: p.career?.games ?? 0,
        source: "approx",
      });
    }
    return { tenures: out, source: "approx-derived" };
  }, [fetched, draftSegment]);
}
