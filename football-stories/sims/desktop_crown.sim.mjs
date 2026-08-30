// Node simulation of the crown model (vite build can't run in the sandbox).
// Crowns are the only marks allowed to leave the timeline lane, so the things
// worth asserting are all about the space they take and the claims they make:
//
//   1. They fit the era header's air, so turning Named Eras on doesn't shove
//      the timeline down when a franchise happens to have won something.
//   2. Plaques never overlap, at any column width the ladder can produce —
//      INCLUDING the dense mixed-tier case, which is the one the three-tier
//      design actually risks.
//   3. "SB xN" only ever means N CONSECUTIVE seasons, all of one tier.
//   4. Merging is collision-driven — the Seasons zoom, where there is room,
//      keeps one plaque per year.
//   5. Each tier claims exactly what it should: a pre-merger championship is
//      never "SB", a division title never overwrites a playoff exit.
//
// Run: node sims/desktop_crown.sim.mjs

import {
  buildCrowns, crownedYears, wonSuperBowl, wonConference, wonDivision,
  crownTierFor, medalFrameWidth, plaqueWidth, CROWN_TIERS,
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
function makeBlocks({ years, titles, divisions = {}, seasonW, offW = 0 }) {
  const blocks = [];
  let x = 0;
  for (const y of years) {
    blocks.push({
      type: "season", year: y, x0: x, x1: x + seasonW, width: seasonW,
      season: { season: {
        playoffs: titles[y] ?? null,
        division_finish: divisions[y] ?? "3rd of 4",
        wins: 12, losses: 5,
      } },
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
const finishAt = (label, ...ys) => Object.fromEntries(ys.map((y) => [y, label]));
const divTitlesAt = (...ys) => finishAt("1st of 4", ...ys);

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
    const crowns = buildCrowns({ blocks });
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
  const crowns = buildCrowns({ blocks });
  ok(crowns.length === 2, "two titles one year apart should stay two crowns");
  const need = crowns[0].plaqueW + CROWN_GAP;
  const have = 2 * ERA_FIT_MIN_SEASON_W;
  ok(
    crowns.every((c) => !c.nudged),
    `at the minimum column width (${ERA_FIT_MIN_SEASON_W}px) alternating SUPER BOWLS`
    + ` had to be nudged off their own years: a ${crowns[0].plaqueW}px plaque`
    + ` plus ${CROWN_GAP}px gap needs ${need}px but only ${have}px is available.`
    + ` Shrink the sb tier's fs / pad / minW.`,
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
  const crowns = buildCrowns({ blocks });
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
  const eras = buildCrowns({
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
  const seasons = buildCrowns({
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
  const c = buildCrowns({
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
  ok(buildCrowns({ blocks, showPlayoffs: false }).length === 0,
    "playoff finishes switched off should produce no crowns");
  ok(buildCrowns({ blocks: makeBlocks({
    years: yearsFrom(1988, 1996), titles: {}, seasonW: 30,
  }) }).length === 0, "a franchise with no titles should produce no crowns");
  ok(buildCrowns({}).length === 0, "missing blocks should not throw");

  const set = crownedYears(buildCrowns({ blocks }));
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

// ---------------------------------------------------------------------------
// 7. THREE TIERS: precedence, what each one claims, and what it takes over.
// ---------------------------------------------------------------------------
ok(CROWN_TIERS.map((t) => t.id).join(",") === "sb,conf,div", "tiers are ordered best-first");
ok(CROWN_TIERS[0].rises && CROWN_TIERS[1].rises && !CROWN_TIERS[2].rises,
   "gold and silver take the frame up with them; copper is a cap only");
// Heights descend with the tier — the hierarchy has to read before the label does.
ok(CROWN_TIERS.every((t, i) => i === 0 || t.h < CROWN_TIERS[i - 1].h),
   "a lesser win must not wear a taller cap");
ok(CROWN_TIERS[0].h === CROWN_H, "the tallest tier defines CROWN_H, which is what the zone is sized for");
// ONE OBJECT, THREE SIZES. The type steps down with the height, so a lesser cap
// is smaller in both dimensions a reader actually judges rank by. Width cannot
// join in — "CONF" is four letters and "SB" is two — which is exactly why the
// other two have to.
ok(CROWN_TIERS.every((t, i) => i === 0 || t.fs < CROWN_TIERS[i - 1].fs),
   "a lesser win must not wear larger type");
for (const t of CROWN_TIERS) {
  ok(t.fs > 8, `${t.id} type is ${t.fs}px — below about 9 an uppercase chip stops being readable`);
  ok(t.pad > 0 && t.minW > 0, `${t.id} needs a padding and a floor width`);
}
// PER-TIER TIGHTEST CASE. Two wins one year apart at the narrowest column the
// ladder produces. Gold has to clear it; silver provably cannot at any legible
// size, and takes a small nudge instead (see the tier table's note).
{
  const have = 2 * ERA_FIT_MIN_SEASON_W;
  const margins = {};
  for (const t of CROWN_TIERS) margins[t.id] = have - plaqueWidth(t, t.label) - CROWN_GAP;
  ok(margins.sb >= 2,
    `the gold cap needs ${plaqueWidth(CROWN_TIERS[0], "SB") + CROWN_GAP}px between alternating`
    + ` titles but only ${have}px is available — shrink CROWN_FS / its pad / minW`);
  ok(margins.div >= 0, `the copper cap no longer fits between alternating division titles`
    + ` (margin ${margins.div})`);
  ok(margins.conf > -12,
    `the silver cap overlaps by ${-margins.conf}px between alternating conference wins.`
    + ` A few px is a nudge nobody sees; this much is a label sitting on its neighbour`);
  console.log("   tightest-case margins at "
    + `${ERA_FIT_MIN_SEASON_W}px columns: `
    + CROWN_TIERS.map((t) => `${t.id} ${margins[t.id] >= 0 ? "+" : ""}${margins[t.id]}`).join("  "));
}

// The predicates, and the seams between them.
ok(wonConference("Lost SB"), "reaching the Super Bowl and losing it IS winning the conference");
ok(!wonConference("Won SB"), "a Super Bowl winner is resolved by precedence, not by this predicate");
ok(!wonConference("Lost Conf"), '"Lost Conf" lost the conference final — it won nothing');
ok(!wonConference("Lost Champ"), "a pre-merger championship game is not a conference final");
ok(wonDivision("1st of 4") && wonDivision("1st of 6"), "first in the division is the title");
ok(!wonDivision("2nd of 4") && !wonDivision("4th of 4"), "any other place is not");
ok(!wonDivision(null) && !wonDivision("") && !wonDivision("1 of"), "junk is not a title");

// PRECEDENCE: one cap per season, the highest it earned.
const tierOf = (playoffs, division_finish) => crownTierFor({ playoffs, division_finish })?.id ?? null;
ok(tierOf("Won SB", "1st of 4") === "sb", "a Super Bowl winner wears gold, not three caps");
ok(tierOf("Lost SB", "1st of 4") === "conf", "a conference winner wears silver, not copper too");
ok(tierOf("Lost Conf", "1st of 4") === "div", "losing the conference final still won the division");
ok(tierOf("Lost WC", "1st of 4") === "div", "a division winner who went out early still won the division");
ok(tierOf("Lost WC", "2nd of 4") === null, "a wild card that won nothing gets no cap");
ok(tierOf(null, "1st of 4") === "div", "a division title needs no playoff row at all");
ok(tierOf("Won Champ", "1st of 4") === "div",
   'a pre-merger championship is not an SB and not a conference — it falls through to what it can prove');

// A DIVISION CAP MUST NOT TAKE THE FRAME. Its season's playoff exit is a
// different fact, and the frame is where that fact is written.
{
  const blocks = makeBlocks({
    years: yearsFrom(1988, 1996),
    titles: { ...titlesAt(1992), ...finishAt("Lost WC", 1990) },
    divisions: divTitlesAt(1990, 1992),
    seasonW: 30,
  });
  const crowns = buildCrowns({ blocks, medalFor: (s2) => (s2.playoffs === "Lost WC" ? "#2b2b2b" : null) });
  const div = crowns.find((c) => c.tier === "div");
  const sb = crowns.find((c) => c.tier === "sb");
  ok(!!div && !!sb, "both a division cap and a Super Bowl crown should be built");
  const set = crownedYears(crowns);
  ok(set.has(1992), "a Super Bowl season hands its frame to the crown");
  ok(!set.has(1990), "a division season keeps its own frame — the cap is not the frame");
}

// ---------------------------------------------------------------------------
// 8. MIXED TIERS: they never merge, and they never overlap.
// ---------------------------------------------------------------------------
{
  const blocks = makeBlocks({
    years: yearsFrom(1988, 1996),
    titles: titlesAt(1993),
    divisions: divTitlesAt(1992, 1993),
    seasonW: ERA_FIT_MIN_SEASON_W,
  });
  const crowns = buildCrowns({ blocks });
  ok(crowns.length === 2, `a division title next to a Super Bowl is two claims, got ${crowns.length}`);
  ok(crowns.every((c) => c.count === 1), "a mixed pair must never merge into one label");
  ok(crowns.map((c) => c.tier).join(",") === "div,sb", "…and each keeps its own tier");
}

// THE DENSITY SWEEP — the case the "all three at both zooms" decision creates.
// A franchise that wins its division most years, with conference runs and a
// title inside them, at every column width the ladder can produce. Plaques must
// still not overlap, and a nudged cap must not drift so far from its own column
// that the stem stops being an explanation.
{
  const years = yearsFrom(1988, 2012);
  const divisions = divTitlesAt(1990, 1991, 1992, 1994, 1996, 1998, 1999, 2003, 2005, 2006, 2007, 2009);
  const titles = { ...titlesAt(1996), ...finishAt("Lost SB", 1991, 2006, 2007) };
  let worstDrift = 0;
  let cases = 0;
  for (let w = ERA_FIT_MIN_SEASON_W; w <= ERA_FIT_MAX_SEASON_W; w++) {
    const crowns = buildCrowns({ blocks: makeBlocks({ years, titles, divisions, seasonW: w }) });
    const bad = overlaps(crowns);
    ok(!bad, `dense mixed tiers overlap at seasonW=${w}`
      + (bad ? `: ${bad[0].label}@${bad[0].plaqueCx.toFixed(1)} vs ${bad[1].label}@${bad[1].plaqueCx.toFixed(1)}` : ""));
    for (const c of crowns) worstDrift = Math.max(worstDrift, Math.abs(c.plaqueCx - c.cx));
    cases++;
  }
  ok(worstDrift <= 2 * CROWN_MIN_W,
    `a cap drifted ${worstDrift.toFixed(1)}px from its own column. separate() pushes`
    + ` rightward and cascades, so a dense mixed run can walk the labels away from`
    + ` the years they describe — if this trips, the tiers need thinning at the`
    + ` Eras zoom rather than a bigger tolerance`);
  console.log(`   ${cases} dense mixed-tier widths, worst cap drift ${worstDrift.toFixed(1)}px`);
}

// Every tier merges within itself, and says so.
for (const [id, finishArgs] of [["div", null], ["conf", null]]) {
  const years = yearsFrom(1988, 1996);
  const blocks = makeBlocks({
    years,
    titles: id === "conf" ? finishAt("Lost SB", 1992, 1993) : {},
    divisions: id === "div" ? divTitlesAt(1992, 1993) : {},
    seasonW: ERA_FIT_MIN_SEASON_W,
  });
  const crowns = buildCrowns({ blocks });
  const tier = CROWN_TIERS.find((t) => t.id === id);
  ok(crowns.length === 1 && crowns[0].count === 2,
    `back-to-back ${id} wins should merge at the Eras zoom, got ${crowns.length}`);
  ok(crowns[0].label === `${tier.label} ×2`,
    `merged ${id} label should read "${tier.label} ×2", got "${crowns[0].label}"`);
  void finishArgs;
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL SIMS PASS");
process.exit(failures ? 1 : 0);
