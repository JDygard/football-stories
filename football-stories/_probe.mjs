console.log("start");
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

const ROOT = "/sessions/loving-determined-fermat/mnt/draftAnalysis/football-stories/public";
const TEAM = process.env.TEAM || "CHI";
const VIEW = process.env.VIEW || "desktop";
const DRAFT_DELAY = Number(process.env.DRAFT_DELAY ?? 50); // ms after team segment

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  url: "http://localhost/", pretendToBeVisual: true,
});
const { window } = dom;
global.window = window; global.document = window.document;
global.navigator = window.navigator; global.HTMLElement = window.HTMLElement;
global.Element = window.Element; global.Node = window.Node;
global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
global.getComputedStyle = window.getComputedStyle.bind(window);
global.IS_REACT_ACT_ENVIRONMENT = true;

// ResizeObserver: report a fixed size for whatever is observed.
const W = VIEW === "desktop" ? 1280 : 390, H = VIEW === "desktop" ? 760 : 780;
class RO {
  constructor(cb) { this.cb = cb; }
  observe(el) { setTimeout(() => this.cb([{ target: el, contentRect: { width: W, height: H } }]), 0); }
  disconnect() {}
}
window.ResizeObserver = RO; global.ResizeObserver = RO;
window.Element.prototype.getBoundingClientRect = function () {
  return { top: 0, left: 0, right: W, bottom: H, width: W, height: H, x: 0, y: 0 };
};
window.Element.prototype.setPointerCapture = function(){};
window.Element.prototype.releasePointerCapture = function(){};
window.scrollTo = () => {};

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

global.fetch = async (url) => {
  const rel = url.replace(/^\//, "");
  const isDraft = rel.includes("teams_draft");
  if (isDraft) await delay(DRAFT_DELAY);
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return { ok: false, status: 404, json: async () => null };
  return { ok: true, status: 200, json: async () => readJson(rel) };
};

console.log("importing bundle");
const { App, DesktopApp } = await import("./_bundle.mjs");
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");

const el = document.getElementById("root");
const root = createRoot(el);
console.log("pre-render");
await act(async () => { root.render(React.createElement(VIEW === "desktop" ? DesktopApp : App, {})); });
for (let i = 0; i < 6; i++) await act(async () => { await delay(40); });

// Report: how many clickable rects (cursor:pointer) exist in the svg
const svg = document.querySelector("svg");
const clickable = svg ? svg.querySelectorAll('[style*="cursor: pointer"]') : [];
console.log(`VIEW=${VIEW} TEAM=${TEAM} DRAFT_DELAY=${DRAFT_DELAY}`);
console.log("svg present:", !!svg);
console.log("clickable elements in svg:", clickable.length);
console.log("zoom hud text:", document.body.textContent.match(/Zoom \d[^|]{0,30}/)?.[0] || "(none)");
const texts = [...(svg?.querySelectorAll("text") || [])].map(t => t.textContent);
console.log("sample texts:", texts.slice(0, 12).join(" | "));

process.exit(0);
