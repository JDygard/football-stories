// Real-browser INTERACTION simulation for the desktop timeline.
//
// The other two sims can't see this class of bug at all: the layout math is
// right, the markup is right, and the click handlers are wired to the right
// elements — yet nothing happens when you click, because of how the BROWSER
// routes the click. Specifically: while a pointer is captured, Chrome retargets
// the compatibility mouse events (mousedown/mouseup/click) to the capturing
// element, so a click never reaches the SVG node under the cursor. Only a real
// browser reproduces that, so this harness mounts the real DesktopMain in
// Chromium and clicks things the way a user does.
//
// Build + run (see the runner script alongside it):
//   npx esbuild sims/desktop_interaction.sim.jsx --bundle --outfile=.harness.js
//   then load sims/desktop_interaction.html in a browser and drive it.
//
// The harness records every callback the app fires onto window.__events so the
// driver can assert on them.

import { createRoot } from "react-dom/client";
import { createElement as h, useState } from "react";
import DesktopMain from "../src/desktop/DesktopMain.jsx";

const FIRST = 1990;
const LAST = 2005;

const seasons = [];
for (let y = FIRST; y <= LAST; y++) {
  const games = [];
  for (let i = 0; i < 16; i++) {
    const win = (i * 7 + y * 3) % 5 > 1;
    games.push({
      game_id: `${y}-${i}`, season: y, is_playoff: false,
      result: win ? "W" : "L", points_for: win ? 27 : 13, points_against: win ? 17 : 24,
      franchise_id: "ARI", opponent_id: "SEA",
    });
  }
  const wins = games.filter((g) => g.result === "W").length;
  seasons.push({
    year: y, games,
    season: {
      wins, losses: 16 - wins, ties: 0, playoffs: null,
      point_diff: (wins - 8) * 21, division_finish: "2nd of 4",
    },
  });
}

// One long staff tenure that leaves for another team — it gives us both a
// ribbon band to click (opens the info card) and a destination pill to click
// (follows the career to that team).
const staff = [
  {
    admin_person_id: "coach-1",
    name: "Testy Coachman",
    role: "coach",
    from: 1991,
    to: 2001,
    exit: "to_team",
    next_team: "SEA",
  },
];

const draftSegment = {
  picks: seasons.flatMap((s) => [
    {
      player_id: `p${s.year}`, year: s.year, round: 1, pick_overall: 4,
      name: "Draftee Player", position: "QB", value: { score: 70, tier: "A" },
    },
  ]),
};

const mapped = { team: "ARI", seasons, staff, pre1967: null };

window.__events = [];
const record = (type, detail) => {
  window.__events.push({ type, detail });
};

function Harness() {
  const [settings] = useState({});
  return h(
    "div",
    { style: { position: "absolute", inset: 0 } },
    h(DesktopMain, {
      mapped,
      draftSegment,
      settings,
      adminById: new Map([["coach-1", { title: "Head Coach" }]]),
      focusYear: null,
      onFocusConsumed: () => {},
      ribbonConfig: { roles: {}, players: [] },
      onFollow: (team, year, person) => record("follow", { team, year, person }),
    }),
  );
}

createRoot(document.getElementById("root")).render(h(Harness));
