// Guard for the era CAST: turning the prose names in a curated era's
// `highlights` into the people the data actually holds.
//
// This used to guard a great deal more — an allowlist of staff names that
// overrode the personnel panel's role toggles, and the reducer deciding when a
// focused view survived a panel write. All of that is gone: coaches, GMs and
// owners are selected one at a time exactly like players now, so a focused view
// simply replaces the selection with its own cast. Two mechanisms governing the
// same ribbons is what produced the bug where a role toggle hid the very coach
// a chapter named, and one list is the only real fix.
//
// What is left is the matching, which is loose in exactly one direction: a
// surname may stand for a full name as a whole token, never as a substring.
// That matters because the two sources spell people differently — highlights
// say "Dungy", the team segment says "Dungy" but might say "Tony Dungy", and
// the tenure segment says "Peyton Manning" in full.
//
//     node sims/era_cast.sim.mjs

import {
  normName,
  nameMatches,
  eraCast,
  eraYears,
  resolveEraStaff,
  resolveEraPlayers,
} from "../src/utils/eraCast.js";
import { trackGroup } from "../src/components/visualization/staffRibbonModel.js";

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log("  FAIL: " + msg); } };

// --- splitting a chapter's cast ------------------------------------------
{
  const cast = eraCast({
    highlights: [
      { name: "Peyton Manning", kind: "player" },
      { name: "Dungy", kind: "staff" },
      { name: "Mora", kind: "staff" },
    ],
  });
  ok(cast.players.length === 1, `expected 1 player, got ${cast.players.length}`);
  ok(cast.staffNames.join() === "Dungy,Mora", `staff names: ${cast.staffNames}`);
  const none = eraCast({ highlights: [{ name: "Bo Nix", kind: "player" }] });
  ok(none.staffNames.length === 0, "a player-only chapter names no staff");
  ok(eraCast(null).players.length === 0, "a null era yields an empty cast");
  ok(eraCast({}).staffNames.length === 0, "an era with no highlights yields an empty cast");
}

// --- name matching, loose one way only ------------------------------------
{
  const t = (a, b, want) =>
    ok(nameMatches(a, b) === want, `nameMatches(${JSON.stringify(a)}, ${JSON.stringify(b)}) !== ${want}`);
  t("Dungy", "Tony Dungy", true);        // surname stands for the full name
  t("James Irsay", "Irsay", true);       // …and the other way round
  t("Mora", "Mora", true);
  t("Peyton Manning", "peyton manning", true);
  t("Mora", "Moraine", false);           // whole token, never a substring
  t("Dungy", "Jim Mora", false);
  t("", "Mora", false);
  // Two full names differing by a generational suffix are DIFFERENT PEOPLE —
  // Marvin Harrison and Marvin Harrison Jr. both exist, on different
  // franchises. Matching them would put the wrong man in a chapter.
  t("Marvin Harrison", "Marvin Harrison Jr.", false);
  ok(normName("D.J. O'Neal-Smith") === "dj onealsmith", `normName: ${normName("D.J. O'Neal-Smith")}`);
}

// --- one chip-group question, two kinds of row ----------------------------
//
// The panel filters staff and players through the same chip row, so it asks
// every row the same question and the answer has to come from the right field:
// the job for a staffer, the position for a player.
{
  ok(trackGroup({ kind: "staff", role: "coach", position: null }) === "coach", "a coach groups as coach");
  ok(trackGroup({ kind: "staff", role: "gm" }) === "gm", "a GM groups as gm");
  ok(trackGroup({ kind: "staff" }) === "unknown", "a roleless staffer falls back to unknown");
  ok(trackGroup({ kind: "player", position: "QB" }) === "qb", "a quarterback groups as qb");
  ok(trackGroup({ position: "T" }) === "ol", "a tackle groups as ol");
  ok(trackGroup(null) === "unknown", "a missing row groups as unknown");
  // A staffer must NOT be grouped by position — they have none, and falling
  // through to positionGroup would file every coach under "unknown".
  ok(trackGroup({ kind: "staff", role: "owner", position: "QB" }) === "owner",
    "kind decides the group, not a stray position field");
}

