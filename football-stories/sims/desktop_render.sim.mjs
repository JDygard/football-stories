// Headless RENDER simulation of the desktop timeline layer. The node logic sim
// covers the pure layout math; this one mounts the actual SVG components with
// react-dom/server and inspects the markup, which is the only way in this
// sandbox to catch the things the math can't see: NaN coordinates leaking into
// attributes, geometry that overlaps once it's drawn, and paint ORDER (the year
// axis has to come after the ribbons, or connectors bury the year numbers).
//
// Node can't import .jsx directly, so transpile first with the esbuild that
// ships inside vite's dependency tree — no new devDependency:
//
//   npx esbuild sims/desktop_render.sim.mjs --bundle --format=esm \
//     --loader:.js=jsx --jsx=automatic --packages=external \
//     --outfile=.render.mjs && node .render.mjs
//
// The pure-logic sibling, sims/desktop_logic.sim.mjs, runs under plain node.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import DesktopTimelineLayer from "../src/desktop/DesktopTimelineLayer.jsx";
import { buildDesktopLayout } from "../src/desktop/buildDesktopLayout.js";
import { DESKTOP_BANDS, desktopGeometryFor } from "../src/desktop/desktopDetail.js";
import { stripReserveByYear, PEEK } from "../src/desktop/desktopRibbonModel.js";
import {
  OFF_HEADER_W_COMPACT, OFF_HEADER_W_FULL, BANNER_PAD_L, BANNER_PAD_R,
} from "../src/desktop/buildDesktopLayout.js";
import DesktopDraftModule from "../src/desktop/DesktopDraftModule.jsx";
import {
  ERA_HEADER_H, ERA_TEXT_INSET, ERA_BORDER_W, ERA_RAIL_GAP,
  ERA_RECORD_FS,
} from "../src/desktop/desktopEraModel.js";
import { CROWN_H } from "../src/desktop/desktopCrownModel.js";
import { MEDAL_SB } from "../src/palette.js";

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log("FAIL:", msg); } };

const W = 1600, H = 900;

// ---- synthetic franchise ----
const FIRST = 1967, LAST = 2020;
const seasons = [];
for (let y = FIRST; y <= LAST; y++) {
  const games = [];
  for (let i = 0; i < 16; i++) {
    const win = (i + y) % 3 !== 0;
    games.push({
      game_id: `${y}-${i}`, season: y, is_playoff: false,
      result: win ? "W" : "L", points_for: win ? 24 : 13, points_against: win ? 17 : 27,
      franchise_id: "TST", opponent_id: "OPP",
    });
  }
  // Playoff games every other year, starting in the first year in view, so the
  // postseason ROW section is actually exercised at scrollX 0. Odd years that
  // reached the postseason carry only a finish string, exercising the
  // degraded result-strip path.
  if (y % 2 === 0) {
    for (let i = 0; i < 3; i++) {
      games.push({
        game_id: `${y}-p${i}`, season: y, is_playoff: true,
        result: i < 2 ? "W" : "L", points_for: i < 2 ? 31 : 10, points_against: i < 2 ? 14 : 28,
        franchise_id: "TST", opponent_id: "OPP",
      });
    }
  }
  seasons.push({
    year: y, games,
    season: {
      wins: 11, losses: 5, ties: 0,
      playoffs: y % 2 === 0 ? "Won SB" : y % 5 === 0 ? "Lost WC" : null,
      point_diff: y % 2 ? 142 : -87,
      division_finish: y % 3 === 0 ? "1st of 4" : "4th of 4",
    },
  });
}
const draftByYear = {};
for (let y = FIRST; y <= LAST; y++) {
  draftByYear[y] = Array.from({ length: 8 }, (_, i) => ({
    player_id: `p${y}-${i}`, year: y, round: 1 + i, pick_overall: i * 25 + 4,
    // One name short enough to survive the compact column whole and one that
    // isn't, so both halves of the fit ladder are exercised at every band.
    name: i === 0 ? "Ja'Marr Chase" : `Firstname Surname${i}`,
    position: ["WR", "QB", "RB", "OLB", "TE", "CB", "DE", "G"][i],
    value: { score: 40 + i * 6, tier: "BCDAF"[i % 5] },
  }));
}
const moduleData = {
  draftByYear, expandedYears: new Set(),
  onToggleYear: () => {}, onSelectPick: () => {}, tapGuard: () => false,
};
const staff = [];
for (let i = 0; i < 14; i++) {
  staff.push({
    admin_person_id: `s${i}`, name: `Coach Number${i}`, role: ["coach", "gm", "owner"][i % 3],
    from: FIRST + i * 4, to: FIRST + i * 4 + 3,
    exit: i % 2 ? "to_team" : "retired", next_team: "OPP",
    // Arrivals as well as departures, so the ENTRY pill margin is actually
    // populated — that margin is what the era frame has to sit below.
    entry: i % 3 ? "from_team" : "drafted", prev_team: "PRV",
  });
}
const reserveByYear = stripReserveByYear(staff);

