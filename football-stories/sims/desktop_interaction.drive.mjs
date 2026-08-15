// Drives sims/desktop_interaction.html in a real Chromium and asserts that the
// desktop timeline's CLICKS actually reach their targets.
//
// Why this exists as a third sim. desktop_logic covers the layout math and
// desktop_render covers the markup, and both passed while the app was
// unclickable: the geometry was right, the handlers were attached to the right
// nodes, and yet nothing happened. The cause was browser event routing — while
// a pointer is captured, Chrome retargets the compatibility mouse events
// (including `click`) to the capturing element, so clicks landed on the scroll
// container rather than the ribbon or pill under the cursor. Nothing short of a
// real browser reproduces that.
//
//   npx esbuild sims/desktop_interaction.sim.jsx --bundle --loader:.js=jsx \
//     --jsx=automatic --outfile=sims/.harness.js
//   node sims/desktop_interaction.drive.mjs
//
// Needs Playwright's Chromium (npx playwright install chromium). Optional, in
// the sense that the harness page itself can also just be opened and clicked by
// hand — but keep this runnable, because "it renders correctly" and "it works"
// turned out to be very different claims.

import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const HARNESS = pathToFileURL(
  path.join(process.cwd(), "sims", "desktop_interaction.html"),
).href;

let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? "PASS: " : "FAIL: ") + msg);
  if (!cond) failures++;
};

// The timeline's native horizontal scroller — found in-page by geometry rather
// than by selector, so the harness doesn't need a test hook in the app.
const scrollBy = (page, dx) =>
  page.evaluate((d) => {
    for (const el of document.querySelectorAll("div")) {
      if (el.scrollWidth > el.clientWidth + 10) {
        el.scrollLeft += d;
        return el.scrollLeft;
      }
    }
    return null;
  }, dx);
const scrollLeft = (page) => scrollBy(page, 0);

// Scroll the timeline until `locator` sits near viewport x = targetX. The SVG
// is a sticky viewport-width overlay over a totalWidth spacer, so content far
// from the current scroll position reports an off-screen box and cannot be
// clicked until it's scrolled in.
async function bringIntoView(page, locator, targetX) {
  for (let i = 0; i < 8; i++) {
    const box = await locator.boundingBox();
    if (!box) return null;
    const delta = box.x - targetX;
    if (Math.abs(delta) < 6) return box;
    await scrollBy(page, delta);
    await page.waitForTimeout(160);
  }
  return locator.boundingBox();
}

// PW_CHROMIUM lets a sandbox point at a Chromium that's already on disk when it
// doesn't match the installed Playwright's expected build.
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
await page.goto(HARNESS);
await page.waitForTimeout(900);

ok(pageErrors.length === 0, `no page errors: ${pageErrors.slice(0, 2).join(" | ")}`);

const card = () => page.locator('button[aria-label="Close"]');
const closeCard = async () => {
  if (await card().count()) {
    await card().first().click();
    await page.waitForTimeout(200);
  }
};

// ---- 1. clicking a personnel ribbon opens its info card ----
const band = page.locator("path[stroke='#111']").first();
ok((await band.count()) > 0, "ribbon band rendered");
const bandBox = await bringIntoView(page, band, 200);
// The ribbon path is an L/Z shape, so its bbox centre is mostly empty. Aim at
// the horizontal tenure band, which rides inside the rail zone — that zone's
// own rect gives a reliable y.
const rail = page.locator('rect[fill="#eceef3"]').first();
const railBox = (await rail.count()) ? await rail.boundingBox() : null;
ok(railBox != null, "personnel rail zone rendered");
if (bandBox && railBox) {
  await page.mouse.click(bandBox.x + 120, railBox.y + 12);
  await page.waitForTimeout(450);
}
ok((await card().count()) > 0, "clicking a ribbon opens the info card");
await closeCard();

// ---- 2. clicking a named draft grade box opens that player's card ----
const pick = page.locator("text=D. Player").first();
if ((await pick.count()) > 0) {
  const pickBox = await bringIntoView(page, pick, 400);
  if (pickBox) {
    await page.mouse.click(pickBox.x + pickBox.width / 2, pickBox.y + pickBox.height / 2);
    await page.waitForTimeout(450);
  }
  ok((await card().count()) > 0, "clicking a draft grade box opens the player card");
  await closeCard();
} else {
  ok(false, "draft grade box rendered");
}