// --- resolving the cast against the data ---------------------------------
//
// This is the part that had no coverage and cost a release: both shells did it
// inline, DesktopApp's copy referenced a ref it never declared, and the whole
// desktop era-focus feature silently did nothing while mobile's identical copy
// worked. esbuild parsed it happily — it is a ReferenceError, not a syntax
// error. Now there is one implementation and these hold it to the rules.
{
  const ident = (r) => r; // stand-in for staffTrackRow
  const STAFF = [
    { admin_person_id: "a", name: "Mora", role: "coach", from: 1998, to: 2001 },
    { admin_person_id: "b", name: "Tony Dungy", role: "coach", from: 2002, to: 2008 },
    { admin_person_id: "c", name: "Marchibroda", role: "coach", from: 1992, to: 1995 },
    { admin_person_id: "d", name: "James Irsay", role: "owner", from: 1997, to: 2024 },
  ];
  const box = { firstYear: 1998, lastYear: 2010, start: 1998, end: 2010 };

  const got = resolveEraStaff(STAFF, ["Dungy", "Mora"], box, ident).map((r) => r.name);
  ok(got.join() === "Tony Dungy,Mora", `staff cast resolved to [${got}]`);
  ok(!got.includes("Marchibroda"), "a coach the chapter never named came along");

  // An ONGOING chapter has end === null; eraYears must fall back to the
  // clamped lastYear or every comparison is false and the cast comes back
  // empty — which is precisely how this fails silently.
  const ongoing = { firstYear: 2002, lastYear: 2010, start: 2002, end: null };
  const y = eraYears(ongoing);
  ok(y.from === 2002 && y.to === 2010, `eraYears on an ongoing chapter: ${JSON.stringify(y)}`);
  ok(resolveEraStaff(STAFF, ["Dungy"], ongoing, ident).length === 1,
    "an ongoing chapter still resolves its staff");

  // Named but non-overlapping: keep them rather than drop them. A chapter that
  // names someone should show them.
  const early = { firstYear: 1970, lastYear: 1975, start: 1970, end: 1975 };
  ok(resolveEraStaff(STAFF, ["Mora"], early, ident).length === 1,
    "a named person with no overlapping stint still resolves to their first");
  // …but a name nobody carries resolves to nothing, not to undefined.
  ok(resolveEraStaff(STAFF, ["Nobody At All"], box, ident).length === 0, "an unknown name resolves to nothing");
  ok(resolveEraStaff(null, ["Mora"], box, ident).length === 0, "no staff rows resolves to nothing");
  ok(resolveEraStaff(STAFF, null, box, ident).length === 0, "no names resolves to nothing");

  // PLAYERS match exactly, never loosely: among hundreds of stints a surname
  // standing in for a full name would put the wrong person in a chapter.
  const TEN = [
    { player_id_internal: "p1", name: "Peyton Manning", position: "QB", from: 1998, to: 2011, conf: "high" },
    { player_id_internal: "p2", name: "Manning", position: "DE", from: 1985, to: 1988, conf: "high" },
    { player_id_internal: "p3", name: "Reggie Wayne", position: "WR", from: 2001, to: 2014, conf: "low" },
  ];
  const picks = resolveEraPlayers(TEN, [{ name: "Peyton Manning" }, { name: "Reggie Wayne" }], box);
  ok(picks.length === 1 && picks[0].name === "Peyton Manning",
    `players resolved to [${picks.map((p) => p.name)}] — a low-conf row must be skipped`);
  ok(resolveEraPlayers(TEN, [{ name: "Manning" }], box)[0].position === "DE",
    "a bare surname must NOT match the full name it is a token of");
  ok(picks[0].key === "p1:1998:2011", `selection key is the stint key (${picks[0].key})`);
  ok(resolveEraPlayers(null, [{ name: "x" }], box).length === 0, "no tenure rows resolves to nothing");
}

console.log(fail ? `\n${fail} FAILURE(S)` : "ALL SIMS PASS");
process.exit(fail ? 1 : 0);