// Named Eras, shaped like a curated curated/eras.json team: contiguous where
// the story is contiguous, with a GAP (1971-1979) because not every year has
// to belong to one, and an ongoing era at the end.
const eras = [
  { id: "founding", label: "The Founding Years", short: "Founding", start: 1967, end: 1970,
    record: { wins: 30, losses: 34, ties: 2 } },
  { id: "middle", label: "The Middle Distance", short: "Middle", start: 1980, end: 1999,
    record: { wins: 160, losses: 160, ties: 0 } },
  { id: "one-off", label: "A Single Forgettable Season", start: 2000, end: 2000,
    record: { wins: 4, losses: 12, ties: 0 } },
  { id: "modern", label: "The Modern Era", short: "Modern", start: 2001, end: null, ongoing: true,
    record: { wins: 120, losses: 100, ties: 0 } },
];

const NUMERIC_ATTR = /\b(?:x|y|x1|x2|y1|y2|cx|cy|width|height|rx)="([^"]*)"/g;
const badNumber = (markup) => {
  const bad = [];
  let m;
  while ((m = NUMERIC_ATTR.exec(markup))) {
    if (/nan|infinity|undefined|null/i.test(m[1])) bad.push(m[0]);
  }
  return bad;
};

for (const band of DESKTOP_BANDS) {
  const layout = buildDesktopLayout({
    seasons, modules: [DesktopDraftModule], moduleData, reserveByYear,
    detailBand: band, fitWidth: W,
  });
  const markup = renderToStaticMarkup(
    h("svg", { width: W, height: H },
      h(DesktopTimelineLayer, {
        layout, scrollX: 0, width: W, height: H, band, moduleData, staff,
        pre1967: { wins: 120, losses: 130, ties: 5 },
        adminById: new Map(), onSelectStaff: () => {}, tapGuard: () => false,
        onFollow: () => {}, showWinRate: true, showPlayoffs: true, eras,
      })),
  );
  ok(markup.length > 1000, `${band}: renders something (${markup.length} chars)`);
  const bad = badNumber(markup);
  ok(bad.length === 0, `${band}: no NaN/undefined coordinates (${bad.slice(0, 3).join(" ")})`);

  // Negative geometry is always a bug in this layer — every rect is sized from
  // a lane/zone extent that must resolve positive.
  const negSize = [...markup.matchAll(/\b(?:width|height)="(-[\d.]+)"/g)];
  ok(negSize.length === 0, `${band}: no negative rect sizes (${negSize.slice(0, 3).map((m) => m[0]).join(" ")})`);

  // ---- SUPER BOWL CROWNS -------------------------------------------------
  // The synthetic franchise wins a title every even year, so every line-mode
  // band renders a whole run of them and the alternating (non-merging) case is
  // exercised by construction.
  const geomForCrown = desktopGeometryFor(band);
  // Built from the constants, not hardcoded, so retuning the plaque can't
  // silently turn these assertions into no-ops.
  const PLAQUE_RE = `<rect x="([\\d.]+)" y="([\\d.]+)" width="([\\d.]+)" height="${CROWN_H}" rx="4" fill="${MEDAL_SB}"`;
  const plaques = [...markup.matchAll(new RegExp(PLAQUE_RE, "g"))];
  if (geomForCrown.season.mode === "line") {
    ok(plaques.length > 0, `${band}: Super Bowl crowns render`);
    ok(markup.includes(">SB<") || /SB ×\d/.test(markup),
      `${band}: a crown plaque carries its "SB" label`);

    // PAINT ORDER, same rule as the year axis: the crown's outline and plaque
    // go over the ribbons, which drop through this exact band on their way to
    // the rail. A crown painted under an opaque connector gets struck through.
    const lastRibbonPath = markup.lastIndexOf("<path");
    const firstPlaque = markup.search(new RegExp(PLAQUE_RE));
    ok(lastRibbonPath === -1 || firstPlaque > lastRibbonPath,
      `${band}: crown plaques must paint AFTER the ribbon layer`
      + ` (plaque @${firstPlaque}, last ribbon @${lastRibbonPath})`);

    // A crowned season must not ALSO draw the ordinary medal frame — that
    // would double-stroke the column.
    const goldFrames = [...markup.matchAll(
      new RegExp(`stroke="${MEDAL_SB}" stroke-width="2.5"`, "g"),
    )];
    ok(goldFrames.length === plaques.length,
      `${band}: expected one gold frame per crown, got ${goldFrames.length}`
      + ` frames for ${plaques.length} plaques — a crowned season is drawing`
      + ` its own medal frame as well as the crown's`);

    // The crown must clear the era header's record line. This is the whole
    // premise of borrowing the header's air rather than buying a new row.
    const recordText = /<text x="[\d.]+" y="([\d.]+)"[^>]*font-size="12.5"/.exec(markup);
    if (recordText) {
      const recordBottom = +recordText[1] + ERA_RECORD_FS * 0.25;
      const topPlaque = Math.min(...plaques.map((m) => +m[2]));
      ok(topPlaque >= recordBottom,
        `${band}: a crown plaque at y=${topPlaque.toFixed(1)} strikes through the`
        + ` era record line at y=${recordBottom.toFixed(1)}`);
    }
  } else {
    // Row-mode bands spell the finish out in the game log, so no crown.
    ok(plaques.length === 0,
      `${band}: crowns belong to the line-mode zooms only, found ${plaques.length}`);
  }

  const geom = desktopGeometryFor(band);
  if (geom.offseason === "hidden") {
    // PAINT ORDER: the year axis must come after the last ribbon path, or
    // opaque connectors crossing the axis strip bury the year numbers.
    const lastRibbon = markup.lastIndexOf("<path");
    const firstAxis = markup.indexOf('paint-order="stroke"');
    ok(firstAxis > -1, `${band}: year axis rendered`);
    ok(lastRibbon > -1 && firstAxis > lastRibbon,
      `${band}: axis paints after ribbons (ribbon@${lastRibbon}, axis@${firstAxis})`);
    // and it carries the white halo that keeps it legible over them
    ok(/stroke="#ffffff"[^>]*paint-order="stroke"|paint-order="stroke"/.test(markup),
      `${band}: axis glyphs haloed`);

    // It has to read as a dated AXIS, not scattered captions: a baseline
    // spanning the whole timeline, major ticks, and minor ticks between.
    const baseline = new RegExp(
      `<line x1="0" x2="${layout.totalWidth}"[^>]*stroke="#b6bdc8"`,
    );
    ok(baseline.test(markup), `${band}: axis has a full-width baseline`);
    const majors = [...markup.matchAll(/stroke="#7c8492"/g)].length;
    const minors = [...markup.matchAll(/stroke="#c3c9d2"/g)].length;
    ok(majors > 0, `${band}: labelled major ticks rendered (${majors})`);
    // The axis is SUBDIVIDED — there are more ticks than labels. (How many more
    // depends on the step the window happens to pick; at a 2-year step the
    // subdivision is exactly one minor per major, so don't assert a ratio.)
    ok(minors > 0, `${band}: minor ticks subdivide the labelled step (${minors} minors, ${majors} majors)`);
    // Minor ticks never sit on a labelled year — that would double-strike it.
    ok(minors + majors <= layout.blocks.filter((b) => b.type === "season").length,
      `${band}: no year carries both a major and a minor tick`);
    // Years are set large enough to anchor the view.
    ok(/font-size="15"[^>]*font-weight="700"|font-weight="700"[^>]*font-size="15"/.test(markup),
      `${band}: year labels set as headlines, not captions`);
  } else {
    // The win-rate pill lives INSIDE the banner column now. Find every pill
    // (rx == height/2, filled with the curve color) and check it fits.
    const pills = [...markup.matchAll(
      /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="18" rx="9" fill="#4a6fa5"/g,
    )];
    // Zoom 4 deliberately suppresses the pill — there, games are the subject.
    if (band === "GAME_DETAIL") {
      ok(pills.length === 0, `${band}: win-rate pill suppressed at the game zoom`);
    } else {
      ok(pills.length > 0, `${band}: win-rate pills rendered (${pills.length})`);
    }
    const headerW = geom.offseason === "compact" ? OFF_HEADER_W_COMPACT : OFF_HEADER_W_FULL;
    const innerW = headerW - BANNER_PAD_L - BANNER_PAD_R;
    for (const p of pills.slice(0, 20)) {
      const x = +p[1], w = +p[2];
      const off = layout.blocks.find(
        (b) => b.type === "offseason" && Math.abs(b.x0 + BANNER_PAD_L - x) < 0.01,
      );
      ok(!!off, `${band}: pill at x=${x} starts at the banner's left gutter`);
      ok(w <= innerW + 1e-6, `${band}: pill ${w}px fits the ${innerW}px banner content width`);
    }
    // ---- THE DRAFT ROW IS THE SAME ROW AT EVERY ZOOM --------------------
    // It used to be two designs: tier-coloured boxes carrying a name at
    // SEASON_LINES, transparent rows carrying a pick label and a small grade
    // chip at the two game bands. Whichever band this is, the row now carries
    // all four fields — pick number, name, position, grade — so every one of
    // these assertions runs against every band that shows the draft at all.
    if (geom.offseason !== "hidden") {
      ok(markup.includes(">DRAFT<"), `${band}: draft section labeled`);

      // 1. PICK NUMBER. The gutter is the one thing zoom changes: the compact
      //    column can't afford the round prefix, the full column can. Asserting
      //    the specific form each way is what stops the fallback from silently
      //    becoming permanent (or never firing).
      if (geom.offseason === "compact") {
        ok(markup.includes(">#4<"), `${band}: pick number on the row`);
        ok(!markup.includes(">R1 #4<"),
          `${band}: compact column should drop the round prefix`);
      } else {
        ok(markup.includes(">R1 #4<"), `${band}: round + pick number on the row`);
      }

      // 2. POSITION, in its own slot — never sacrificed to a long name. "OLB"
      //    is the widest real position and belongs to pick 4, whose name
      //    ("Firstname Surname3") is too wide to fit: exactly the case the old
      //    name-suffix ladder used to drop.
      ok(markup.includes(">OLB<"), `${band}: position rendered beside a name that had to abbreviate`);
      ok(markup.includes(">QB<"), `${band}: position rendered`);

      // 3. NAME — whole when it fits, initial form when it doesn't. Both
      //    directions, so neither half can rot into always-abbreviate (which
      //    is what the old character-counting fit looked like from outside).
      ok(markup.includes(">Ja&#x27;Marr Chase<") || markup.includes(">Ja'Marr Chase<"),
        `${band}: a name that fits its row is shown in full`);
      if (geom.offseason === "compact") {
        ok(/>F\. Surname\d+</.test(markup),
          `${band}: a name too wide for the compact row falls back to the initial form`);
      } else {
        ok(/>Firstname Surname\d+</.test(markup),
          `${band}: the full column is wide enough to spell the same name out`);
      }

      // 4. GRADE, as a letter on the row itself rather than a separate chip.
      ok(/>A<|>B<|>C<|>D<|>F</.test(markup), `${band}: grade letter on the row`);
    }
  }

  // ---- game log reads vertically ----
  if (geom.season.mode === "rows") {
    // NOTHING in a game log may be rotated. This is the assertion that actually
    // pins the requirement: the old design drew each game as a column with
    // rotate(-90) score plates, and any regression back toward that shows up
    // here first.
    const rotated = [...markup.matchAll(/rotate\(-?\d/g)];
    ok(rotated.length === 0, `${band}: no rotated text in the timeline (${rotated.length} found)`);

    const seasonBlocks = layout.blocks.filter((b) => b.type === "season");
    // Fixed-width column, independent of how many games were played.
    const colWidths = new Set(seasonBlocks.map((b) => b.width.toFixed(4)));
    ok(colWidths.size === 1, `${band}: season columns all one width (${colWidths.size} distinct)`);

    if (band === "GAME_DETAIL") {
      ok(markup.includes(">SEASON<"), `${band}: log carries a SEASON header`);
      ok(/>POSTSEASON/.test(markup), `${band}: postseason section labeled`);
      // Score plates read straight across: "TST 24" on the left, "17 OPP" right.
      ok(/>TST \d+</.test(markup), `${band}: franchise score plate rendered horizontally`);
      ok(/>\d+ OPP</.test(markup), `${band}: opponent score plate rendered horizontally`);

      // Rows stack strictly downward inside the lane, never past its bottom.
      const rects = [...markup.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#(?:2e9d51|d0423f|b9bdc4)"/g)];
      ok(rects.length > 0, `${band}: game rows rendered (${rects.length})`);
      const byCol = new Map();
      for (const r of rects) {
        const key = r[1];
        if (!byCol.has(key)) byCol.set(key, []);
        byCol.get(key).push({ y: +r[2], h: +r[4] });
      }
      // Pick the busiest column and check its rows are ordered and disjoint.
      const col = [...byCol.values()].sort((a, b) => b.length - a.length)[0];
      col.sort((a, b) => a.y - b.y);
      let overlaps = 0;
      for (let i = 1; i < col.length; i++) {
        if (col[i].y < col[i - 1].y + col[i - 1].h - 0.01) overlaps++;
      }
      ok(overlaps === 0, `${band}: game rows stack without overlapping (${overlaps} overlaps in ${col.length} rows)`);
    } else {
      // Bars only at zoom 3 — the plate backdrops are what to look for, since
      // every row carries the same text in its hover <title> either way.
      ok(!markup.includes('fill="#d0d0d0"'),
        `${band}: score plates suppressed at the season-by-season zoom`);
      ok(markup.includes(">PLAYOFFS<"), `${band}: postseason still labeled, abbreviated`);
    }
  }

  // ---- NAMED ERAS ----
  // The chapter is named, washed AND framed at EVERY rung — plaque, wall label,
  // interior tint and border, all four bands. What handles a border whose
  // vertical edges are off-screen at a fine zoom is not dropping it (the top
  // and bottom edges are what you read there) but the sliding wall label.
  const eraHeaders = [...markup.matchAll(
    new RegExp(
      `<rect x="([\\d.]+)" y="([\\d.]+)" width="([\\d.]+)" height="${ERA_HEADER_H}" data-era-header="([^"]+)"`,
      "g",
    ),
  )];
  const eraWashes = [...markup.matchAll(/data-era-wash="([^"]+)"/g)];
  const eraBorders = [...markup.matchAll(/data-era-frame="([^"]+)"/g)];
  ok(eraBorders.length === eras.length,
    `${band}: ${eraBorders.length} era borders, expected ${eras.length}`);
  {
    ok(eraHeaders.length === eras.length,
      `${band}: one frame per era (${eraHeaders.length} of ${eras.length})`);
    ok(eraWashes.length === eras.length,
      `${band}: one interior wash per era (${eraWashes.length} of ${eras.length})`);
    // PAINT ORDER: every wash goes under the year columns / win-rate curve,
    // every header band over them. If the two passes ever collapse back into
    // one, this is what catches it.
    ok(markup.indexOf('data-era-wash') < markup.indexOf('data-era-header'),
      `${band}: era wash paints before the era frame`);
    // Each era is a DIFFERENT tone — adjacent chapters must be tellable apart.
    const toneFills = [...markup.matchAll(
      new RegExp(`height="${ERA_HEADER_H}" data-era-header="[^"]+" fill="([^"]+)"`, "g"),
    )].map((m) => m[1]);
    ok(new Set(toneFills).size === eras.length,
      `${band}: every era carries its own tone (${new Set(toneFills).size} distinct of ${eras.length})`);
    // …but subtly: the header tint stays within a whisker of white.
    ok(toneFills.every((f) => /hsl\(\d+ [\d.]+% 9[5-9](\.\d+)?%\)/.test(f)),
      `${band}: era tints stay subtle (${toneFills[0]})`);
    ok(markup.includes(">The Middle Distance<"), `${band}: era titles rendered`);
    ok(markup.includes(">1980–1999<"), `${band}: era year range rendered`);
    ok(markup.includes(">2001–now<"), `${band}: an ongoing era reads as -now`);

    // THE standardized gutter. Every line of era text — years eyebrow, accent
    // rule, title — starts exactly ERA_TEXT_INSET from its own frame's left
    // border. This is the assertion that pins it: a proportional anchor would
    // put each frame's text at a different offset and every one of these would
    // fail.
    const titles = [...markup.matchAll(/<text x="([\d.]+)" y="[\d.]+" data-era-title="/g)]
      .map((m) => +m[1]);
    ok(titles.length > 0, `${band}: era titles anchored`);
    ok(markup.includes('text-anchor="start"'), `${band}: era text is left-aligned`);
    const frames = eraHeaders.map((m) => ({ x: +m[1], w: +m[3] }));
    const gutterOf = (tx) => {
      const owner = frames.filter((hd) => tx >= hd.x && tx < hd.x + hd.w);
      return owner.length === 1 ? tx - owner[0].x : null;
    };
    for (const tx of titles) {
      ok(gutterOf(tx) === ERA_TEXT_INSET,
        `${band}: title at x=${tx} sits ${gutterOf(tx)}px in (want ${ERA_TEXT_INSET})`);
    }
    const eyebrows = [...markup.matchAll(/<text x="([\d.]+)" y="[\d.]+" data-era-years="/g)]
      .map((m) => +m[1]);
    // The record line: same gutter, under the title, and only where a title is.
    const records = [...markup.matchAll(/<text x="([\d.]+)" y="([\d.]+)" data-era-record="/g)]
      .map((m) => ({ x: +m[1], y: +m[2] }));
    const titleYs = [...markup.matchAll(/<text x="[\d.]+" y="([\d.]+)" data-era-title="/g)]
      .map((m) => +m[2 - 1]);
    ok(records.length > 0, `${band}: era records rendered`);
    // Plaque text is black ink — the era's tone lives in the border and wash,
    // not in the words.
    ok(!/data-era-(?:title|years|record)="[^"]+"[^>]*fill="hsl\(/.test(markup),
      `${band}: no plaque text is tinted`);
    ok(/data-era-title="[^"]+"[^>]*fill="#111111"/.test(markup),
      `${band}: era titles are black`);
    ok(records.length <= titles.length,
      `${band}: no record without a title (${records.length} records, ${titles.length} titles)`);
    ok(markup.includes(">160-160<"), `${band}: a tieless record reads W-L`);
    ok(markup.includes(">30-34-2<"), `${band}: a record with ties reads W-L-T`);
    // A record is EITHER inline with the title (right of it, same baseline) or
    // stacked on the standard gutter a line below. Never anywhere else.
    for (const r of records) {
      const inline = titleYs.includes(r.y);
      if (inline) {
        ok(gutterOf(r.x) > ERA_TEXT_INSET,
          `${band}: inline record at x=${r.x} sits right of the gutter`);
      } else {
        ok(gutterOf(r.x) === ERA_TEXT_INSET,
          `${band}: stacked record at x=${r.x} shares the gutter (${gutterOf(r.x)})`);
      }
    }
    ok(records.some((r) => titleYs.includes(r.y)),
      `${band}: at least one record rides the title's line`);
    // Every mark still lands inside its own frame.
    for (const r of records) ok(gutterOf(r.x) !== null, `${band}: record inside a frame`);
    // Painted with the rest of the label — after the ribbons, haloed.
    ok(markup.indexOf('data-era-record=') > markup.lastIndexOf('<path'),
      `${band}: the record paints after the ribbons`);
    for (const ex of eyebrows) {
      ok(gutterOf(ex) === ERA_TEXT_INSET,
        `${band}: years eyebrow at x=${ex} shares the gutter (${gutterOf(ex)})`);
    }
    // …and the whole label block is one column: the accent rule starts there too.
    const rules = [...markup.matchAll(/<line x1="([\d.]+)" x2="[\d.]+" y1="[\d.]+" y2="[\d.]+" data-era-rule="/g)]
      .map((m) => +m[1]);
    // The rule appears wherever any text does — and nowhere else, so a frame
    // too narrow for even its years stays a bare tinted chapter rather than
    // carrying an orphan tick. Same x as the text, by construction.
    const textXs = new Set([...titles, ...eyebrows]);
    ok(textXs.size > 0 && new Set(rules).size === textXs.size,
      `${band}: an accent rule wherever there's a label (${new Set(rules).size} of ${textXs.size})`);
    ok([...textXs].every((x) => rules.includes(x)),
      `${band}: every label column carries its rule`);
    for (const rx of rules) {
      ok(gutterOf(rx) === ERA_TEXT_INSET,
        `${band}: accent rule at x=${rx} shares the gutter (${gutterOf(rx)})`);
    }

    // Each frame encloses whole years: it opens on its first year's offseason
    // block and closes on its last year's season block.
    const edge = (year, side) => {
      const cell = layout.byYear.get(year);
      return side === "start" ? cell.offseason.x0 : cell.season.x1;
    };
    const spans = [[1967, 1970], [1980, 1999], [2000, 2000], [2001, LAST]];
    const sortedHeaders = eraHeaders.map((m) => ({ x: +m[1], y: +m[2], w: +m[3] }))
      .sort((a, b) => a.x - b.x);
    spans.forEach(([y0, y1], i) => {
      const hdr = sortedHeaders[i];
      ok(Math.abs(hdr.x - edge(y0, "start")) < 0.01,
        `${band}: era ${y0}-${y1} frame opens on ${y0}'s offseason`);
      ok(Math.abs(hdr.x + hdr.w - edge(y1, "end")) < 0.01,
        `${band}: era ${y0}-${y1} frame closes on ${y1}'s season`);
    });
    // Frames are disjoint, and the gap year range (1971-1979) carries none.
    for (let i = 1; i < sortedHeaders.length; i++) {
      ok(sortedHeaders[i].x >= sortedHeaders[i - 1].x + sortedHeaders[i - 1].w - 0.01,
        `${band}: era frames don't overlap`);
    }
    const gapMid = (edge(1971, "start") + edge(1979, "end")) / 2;
    ok(!sortedHeaders.some((hd) => gapMid > hd.x && gapMid < hd.x + hd.w),
      `${band}: an unauthored stretch of years has no frame`);

    const lastRibbonAt = markup.lastIndexOf('<path');
    const firstTitleAt = markup.indexOf('data-era-title=');
    ok(firstTitleAt > lastRibbonAt,
      `${band}: era labels paint after the ribbons (ribbon@${lastRibbonAt}, label@${firstTitleAt})`);

    // ---- THE BORDER'S GEOMETRY ----
    // Drawn at every rung now, so measured at every rung: it encloses the
    // seasons AND the personnel rail's tenure bands, and stops clear of them.
    {
      // ---- the frame's vertical extent ----
      // A chapter encloses its whole seasons AND the personnel rail's tenure
      // bands — the people who served in an era are inside its frame — but stops
      // at the bottom of the last band. Below that is the peek and the exit
      // pills: a career leaving, which belongs to the person, not to the chapter
      // they're walking out of.
      const frameRects = [...markup.matchAll(
        /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" data-era-frame="/g,
      )].map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
      ok(frameRects.length === eras.length,
        `${band}: one bordered frame per era (${frameRects.length})`);
      const frameTop = Math.min(...frameRects.map((f) => f.y));
      const frameBottom = Math.max(...frameRects.map((f) => f.y + f.h));
      const railZoneM = /<rect x="0" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="#eceef3"/
        .exec(markup);
      const railTopY = +railZoneM[1];
      const railZoneBottom = railTopY + +railZoneM[2];
      // The zone runs PEEK + 4 past the last band, so that's where the bands end.
      const lastBandBottom = railZoneBottom - PEEK - 4;
      ok(frameBottom > railTopY,
        `${band}: frame reaches down INTO the personnel rail (${frameBottom.toFixed(1)} vs ${railTopY})`);
      // frameBottom is the stroke's CENTRELINE; what has to clear the bands is
      // its near edge, and what has to stay inside the rail zone is its far one.
      const borderNear = frameBottom - ERA_BORDER_W / 2;
      const borderFar = frameBottom + ERA_BORDER_W / 2;
      ok(borderNear - lastBandBottom >= ERA_RAIL_GAP - 0.01,
        `${band}: ${(borderNear - lastBandBottom).toFixed(2)}px clear below the last band (want >= ${ERA_RAIL_GAP})`);
      ok(borderNear - lastBandBottom < ERA_RAIL_GAP + 2,
        `${band}: …and not a yawning gap (${(borderNear - lastBandBottom).toFixed(2)}px)`);
      ok(borderFar <= railZoneBottom + 0.01,
        `${band}: …and stops above the exit peek (${borderFar.toFixed(1)} vs ${railZoneBottom.toFixed(1)})`);
      // Ribbons ARRIVE from outside the frame: every ribbon path starts at
      // "M x topY", and the topmost of those is above the frame's top edge.
      const ribbonTops = [...markup.matchAll(/ d="M ([\d.-]+) ([\d.-]+)/g)].map((m) => +m[2]);
      ok(ribbonTops.length > 0, `${band}: ribbons rendered`);
      ok(Math.min(...ribbonTops) < frameTop,
        `${band}: incoming ribbons enter from above the frame (${Math.min(...ribbonTops).toFixed(1)} vs ${frameTop.toFixed(1)})`);
      // PAINT ORDER: because those connectors drop straight through the plaque
      // band, the label has to be painted AFTER the last ribbon path — and
      // haloed — or an opaque connector strikes a title clean through. Same
      // requirement the year axis has.
      // The BORDER too — it now crosses the rail's opaque tenure bands, and a
      // line painted under them would break at every boundary a tenure spans.
      ok(markup.indexOf('data-era-frame=') > lastRibbonAt,
        `${band}: the frame border paints after the ribbons it crosses`);
    }
    ok(/data-era-title="[^"]+" font-size="[\d.]+" font-weight="\d+" text-anchor="start" fill="[^"]+" stroke="#ffffff"/
      .test(markup), `${band}: era titles carry a white halo`);
    // The tint and the plaque's band still paint BEFORE everything.
    ok(markup.indexOf('data-era-header=') < lastRibbonAt,
      `${band}: the plaque band itself stays under the ribbons`);
    ok(markup.indexOf('data-era-wash=') < markup.indexOf('<path'),
      `${band}: the interior tint stays under the ribbons`);

    // The plaque is a ROW, not an overlay: the year "paper" columns and the
    // ribbon pills must all start BELOW it, or the titles get drawn over.
    const headerTop = sortedHeaders[0].y;
    const headerBottom = headerTop + ERA_HEADER_H;
    const paper = [...markup.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="[\d.]+" fill="#fbfbfa"/g)];
    for (const pr of paper.slice(0, 30)) {
      ok(+pr[1] >= headerBottom - 0.01,
        `${band}: year column starts below the era header (${pr[1]} vs ${headerBottom})`);
    }
    ok(paper.length > 0 || band === "ERA_SUMMARY",
      `${band}: year columns present to check against the header`);
  }

  // The rail zone must be a single full-width strip, not per-column paper.
  ok(markup.includes('fill="#eceef3"'), `${band}: personnel rail has its own zone`);
}

// ---- short window: the banner stack must fit its own lane ----
// The lane floor (LANE_MIN) exists to clear the banner's year headline + facts
// + ALL-TIME section. On a short viewport the lane bottoms out at that floor,
// so this is where the stack overflows if the floor drifts below the content.
for (const H2 of [360, 460]) {
  const band = "SEASON_LINES";
  const layout = buildDesktopLayout({
    seasons, modules: [DesktopDraftModule], moduleData, reserveByYear,
    detailBand: band, fitWidth: W,
  });
  const markup = renderToStaticMarkup(
    h("svg", { width: W, height: H2 },
      h(DesktopTimelineLayer, {
        layout, scrollX: 0, width: W, height: H2, band, moduleData, staff,
        pre1967: { wins: 120, losses: 130, ties: 5 },
        adminById: new Map(), onSelectStaff: () => {}, tapGuard: () => false,
        onFollow: () => {}, showWinRate: true, showPlayoffs: true, eras,
      })),
  );
  ok(badNumber(markup).length === 0, `short window ${H2}px: no NaN coordinates`);
  ok([...markup.matchAll(/\b(?:width|height)="(-[\d.]+)"/g)].length === 0,
    `short window ${H2}px: no negative rect sizes`);
  // The win-rate pill is the last thing in the banner stack. Its bottom edge —
  // plus the record line under it — has to stay above the lane's bottom, which
  // is where the personnel rail zone begins.
  const pill = /<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="18" rx="9" fill="#4a6fa5"/.exec(markup);
  const railZone = /<rect x="0" y="([\d.]+)" width="[\d.]+" height="[\d.]+" fill="#eceef3"/.exec(markup);
  ok(!!pill && !!railZone, `short window ${H2}px: banner pill and rail zone both render`);
  if (pill && railZone) {
    const pillRecordBottom = +pill[1] + 18 + 12; // pill + the record line beneath it
    ok(pillRecordBottom < +railZone[1],
      `short window ${H2}px: banner stack stays clear of the rail (${pillRecordBottom.toFixed(1)} vs ${(+railZone[1]).toFixed(1)})`);
  }
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL RENDER SIMS PASS");
process.exit(failures ? 1 : 0);
