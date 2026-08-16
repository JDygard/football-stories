// Node simulation of the Super Bowl crown model (vite build can't run in the
// sandbox). The crown is the one mark allowed to leave the timeline lane, so
// the things worth asserting are all about the space it takes and the claims it
// makes:
//
//   1. It fits the era header's air, so turning Named Eras on doesn't shove the
//      timeline down when a franchise happens to have won one.
//   2. Plaques never overlap, at any column width the ladder can produce.
//   3. "SB xN" only ever means N CONSECUTIVE titles.
//   4. Merging is collision-driven — the Seasons zoom, where there is room,
//      keeps one plaque per year.
//   5. A pre-merger championship never gets labelled "SB".
//
// Run: node sims/desktop_crown.sim.mjs

import {
  buildSuperBowlCrowns, crownedYears, wonSuperBowl, medalFrameWidth,
  CROWN_ZONE, CROWN_H, CROWN_RISE, CROWN_GAP, CROWN_MIN_W,
} from "../src/desktop/desktopCrownModel.js";
import {
  ERA_HEADER_H, ERA_RECORD_BASELINE, ERA_RECORD_FS,
} from "../src/desktop/desktopEraModel.js";
import {
  ERA_FIT_MIN_SEASON_W, ERA_FIT_MAX_SEASON_W,
} from "../src/desktop/buildDesktopLayout.js";
import { DESKTOP_GEOMETRY } from "../src/desktop/desktopDetail.js";

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) { failures++; console.log("FAIL:", msg); }
};

// ---- synthetic layouts ----------------------------------------------------
// A line-mode timeline: seasons of `seasonW`, optionally separated by an
// offseason block of `offW` (the Seasons zoom shows one; Eras hides them).
function makeBlocks({ years, titles, seasonW, offW = 0 }) {
  const blocks = [];
  let x = 0;
  for (const y of years) {
    blocks.push({
      type: "season", year: y, x0: x, x1: x + seasonW, width: seasonW,
      season: { season: { playoffs: titles[y] ?? null, wins: 12, losses: 5 } },
    });
    x += seasonW;
    if (offW) {
      blocks.push({ type: "offseason", year: y, x0: x, x1: x + offW, width: offW });
      x += offW;
    }
  }
  return blocks;
}
const yearsFrom = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const titlesAt = (...ys) => Object.fromEntries(ys.map((y) => [y, "Won SB"]));

// ---------------------------------------------------------------------------
// 1. The crown fits the era header band's own air.
// ---------------------------------------------------------------------------
// The band is ERA_HEADER_H tall and its last line of text is the record, on a
// baseline of ERA_RECORD_BASELINE. Everything below that descender is free, and
// the crown has to live inside it — that is the entire reason the mark costs no
// vertical budget when eras are on.
const recordBottom = ERA_RECORD_BASELINE + ERA_RECORD_FS * 0.25; // rough descender
const headerAir = ERA_HEADER_H - recordBottom;
ok(
  CROWN_ZONE <= headerAir,
  `the crown needs ${CROWN_ZONE}px above the lane but the era header only has`
  + ` ${headerAir.toFixed(1)}px of air below its record line — it would strike`
  + ` through the chapter's record`,
);
ok(
  CROWN_H + CROWN_RISE - CROWN_ZONE === 2,
  "the plaque should tuck 2px under the frame's rise so the two read as one mark"
  + ` (H ${CROWN_H} + rise ${CROWN_RISE} - zone ${CROWN_ZONE})`,
);
console.log(`   era header air ${headerAir.toFixed(1)}px vs crown zone ${CROWN_ZONE}px`);