// ---- 2b. cards stack on the shelf instead of replacing each other ----
// The desktop card is docked, not floating: opening a second must not dismiss
// the first (the old outside-click dismiss would have), re-opening the same
// person must not duplicate, and each × must close only its own card.
{
  const ribbonBox = await bringIntoView(page, band, 200);
  if (ribbonBox && railBox) {
    await page.mouse.click(ribbonBox.x + 120, railBox.y + 12);
    await page.waitForTimeout(400);
  }
  const afterRibbon = await card().count();
  const pick2 = page.locator("text=D. Player").first();
  const pick2Box = await bringIntoView(page, pick2, 400);
  if (pick2Box) {
    await page.mouse.click(pick2Box.x + pick2Box.width / 2, pick2Box.y + pick2Box.height / 2);
    await page.waitForTimeout(400);
  }
  ok((await card().count()) === afterRibbon + 1,
    `opening a second card keeps the first (${afterRibbon} -> ${await card().count()})`);

  // Re-clicking the same draft box must not add a duplicate.
  const beforeDup = await card().count();
  if (pick2Box) {
    const again = await pick2.boundingBox();
    if (again) {
      await page.mouse.click(again.x + again.width / 2, again.y + again.height / 2);
      await page.waitForTimeout(350);
    }
  }
  ok((await card().count()) === beforeDup, "re-opening the same card does not duplicate it");

  // Clicking the timeline background must NOT dismiss anything.
  await page.mouse.click(900, 60);
  await page.waitForTimeout(250);
  ok((await card().count()) === beforeDup, "clicking elsewhere leaves the open cards alone");

  // Each × closes exactly one.
  await card().first().click();
  await page.waitForTimeout(250);
  ok((await card().count()) === beforeDup - 1, "the × closes one card, not all of them");
  await page.locator("text=Close all").first().click().catch(() => {});
  await page.waitForTimeout(250);
  await closeCard();
  ok((await card().count()) === 0, "all cards can be dismissed");
}

// ---- 3. clicking a "To <team>" pill follows the career ----
await page.evaluate(() => {
  window.__events = [];
});
const pill = page.locator("text=Seahawks →").first();
ok((await pill.count()) > 0, "destination pill rendered");
const pillBox = await bringIntoView(page, pill, 500);
ok(pillBox != null, "destination pill can be scrolled into view");
if (pillBox) {
  await page.mouse.click(pillBox.x + pillBox.width / 2, pillBox.y + pillBox.height / 2);
  await page.waitForTimeout(350);
}
const follows = (await page.evaluate(() => window.__events)).filter((e) => e.type === "follow");
ok(follows.length > 0, "clicking a team link fires onFollow");
ok(follows[0]?.detail?.team === "SEA",
  `onFollow targets the destination team (got ${follows[0]?.detail?.team})`);

