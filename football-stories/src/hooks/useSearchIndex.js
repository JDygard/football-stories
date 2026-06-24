// NFL-wide search index for the header search box.
//
// The index (public/data/index/search_index.json, built by segment.py) is one
// logical row per person with their franchise stints expanded at the leaf, so
// the UI can show "one result per franchise stint". It's ~1.8MB, so it is
// LAZY-loaded on first use (the search box calls ensureLoaded() on focus) and
// cached at module scope — fetched once per session, shared across mounts.
//
// On-disk shape (keys kept short to shrink the payload):
//   { v, people: [ { n:name, i:id, k:"p"|"s", s:[[team,from,to,posOrRole],...] } ] }
//   k="p" player (4th stint field = position) · k="s" staff (4th = role)
//
// A selected row is handed to App.goTo(team, year, follow), which switches the
// franchise, enables/adds that person's ribbon, and scrolls to their era.

import { useCallback, useState } from "react";

let _people = null; // parsed array once ready
let _promise = null; // in-flight fetch (dedupes concurrent loads)

function loadIndex() {
  if (_promise) return _promise;
  _promise = fetch("/data/index/search_index.json")
    .then((r) => {
      if (!r.ok) throw new Error(`search index HTTP ${r.status}`);
      return r.json();
    })
    .then((json) => {
      _people = Array.isArray(json?.people) ? json.people : [];
      return _people;
    });
  return _promise;
}

const KIND = { p: "player", s: "staff" };

// Expand the people that match `query` into one row per franchise stint,
// ranked: name-start match first, then word-start, then any substring; within
// a rank, most-recent stint first. Cheap enough to run on every keystroke
// (the box gates on >= 2 chars, which bounds the match set).
function buildRows(people, query, limit) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const rows = [];
  for (const p of people) {
    const name = p.n;
    if (!name) continue;
    const lower = name.toLowerCase();
    const at = lower.indexOf(q);
    if (at === -1) continue;
    const rank = at === 0 ? 0 : lower[at - 1] === " " ? 1 : 2;
    const kind = KIND[p.k] || "player";
    const stints = p.s || [];
    for (let j = 0; j < stints.length; j++) {
      const [team, from, to, meta] = stints[j];
      rows.push({
        key: `${p.i}|${team}|${from}|${to}|${meta ?? ""}`,
        id: p.i,
        kind,
        name,
        team,
        from,
        to,
        role: kind === "staff" ? meta : null,
        position: kind === "player" ? meta : null,
        rank,
      });
    }
    if (rows.length > 1200) break; // safety cap for pathological short queries
  }
  rows.sort(
    (a, b) =>
      a.rank - b.rank ||
      (b.to || 0) - (a.to || 0) ||
      a.name.localeCompare(b.name) ||
      String(a.team).localeCompare(String(b.team)),
  );
  return rows.slice(0, limit);
}

export default function useSearchIndex() {
  const [status, setStatus] = useState(_people ? "ready" : "idle");

  const ensureLoaded = useCallback(() => {
    if (_people) {
      setStatus("ready");
      return;
    }
    setStatus("loading");
    loadIndex().then(
      () => setStatus("ready"),
      () => setStatus("error"),
    );
  }, []);

  // `status` is intentionally a dep: once the fetch resolves, the identity of
  // `search` changes so consumers (useMemo) recompute against the loaded data.
  const search = useCallback(
    (query, limit = 40) => (_people ? buildRows(_people, query, limit) : []),
    [status], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { status, ensureLoaded, search };
}