// ---------------------------------------------------------------------------
// 2. Plaques never overlap — swept across the whole width range the ladder can
//    produce, with title runs of every length from 1 to 4.
// ---------------------------------------------------------------------------
function overlaps(crowns) {
  for (let i = 1; i < crowns.length; i++) {
    const a = crowns[i - 1], b = crowns[i];
    if (b.plaqueCx - b.plaqueW / 2 < a.plaqueCx + a.plaqueW / 2 - 0.001) return [a, b];
  }
  return null;
}
let widthCases = 0;
for (let w = ERA_FIT_MIN_SEASON_W; w <= ERA_FIT_MAX_SEASON_W; w++) {
  for (const runLen of [1, 2, 3, 4]) {
    // A run, then a gap year, then a lone title — the case that exercises both
    // merging and the non-mergeable neighbour.
    const runYears = yearsFrom(1990, 1989 + runLen);
    const blocks = makeBlocks({
      years: yearsFrom(1988, 2000),
      titles: titlesAt(...runYears, 1989 + runLen + 2),
      seasonW: w,
    });
    const crowns = buildSuperBowlCrowns({ blocks });
    const bad = overlaps(crowns);
    ok(!bad, `plaques overlap at seasonW=${w}, run of ${runLen}`
      + (bad ? `: ${bad[0].label}@${bad[0].plaqueCx.toFixed(1)} vs ${bad[1].label}@${bad[1].plaqueCx.toFixed(1)}` : ""));
    widthCases++;
  }
}
console.log(`   ${widthCases} width x run-length cases, no plaque overlap`);

// At the narrowest column the ladder allows, two titles separated by one
// ordinary year must still clear WITHOUT nudging — that is the margin the
// merge rule leans on, and it is only 2px.
{
  const blocks = makeBlocks({
    years: yearsFrom(1988, 1996), titles: titlesAt(1990, 1992),
    seasonW: ERA_FIT_MIN_SEASON_W,
  });
  const crowns = buildSuperBowlCrowns({ blocks });
  ok(crowns.length === 2, "two titles one year apart should stay two crowns");
  const need = crowns[0].plaqueW + CROWN_GAP;
  const have = 2 * ERA_FIT_MIN_SEASON_W;
  ok(
    crowns.every((c) => !c.nudged),
    `at the minimum column width (${ERA_FIT_MIN_SEASON_W}px) alternating titles`
    + ` had to be nudged off their own years: a ${crowns[0].plaqueW}px plaque`
    + ` plus ${CROWN_GAP}px gap needs ${need}px but only ${have}px is available.`
    + ` Shrink CROWN_FS / CROWN_PAD / CROWN_MIN_W.`,
  );
  console.log(`   tightest case: ${need}px needed, ${have}px available`
    + ` (${(have - need).toFixed(0)}px margin)`);
}

// ---------------------------------------------------------------------------
// 3. A merged label only ever counts CONSECUTIVE titles.
// ---------------------------------------------------------------------------
for (const w of [ERA_FIT_MIN_SEASON_W, 20, 30, 40, 72]) {
  const blocks = makeBlocks({
    years: yearsFrom(1988, 2000), titles: titlesAt(1990, 1991, 1995), seasonW: w,
  });
  const crowns = buildSuperBowlCrowns({ blocks });
  for (const c of crowns) {
    for (let i = 1; i < c.years.length; i++) {
      ok(
        c.years[i] === c.years[i - 1] + 1,
        `crown "${c.label}" at seasonW=${w} merged non-consecutive seasons`
        + ` ${c.years.join(", ")} — the label would be a lie`,
      );
    }
    ok(c.count === c.years.length, `crown "${c.label}" count disagrees with its years`);
  }
  const total = crowns.reduce((n, c) => n + c.count, 0);
  ok(total === 3, `every title must appear exactly once (seasonW=${w}, got ${total})`);
}