// ---- 4. dragging still pans, and swallows its own trailing click ----
// This is the other half of the capture fix: capture now happens on the first
// drag move rather than on press, so a real drag must still pan AND must not
// leave a stray click that opens a card.
await closeCard();
await page.evaluate(() => {
  window.__events = [];
});
const before = await scrollLeft(page);
if (railBox) {
  await page.mouse.move(700, railBox.y + 12);
  await page.mouse.down();
  for (let x = 690; x >= 500; x -= 38) {
    await page.mouse.move(x, railBox.y + 12);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}
const after = await scrollLeft(page);
ok(after > before, `mouse drag pans the timeline (${before} -> ${after})`);
ok((await card().count()) === 0, "a drag does not leave a trailing click that opens a card");

// ---- 5. the shell: team changes hold the chrome and sweep the timeline ----
// Second harness, because these only show up across a real data load: it mounts
// the whole DesktopApp with a deliberately slow stubbed fetch.
const SHELL = pathToFileURL(
  path.join(process.cwd(), "sims", "desktop_shell.html"),
).href;
await page.goto(SHELL);
await page.waitForTimeout(1200);

// Sample every animation frame: does the control dock we started with stay in
// the document, and which sweep class is on the timeline pane?
const startRecording = () =>
  page.evaluate(() => {
    const dock = document.querySelector("aside");
    window.__rec = { dockLost: 0, headerLost: 0, classes: [], frames: 0, travel: {} };
    const header = dock ? dock.parentElement.firstElementChild : null;
    const tick = () => {
      const r = window.__rec;
      r.frames++;
      if (!dock || !document.contains(dock)) r.dockLost++;
      if (!header || !document.contains(header)) r.headerLost++;
      const pane = document.querySelector('[class*="desktop-sweep"]');
      const cls = pane ? pane.className : "";
      if (cls) {
        if (r.classes[r.classes.length - 1] !== cls) r.classes.push(cls);
        // Read the ACTUAL transform, not just the class: the direction of
        // travel is the thing being asserted, and a class name can't be wrong
        // in a way you'd notice while a sign flip very much can.
        const m = new DOMMatrixReadOnly(getComputedStyle(pane).transform);
        const t = (r.travel[cls] = r.travel[cls] || { minX: 0, maxX: 0, minY: 0, maxY: 0 });
        t.minX = Math.min(t.minX, m.m41); t.maxX = Math.max(t.maxX, m.m41);
        t.minY = Math.min(t.minY, m.m42); t.maxY = Math.max(t.maxY, m.m42);
      }
      if (r.recording) requestAnimationFrame(tick);
    };
    window.__rec.recording = true;
    requestAnimationFrame(tick);
    return !!dock && !!header;
  });

// The travel must be purely VERTICAL and in the stated direction. `up` means the
// pane moved above its resting place at some point during that phase.
const travelled = (rec, cls) => {
  const t = Object.entries(rec.travel).find(([k]) => k.includes(cls))?.[1];
  if (!t) return null;
  return {
    up: t.minY < -8,
    down: t.maxY > 8,
    sideways: Math.abs(t.minX) > 1 || Math.abs(t.maxX) > 1,
  };
};

const stopRecording = () =>
  page.evaluate(() => {
    window.__rec.recording = false;
    return window.__rec;
  });

// Following someone ONWARD (an exit pill) sweeps forward. The exit pill sits at
// the END of the tenure, far to the right in content coordinates — scroll it in
// before clicking, or the click lands on empty viewport (a bounding box exists
// for off-screen SVG content, so it looks clickable and isn't).
{
  const exitPill = page.locator("text=/→/").last();
  const box = await bringIntoView(page, exitPill, 600);
  ok(box != null && box.x > 0 && box.x < 1500, `shell: exit pill scrolled on screen (x=${box?.x?.toFixed(0)})`);
  ok(await startRecording(), "shell: dock and header present before the follow");
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1400);
  }
  const rec = await stopRecording();
  ok(rec.frames > 20, `shell: sampled the transition (${rec.frames} frames)`);
  // THE FLASH TEST. The old shell swapped itself for a bare "Loading…" div
  // while the destination segment was in flight; these nodes would vanish.
  ok(rec.dockLost === 0, `shell: control dock never left the document (${rec.dockLost}/${rec.frames} frames missing)`);
  ok(rec.headerLost === 0, `shell: header never left the document (${rec.headerLost}/${rec.frames} frames missing)`);
  ok(rec.classes.some((c) => c.includes("sweep-out-fwd")), `shell: swept out forward (saw ${rec.classes.join(",")})`);
  ok(rec.classes.some((c) => c.includes("sweep-in-fwd")), `shell: swept in forward (saw ${rec.classes.join(",")})`);
  const outAt = rec.classes.findIndex((c) => c.includes("sweep-out-fwd"));
  const inAt = rec.classes.findIndex((c) => c.includes("sweep-in-fwd"));
  ok(outAt >= 0 && inAt > outAt, "shell: the new timeline arrives after the old one leaves");
  // DIRECTION. The "To <team>" pill sits below the rail, so that team is down
  // there: the old one has to leave through the TOP and the new one rise from
  // the BOTTOM. Getting this backwards is the whole point of the assertion.
  const outT = travelled(rec, "sweep-out-fwd");
  const inT = travelled(rec, "sweep-in-fwd");
  ok(outT?.up && !outT.down, `shell: following onward, the old team leaves through the top (${JSON.stringify(outT)})`);
  ok(inT?.down && !inT.up, `shell: and the new team arrives from the bottom (${JSON.stringify(inT)})`);
  ok(!outT?.sideways && !inT?.sideways, "shell: the sweep is vertical, with no sideways drift");
  // And it actually landed on the other team.
  ok((await page.locator("body").innerText()).includes("SEA"), "shell: navigated to the destination team");
}

