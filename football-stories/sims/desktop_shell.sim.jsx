// Harness for the desktop SHELL (DesktopApp), used to check the two things
// that only show up across a team change: that the chrome survives the load,
// and that a career-follow sweeps the timeline the right way.
//
// `fetch` is stubbed to serve synthetic segments after a deliberate delay, so
// the loading window is wide enough to observe. That delay is the whole point:
// the flash this guards against was DesktopApp returning a bare "Loading…" div
// while the destination team's segment was in flight, tearing down the header
// and the control dock and rebuilding them a moment later.
//
// Build + drive it exactly like desktop_interaction (same driver runs both).

import { createRoot } from "react-dom/client";
import { createElement as h } from "react";
import DesktopApp from "../src/desktop/DesktopApp.jsx";

const FETCH_DELAY_MS = 300;
window.__fetches = [];

// Two teams, each with a coach who came from the other and left for the other,
// so both an exit pill ("To …") and an entry pill ("From …") are clickable.
const TEAMS = {
  ARI: { other: "SEA", first: 1990, last: 2005 },
  SEA: { other: "ARI", first: 1990, last: 2005 },
};

function teamSegment(id) {
  const { other, first, last } = TEAMS[id];
  const seasons = [];
  const games = [];
  for (let y = first; y <= last; y++) {
    const yearGames = [];
    for (let i = 0; i < 16; i++) {
      const win = (i * 7 + y * 3) % 5 > 1;
      yearGames.push({
        game_id: `${id}-${y}-${i}`, season: y, is_playoff: false,
        result: win ? "W" : "L", points_for: win ? 27 : 13, points_against: win ? 17 : 24,
        franchise_id: id, opponent_id: other,
      });
    }
    games.push(...yearGames);
    const wins = yearGames.filter((g) => g.result === "W").length;
    seasons.push({
      year: y, wins, losses: 16 - wins, ties: 0, playoffs: null,
      point_diff: (wins - 8) * 21, division_finish: "2nd of 4",
    });
  }
  return {
    team: id,
    seasons,
    games,
    staff: [
      {
        admin_person_id: `${id}-coach`,
        name: `${id} Coachman`,
        role: "coach",
        from: first + 1,
        to: last - 2,
        entry: "from_team",
        prev_team: other,
        exit: "to_team",
        next_team: other,
      },
    ],
  };
}

const draftSegment = (id) => ({
  team: id,
  picks: Array.from({ length: 16 }, (_, i) => ({
    player_id: `${id}-p${i}`, year: 1990 + i, round: 1, pick_overall: 4,
    name: `${id} Draftee`, position: "QB", value: { score: 70, tier: "A" },
  })),
});

const json = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

window.fetch = (url) => {
  const u = String(url);
  window.__fetches.push(u);
  return new Promise((resolve) => {
    setTimeout(() => {
      let m = /\/data\/segments\/teams\/(\w+)\.json/.exec(u);
      if (m && TEAMS[m[1]]) return resolve(json(teamSegment(m[1])));
      m = /\/data\/segments\/teams_draft\/(\w+)\.json/.exec(u);
      if (m && TEAMS[m[1]]) return resolve(json(draftSegment(m[1])));
      if (/\/data\/segments\/admin\//.test(u)) return resolve(json({ records: [] }));
      if (/\/data\/segments\/teams_tenures\//.test(u)) return resolve(json({ tenures: [] }));
      if (/\/data\/segments\/players\//.test(u)) return resolve(json({ career: [] }));
      return resolve(new Response("{}", { status: 404 }));
    }, FETCH_DELAY_MS);
  });
};

document.body.dataset.view = "desktop";
createRoot(document.getElementById("root")).render(h(DesktopApp));
