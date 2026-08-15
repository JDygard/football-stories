import { useEffect, useState, useMemo } from "react";
import mapTeamData from "../utils/mapTeamData.js";
import { getPersonnelTitle } from "../utils/getPersonnelTitle.js";

export default function useTeamData(teamId) {
  const [loading, setLoading] = useState(false);
  const [teamSegment, setTeamSegment] = useState(null);
  const [draftSegment, setDraftSegment] = useState(null);
  const [erasSegment, setErasSegment] = useState(null);
  const [error, setError] = useState(null);
  const [adminById, setAdminById] = useState(() => new Map());


  // 1) Fetch team segment: { team, seasons, games }
  useEffect(() => {
    if (!teamId) return;

    let cancelled = false;

    setLoading(true);
    setError(null);
    setTeamSegment(null);

    fetch(`/data/segments/teams/${teamId}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Bad response ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!cancelled) setTeamSegment(json);
      })
      .catch(err => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  // Draft segment (per-team draft classes). May 404 until the pipeline has
  // materialized teams_draft/ — that's fine, we just render no draft content.
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    setDraftSegment(null);

    fetch(`/data/segments/teams_draft/${teamId}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setDraftSegment(json);
      })
      .catch(() => {
        if (!cancelled) setDraftSegment(null);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  // Named Eras segment (hand-curated narrative eras — see dataset_generation/
  // eras.py). Same 404-tolerant contract as the draft segment, and for the same
  // reason squared: eras are authored one franchise at a time, so most teams
  // legitimately have no file and the timeline just renders without them.
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    setErasSegment(null);

    fetch(`/data/segments/teams_eras/${teamId}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setErasSegment(json);
      })
      .catch(() => {
        if (!cancelled) setErasSegment(null);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamSegment?.staff?.length) return;

    let cancelled = false;

    const ids = [
      ...new Set(teamSegment.staff.map(s => s.admin_person_id))
    ];

    Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/data/segments/admin/${id}.json`);
          if (!res.ok) return [id, null];
          const json = await res.json();
          return [id, json];
        } catch {
          return [id, null];
        }
      })
    ).then((entries) => {
      if (cancelled) return;

      setAdminById((prev) => {
        const next = new Map(prev);

        for (const [id, segment] of entries) {
          if (!segment) continue;

          next.set(id, {
            title: getPersonnelTitle(segment),
          });
        }

        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [teamSegment]);


  // 2) Derive mapped data (season blocks, t-values, win ratios…)
  const mapped = useMemo(() => {
    if (!teamSegment) return null;
    return mapTeamData(teamSegment);
  }, [teamSegment]);


  // 3) Derived layout helpers — consumed by Main.jsx
  const performanceLeft = 160;
  const performanceRight = null;
  const svgWidth = null;
  /*
          season,
          year,
          winRatio,
          totalGames,
          games: mappedGames,
          seasonTop,
          seasonBottom,
          offseasonTop,
          offseasonBottom,
  */
  return {
    loading,
    error,
    teamSegment,
    draftSegment,
    erasSegment,
    mapped,
    performanceLeft,
    performanceRight,
    svgWidth,
    adminById,
  };
}