// Following someone BACK (an entry pill) sweeps the other way.
{
  const entryPill = page.locator("text=/→/").first();
  const box = await bringIntoView(page, entryPill, 600);
  ok(box != null && box.x > 0 && box.x < 1500, `shell: entry pill scrolled on screen (x=${box?.x?.toFixed(0)})`);
  await startRecording();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1400);
  }
  const rec = await stopRecording();
  ok(rec.dockLost === 0, "shell: dock survives the second change too");
  ok(rec.classes.some((c) => c.includes("sweep-out-back")), `shell: entry pill sweeps backward (saw ${rec.classes.join(",")})`);
  ok(rec.classes.some((c) => c.includes("sweep-in-back")), "shell: and arrives from the other side");
  // Mirrored: a "From <team>" pill sits above the lane, so leave downward and
  // bring the previous team in from the top.
  const outB = travelled(rec, "sweep-out-back");
  const inB = travelled(rec, "sweep-in-back");
  ok(outB?.down && !outB.up, `shell: following back, the old team leaves through the bottom (${JSON.stringify(outB)})`);
  ok(inB?.up && !inB.down, `shell: and the previous team arrives from the top (${JSON.stringify(inB)})`);
}

// ---- 6. the team drawer opens without displacing the timeline ----
// The shared TeamSelect is `position: fixed; inset: 0` — a full-screen takeover
// that buries the timeline. The desktop drawer hangs under the header instead,
// and the assertion that matters is that the timeline's box and scroll position
// come through untouched.
{
  const geometry = () =>
    page.evaluate(() => {
      let sc = null;
      for (const d of document.querySelectorAll("div")) {
        if (d.scrollWidth > d.clientWidth + 10) { sc = d; break; }
      }
      const svg = document.querySelector("svg");
      const r = svg?.getBoundingClientRect();
      return { scrollLeft: sc?.scrollLeft ?? null, top: r?.top ?? null, height: r?.height ?? null };
    });
  const drawer = () => page.locator(".desktop-team-drawer");
  const tab = page.locator("button", { hasText: /Cardinals|Seahawks/ }).first();

  await scrollBy(page, 400); // so a displaced or reset scroll would be obvious
  await page.waitForTimeout(200);
  const before = await geometry();

  await tab.click();
  await page.waitForTimeout(350);
  ok((await drawer().count()) === 1, "team drawer opens from the header");
  const during = await geometry();
  ok(during.top === before.top && during.height === before.height,
    `team drawer does not displace the timeline (${JSON.stringify(before)} vs ${JSON.stringify(during)})`);
  ok(during.scrollLeft === before.scrollLeft, "team drawer leaves the timeline's scroll position alone");

  // Short and wide: it must not swallow the view the way the fixed overlay did.
  const box = await drawer().boundingBox();
  ok(box.height < 320, `team drawer is short (${box.height.toFixed(0)}px), not a full-screen takeover`);
  ok(box.width > 1000, `team drawer spans the window (${box.width.toFixed(0)}px), using width instead of height`);
  ok((await page.locator(".desktop-team-drawer button").count()) >= 33,
    "all 32 teams are reachable in one view");

  // The pill toggles it: dismiss-on-outside-click must not fight its own trigger.
  await tab.click();
  await page.waitForTimeout(300);
  ok((await drawer().count()) === 0, "the team pill closes the drawer it opened");

  // Clicking the timeline dismisses it.
  await tab.click();
  await page.waitForTimeout(300);
  await page.mouse.click(700, 620);
  await page.waitForTimeout(300);
  ok((await drawer().count()) === 0, "clicking the timeline dismisses the drawer");

  // And picking a team switches, with the chrome held as ever and no sweep.
  await tab.click();
  await page.waitForTimeout(300);
  await startRecording();
  await page.locator(".desktop-team-drawer button", { hasText: "Seahawks" }).first().click();
  await page.waitForTimeout(900);
  const rec = await stopRecording();
  ok((await drawer().count()) === 0, "picking a team closes the drawer");
  ok(rec.dockLost === 0, "picking a team from the drawer never drops the chrome");
  ok(rec.classes.length === 0, "a drawer pick swaps in place — no career sweep");
  ok((await page.locator("body").innerText()).includes("Seahawks"), "the drawer pick switched teams");
}

// The sweep must leave nothing behind: no lingering transform or mask once it
// settles, or the timeline would sit permanently offset and edge-faded.
ok((await page.locator('[class*="desktop-sweep"]').count()) === 0,
  "shell: sweep classes are cleared when the transition finishes");

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : "\nALL INTERACTION SIMS PASS");
process.exit(failures ? 1 : 0);