// ---------------------------------------------------------------------------
// 4. Merging is collision-driven, not unconditional.
// ---------------------------------------------------------------------------
{
  // Eras zoom: narrow, no offseason blocks -> back-to-back titles merge.
  const eras = buildSuperBowlCrowns({
    blocks: makeBlocks({
      years: yearsFrom(1988, 1996), titles: titlesAt(1992, 1993),
      seasonW: ERA_FIT_MIN_SEASON_W,
    }),
  });
  ok(eras.length === 1 && eras[0].count === 2,
    `back-to-back titles at the Eras zoom should merge into one plaque, got ${eras.length}`);
  ok(eras[0].label === "SB ×2", `merged label should read "SB ×2", got "${eras[0].label}"`);

  // Seasons zoom: wider columns AND an offseason block between them -> no
  // collision, so each title keeps its own plaque.
  const sw = DESKTOP_GEOMETRY.SEASON_LINES.season.width;
  const seasons = buildSuperBowlCrowns({
    blocks: makeBlocks({
      years: yearsFrom(1988, 1996), titles: titlesAt(1992, 1993),
      seasonW: sw, offW: 116,
    }),
  });
  ok(seasons.length === 2,
    `at the Seasons zoom (${sw}px columns + an offseason block) back-to-back`
    + ` titles have room for their own plaques, got ${seasons.length}`);
  ok(seasons.every((c) => c.label === "SB"), "unmerged crowns should read plain \"SB\"");
  console.log(`   Eras ${ERA_FIT_MIN_SEASON_W}px -> merged; Seasons ${sw}px+offseason -> separate`);
}

// A four-peat at the tightest width collapses all the way, not just pairwise.
{
  const c = buildSuperBowlCrowns({
    blocks: makeBlocks({
      years: yearsFrom(1988, 2000), titles: titlesAt(1990, 1991, 1992, 1993),
      seasonW: ERA_FIT_MIN_SEASON_W,
    }),
  });
  ok(c.length === 1 && c[0].count === 4,
    `a four-peat should collapse to one plaque, got ${c.length} (${c.map((x) => x.label).join(", ")})`);
  // The frame has to actually span the four years it claims.
  const span = c[0].frameX1 - c[0].frameX0;
  ok(span >= 3 * ERA_FIT_MIN_SEASON_W,
    `the merged frame spans ${span.toFixed(1)}px but must cover four columns`);
}

// ---------------------------------------------------------------------------
// 5. Only a Super Bowl earns the label.
// ---------------------------------------------------------------------------
ok(wonSuperBowl("Won SB"), '"Won SB" should be a title');
ok(!wonSuperBowl("Lost SB"), '"Lost SB" is not a title');
ok(!wonSuperBowl("Lost Conf"), '"Lost Conf" is not a title');
ok(!wonSuperBowl(null) && !wonSuperBowl(undefined), "missing finish is not a title");
// palette.js's gold ALSO matches "won champ" so a pre-merger NFL Championship
// keeps its gold frame. It must not get an "SB" plaque.
ok(!wonSuperBowl("Won Champ"), '"Won Champ" is a pre-merger title, not a Super Bowl');
ok(!wonSuperBowl("Won Championship"), '"Won Championship" must not be labelled SB');

// ---------------------------------------------------------------------------
// 6. Plumbing: switched off, never won, and the crowned-year set.
// ---------------------------------------------------------------------------
{
  const blocks = makeBlocks({
    years: yearsFrom(1988, 1996), titles: titlesAt(1992, 1993), seasonW: 30,
  });
  ok(buildSuperBowlCrowns({ blocks, showPlayoffs: false }).length === 0,
    "playoff finishes switched off should produce no crowns");
  ok(buildSuperBowlCrowns({ blocks: makeBlocks({
    years: yearsFrom(1988, 1996), titles: {}, seasonW: 30,
  }) }).length === 0, "a franchise with no titles should produce no crowns");
  ok(buildSuperBowlCrowns({}).length === 0, "missing blocks should not throw");

  const set = crownedYears(buildSuperBowlCrowns({ blocks }));
  ok(set.has(1992) && set.has(1993) && !set.has(1991),
    "crownedYears should list exactly the title seasons, so their own medal"
    + " frame stands down and the crown draws it instead");
}

// The crown's frame width must match the frame SeasonBlock would have drawn —
// a title's frame is the same frame, only taller.
{
  const block = { width: 40 };
  ok(medalFrameWidth(block) === 22, "medalFrameWidth should clamp to 22");
  ok(medalFrameWidth({ width: 12 }) === 10, "a narrow column's frame insets by 2");
  ok(medalFrameWidth({ width: 3 }) === 4, "frame width has a 4px floor");
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL SIMS PASS");
process.exit(failures ? 1 : 0);
