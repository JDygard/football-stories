// src/App.jsx
import { useCallback as useCallback5, useEffect as useEffect13, useRef as useRef7, useState as useState12 } from "react";

// src/components/header/Header.jsx
import { useEffect as useEffect2, useRef as useRef2, useState as useState3 } from "react";
import { motion, useAnimation } from "framer-motion";

// src/components/visualization/teamMeta.js
var TEAM_META = {
  ARI: { name: "Cardinals", color: "#97233F" },
  ATL: { name: "Falcons", color: "#A71930" },
  BAL: { name: "Ravens", color: "#241773" },
  BUF: { name: "Bills", color: "#00338D" },
  CAR: { name: "Panthers", color: "#0085CA" },
  CHI: { name: "Bears", color: "#0B162A" },
  CIN: { name: "Bengals", color: "#FB4F14" },
  CLE: { name: "Browns", color: "#311D00" },
  DAL: { name: "Cowboys", color: "#041E42" },
  DEN: { name: "Broncos", color: "#FB4F14" },
  DET: { name: "Lions", color: "#0076B6" },
  GB: { name: "Packers", color: "#203731" },
  HOU: { name: "Texans", color: "#03202F" },
  IND: { name: "Colts", color: "#002C5F" },
  JAX: { name: "Jaguars", color: "#006778" },
  KC: { name: "Chiefs", color: "#E31837" },
  LAC: { name: "Chargers", color: "#0080C6" },
  LAR: { name: "Rams", color: "#003594" },
  LV: { name: "Raiders", color: "#000000" },
  MIA: { name: "Dolphins", color: "#008E97" },
  MIN: { name: "Vikings", color: "#4F2683" },
  NE: { name: "Patriots", color: "#002244" },
  NO: { name: "Saints", color: "#9F8958" },
  NYG: { name: "Giants", color: "#0B2265" },
  NYJ: { name: "Jets", color: "#125740" },
  PHI: { name: "Eagles", color: "#004C54" },
  PIT: { name: "Steelers", color: "#B9952E" },
  SEA: { name: "Seahawks", color: "#002244" },
  SF: { name: "49ers", color: "#AA0000" },
  TB: { name: "Buccaneers", color: "#D50A0A" },
  TEN: { name: "Titans", color: "#0C2340" },
  WAS: { name: "Commanders", color: "#5A1414" }
};
function teamName(fid) {
  return TEAM_META[fid]?.name || fid;
}

// src/components/header/TeamTab.jsx
import { jsx, jsxs } from "react/jsx-runtime";
function TeamTab({ teamId, onOpen }) {
  const label = teamId ? teamName(teamId) : "Select team";
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: onOpen,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        height: "32px",
        padding: "0 16px",
        // White-on-navy pill riding the dark header (mockup palette).
        background: "rgba(255,255,255,0.08)",
        border: "1.5px solid rgba(255,255,255,0.28)",
        borderRadius: "999px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        color: "#fff",
        whiteSpace: "nowrap",
        transition: "border-color 0.15s, background 0.15s"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
        e.currentTarget.style.background = "rgba(255,255,255,0.16)";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      },
      children: [
        teamId && /* @__PURE__ */ jsx(
          "span",
          {
            style: {
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.6)"
            },
            children: teamId
          }
        ),
        /* @__PURE__ */ jsx("span", { children: label }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: "10px", color: "rgba(255,255,255,0.65)", lineHeight: 1 }, children: "\u25BC" })
      ]
    }
  );
}

// src/components/header/data/nflStructure.js
var NFL_STRUCTURE = {
  AFC: {
    East: [
      { id: "BUF", name: "Buffalo Bills" },
      { id: "MIA", name: "Miami Dolphins" },
      { id: "NE", name: "New England Patriots" },
      { id: "NYJ", name: "New York Jets" }
    ],
    North: [
      { id: "BAL", name: "Baltimore Ravens" },
      { id: "CIN", name: "Cincinnati Bengals" },
      { id: "CLE", name: "Cleveland Browns" },
      { id: "PIT", name: "Pittsburgh Steelers" }
    ],
    South: [
      { id: "HOU", name: "Houston Texans" },
      { id: "IND", name: "Indianapolis Colts" },
      { id: "JAX", name: "Jacksonville Jaguars" },
      { id: "TEN", name: "Tennessee Titans" }
    ],
    West: [
      { id: "DEN", name: "Denver Broncos" },
      { id: "KC", name: "Kansas City Chiefs" },
      { id: "LAC", name: "Los Angeles Chargers" },
      { id: "LV", name: "Las Vegas Raiders" }
    ]
  },
  NFC: {
    East: [
      { id: "DAL", name: "Dallas Cowboys" },
      { id: "NYG", name: "New York Giants" },
      { id: "PHI", name: "Philadelphia Eagles" },
      { id: "WAS", name: "Washington Commanders" }
    ],
    North: [
      { id: "CHI", name: "Chicago Bears" },
      { id: "DET", name: "Detroit Lions" },
      { id: "GB", name: "Green Bay Packers" },
      { id: "MIN", name: "Minnesota Vikings" }
    ],
    South: [
      { id: "ATL", name: "Atlanta Falcons" },
      { id: "CAR", name: "Carolina Panthers" },
      { id: "NO", name: "New Orleans Saints" },
      { id: "TB", name: "Tampa Bay Buccaneers" }
    ],
    West: [
      { id: "ARI", name: "Arizona Cardinals" },
      { id: "LAR", name: "Los Angeles Rams" },
      { id: "SEA", name: "Seattle Seahawks" },
      { id: "SF", name: "San Francisco 49ers" }
    ]
  }
};

// src/components/header/TeamSelect.jsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function TeamSelect({ onSelect, onClose }) {
  return /* @__PURE__ */ jsxs2(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        background: "#f4f5f7",
        overflowY: "auto",
        zIndex: 20,
        boxSizing: "border-box"
      },
      children: [
        /* @__PURE__ */ jsxs2(
          "div",
          {
            style: {
              position: "sticky",
              top: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "#fff",
              borderBottom: "1px solid #d8dbe1"
            },
            children: [
              /* @__PURE__ */ jsx2("span", { style: { fontSize: "15px", fontWeight: 600, color: "#1f2430" }, children: "Select team" }),
              /* @__PURE__ */ jsx2(
                "button",
                {
                  onClick: onClose,
                  style: {
                    height: "32px",
                    padding: "0 14px",
                    background: "#fff",
                    border: "1.5px solid #b8bdc7",
                    borderRadius: "999px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1f2430"
                  },
                  children: "Close"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx2("div", { style: { padding: "16px", boxSizing: "border-box" }, children: Object.entries(NFL_STRUCTURE).map(([conference, divisions]) => /* @__PURE__ */ jsxs2("div", { style: { marginBottom: "28px" }, children: [
          /* @__PURE__ */ jsx2(
            "h2",
            {
              style: {
                margin: "0 0 12px",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#7c8390",
                textTransform: "uppercase"
              },
              children: conference
            }
          ),
          /* @__PURE__ */ jsx2(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px"
              },
              children: Object.entries(divisions).map(([division, teams]) => /* @__PURE__ */ jsxs2(
                "div",
                {
                  style: {
                    background: "#fff",
                    border: "1px solid #e1e3e8",
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  },
                  children: [
                    /* @__PURE__ */ jsx2(
                      "div",
                      {
                        style: {
                          fontSize: "12px",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: "#9aa0ab",
                          textAlign: "center",
                          textTransform: "uppercase"
                        },
                        children: division
                      }
                    ),
                    /* @__PURE__ */ jsx2(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        },
                        children: teams.map((team) => /* @__PURE__ */ jsxs2(
                          "button",
                          {
                            onClick: () => onSelect(team.id),
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 14px",
                              background: "#fff",
                              border: "1.5px solid #b8bdc7",
                              borderRadius: "999px",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#1f2430",
                              textAlign: "left",
                              transition: "border-color 0.15s, background 0.15s"
                            },
                            onMouseEnter: (e) => {
                              e.currentTarget.style.borderColor = "#7c8390";
                              e.currentTarget.style.background = "#f6f7f9";
                            },
                            onMouseLeave: (e) => {
                              e.currentTarget.style.borderColor = "#b8bdc7";
                              e.currentTarget.style.background = "#fff";
                            },
                            children: [
                              /* @__PURE__ */ jsx2(
                                "span",
                                {
                                  style: {
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    letterSpacing: "0.04em",
                                    color: "#7c8390",
                                    minWidth: "30px"
                                  },
                                  children: team.id
                                }
                              ),
                              /* @__PURE__ */ jsx2("span", { children: team.name })
                            ]
                          },
                          team.id
                        ))
                      }
                    )
                  ]
                },
                division
              ))
            }
          )
        ] }, conference)) })
      ]
    }
  );
}

// src/components/header/SearchBox.jsx
import { useCallback as useCallback2, useEffect, useMemo, useRef, useState as useState2 } from "react";

// src/hooks/useSearchIndex.js
import { useCallback, useState } from "react";
var _people = null;
var _promise = null;
function loadIndex() {
  if (_promise) return _promise;
  _promise = fetch("/data/index/search_index.json").then((r) => {
    if (!r.ok) throw new Error(`search index HTTP ${r.status}`);
    return r.json();
  }).then((json) => {
    _people = Array.isArray(json?.people) ? json.people : [];
    return _people;
  });
  return _promise;
}
var KIND = { p: "player", s: "staff" };
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
        rank
      });
    }
    if (rows.length > 1200) break;
  }
  rows.sort(
    (a, b) => a.rank - b.rank || (b.to || 0) - (a.to || 0) || a.name.localeCompare(b.name) || String(a.team).localeCompare(String(b.team))
  );
  return rows.slice(0, limit);
}
function useSearchIndex() {
  const [status, setStatus] = useState(_people ? "ready" : "idle");
  const ensureLoaded = useCallback(() => {
    if (_people) {
      setStatus("ready");
      return;
    }
    setStatus("loading");
    loadIndex().then(
      () => setStatus("ready"),
      () => setStatus("error")
    );
  }, []);
  const search = useCallback(
    (query, limit = 40) => _people ? buildRows(_people, query, limit) : [],
    [status]
    // eslint-disable-line react-hooks/exhaustive-deps
  );
  return { status, ensureLoaded, search };
}

// src/utils/frameRect.js
var FRAME_ID = "app-frame";
function frameRect() {
  const el = typeof document !== "undefined" && document.getElementById(FRAME_ID);
  if (el) return el.getBoundingClientRect();
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const h = typeof window !== "undefined" ? window.innerHeight : 0;
  return { top: 0, left: 0, right: w, bottom: h, width: w, height: h };
}

// src/components/visualization/allocateTailSlots.js
function allocateTailSlots(ribbons) {
  const sorted = [...ribbons].sort((a, b) => a.startY - b.startY);
  const active = [];
  const free = [];
  let nextSlot = 0;
  const result = /* @__PURE__ */ new Map();
  for (const r of sorted) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].endY <= r.startY) {
        const { slot: slot2 } = active.splice(i, 1)[0];
        const idx = free.findIndex((s) => s > slot2);
        if (idx === -1) free.push(slot2);
        else free.splice(idx, 0, slot2);
      }
    }
    const slot = free.length > 0 ? free.shift() : nextSlot++;
    result.set(r.id, slot);
    active.push({
      endY: r.endY,
      slot
    });
  }
  return result;
}

// src/components/visualization/staffRibbonModel.js
var ROLE_COLORS = {
  owner: "#b03a3c",
  // deep red (mockup palette; was blue)
  gm: "#e0862e",
  // warm orange
  coach: "#2e8b45",
  // green
  // player ribbons color by position group
  qb: "#8e44ad",
  rb: "#0e8f76",
  wr: "#2d6cdf",
  te: "#6c8fd6",
  ol: "#8a6d3b",
  dl: "#b03a3a",
  lb: "#5e7c1e",
  db: "#17a2b8",
  st: "#777777",
  unknown: "#999"
};
var POSITION_GROUPS = {
  QB: "qb",
  RB: "rb",
  FB: "rb",
  HB: "rb",
  WR: "wr",
  TE: "te",
  C: "ol",
  G: "ol",
  T: "ol",
  OG: "ol",
  OT: "ol",
  OL: "ol",
  DE: "dl",
  DT: "dl",
  NT: "dl",
  DL: "dl",
  LB: "lb",
  OLB: "lb",
  ILB: "lb",
  MLB: "lb",
  EDGE: "lb",
  CB: "db",
  S: "db",
  FS: "db",
  SS: "db",
  DB: "db",
  K: "st",
  P: "st",
  LS: "st"
};
function positionGroup(position) {
  return POSITION_GROUPS[String(position || "").toUpperCase()] || "unknown";
}
var STRIP_H = 16;
var STRIP_GAP = 0;
var MIN_TAIL_W = 6;
var SQUISH_FULL_SLOTS = 4;
var SQUISH_BUDGET = 6 * STRIP_H;
var MAX_TAIL_SLOTS = Math.floor(SQUISH_BUDGET / MIN_TAIL_W);
var PEEK = 3;
function roleColor(role) {
  return ROLE_COLORS[role] || ROLE_COLORS.unknown;
}
var entryOrder = (a, b) => String(a.name).localeCompare(String(b.name)) || String(a.key || "").localeCompare(String(b.key || ""));
function stripReserveByYear(staff, stripHeight = STRIP_H, gap = STRIP_GAP) {
  const out = {};
  for (const s of staff || []) {
    if (s.from == null || s.to == null) continue;
    out[s.from] = (out[s.from] || 0) + stripHeight + gap;
  }
  return out;
}
function maxStackHeight(staff, stripHeight = STRIP_H, gap = STRIP_GAP) {
  const edges = [];
  for (const s of staff || []) {
    if (s.from == null || s.to == null) continue;
    edges.push([s.from, 1], [s.to + 1, -1]);
  }
  edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let max = 0;
  for (const [, d] of edges) {
    cur += d;
    if (cur > max) max = cur;
  }
  return max * (stripHeight + gap);
}
function buildStaffRibbons({
  staff,
  layout,
  stripHeight = STRIP_H,
  gap = STRIP_GAP
} = {}) {
  if (!staff?.length || !layout?.blocks?.length) {
    return { ribbons: [], railWidth: 0, slotCount: 0, tailW: STRIP_H };
  }
  const first = layout.blocks[0];
  const last = layout.blocks[layout.blocks.length - 1];
  const byFrom = /* @__PURE__ */ new Map();
  const spans = [];
  for (const s of staff) {
    if (s.from == null || s.to == null) continue;
    if (s.to < layout.firstYear || s.from > layout.lastYear) continue;
    const span = {
      key: `${s.admin_person_id}:${s.role}:${s.from}`,
      id: s.admin_person_id,
      name: s.name,
      role: s.role,
      color: roleColor(s.role),
      from: s.from,
      to: s.to,
      kind: s.kind || "staff",
      approx: !!s.approx,
      position: s.position || null,
      // Career-follow links (To/From <team>), computed in the pipeline.
      prevTeam: s.prev_team || null,
      nextTeam: s.next_team || null,
      entry: s.entry || null,
      exit: s.exit || null,
      conf: s.conf || null
    };
    spans.push(span);
    if (!byFrom.has(s.from)) byFrom.set(s.from, []);
    byFrom.get(s.from).push(span);
  }
  for (const group of byFrom.values()) group.sort(entryOrder);
  const ribbons = [];
  for (const r of spans) {
    const fromB = layout.byYear.get(r.from);
    const toB = layout.byYear.get(r.to);
    const idx = byFrom.get(r.from).indexOf(r);
    let y0 = fromB ? fromB.offseason.ribbonTop ?? fromB.offseason.y0 : layout.tToY(r.from);
    y0 += idx * (stripHeight + gap);
    let y1 = toB ? toB.season.y1 : layout.tToY(r.to + 1);
    y0 = Math.max(first.y0, Math.min(y0, last.y1 - stripHeight));
    y1 = Math.max(first.y0, Math.min(y1, last.y1));
    if (y1 <= y0) continue;
    const hasExit = y1 - y0 >= 2 * stripHeight;
    ribbons.push({
      ...r,
      y0,
      y1,
      hasExit,
      exitY: y1 - stripHeight,
      tailEnd: y1
    });
  }
  const entryRows = new Set(ribbons.map((r) => r.y0));
  const exitGroups = /* @__PURE__ */ new Map();
  for (const r of ribbons) {
    if (!r.hasExit) continue;
    if (!exitGroups.has(r.exitY)) exitGroups.set(r.exitY, []);
    exitGroups.get(r.exitY).push(r);
  }
  for (const group of exitGroups.values()) {
    group.sort((a, b) => a.y0 - b.y0);
    group.forEach((r, i) => {
      r.exitY -= (group.length - 1 - i) * stripHeight;
    });
    let extra = 0;
    while (group.some((r) => entryRows.has(r.exitY - extra))) {
      extra += stripHeight;
    }
    for (const r of group) {
      r.exitY = Math.max(r.y0 + stripHeight, r.exitY - extra);
      r.tailEnd = r.exitY + stripHeight;
    }
  }
  const slotMap = allocateTailSlots(
    ribbons.map((r) => ({ id: r.key, startY: r.y0, endY: r.tailEnd }))
  );
  const slotCount = ribbons.length ? Math.max(...slotMap.values()) + 1 : 0;
  let shown = ribbons;
  let slots = slotCount;
  if (slotCount > MAX_TAIL_SLOTS) {
    shown = ribbons.filter((r) => (slotMap.get(r.key) ?? 0) < MAX_TAIL_SLOTS);
    slots = MAX_TAIL_SLOTS;
  }
  let tailW = stripHeight;
  if (slots > SQUISH_FULL_SLOTS) {
    tailW = Math.max(
      MIN_TAIL_W,
      Math.min(stripHeight - 1, Math.floor(SQUISH_BUDGET / slots))
    );
  }
  const railWidth = slots * tailW;
  for (const r of shown) {
    const slot = slotMap.get(r.key) ?? 0;
    r.slot = slot;
    r.x = railWidth - (slot + 1) * tailW;
    r.width = tailW;
  }
  return { ribbons: shown, railWidth, slotCount: slots, tailW };
}
function resolveRibbonStrips({
  ribbons,
  scrollY = 0,
  stripHeight = STRIP_H,
  gap = STRIP_GAP
} = {}) {
  const strips = /* @__PURE__ */ new Map();
  if (!ribbons?.length) return { strips, stackHeight: 0 };
  const order = ribbons.filter((r) => r.tailEnd > scrollY).slice().sort(
    (a, b) => a.y0 - b.y0 || a.from - b.from || String(a.name).localeCompare(String(b.name))
  );
  const pinned = [];
  for (const r of order) {
    const rest = r.hasExit ? r.exitY : r.tailEnd - stripHeight;
    if (rest < scrollY) {
      strips.set(r.key, { y: rest, mode: "departing" });
    } else if (r.y0 < scrollY) {
      pinned.push(r);
    } else {
      strips.set(r.key, { y: r.y0, mode: "anchored" });
    }
  }
  const row = stripHeight + gap;
  const stackHeight = pinned.length * row;
  pinned.forEach((r, i) => {
    strips.set(r.key, { y: scrollY - (pinned.length - i) * row, mode: "pinned" });
  });
  return { strips, stackHeight };
}

// src/components/header/SearchBox.jsx
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var ROLE_LABEL = { coach: "Coach", gm: "GM", owner: "Owner", unknown: "Staff" };
var MIN_CHARS = 2;
var MAX_ROWS = 40;
function dotColor(row) {
  return row.kind === "staff" ? roleColor(row.role || "unknown") : roleColor(positionGroup(row.position));
}
function metaLabel(row) {
  if (row.kind === "staff") return ROLE_LABEL[row.role] || "Staff";
  return row.position || "Player";
}
function SearchBox({ onSelect }) {
  const { status, ensureLoaded, search } = useSearchIndex();
  const [query, setQuery] = useState2("");
  const [open, setOpen] = useState2(false);
  const [active, setActive] = useState2(0);
  const [rect, setRect] = useState2(null);
  const inputRef = useRef(null);
  const blurTimer = useRef(null);
  const rows = useMemo(
    () => query.trim().length >= MIN_CHARS ? search(query, MAX_ROWS) : [],
    [query, search]
  );
  const activeIndex = Math.min(active, Math.max(0, rows.length - 1));
  const measure = useCallback2(() => {
    const el = inputRef.current;
    if (el) setRect(el.getBoundingClientRect());
  }, []);
  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);
  const openMenu = useCallback2(() => {
    clearTimeout(blurTimer.current);
    ensureLoaded();
    measure();
    setOpen(true);
  }, [ensureLoaded, measure]);
  const choose = useCallback2(
    (row) => {
      const follow = row.kind === "staff" ? { id: row.id, kind: "staff", role: row.role, name: row.name } : { id: row.id, kind: "player", name: row.name, position: row.position };
      onSelect && onSelect(row.team, row.from, follow);
      setQuery("");
      setOpen(false);
      inputRef.current && inputRef.current.blur();
    },
    [onSelect]
  );
  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      openMenu();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (rows[activeIndex]) {
        e.preventDefault();
        choose(rows[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current && inputRef.current.blur();
    }
  };
  const onBlur = () => {
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => () => clearTimeout(blurTimer.current), []);
  const showPanel = open && query.trim().length >= MIN_CHARS;
  return /* @__PURE__ */ jsxs3(Fragment, { children: [
    /* @__PURE__ */ jsx3(
      "input",
      {
        ref: inputRef,
        type: "text",
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) openMenu();
        },
        onFocus: openMenu,
        onBlur,
        onKeyDown,
        placeholder: "Search player/coach/owner",
        "aria-label": "Search players, coaches, and owners",
        style: {
          width: "160px",
          height: "24px",
          padding: "0 8px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          outline: "none",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2
        }
      }
    ),
    showPanel && rect && /* @__PURE__ */ jsxs3(
      "div",
      {
        style: {
          position: "fixed",
          // `fixed` here resolves against the device frame, not the viewport
          // (see .app-frame in index.css), so the measured input rect —
          // viewport coordinates — is rebased onto the frame's origin.
          top: rect.bottom - frameRect().top + 4,
          right: Math.max(8, Math.round(frameRect().right - rect.right)),
          width: "min(320px, calc(100% - 16px))",
          maxHeight: 360,
          overflowY: "auto",
          zIndex: 50,
          background: "#fff",
          border: "1px solid #d6dae2",
          borderRadius: 8,
          boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
          padding: 4
        },
        children: [
          status === "loading" && !rows.length && /* @__PURE__ */ jsx3("div", { style: MSG, children: "Loading search index\u2026" }),
          status === "error" && /* @__PURE__ */ jsx3("div", { style: MSG, children: "Search is unavailable." }),
          status === "ready" && !rows.length && /* @__PURE__ */ jsx3("div", { style: MSG, children: "No matches." }),
          rows.map((row, i) => /* @__PURE__ */ jsxs3(
            "button",
            {
              onMouseDown: (e) => {
                e.preventDefault();
                choose(row);
              },
              onMouseEnter: () => setActive(i),
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                textAlign: "left",
                border: "none",
                borderRadius: 6,
                padding: "6px 8px",
                cursor: "pointer",
                background: i === activeIndex ? "#f2f4f8" : "none",
                fontSize: 12.5
              },
              children: [
                /* @__PURE__ */ jsx3(
                  "span",
                  {
                    style: {
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: dotColor(row),
                      flex: "0 0 auto"
                    }
                  }
                ),
                /* @__PURE__ */ jsx3(
                  "span",
                  {
                    style: {
                      fontWeight: 600,
                      color: "#222",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1
                    },
                    children: row.name
                  }
                ),
                /* @__PURE__ */ jsx3("span", { style: { color: "#888", flex: "0 0 auto" }, children: metaLabel(row) }),
                /* @__PURE__ */ jsx3(
                  "span",
                  {
                    style: { color: "#2d5cb8", fontWeight: 600, flex: "0 0 auto" },
                    children: teamName(row.team)
                  }
                ),
                /* @__PURE__ */ jsxs3(
                  "span",
                  {
                    style: { color: "#aab", flex: "0 0 auto", fontVariantNumeric: "tabular-nums" },
                    children: [
                      row.from,
                      row.to && row.to !== row.from ? `\u2013${row.to}` : ""
                    ]
                  }
                )
              ]
            },
            row.key
          ))
        ]
      }
    )
  ] });
}
var MSG = { padding: "10px 12px", color: "#999", fontSize: 12.5 };

// src/components/header/Header.jsx
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var HEADER_H = 48;
var HIDE_THRESHOLD = 0;
function MenuItem({ children, onClick, disabled }) {
  return /* @__PURE__ */ jsx4(
    "button",
    {
      onClick: disabled ? void 0 : onClick,
      disabled,
      style: {
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        border: "none",
        background: "none",
        fontSize: 13,
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        color: disabled ? "#aaa" : "#222"
      },
      onMouseEnter: (e) => {
        if (!disabled) e.currentTarget.style.background = "#f2f4f8";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.background = "none";
      },
      children
    }
  );
}
function Header({
  scrollRef,
  selectedTeam,
  setSelectedTeam,
  onOpenLeague,
  onOpenMethodology,
  onSearchSelect
}) {
  const controls = useAnimation();
  const [teamSelectOpen, setTeamSelectOpen] = useState3(false);
  const [menuOpen, setMenuOpen] = useState3(false);
  const lastYRef = useRef2(0);
  const accumulatedDownRef = useRef2(0);
  const visibleRef = useRef2(true);
  useEffect2(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastYRef.current;
      if (delta > 0) {
        accumulatedDownRef.current += delta;
        if (visibleRef.current && accumulatedDownRef.current > HIDE_THRESHOLD) {
          visibleRef.current = false;
          controls.start({
            height: 0,
            y: -HEADER_H,
            transition: { duration: 0.25 }
          });
        }
      } else if (delta < 0) {
        if (!visibleRef.current) {
          visibleRef.current = true;
          controls.start({
            height: HEADER_H,
            y: 0,
            transition: { duration: 0.25 }
          });
        }
        accumulatedDownRef.current = 0;
      }
      lastYRef.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, controls]);
  useEffect2(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  return /* @__PURE__ */ jsxs4(Fragment2, { children: [
    /* @__PURE__ */ jsxs4(
      motion.header,
      {
        animate: controls,
        initial: { height: HEADER_H, y: 0 },
        style: {
          width: "100%",
          overflow: "hidden",
          borderBottom: "1px solid #0a1626",
          background: "#0f2036",
          // deep navy chrome (mockup palette)
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          boxSizing: "border-box",
          position: "relative"
        },
        children: [
          /* @__PURE__ */ jsx4("div", { style: { flex: 1, display: "flex", alignItems: "center" }, children: /* @__PURE__ */ jsx4(
            "button",
            {
              "aria-label": "Menu",
              onClick: () => setMenuOpen((o) => !o),
              style: {
                border: "none",
                background: "none",
                fontSize: 18,
                cursor: "pointer",
                padding: "2px 8px 2px 0",
                color: "#fff",
                lineHeight: 1
              },
              children: "\u2630"
            }
          ) }),
          /* @__PURE__ */ jsx4(
            TeamTab,
            {
              teamId: selectedTeam,
              onOpen: () => setTeamSelectOpen(true)
            }
          ),
          /* @__PURE__ */ jsx4("div", { style: { flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }, children: /* @__PURE__ */ jsx4(SearchBox, { onSelect: onSearchSelect }) })
        ]
      }
    ),
    menuOpen && /* @__PURE__ */ jsxs4(Fragment2, { children: [
      /* @__PURE__ */ jsx4(
        "div",
        {
          onClick: () => setMenuOpen(false),
          style: { position: "fixed", inset: 0, zIndex: 39 }
        }
      ),
      /* @__PURE__ */ jsxs4(
        "div",
        {
          style: {
            position: "fixed",
            top: HEADER_H + 4,
            left: 8,
            zIndex: 40,
            background: "#fff",
            border: "1px solid #d6dae2",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
            minWidth: 220,
            padding: 6
          },
          children: [
            /* @__PURE__ */ jsx4(
              MenuItem,
              {
                onClick: () => {
                  setMenuOpen(false);
                  onOpenLeague && onOpenLeague();
                },
                children: "\u{1F3C6} League leaderboards"
              }
            ),
            /* @__PURE__ */ jsx4(
              MenuItem,
              {
                onClick: () => {
                  setMenuOpen(false);
                  onOpenMethodology && onOpenMethodology();
                },
                children: "\u24D8 How grades work"
              }
            )
          ]
        }
      )
    ] }),
    teamSelectOpen && /* @__PURE__ */ jsx4(
      TeamSelect,
      {
        onClose: () => setTeamSelectOpen(false),
        onSelect: (teamId) => {
          setSelectedTeam(teamId);
          setTeamSelectOpen(false);
        }
      }
    )
  ] });
}

// src/components/Main.jsx
import {
  forwardRef,
  useCallback as useCallback4,
  useEffect as useEffect6,
  useImperativeHandle,
  useLayoutEffect as useLayoutEffect2,
  useMemo as useMemo4,
  useRef as useRef6,
  useState as useState6
} from "react";

// src/components/visualization/TeamTimelineLayer.jsx
import { memo as memo2, useMemo as useMemo2 } from "react";

// src/components/visualization/detail.js
var DETAIL_BANDS = [
  "GAME_DETAIL",
  "GAME_BANDS",
  "SEASON_LINES",
  "ERA_SUMMARY",
  "FRANCHISE_OVERVIEW"
];
var DETAIL_GEOMETRY = {
  GAME_DETAIL: { season: { mode: "rows", gameRowHeight: 18 }, offseason: "full" },
  GAME_BANDS: { season: { mode: "page" }, offseason: "full" },
  SEASON_LINES: { season: { mode: "line", height: 4 }, offseason: "compact" },
  ERA_SUMMARY: { season: { mode: "line", height: 12 }, offseason: "hidden" },
  FRANCHISE_OVERVIEW: { season: { mode: "line", height: 5 }, offseason: "hidden" }
};
var DEFAULT_BAND = "GAME_DETAIL";
var MOBILE_BANDS = DETAIL_BANDS.filter((b) => b !== "FRANCHISE_OVERVIEW");
var ZOOM_LEVELS = 4;
var ZOOM_LABELS = {
  GAME_DETAIL: { zoom: 4, name: "Every Game" },
  GAME_BANDS: { zoom: 3, name: "Season by season" },
  SEASON_LINES: { zoom: 2, name: "Seasons" },
  ERA_SUMMARY: { zoom: 1, name: "Eras" },
  FRANCHISE_OVERVIEW: { zoom: 1, name: "Eras" }
};
var zoomLabelFor = (band) => ZOOM_LABELS[band] || ZOOM_LABELS[DEFAULT_BAND];
var bandRank = (band) => {
  const i = DETAIL_BANDS.indexOf(band);
  return i === -1 ? 0 : i;
};
var bandAtLeast = (band, minBand) => bandRank(band) <= bandRank(minBand || DEFAULT_BAND);
var geometryFor = (band) => DETAIL_GEOMETRY[band] || DETAIL_GEOMETRY[DEFAULT_BAND];

// src/components/visualization/StaffRibbonLayer.jsx
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var PX_PER_CHAR = 5.8;
var EXPAND_FULL_AT = 40;
var OVERHANG = 220;
var LABEL_SHOW_AT = 22;
var PILL_GAP = 8;
var DEST_BG = "#2e333a";
var DEST_FG = "#ffffff";
var TERM_BG = "#c3c8ce";
var TERM_FG = "#2a2d31";
var pillW = (text) => Math.round(text.length * 6.6) + 18;
function exitLabel(r) {
  if (!r.hasExit) return null;
  if (r.exit === "to_team" && r.nextTeam)
    return { text: `${teamName(r.nextTeam)} \u2192`, fid: r.nextTeam, year: (r.to || 0) + 1, kind: "dest" };
  if (r.exit === "retired") return { text: "Retired", kind: "term" };
  if (r.exit === "left_league") return { text: "Left NFL", kind: "term" };
  return null;
}
function entryLabel(r) {
  if (r.entry === "from_team" && r.prevTeam)
    return { text: `${teamName(r.prevTeam)} \u2192`, fid: r.prevTeam, year: Math.max(0, (r.from || 0) - 1), kind: "dest" };
  if (r.entry === "drafted") return { text: "Drafted", kind: "term" };
  return null;
}
function FollowTag({ x, y, anchor, info, person, conf, onFollow, tapGuard }) {
  if (!info) return null;
  const dest = info.kind === "dest";
  const navigable = dest && !!info.fid && conf !== "approx" && conf !== "low";
  const w = pillW(info.text);
  const rx = anchor === "end" ? -w : 0;
  const onClick = navigable ? (e) => {
    e.stopPropagation();
    if (tapGuard && tapGuard()) return;
    onFollow?.(info.fid, info.year, person);
  } : void 0;
  return /* @__PURE__ */ jsxs5(
    "g",
    {
      transform: `translate(${x} ${y})`,
      onClick,
      style: navigable ? { cursor: "pointer" } : { pointerEvents: "none" },
      children: [
        /* @__PURE__ */ jsx5("rect", { x: rx, y: -9, width: w, height: 18, rx: 9, fill: dest ? DEST_BG : TERM_BG }),
        /* @__PURE__ */ jsx5(
          "text",
          {
            x: anchor === "end" ? -9 : 9,
            y: 0.5,
            textAnchor: anchor,
            dominantBaseline: "middle",
            fontSize: 11,
            fontWeight: 700,
            fill: dest ? DEST_FG : TERM_FG,
            style: { userSelect: "none" },
            children: info.text
          }
        )
      ]
    }
  );
}
function ribbonPath({ stripY, tailX, tailW, exitY, tailEnd, leftX, rightX, hasExit, h }) {
  const tr = tailX + tailW;
  if (hasExit && stripY < exitY) {
    return [
      `M ${leftX} ${stripY}`,
      `H ${tr}`,
      `V ${exitY}`,
      `H ${rightX}`,
      `V ${exitY + h}`,
      `H ${tailX}`,
      `V ${stripY + h}`,
      `H ${leftX}`,
      "Z"
    ].join(" ");
  }
  if (hasExit) {
    return `M ${leftX} ${stripY} H ${rightX} V ${stripY + h} H ${leftX} Z`;
  }
  return [
    `M ${leftX} ${stripY}`,
    `H ${tr}`,
    `V ${tailEnd}`,
    `H ${tailX}`,
    `V ${stripY + h}`,
    `H ${leftX}`,
    "Z"
  ].join(" ");
}
function stripLabel(r, title, maxChars) {
  const approx = r.approx ? "~" : "";
  const roleLabel = r.kind === "player" ? String(r.position || r.role).toUpperCase() : String(r.role).toUpperCase();
  const full = title ? `${r.name} \xB7 ${title} \xB7 ${r.from}\u2013${r.to}${approx}` : `${r.name} \xB7 ${roleLabel} \xB7 ${r.from}\u2013${r.to}${approx}`;
  if (full.length <= maxChars) return full;
  const short = `${r.name} \xB7 ${r.from}\u2013${r.to}`;
  if (short.length <= maxChars) return short;
  return short.slice(0, Math.max(1, maxChars - 1)) + "\u2026";
}
function StaffRibbonLayer({
  ribbons = [],
  strips,
  width = 0,
  slotCount = 0,
  tailWidth = STRIP_H,
  railPan = 0,
  viewBottom = Infinity,
  adminById,
  onSelect,
  onFollow,
  tapGuard
}) {
  if (!ribbons.length || !width || !strips) return null;
  const expandT = Math.min(1, Math.abs(railPan) / EXPAND_FULL_AT);
  const tailW = tailWidth + (STRIP_H - tailWidth) * expandT;
  const railWidth = slotCount * tailW;
  const railLeft = width - railWidth - PEEK;
  const showRight = railPan < -LABEL_SHOW_AT;
  const showLeft = railPan > LABEL_SHOW_AT;
  const RANK = { anchored: 0, departing: 1, pinned: 2 };
  const items = ribbons.map((r) => ({ r, s: strips.get(r.key) })).filter(({ s }) => s && s.y <= viewBottom).sort((a, b) => RANK[a.s.mode] - RANK[b.s.mode]);
  return /* @__PURE__ */ jsxs5("g", { children: [
    /* @__PURE__ */ jsxs5("defs", { children: [
      /* @__PURE__ */ jsxs5("linearGradient", { id: "ribFadeR", x1: "0", y1: "0", x2: "1", y2: "0", children: [
        /* @__PURE__ */ jsx5("stop", { offset: "0", stopColor: "#fff" }),
        /* @__PURE__ */ jsx5("stop", { offset: "1", stopColor: "#000" })
      ] }),
      /* @__PURE__ */ jsxs5("linearGradient", { id: "ribFadeL", x1: "0", y1: "0", x2: "1", y2: "0", children: [
        /* @__PURE__ */ jsx5("stop", { offset: "0", stopColor: "#000" }),
        /* @__PURE__ */ jsx5("stop", { offset: "1", stopColor: "#fff" })
      ] }),
      /* @__PURE__ */ jsx5("mask", { id: "ribMaskR", maskContentUnits: "objectBoundingBox", children: /* @__PURE__ */ jsx5("rect", { width: "1", height: "1", fill: "url(#ribFadeR)" }) }),
      /* @__PURE__ */ jsx5("mask", { id: "ribMaskL", maskContentUnits: "objectBoundingBox", children: /* @__PURE__ */ jsx5("rect", { width: "1", height: "1", fill: "url(#ribFadeL)" }) })
    ] }),
    items.map(({ r, s }) => {
      const stripY = s.y;
      const tailX = railLeft + railWidth - ((r.slot ?? 0) + 1) * tailW;
      const title = adminById?.get?.(r.id)?.title;
      const maxChars = Math.floor((tailX + tailW - 14) / PX_PER_CHAR);
      const exI = exitLabel(r);
      const capRightX = exI ? width + PILL_GAP + pillW(exI.text) : width;
      const rightX = exI ? capRightX : width;
      const enI = entryLabel(r);
      const capLeftX = enI ? -PILL_GAP - pillW(enI.text) : 0;
      const leftX = enI ? capLeftX : 0;
      const d = ribbonPath({
        stripY,
        tailX,
        tailW,
        exitY: r.exitY,
        tailEnd: r.tailEnd,
        leftX,
        rightX,
        hasExit: r.hasExit,
        h: STRIP_H
      });
      const handleClick = typeof onSelect === "function" ? (e) => {
        e.stopPropagation();
        if (tapGuard && tapGuard()) return;
        onSelect(r);
      } : void 0;
      const exitRowY = r.hasExit ? r.exitY : r.tailEnd - STRIP_H;
      const person = { id: r.id, kind: r.kind, role: r.role, name: r.name, position: r.position };
      return /* @__PURE__ */ jsxs5("g", { children: [
        /* @__PURE__ */ jsx5(
          "path",
          {
            d,
            fill: r.color,
            stroke: "#111",
            strokeWidth: 1,
            strokeDasharray: r.approx ? "4 3" : void 0,
            strokeLinejoin: "miter",
            onClick: handleClick,
            style: handleClick ? { cursor: "pointer" } : void 0,
            children: /* @__PURE__ */ jsx5("title", { children: title ? `${r.name} \xB7 ${title} \xB7 ${r.from}\u2013${r.to}` : `${r.name} \xB7 ${r.from}\u2013${r.to}` })
          }
        ),
        showRight && exI && exI.kind === "dest" && /* @__PURE__ */ jsx5(
          "rect",
          {
            x: capRightX,
            y: exitRowY,
            width: width + OVERHANG - capRightX,
            height: STRIP_H,
            fill: r.color,
            mask: "url(#ribMaskR)"
          }
        ),
        showLeft && enI && enI.kind === "dest" && /* @__PURE__ */ jsx5(
          "rect",
          {
            x: -OVERHANG,
            y: stripY,
            width: capLeftX + OVERHANG,
            height: STRIP_H,
            fill: r.color,
            mask: "url(#ribMaskL)"
          }
        ),
        /* @__PURE__ */ jsx5(
          "text",
          {
            x: 6,
            y: stripY + STRIP_H / 2 + 0.5,
            fontSize: 10.5,
            fontWeight: 700,
            dominantBaseline: "middle",
            fill: "#fff",
            style: { pointerEvents: "none", userSelect: "none" },
            children: stripLabel(r, title, maxChars)
          }
        ),
        showRight && exI && /* @__PURE__ */ jsx5(
          FollowTag,
          {
            x: width + PILL_GAP,
            y: exitRowY + STRIP_H / 2,
            anchor: "start",
            info: exI,
            person,
            conf: r.conf,
            onFollow,
            tapGuard
          }
        ),
        showLeft && enI && /* @__PURE__ */ jsx5(
          FollowTag,
          {
            x: -PILL_GAP,
            y: stripY + STRIP_H / 2,
            anchor: "end",
            info: enI,
            person,
            conf: r.conf,
            onFollow,
            tapGuard
          }
        )
      ] }, r.key);
    })
  ] });
}

// src/components/visualization/SeasonPage.jsx
import { memo } from "react";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var PAGE_BG = "#ffffff";
var HAIR = "#e7e4dd";
var SEC_LABEL = "#3c4350";
var INK = "#1d2534";
var MUTED = "#8a8f98";
var NAVY_PILL = "#2c4f8f";
var CHIP = {
  W: { fill: "#2e9d51", stroke: "#20713a" },
  L: { fill: "#d0423f", stroke: "#9c322f" },
  T: { fill: "#b9bdc4", stroke: "#8f959d" }
};
var MEDALS = [
  [/won (sb|super|champ)/i, "#d4af37"],
  [/lost (sb|super)/i, "#b9bec7"],
  [/lost conf|lost champ/i, "#8d99ae"],
  [/lost div/i, "#cd7f32"],
  [/lost wc/i, "#2b2b2b"]
];
function playoffMedal(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS) {
    if (re.test(playoffs)) return color;
  }
  return null;
}
function divisionLabel(s) {
  if (!s) return null;
  const m = /^\s*(\d+)\w*\s+of\s+(\d+)\s*$/.exec(s);
  if (!m) return { text: s, tone: "neutral" };
  const place = +m[1];
  const total = +m[2];
  if (place === 1) return { text: "Won Division", tone: "good" };
  if (place === total) return { text: "Last in Division", tone: "bad" };
  return { text: s, tone: "neutral" };
}
var toneColor = (tone) => tone === "good" ? "#3f8f2e" : tone === "bad" ? "#c0492b" : "#8a857c";
function SectionLabel({ x, right, y, children }) {
  return /* @__PURE__ */ jsxs6("g", { style: { pointerEvents: "none" }, children: [
    /* @__PURE__ */ jsx6("line", { x1: x, x2: right, y1: y + 0.5, y2: y + 0.5, stroke: HAIR, strokeWidth: 1 }),
    /* @__PURE__ */ jsx6("text", { x, y: y + 17, fontSize: 10, fontWeight: 800, fill: SEC_LABEL, style: { letterSpacing: 1.3 }, children })
  ] });
}
function ChipRow({ games, x, y, width, h }) {
  const n = games.length;
  if (!n) return null;
  const gap = 3;
  const size = Math.max(10, Math.min(h - 6, (width - (n - 1) * gap) / n));
  const letters = size >= 12;
  return /* @__PURE__ */ jsx6("g", { style: { pointerEvents: "none" }, children: games.map(({ g }, i) => {
    const c = CHIP[g.result] || CHIP.T;
    const cx = x + i * (size + gap);
    return /* @__PURE__ */ jsxs6("g", { children: [
      /* @__PURE__ */ jsx6("rect", { x: cx, y, width: size, height: size, rx: 3.5, fill: c.fill, stroke: c.stroke, strokeWidth: 1 }),
      letters && /* @__PURE__ */ jsx6(
        "text",
        {
          x: cx + size / 2,
          y: y + size / 2 + 0.5,
          fontSize: Math.min(10, size * 0.58),
          fontWeight: 700,
          textAnchor: "middle",
          dominantBaseline: "central",
          fill: "#fff",
          children: g.result
        }
      )
    ] }, g.game_id || i);
  }) });
}
var SeasonPage = memo(function SeasonPage2({
  offBlock,
  seaBlock,
  contentLeft,
  contentRight,
  fullWidth,
  meta,
  moduleData,
  detailBand,
  showWinRate = true
}) {
  const cw = Math.max(0, contentRight - contentLeft);
  const page = seaBlock.page || {};
  const post = seaBlock.postseason;
  const headerY = offBlock.headerY ?? offBlock.y0;
  const yearBase = headerY + 52;
  let pill = null;
  if (showWinRate && meta && meta.enterPct != null) {
    const pct = Math.round(meta.enterPct * 100);
    const label = `${pct}% (${meta.enterWins}\u2013${meta.enterLosses})`;
    const fs = 12;
    const caretW = fs * 0.62;
    const gap = 4;
    const dir = meta.prevPct == null ? 0 : meta.enterPct > meta.prevPct ? 1 : meta.enterPct < meta.prevPct ? -1 : 0;
    const textW = Math.round(label.length * fs * 0.52);
    const w = (dir !== 0 ? caretW + gap : 0) + textW + 20;
    pill = { label, fs, caretW, gap, dir, w, h: 24, cx: contentRight - w / 2, cy: yearBase - 8 };
  }
  const rec = meta ? meta.ties ? `${meta.wins}-${meta.losses}-${meta.ties}` : `${meta.wins}-${meta.losses}` : "";
  const df = meta ? divisionLabel(meta.divisionFinish) : null;
  const pd = meta?.pointDiff;
  const pdStr = pd == null ? null : pd > 0 ? `(+${pd})` : `(${pd})`;
  const pdColor = pd > 0 ? "#3f8f2e" : pd < 0 ? "#c0492b" : "#8a857c";
  const medal = post ? playoffMedal(post.result) : null;
  return /* @__PURE__ */ jsxs6("g", { children: [
    /* @__PURE__ */ jsx6(
      "rect",
      {
        x: 0,
        y: offBlock.y0,
        width: fullWidth,
        height: seaBlock.y1 - offBlock.y0,
        fill: PAGE_BG,
        style: { pointerEvents: "none" }
      }
    ),
    /* @__PURE__ */ jsx6(
      "line",
      {
        x1: 0,
        x2: fullWidth,
        y1: seaBlock.y1 - 0.5,
        y2: seaBlock.y1 - 0.5,
        stroke: HAIR,
        strokeWidth: 1,
        style: { pointerEvents: "none" }
      }
    ),
    /* @__PURE__ */ jsxs6("g", { style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsx6("text", { x: contentLeft, y: yearBase, fontSize: 30, fontWeight: 600, fill: INK, style: { letterSpacing: -0.5 }, children: seaBlock.year }),
      pill && /* @__PURE__ */ jsxs6("g", { children: [
        /* @__PURE__ */ jsx6(
          "rect",
          {
            x: pill.cx - pill.w / 2,
            y: pill.cy - pill.h / 2,
            width: pill.w,
            height: pill.h,
            rx: pill.h / 2,
            fill: NAVY_PILL
          }
        ),
        pill.dir !== 0 && (() => {
          const cl = pill.cx - pill.w / 2 + 10;
          const ch = pill.caretW * 0.92;
          const up = `${cl},${pill.cy + ch / 2} ${cl + pill.caretW},${pill.cy + ch / 2} ${cl + pill.caretW / 2},${pill.cy - ch / 2}`;
          const down = `${cl},${pill.cy - ch / 2} ${cl + pill.caretW},${pill.cy - ch / 2} ${cl + pill.caretW / 2},${pill.cy + ch / 2}`;
          return /* @__PURE__ */ jsx6(
            "polygon",
            {
              points: pill.dir > 0 ? up : down,
              fill: pill.dir > 0 ? "#4ade80" : "#ff6b6b",
              stroke: "#fff",
              strokeWidth: 0.75,
              strokeLinejoin: "round"
            }
          );
        })(),
        /* @__PURE__ */ jsx6(
          "text",
          {
            x: pill.dir !== 0 ? pill.cx - pill.w / 2 + 10 + pill.caretW + pill.gap : pill.cx,
            y: pill.cy,
            fontSize: pill.fs,
            fontWeight: 400,
            textAnchor: pill.dir !== 0 ? "start" : "middle",
            dominantBaseline: "central",
            fill: "#fff",
            children: pill.label
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx6(SectionLabel, { x: contentLeft, right: contentRight, y: page.regularLabelY, children: "REGULAR SEASON" }),
    meta && /* @__PURE__ */ jsxs6("text", { x: contentLeft, y: page.recY + 14, fontSize: 12, fill: INK, style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsx6("tspan", { fontWeight: 700, children: "Record" }),
      /* @__PURE__ */ jsx6("tspan", { fontWeight: 700, children: `  ${rec}` }),
      df && /* @__PURE__ */ jsx6("tspan", { fill: toneColor(df.tone), fontWeight: 700, children: `   ${df.text}` }),
      pdStr && /* @__PURE__ */ jsx6("tspan", { fill: pdColor, fontWeight: 700, children: `  ${pdStr}` })
    ] }),
    /* @__PURE__ */ jsx6(ChipRow, { games: seaBlock.games, x: contentLeft, y: page.chipsY, width: cw, h: page.chipsH || 26 }),
    page.draftLabelY != null && /* @__PURE__ */ jsx6(SectionLabel, { x: contentLeft, right: contentRight, y: page.draftLabelY, children: "DRAFT CLASS" }),
    (seaBlock.modules || []).map((box) => /* @__PURE__ */ jsx6("g", { children: box.module.render({
      year: seaBlock.year,
      x: contentLeft,
      width: cw,
      y: box.y,
      height: box.height,
      mode: "full",
      detailBand,
      data: moduleData
    }) }, `${seaBlock.year}-${box.id}`)),
    post && /* @__PURE__ */ jsxs6("g", { children: [
      /* @__PURE__ */ jsx6(SectionLabel, { x: contentLeft, right: contentRight, y: post.labelY, children: "PLAYOFFS" }),
      /* @__PURE__ */ jsxs6(
        "text",
        {
          x: contentLeft,
          y: post.resultY + 14,
          fontSize: 12,
          fontWeight: 700,
          fill: post.result ? medal ? "#2b2b2b" : INK : MUTED,
          style: { pointerEvents: "none" },
          children: [
            post.result || "Missed Playoffs",
            medal && /* @__PURE__ */ jsx6("tspan", { fill: medal, children: "  \u25CF" })
          ]
        }
      ),
      post.chipsY != null && /* @__PURE__ */ jsx6(ChipRow, { games: post.games, x: contentLeft, y: post.chipsY, width: cw, h: post.chipsH || 26 })
    ] })
  ] });
});
var SeasonPage_default = SeasonPage;

// src/components/visualization/offseason/draftModel.js
var HEADER_H2 = 18;
var PICK_ROW_H = 16;
var COMPACT_H = 20;
var BOTTOM_PAD = 4;
var TIER_COLORS = {
  S: "#006837",
  "A+": "#1a9850",
  A: "#66bd63",
  B: "#a6d96a",
  C: "#fee08b",
  D: "#fdae61",
  F: "#d73027"
};
var NO_VALUE_COLOR = "#d9d9d9";
function tierColor(tier) {
  return TIER_COLORS[tier] || NO_VALUE_COLOR;
}
function gradeOf(value, adjusted = false) {
  if (!value) return { score: null, tier: null, percentile: null, provisional: false };
  if (adjusted && typeof value.score_adj === "number") {
    return {
      score: value.score_adj,
      tier: value.tier_adj,
      percentile: value.percentile_adj,
      provisional: !!value.provisional
    };
  }
  return {
    score: typeof value.score === "number" ? value.score : null,
    tier: value.tier ?? null,
    percentile: value.percentile ?? null,
    provisional: !!value.provisional
  };
}
function _srgbToLin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function _luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * _srgbToLin(r) + 0.7152 * _srgbToLin(g) + 0.0722 * _srgbToLin(b);
}
function tierTextColor(tier) {
  const L = _luminance(tierColor(tier));
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastBlack >= contrastWhite ? "#1a1a1a" : "#ffffff";
}
function groupPicksByYear(picks) {
  const out = {};
  for (const p of picks || []) {
    const y = p.year;
    if (y == null) continue;
    (out[y] || (out[y] = [])).push(p);
  }
  for (const y of Object.keys(out)) {
    out[y].sort(
      (a, b) => (a.pick_overall ?? 9999) - (b.pick_overall ?? 9999)
    );
  }
  return out;
}
function picksForYear(data, year) {
  return data && data.draftByYear && data.draftByYear[year] || [];
}
function classGradeFor(data, year) {
  const g = data && data.classGrades;
  if (!g) return null;
  return g[year] || g[String(year)] || null;
}
function isExpandedYear(data, year) {
  return !!(data && data.expandedYears && data.expandedYears.has(year));
}
function measureDraft({ year, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return 0;
  if (mode === "compact") {
    if (!isExpandedYear(data, year)) return COMPACT_H + BOTTOM_PAD;
    return picks.length * PICK_ROW_H + BOTTOM_PAD;
  }
  return HEADER_H2 + picks.length * PICK_ROW_H + BOTTOM_PAD;
}
function classSummary(picks, adjusted = false) {
  const list = picks || [];
  const g = (p) => gradeOf(p.value, adjusted);
  const scored = list.filter((p) => typeof g(p).score === "number");
  const avgScore = scored.length ? scored.reduce((a, p) => a + g(p).score, 0) / scored.length : null;
  const hits = list.filter((p) => ["S", "A+", "A", "B"].includes(g(p).tier)).length;
  const busts = list.filter((p) => ["D", "F"].includes(g(p).tier)).length;
  return {
    count: list.length,
    scored: scored.length,
    avgScore,
    hits,
    busts
  };
}
function pickLabel(p) {
  const r = p.round != null ? `R${p.round}` : "";
  const o = p.pick_overall != null ? `#${p.pick_overall}` : "";
  return [r, o].filter(Boolean).join(" ") || "\u2014";
}
function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "\u2026" : str;
}

// src/components/visualization/TeamTimelineLayer.jsx
import { Fragment as Fragment3, jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var WIN = "#2e9d51";
var LOSS = "#d0423f";
var TIE = "#b9bdc4";
var BORDER = "#d9d9d9";
var BORDER_W = 2;
var TEXTBG = "#d0d0d0";
var LABEL_FILL = "#1a1a1a";
var PLATE_W = 38;
var MARGIN = { top: 8, left: 52, right: 16, bottom: 8 };
var OFF_PAPER = "#fbfbfa";
var OFF_HAIR = "#ececec";
var OFF_YEAR = "#2e3338";
var SEASON_HEADER_BG = "#f4f4f3";
var CURVE = "#3f5d9e";
var STRIPE_X = 18;
var CARD_L = 32;
var CARD_PAD = 12;
var CARD_STROKE = "#e3e1db";
var CARD_SELECTED = "#2d6cdf";
var DOT_GREY = "#b7bdc7";
var CARD_YEAR_Y = 30;
var CARD_DOT_Y = CARD_YEAR_Y - 6;
var CARD_PCT_Y = CARD_YEAR_Y + 19;
var MEDALS2 = [
  [/won (sb|super|champ)/i, "#d4af37"],
  // gold — won it all
  [/lost (sb|super)/i, "#b9bec7"],
  // silver — lost the big one
  [/lost conf|lost champ/i, "#8d99ae"],
  // steel — lost conference
  [/lost div/i, "#cd7f32"],
  // bronze — lost divisional
  [/lost wc/i, "#2b2b2b"]
  // black — lost wild card
];
function playoffMedal2(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS2) {
    if (re.test(playoffs)) return color;
  }
  return null;
}
function SeasonHeader({ block, contentLeft, contentRight, meta, showPlayoffs = true, card = false }) {
  const h = block.seasonHeaderHeight || 0;
  if (h <= 0 || !meta) return null;
  const y0 = block.y0;
  const cy = y0 + h / 2;
  const cw = Math.max(0, contentRight - contentLeft);
  const pd = meta.pointDiff;
  const pdStr = pd == null ? null : pd > 0 ? `+${pd}` : `${pd}`;
  const pdColor = pd > 0 ? "#3f8f2e" : pd < 0 ? "#c0492b" : "#8a857c";
  const df = divisionLabel2(meta.divisionFinish);
  const dfColor = df ? df.tone === "good" ? "#3f8f2e" : df.tone === "bad" ? "#c0492b" : "#8a857c" : null;
  if (card) {
    return /* @__PURE__ */ jsxs7(
      "text",
      {
        x: contentLeft,
        y: cy,
        dominantBaseline: "central",
        fontSize: 11.5,
        fill: "#1d2534",
        style: { pointerEvents: "none", letterSpacing: 0.1 },
        children: [
          /* @__PURE__ */ jsx7("tspan", { fontWeight: 700, children: "Record" }),
          /* @__PURE__ */ jsx7("tspan", { fontWeight: 700, children: `  ${recordStr(meta, showPlayoffs)}` }),
          df && /* @__PURE__ */ jsx7("tspan", { fill: dfColor, fontWeight: 600, children: `  \xB7  ${df.text}` }),
          pdStr && /* @__PURE__ */ jsx7("tspan", { fill: pdColor, fontWeight: 700, children: `  \xB7  ${pdStr}` })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs7("g", { style: { pointerEvents: "none" }, children: [
    /* @__PURE__ */ jsx7("rect", { x: contentLeft, y: y0, width: cw, height: h, fill: SEASON_HEADER_BG }),
    /* @__PURE__ */ jsxs7(
      "text",
      {
        x: contentLeft + 7,
        y: cy,
        dominantBaseline: "central",
        fontSize: 11,
        fontWeight: 700,
        fill: "#4a4640",
        style: { letterSpacing: 0.2 },
        children: [
          "Record: ",
          recordStr(meta, showPlayoffs),
          df && /* @__PURE__ */ jsx7("tspan", { fill: dfColor, fontWeight: 600, children: `    \xB7    ${df.text}` }),
          pdStr && /* @__PURE__ */ jsx7("tspan", { fill: pdColor, fontWeight: 700, children: `    ${pdStr}` })
        ]
      }
    ),
    /* @__PURE__ */ jsx7(
      "line",
      {
        x1: contentLeft,
        x2: contentRight,
        y1: y0 + h - 0.5,
        y2: y0 + h - 0.5,
        stroke: "#e3ddd2",
        strokeWidth: 1
      }
    )
  ] });
}
var GameRow = memo2(function GameRow2({ g, y, rh, contentLeft, contentRight, cw }) {
  const rowH = Math.max(3, rh - 2);
  const labels = rh >= 12;
  const pf = g.points_for ?? 0;
  const pa = g.points_against ?? 0;
  const total = pf + pa || 1;
  const splitX = contentLeft + cw * (pf / total);
  const isWin = g.result === "W";
  const isTie = g.result === "T";
  const tip = isWin ? Math.min(rowH, Math.max(0, contentRight - splitX)) : Math.min(rowH, Math.max(0, splitX - contentLeft));
  const tipX = isWin ? splitX + tip : splitX - tip;
  const arrow = `${contentLeft},0 ${splitX},0 ${tipX},${rowH / 2} ${splitX},${rowH} ${contentLeft},${rowH}`;
  const bw = BORDER_W;
  const greyArrow = `${contentLeft + bw},0 ${splitX + bw},0 ${tipX + bw},${rowH / 2} ${splitX + bw},${rowH} ${contentLeft + bw},${rowH}`;
  const leftLabel = `${g.franchise_id} ${pf}`;
  const rightLabel = `${pa} ${g.opponent_id}`;
  const bgH = Math.min(rowH - 3, 14);
  const bgY = (rowH - bgH) / 2;
  const plateMidY = bgY + bgH / 2;
  return /* @__PURE__ */ jsxs7("g", { transform: `translate(0, ${y - rowH / 2})`, children: [
    /* @__PURE__ */ jsx7("rect", { x: contentLeft, y: 0, width: Math.max(0, cw), height: rowH, fill: isTie ? TIE : LOSS }),
    !isTie && /* @__PURE__ */ jsxs7(Fragment3, { children: [
      /* @__PURE__ */ jsx7("polygon", { points: greyArrow, fill: BORDER }),
      /* @__PURE__ */ jsx7("rect", { x: contentLeft, y: 0, width: bw, height: rowH, fill: BORDER }),
      /* @__PURE__ */ jsx7("polygon", { points: arrow, fill: WIN })
    ] }),
    labels && /* @__PURE__ */ jsxs7("g", { children: [
      /* @__PURE__ */ jsx7("rect", { x: contentLeft + 2, y: bgY, width: PLATE_W, height: bgH, rx: 2, fill: TEXTBG }),
      /* @__PURE__ */ jsx7("text", { x: contentLeft + 5, y: plateMidY, fontSize: 9, dominantBaseline: "central", fill: LABEL_FILL, children: leftLabel }),
      /* @__PURE__ */ jsx7("rect", { x: contentRight - 2 - PLATE_W, y: bgY, width: PLATE_W, height: bgH, rx: 2, fill: TEXTBG }),
      /* @__PURE__ */ jsx7("text", { x: contentRight - 5, y: plateMidY, fontSize: 9, textAnchor: "end", dominantBaseline: "central", fill: LABEL_FILL, children: rightLabel })
    ] })
  ] });
});
var PostseasonSection = memo2(function PostseasonSection2({ post, contentLeft, contentRight, cw }) {
  if (!post) return null;
  const medal = playoffMedal2(post.result);
  if (post.kind === "result") {
    const { y0: y02, height: h, result: result2 } = post;
    return /* @__PURE__ */ jsxs7("g", { style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsx7(
        "rect",
        {
          x: contentLeft,
          y: y02,
          width: Math.max(0, cw),
          height: h,
          rx: 3,
          fill: "#fafafa",
          stroke: medal || "#dcdcdc",
          strokeWidth: medal ? 1.75 : 1
        }
      ),
      /* @__PURE__ */ jsx7(
        "text",
        {
          x: contentLeft + 8,
          y: y02 + h / 2 + 0.5,
          dominantBaseline: "central",
          fontSize: 9,
          fontWeight: 700,
          fill: "#9a9a9a",
          style: { letterSpacing: 1.5 },
          children: "POSTSEASON"
        }
      ),
      /* @__PURE__ */ jsx7(
        "text",
        {
          x: contentRight - 8,
          y: y02 + h / 2 + 0.5,
          dominantBaseline: "central",
          textAnchor: "end",
          fontSize: 11,
          fontWeight: 700,
          fill: medal ? "#2b2b2b" : "#777",
          children: result2 || "\u2014"
        }
      )
    ] });
  }
  const { y0, headerH, rowH, result, games } = post;
  return /* @__PURE__ */ jsxs7("g", { children: [
    /* @__PURE__ */ jsxs7(
      "text",
      {
        x: contentLeft,
        y: y0 + headerH - 4,
        fontSize: 9,
        fontWeight: 700,
        fill: "#9a9a9a",
        style: { letterSpacing: 1.5 },
        children: [
          "POSTSEASON",
          result ? ` \xB7 ${result}` : ""
        ]
      }
    ),
    /* @__PURE__ */ jsx7(
      "line",
      {
        x1: contentLeft,
        x2: contentRight,
        y1: y0 + headerH - 1,
        y2: y0 + headerH - 1,
        stroke: medal || "#e0e0e0",
        strokeWidth: medal ? 2 : 1
      }
    ),
    games.map(({ g, i, y }) => /* @__PURE__ */ jsx7(
      GameRow,
      {
        g,
        y,
        rh: rowH,
        contentLeft,
        contentRight,
        cw
      },
      g.game_id || `p-${i}`
    ))
  ] });
});
var SeasonBlock = memo2(function SeasonBlock2({ block, contentLeft, contentRight, centerX, cw, labelInline, meta, showPlayoffs = true, card = false }) {
  const sm = block.season || {};
  const raw = sm.season || {};
  const header = /* @__PURE__ */ jsx7(
    SeasonHeader,
    {
      block,
      contentLeft,
      contentRight,
      meta,
      showPlayoffs,
      card
    }
  );
  if (block.mode === "rows") {
    const rh = block.gameRowHeight;
    return /* @__PURE__ */ jsxs7("g", { children: [
      header,
      block.games.map(({ g, i, y: y2 }) => /* @__PURE__ */ jsx7(
        GameRow,
        {
          g,
          y: y2,
          rh,
          contentLeft,
          contentRight,
          cw
        },
        g.game_id || `${block.year}-${i}`
      )),
      /* @__PURE__ */ jsx7(
        PostseasonSection,
        {
          post: block.postseason,
          contentLeft,
          contentRight,
          cw
        }
      )
    ] });
  }
  const wins = raw.wins ?? 0;
  const losses = raw.losses ?? 0;
  const diff = wins - losses;
  const unit = cw / 2 / 16;
  const hh = block.seasonHeaderHeight || 0;
  const y = block.y0 + hh + (block.height - hh) / 2;
  const barW = Math.min(cw / 2, Math.abs(diff) * unit);
  const x0 = diff >= 0 ? centerX : centerX - barW;
  const color = diff >= 0 ? WIN : LOSS;
  const medal = showPlayoffs ? playoffMedal2(raw.playoffs) : null;
  const frameH = Math.max(8, Math.min(block.height - 1, 12));
  return /* @__PURE__ */ jsxs7("g", { children: [
    header,
    !card && medal && /* @__PURE__ */ jsx7(
      "rect",
      {
        x: contentLeft,
        y: y - frameH / 2,
        width: cw,
        height: frameH,
        fill: "none",
        stroke: medal,
        strokeWidth: 1.5,
        rx: 2
      }
    ),
    !card && /* @__PURE__ */ jsx7("rect", { x: x0, y: y - 3, width: barW, height: 6, fill: color, rx: 1 }),
    labelInline && /* @__PURE__ */ jsxs7("text", { x: contentLeft + 4, y, fontSize: 10, dominantBaseline: "middle", fill: "#333", children: [
      block.year,
      " \xB7 ",
      wins,
      "-",
      losses,
      showPlayoffs && raw.playoffs ? ` \xB7 ${raw.playoffs}` : ""
    ] })
  ] });
});
function recordStr(m, showPlayoffs = true) {
  if (!m) return "";
  const wlt = m.ties ? `${m.wins}-${m.losses}-${m.ties}` : `${m.wins}-${m.losses}`;
  return showPlayoffs && m.playoffs ? `${wlt} \xB7 ${m.playoffs}` : wlt;
}
function divisionLabel2(s) {
  if (!s) return null;
  const m = /^\s*(\d+)\w*\s+of\s+(\d+)\s*$/.exec(s);
  if (!m) return { text: s, tone: "neutral" };
  const place = +m[1];
  const total = +m[2];
  if (place === 1) return { text: "Won Division", tone: "good" };
  if (place === total) return { text: "Last in Division", tone: "bad" };
  return { text: s, tone: "neutral" };
}
var OffseasonBlock = memo2(function OffseasonBlock2({
  block,
  contentLeft,
  contentRight,
  cw,
  fullWidth,
  offMode,
  detailBand,
  moduleData,
  meta,
  showWinRate = true
}) {
  if (offMode === "compact") {
    const grade = classGradeFor(moduleData, block.year);
    const picks = picksForYear(moduleData, block.year);
    const s = picks.length ? classSummary(picks, !!moduleData.adjusted) : null;
    const summary = s ? s.scored > 0 ? `${s.count} picks \xB7 ${s.hits} hit${s.hits === 1 ? "" : "s"} \xB7 avg ${s.avgScore == null ? "\u2014" : Math.round(s.avgScore)}` : `${s.count} pick${s.count === 1 ? "" : "s"}` : null;
    const y0 = block.headerY ?? block.y0;
    const yearY = y0 + CARD_YEAR_Y;
    const pctY = y0 + CARD_PCT_Y;
    return /* @__PURE__ */ jsxs7("g", { children: [
      /* @__PURE__ */ jsxs7("g", { style: { pointerEvents: "none" }, children: [
        /* @__PURE__ */ jsx7(
          "text",
          {
            x: contentLeft,
            y: yearY,
            fontSize: 17,
            fontWeight: 600,
            fill: OFF_YEAR,
            style: { letterSpacing: -0.2 },
            children: block.year
          }
        ),
        grade && /* @__PURE__ */ jsxs7("g", { children: [
          /* @__PURE__ */ jsx7("rect", { x: contentLeft + 46, y: yearY - 14, width: 22, height: 16, rx: 4, fill: tierColor(grade.tier) }),
          /* @__PURE__ */ jsxs7(
            "text",
            {
              x: contentLeft + 57,
              y: yearY - 6,
              fontSize: 9.5,
              fontWeight: 700,
              textAnchor: "middle",
              dominantBaseline: "central",
              fill: tierTextColor(grade.tier),
              children: [
                grade.tier,
                grade.provisional ? "*" : ""
              ]
            }
          )
        ] }),
        showWinRate && meta && meta.enterPct != null && /* @__PURE__ */ jsx7("text", { x: contentLeft, y: pctY, fontSize: 12.5, fontWeight: 400, fill: "#22304a", children: `${Math.round(meta.enterPct * 100)}% (${meta.enterWins}\u2013${meta.enterLosses})` }),
        summary && /* @__PURE__ */ jsx7("text", { x: contentRight, y: pctY, fontSize: 10, textAnchor: "end", fill: "#8a8f98", children: summary })
      ] }),
      block.modules.map((box) => /* @__PURE__ */ jsx7("g", { children: box.module.render({
        year: block.year,
        x: contentLeft,
        width: cw,
        y: box.y,
        height: box.height,
        mode: offMode,
        detailBand,
        data: moduleData
      }) }, `${block.year}-${box.id}`))
    ] });
  }
  const showBanner = offMode !== "hidden";
  if ((!block.modules || !block.modules.length) && !showBanner) return null;
  const headerH = block.headerHeight || 0;
  const headTop = block.y0;
  const headBot = headTop + headerH;
  const headMid = headTop + headerH / 2;
  const big = offMode === "full";
  const yearSize = big ? 24 : 19;
  let win = null;
  if (showWinRate && headerH > 0 && detailBand !== "GAME_DETAIL" && meta && meta.enterPct != null) {
    const fs = big ? 11 : 10;
    const pct = Math.round(meta.enterPct * 100);
    const label = `${pct}% (${meta.enterWins}\u2013${meta.enterLosses})`;
    const ph = Math.min(headerH - 8, 18);
    const caretW = fs * 0.62;
    const gap = 4;
    const textW = Math.round(label.length * fs * 0.52);
    const w = caretW + gap + textW + 16;
    const curveX = contentLeft + meta.enterPct * cw;
    const cx = Math.max(contentLeft + w / 2, Math.min(contentRight - w / 2, curveX));
    const dir = meta.prevPct == null ? 0 : meta.enterPct > meta.prevPct ? 1 : meta.enterPct < meta.prevPct ? -1 : 0;
    win = { fs, label, w, ph, cx, caretW, gap, dir };
  }
  return /* @__PURE__ */ jsxs7("g", { children: [
    showBanner && /* @__PURE__ */ jsxs7("g", { style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsx7(
        "rect",
        {
          x: 0,
          y: block.y0,
          width: fullWidth,
          height: block.height,
          fill: OFF_PAPER
        }
      ),
      headerH > 0 && /* @__PURE__ */ jsxs7("g", { children: [
        /* @__PURE__ */ jsx7(
          "text",
          {
            x: 6,
            y: headMid,
            dominantBaseline: "central",
            fontSize: yearSize,
            fontWeight: 600,
            fill: OFF_YEAR,
            style: { letterSpacing: -0.4 },
            children: block.year
          }
        ),
        win && (() => {
          const innerLeft = win.cx - win.w / 2 + 8;
          const caretLeft = innerLeft;
          const textX = innerLeft + win.caretW + win.gap;
          const ch = win.caretW * 0.92;
          const up = `${caretLeft},${headMid + ch / 2} ${caretLeft + win.caretW},${headMid + ch / 2} ${caretLeft + win.caretW / 2},${headMid - ch / 2}`;
          const down = `${caretLeft},${headMid - ch / 2} ${caretLeft + win.caretW},${headMid - ch / 2} ${caretLeft + win.caretW / 2},${headMid + ch / 2}`;
          return /* @__PURE__ */ jsxs7("g", { children: [
            /* @__PURE__ */ jsx7(
              "rect",
              {
                x: win.cx - win.w / 2,
                y: headMid - win.ph / 2,
                width: win.w,
                height: win.ph,
                rx: win.ph / 2,
                fill: CURVE
              }
            ),
            win.dir !== 0 && /* @__PURE__ */ jsx7(
              "polygon",
              {
                points: win.dir > 0 ? up : down,
                fill: win.dir > 0 ? "#4ade80" : "#ff6b6b",
                stroke: "#ffffff",
                strokeWidth: 0.75,
                strokeLinejoin: "round"
              }
            ),
            /* @__PURE__ */ jsx7(
              "text",
              {
                x: win.dir !== 0 ? textX : win.cx,
                y: headMid,
                fontSize: win.fs,
                fontWeight: 600,
                textAnchor: win.dir !== 0 ? "start" : "middle",
                dominantBaseline: "central",
                fill: "#ffffff",
                children: win.label
              }
            )
          ] });
        })(),
        /* @__PURE__ */ jsx7(
          "line",
          {
            x1: contentLeft,
            x2: contentRight,
            y1: headBot - 0.5,
            y2: headBot - 0.5,
            stroke: OFF_HAIR,
            strokeWidth: 1
          }
        )
      ] })
    ] }),
    block.modules.map((box) => /* @__PURE__ */ jsx7("g", { children: box.module.render({
      year: block.year,
      x: contentLeft,
      width: cw,
      y: box.y,
      height: box.height,
      mode: offMode,
      detailBand,
      data: moduleData
    }) }, `${block.year}-${box.id}`))
  ] });
});
var RAIL_PAD = 10;
var TeamTimelineLayer = memo2(function TeamTimelineLayer2({
  layout,
  scrollY = 0,
  width,
  height,
  band,
  moduleData = {},
  staff = [],
  pre1967 = null,
  adminById,
  onSelectStaff,
  tapGuard,
  railPan = 0,
  onFollow,
  showWinRate = true,
  showPlayoffs = true
}) {
  const ribbonLayout = useMemo2(
    () => buildStaffRibbons({ staff, layout }),
    [staff, layout]
  );
  const winCurve = useMemo2(() => {
    if (!layout?.blocks?.length) return null;
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    const pts = [];
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const reg = b.games || [];
      const post = b.postseason?.games || [];
      const seq = post.length ? [...reg, ...post] : reg;
      const m = seq.length || 1;
      seq.forEach(({ g }, idx) => {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
        const y = b.mode === "rows" ? seq[idx].y : b.y0 + (idx + 0.5) / m * b.height;
        pts.push([y, (w + t / 2) / n]);
      });
    }
    return pts.length ? pts : null;
  }, [layout, pre1967]);
  const seasonMeta = useMemo2(() => {
    const map = /* @__PURE__ */ new Map();
    if (!layout?.blocks?.length) return map;
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    let prevPct = null;
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const raw = b.season?.season || {};
      const enterPct = n > 0 ? (w + t / 2) / n : null;
      map.set(b.year, {
        enterPct,
        enterWins: w,
        // cumulative all-time record ENTERING this year
        enterLosses: n - w - t,
        prevPct,
        // prior year's entering-pct (null for the first season)
        wins: raw.wins ?? 0,
        losses: raw.losses ?? 0,
        ties: raw.ties ?? 0,
        playoffs: raw.playoffs || null,
        pointDiff: raw.point_diff ?? null,
        divisionFinish: raw.division_finish || null
      });
      prevPct = enterPct;
      const post = b.postseason?.games || [];
      const seq = post.length ? [...b.games || [], ...post] : b.games || [];
      for (const { g } of seq) {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
      }
    }
    return map;
  }, [layout, pre1967]);
  const railWidth = ribbonLayout.railWidth;
  const railLeft = width - railWidth - PEEK;
  const isCards = band === "SEASON_LINES";
  const isPages = band === "GAME_BANDS";
  const baseRight = railWidth ? railLeft - RAIL_PAD : width - (isPages ? 14 : isCards ? 20 : MARGIN.right);
  const cardRight = baseRight;
  const contentLeft = isCards ? CARD_L + CARD_PAD : isPages ? 14 : MARGIN.left;
  const contentRight = isCards ? cardRight - CARD_PAD : baseRight;
  const cw = Math.max(0, contentRight - contentLeft);
  const centerX = (contentLeft + contentRight) / 2;
  const { strips: ribbonStrips, stackHeight } = useMemo2(
    () => resolveRibbonStrips({ ribbons: ribbonLayout.ribbons, scrollY }),
    [ribbonLayout, scrollY]
  );
  const vPad = 60 + stackHeight;
  const vBot = scrollY + height + vPad;
  const visible = useMemo2(() => {
    if (!layout?.blocks) return [];
    const top = scrollY - vPad;
    const bot = scrollY + height + vPad;
    return layout.blocks.filter((b) => b.y1 > top && b.y0 < bot);
  }, [layout, scrollY, height, vPad]);
  const visibleYears = useMemo2(() => {
    const seen = /* @__PURE__ */ new Set();
    const years = [];
    for (const b of visible) {
      if (seen.has(b.year)) continue;
      seen.add(b.year);
      years.push(b.year);
    }
    return years;
  }, [visible]);
  const winCurvePoints = useMemo2(() => {
    if (!winCurve) return null;
    return winCurve.map(([y, r]) => `${(contentLeft + r * cw).toFixed(1)},${y.toFixed(1)}`).join(" ");
  }, [winCurve, contentLeft, cw]);
  if (!layout || !width || !height) return null;
  const offMode = geometryFor(band).offseason;
  return /* @__PURE__ */ jsxs7(Fragment3, { children: [
    /* @__PURE__ */ jsx7("defs", { children: /* @__PURE__ */ jsxs7("linearGradient", { id: "offPaperShadow", x1: "0", y1: "0", x2: "0", y2: "1", children: [
      /* @__PURE__ */ jsx7("stop", { offset: "0%", stopColor: "#3a2f1a", stopOpacity: "0.18" }),
      /* @__PURE__ */ jsx7("stop", { offset: "100%", stopColor: "#3a2f1a", stopOpacity: "0" })
    ] }) }),
    /* @__PURE__ */ jsxs7("g", { transform: `translate(0, ${stackHeight - scrollY})`, children: [
      showWinRate && winCurve && band !== "GAME_DETAIL" && /* @__PURE__ */ jsxs7("g", { style: { pointerEvents: "none" }, children: [
        /* @__PURE__ */ jsx7(
          "line",
          {
            x1: contentLeft + cw / 2,
            x2: contentLeft + cw / 2,
            y1: 0,
            y2: layout.totalHeight,
            stroke: "#d8dde6",
            strokeWidth: 1,
            strokeDasharray: "2 6"
          }
        ),
        /* @__PURE__ */ jsx7(
          "polyline",
          {
            fill: "none",
            stroke: CURVE,
            strokeWidth: 1.5,
            strokeOpacity: 0.7,
            points: winCurvePoints
          }
        )
      ] }),
      isCards && layout.blocks.length > 0 && /* @__PURE__ */ jsxs7("g", { children: [
        /* @__PURE__ */ jsx7(
          "line",
          {
            x1: STRIPE_X,
            x2: STRIPE_X,
            y1: layout.blocks[0].y0 + 10,
            y2: layout.blocks[layout.blocks.length - 1].y1 - 10,
            stroke: "#d9dde3",
            strokeWidth: 3,
            strokeLinecap: "round",
            style: { pointerEvents: "none" }
          }
        ),
        visibleYears.map((year) => {
          const pair = layout.byYear.get(year);
          if (!pair) return null;
          const { offseason: off, season: sea } = pair;
          const expanded = !!moduleData.expandedYears?.has(year);
          const canToggle = off.modules.length > 0 && typeof moduleData.onToggleYear === "function";
          const dotY = (off.headerY ?? off.y0) + CARD_DOT_Y;
          const dotR = expanded ? 7 : 4;
          return /* @__PURE__ */ jsxs7("g", { children: [
            /* @__PURE__ */ jsx7(
              "rect",
              {
                x: CARD_L,
                y: off.y0 + 3,
                width: Math.max(0, cardRight - CARD_L),
                height: sea.y1 - off.y0 - 6,
                rx: 10,
                fill: "#fff",
                stroke: expanded ? CARD_SELECTED : CARD_STROKE,
                strokeWidth: expanded ? 1.5 : 1,
                onClick: canToggle ? (e) => {
                  e.stopPropagation();
                  if (tapGuard && tapGuard()) return;
                  moduleData.onToggleYear(year);
                } : void 0,
                style: canToggle ? { cursor: "pointer" } : void 0
              }
            ),
            /* @__PURE__ */ jsx7(
              "line",
              {
                x1: STRIPE_X + dotR,
                x2: contentLeft - 5,
                y1: dotY,
                y2: dotY,
                stroke: expanded ? CARD_SELECTED : DOT_GREY,
                strokeWidth: expanded ? 1.5 : 1,
                style: { pointerEvents: "none" }
              }
            ),
            expanded ? /* @__PURE__ */ jsxs7("g", { style: { pointerEvents: "none" }, children: [
              /* @__PURE__ */ jsx7("circle", { cx: STRIPE_X, cy: dotY, r: dotR, fill: "#fff", stroke: CARD_SELECTED, strokeWidth: 2 }),
              /* @__PURE__ */ jsx7("circle", { cx: STRIPE_X, cy: dotY, r: 3.5, fill: CARD_SELECTED })
            ] }) : /* @__PURE__ */ jsx7("circle", { cx: STRIPE_X, cy: dotY, r: dotR, fill: DOT_GREY, style: { pointerEvents: "none" } })
          ] }, `card-${year}`);
        })
      ] }),
      isPages ? visibleYears.map((year) => {
        const pair = layout.byYear.get(year);
        if (!pair) return null;
        return /* @__PURE__ */ jsx7(
          SeasonPage_default,
          {
            offBlock: pair.offseason,
            seaBlock: pair.season,
            contentLeft,
            contentRight,
            fullWidth: width,
            meta: seasonMeta.get(year),
            moduleData,
            detailBand: band,
            showWinRate
          },
          `p-${year}`
        );
      }) : visible.map(
        (b) => b.type === "season" ? /* @__PURE__ */ jsx7(
          SeasonBlock,
          {
            block: b,
            contentLeft,
            contentRight,
            centerX,
            cw,
            labelInline: offMode === "hidden",
            meta: seasonMeta.get(b.year),
            showPlayoffs,
            card: offMode === "compact"
          },
          `s-${b.year}`
        ) : /* @__PURE__ */ jsx7(
          OffseasonBlock,
          {
            block: b,
            contentLeft,
            contentRight,
            cw,
            fullWidth: width,
            offMode,
            detailBand: band,
            moduleData,
            meta: seasonMeta.get(b.year),
            showWinRate
          },
          `o-${b.year}`
        )
      ),
      offMode === "full" && !isPages && visible.filter((b) => b.type === "offseason").map((b) => /* @__PURE__ */ jsx7(
        "rect",
        {
          x: 0,
          y: b.y1,
          width,
          height: 6,
          fill: "url(#offPaperShadow)",
          style: { pointerEvents: "none" }
        },
        `osh-${b.year}`
      )),
      offMode === "hidden" && visible.filter((b) => b.type === "season").map((b) => /* @__PURE__ */ jsx7(
        "text",
        {
          x: MARGIN.left - 6,
          y: b.y0 + 10,
          fontSize: 10,
          textAnchor: "end",
          fill: "#555",
          children: b.year
        },
        `y-${b.year}`
      )),
      /* @__PURE__ */ jsx7(
        StaffRibbonLayer,
        {
          ribbons: ribbonLayout.ribbons,
          strips: ribbonStrips,
          width,
          slotCount: ribbonLayout.slotCount,
          tailWidth: ribbonLayout.tailW,
          railPan,
          viewBottom: vBot,
          adminById,
          onSelect: onSelectStaff,
          onFollow,
          tapGuard
        }
      )
    ] })
  ] });
});
var TeamTimelineLayer_default = TeamTimelineLayer;

// src/components/InfoCard.jsx
import { useEffect as useEffect3, useRef as useRef3, useState as useState4 } from "react";

// src/utils/getPersonnelTitle.js
function roleLabelFromFlags(r) {
  if (!r) return null;
  const parts = [];
  if (r.is_owner) parts.push("Owner");
  if (r.is_gm) parts.push("General Manager");
  if (r.is_coach) parts.push("Head Coach");
  return parts.length ? parts.join(" / ") : null;
}
function getPersonnelTitle(adminSegment) {
  if (!adminSegment?.records?.length) return null;
  const counts = {};
  for (const r of adminSegment.records) {
    const label = roleLabelFromFlags(r);
    if (!label) continue;
    counts[label] = (counts[label] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// src/components/InfoCard.jsx
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var fmt = (v) => v == null || Number.isNaN(Number(v)) ? null : Number(v).toLocaleString();
var STAT_DEFS = {
  passing: [
    ["pass_yds", "Pass yds"],
    ["pass_tds", "Pass TD"],
    ["pass_int", "INT thrown"],
    ["rush_yds", "Rush yds"]
  ],
  rushing: [
    ["rush_att", "Carries"],
    ["rush_yds", "Rush yds"],
    ["rush_tds", "Rush TD"],
    ["rec", "Receptions"]
  ],
  receiving: [
    ["rec", "Receptions"],
    ["rec_yds", "Rec yds"],
    ["rec_tds", "Rec TD"],
    ["rush_yds", "Rush yds"]
  ],
  frontSeven: [
    ["sacks", "Sacks"],
    ["tackles", "Tackles"],
    ["def_int", "INT"]
  ],
  secondary: [
    ["def_int", "INT"],
    ["tackles", "Tackles"],
    ["sacks", "Sacks"]
  ],
  none: []
};
var POS_TO_GROUP = {
  QB: "passing",
  RB: "rushing",
  FB: "rushing",
  HB: "rushing",
  WR: "receiving",
  TE: "receiving",
  DE: "frontSeven",
  DT: "frontSeven",
  NT: "frontSeven",
  DL: "frontSeven",
  LB: "frontSeven",
  OLB: "frontSeven",
  ILB: "frontSeven",
  MLB: "frontSeven",
  EDGE: "frontSeven",
  CB: "secondary",
  S: "secondary",
  FS: "secondary",
  SS: "secondary",
  DB: "secondary",
  // OL / specialists: universal rows only
  C: "none",
  G: "none",
  T: "none",
  OG: "none",
  OT: "none",
  OL: "none",
  K: "none",
  P: "none",
  LS: "none"
};
function positionStats(position, career) {
  if (!career) return [];
  const group = POS_TO_GROUP[String(position || "").toUpperCase()] || "none";
  const rows = [];
  for (const [key, label] of STAT_DEFS[group]) {
    const v = fmt(career[key]);
    if (v != null && Number(career[key]) !== 0) rows.push([label, v]);
  }
  return rows;
}
function universalStats(career) {
  if (!career) return [];
  const rows = [];
  const games = fmt(career.games);
  if (games) rows.push(["Games", games]);
  if (career.starter_seasons) rows.push(["Seasons as starter", fmt(career.starter_seasons)]);
  if (career.pro_bowls) rows.push(["Pro Bowls", fmt(career.pro_bowls)]);
  if (career.all_pro_first_team) rows.push(["All-Pro (1st team)", fmt(career.all_pro_first_team)]);
  return rows;
}
function collapseStints(records) {
  const rows = [...records || []].sort((a, b) => a.year - b.year);
  const stints = [];
  let cur = null;
  for (const r of rows) {
    const title = roleLabelFromFlags(r);
    if (cur && r.team_label === cur.team && title === cur.title && r.year === cur.to + 1) {
      cur.to = r.year;
      continue;
    }
    if (cur) stints.push(cur);
    cur = { team: r.team_label, title, from: r.year, to: r.year };
  }
  if (cur) stints.push(cur);
  return stints;
}
var cardStyle = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 280,
  maxHeight: "75%",
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  padding: "12px 14px",
  fontSize: 12,
  color: "#222",
  zIndex: 30
};
function useDismiss(onClose) {
  const ref = useRef3(null);
  useEffect3(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onClose]);
  return ref;
}
function Row({ label, value }) {
  return /* @__PURE__ */ jsxs8("div", { style: { display: "flex", justifyContent: "space-between", padding: "2px 0" }, children: [
    /* @__PURE__ */ jsx8("span", { style: { color: "#777" }, children: label }),
    /* @__PURE__ */ jsx8("span", { style: { fontWeight: 600 }, children: value })
  ] });
}
function CloseButton({ onClose }) {
  return /* @__PURE__ */ jsx8(
    "button",
    {
      onClick: onClose,
      style: {
        position: "absolute",
        top: 6,
        right: 8,
        border: "none",
        background: "none",
        fontSize: 16,
        cursor: "pointer",
        color: "#999",
        lineHeight: 1,
        padding: 4
      },
      "aria-label": "Close",
      children: "\xD7"
    }
  );
}
function PlayerCard({ pick, onClose, adjusted }) {
  const [career, setCareer] = useState4(pick.career || null);
  const cardRef = useDismiss(onClose);
  useEffect3(() => {
    if (!pick.player_id) return;
    let cancelled = false;
    fetch(`/data/segments/players/${pick.player_id}.json`).then((r) => r.ok ? r.json() : null).then((seg) => {
      if (!cancelled && seg?.career?.length) setCareer(seg.career[0]);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [pick.player_id]);
  const g = gradeOf(pick.value, adjusted);
  const tier = g.tier;
  const provisional = g.provisional;
  const score = g.score;
  const pct = g.percentile;
  const lastYear = career?.last_year ?? pick.career?.last_year;
  const hof = career?.hof ?? pick.career?.hof;
  return /* @__PURE__ */ jsxs8("div", { style: cardStyle, ref: cardRef, children: [
    /* @__PURE__ */ jsx8(CloseButton, { onClose }),
    /* @__PURE__ */ jsx8("div", { style: { fontSize: 14, fontWeight: 700, paddingRight: 16 }, children: pick.name || "Unknown" }),
    /* @__PURE__ */ jsx8("div", { style: { color: "#666", marginBottom: 6 }, children: [pick.position, pick.college].filter(Boolean).join(" \xB7 ") }),
    /* @__PURE__ */ jsxs8("div", { style: { marginBottom: 8 }, children: [
      "Drafted ",
      pick.year,
      pick.round != null ? ` \xB7 R${pick.round} #${pick.pick_overall}` : "",
      pick.age_at_draft ? ` \xB7 age ${pick.age_at_draft}` : ""
    ] }),
    /* @__PURE__ */ jsxs8("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
      /* @__PURE__ */ jsx8(
        "span",
        {
          style: {
            background: tierColor(tier),
            color: tier ? tierTextColor(tier) : "#5a5a5a",
            fontWeight: 700,
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 13
          },
          children: tier ? tier + (provisional ? "*" : "") : "\u2013"
        }
      ),
      score != null ? /* @__PURE__ */ jsxs8("span", { style: { color: "#555" }, children: [
        Math.round(score),
        " / 100",
        pct != null ? ` \xB7 ${Math.round(pct * 100)}th pct` : "",
        adjusted ? " \xB7 availability-adj." : ""
      ] }) : /* @__PURE__ */ jsx8("span", { style: { color: "#999" }, children: "not yet graded" })
    ] }),
    provisional && /* @__PURE__ */ jsx8("div", { style: { color: "#999", fontSize: 11, marginTop: -4, marginBottom: 8 }, children: "* still active \u2014 grade can move" }),
    /* @__PURE__ */ jsxs8("div", { style: { borderTop: "1px solid #eee", paddingTop: 6 }, children: [
      pick.year != null && /* @__PURE__ */ jsx8(
        Row,
        {
          label: "Active",
          value: lastYear ? `${pick.year}\u2013${Math.round(lastYear)}` : `${pick.year}\u2013?`
        }
      ),
      universalStats(career).map(([l, v]) => /* @__PURE__ */ jsx8(Row, { label: l, value: v }, l)),
      positionStats(pick.position, career).map(([l, v]) => /* @__PURE__ */ jsx8(Row, { label: l, value: v }, l)),
      hof && hof !== "No" && /* @__PURE__ */ jsx8(Row, { label: "Hall of Fame", value: "Yes" })
    ] })
  ] });
}
function StaffCard({ ribbon, adminById, onClose }) {
  const [records, setRecords] = useState4(null);
  const cardRef = useDismiss(onClose);
  useEffect3(() => {
    if (!ribbon.id) return;
    let cancelled = false;
    fetch(`/data/segments/admin/${ribbon.id}.json`).then((r) => r.ok ? r.json() : null).then((seg) => {
      if (!cancelled && seg?.records) setRecords(seg.records);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [ribbon.id]);
  const title = adminById?.get?.(ribbon.id)?.title;
  const stints = collapseStints(records);
  return /* @__PURE__ */ jsxs8("div", { style: cardStyle, ref: cardRef, children: [
    /* @__PURE__ */ jsx8(CloseButton, { onClose }),
    /* @__PURE__ */ jsx8("div", { style: { fontSize: 14, fontWeight: 700, paddingRight: 16 }, children: ribbon.name }),
    /* @__PURE__ */ jsxs8("div", { style: { display: "flex", alignItems: "center", gap: 6, margin: "4px 0 8px" }, children: [
      /* @__PURE__ */ jsx8(
        "span",
        {
          style: {
            width: 10,
            height: 10,
            borderRadius: 2,
            display: "inline-block",
            background: ROLE_COLORS[ribbon.role] || ROLE_COLORS.unknown
          }
        }
      ),
      /* @__PURE__ */ jsxs8("span", { style: { color: "#666" }, children: [
        title || ribbon.role.toUpperCase(),
        " \xB7 ",
        ribbon.from,
        "\u2013",
        ribbon.to
      ] })
    ] }),
    /* @__PURE__ */ jsx8("div", { style: { borderTop: "1px solid #eee", paddingTop: 6 }, children: stints.length ? stints.map((s, i) => /* @__PURE__ */ jsxs8("div", { style: { padding: "3px 0" }, children: [
      /* @__PURE__ */ jsxs8("div", { style: { fontWeight: 600 }, children: [
        s.team || "\u2014",
        " \xB7 ",
        s.from,
        s.to !== s.from ? `\u2013${s.to}` : ""
      ] }),
      /* @__PURE__ */ jsx8("div", { style: { color: "#777" }, children: s.title })
    ] }, i)) : /* @__PURE__ */ jsx8("div", { style: { color: "#999" }, children: "Loading tenure\u2026" }) })
  ] });
}
function InfoCard({ selection, adminById, onClose, adjusted }) {
  useEffect3(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!selection) return null;
  if (selection.type === "player") {
    return /* @__PURE__ */ jsx8(PlayerCard, { pick: selection.pick, onClose, adjusted });
  }
  if (selection.type === "staff") {
    return /* @__PURE__ */ jsx8(StaffCard, { ribbon: selection.ribbon, adminById, onClose });
  }
  return null;
}

// src/components/ZoomHud.jsx
import { useEffect as useEffect4, useRef as useRef4 } from "react";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var FOOTER_BAR_H = 44;
function LevelBars({ zoom }) {
  const levels = Array.from({ length: ZOOM_LEVELS }, (_, i) => ZOOM_LEVELS - i);
  return /* @__PURE__ */ jsx9(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2.5,
        marginBottom: 2
      },
      children: levels.map((level) => /* @__PURE__ */ jsx9(
        "span",
        {
          style: {
            // widest = least detail (Eras / Franchise = Zoom 1)
            width: 5 + (ZOOM_LEVELS + 1 - level) * 3.5,
            height: 3,
            borderRadius: 2,
            background: level === zoom ? "#fff" : "rgba(255,255,255,0.32)"
          }
        },
        level
      ))
    }
  );
}
function ZoomHud({ band }) {
  const { zoom, name } = zoomLabelFor(band);
  const firstRef = useRef4(true);
  useEffect4(() => {
    firstRef.current = false;
  }, []);
  if (firstRef.current) return null;
  return /* @__PURE__ */ jsx9(
    "div",
    {
      "aria-hidden": "true",
      style: {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: FOOTER_BAR_H,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 24
        // below the footer (25) so an open drawer covers it
      },
      children: /* @__PURE__ */ jsxs9(
        "div",
        {
          className: "zoom-hud",
          style: {
            width: "100%",
            height: 74,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 11,
            paddingBottom: 13,
            boxSizing: "border-box",
            // gradient fades out going up — strongest at the footer edge, gone by
            // the top of the band
            background: "linear-gradient(to top, rgba(16,19,26,0.82) 0%, rgba(16,19,26,0.5) 42%, rgba(16,19,26,0) 100%)"
          },
          children: [
            /* @__PURE__ */ jsx9(LevelBars, { zoom }),
            /* @__PURE__ */ jsx9(
              "span",
              {
                style: {
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  color: "#fff",
                  textShadow: "0 1px 3px rgba(0,0,0,0.45)",
                  whiteSpace: "nowrap"
                },
                children: name
              }
            )
          ]
        },
        band
      )
    }
  );
}

// src/hooks/useTimelineViewport.js
import {
  useCallback as useCallback3,
  useEffect as useEffect5,
  useLayoutEffect,
  useMemo as useMemo3,
  useRef as useRef5,
  useState as useState5
} from "react";

// src/components/visualization/buildTimelineLayout.js
var OFF_FRAC = 0.4;
var SEA_FRAC = 0.6;
var OFF_HEADER_FULL = 38;
var OFF_HEADER_COMPACT = 56;
var OFF_HEADER_PAGE = 72;
var SEC_LABEL_H = 24;
var REC_LINE_H = 20;
var CHIPS_H = 26;
var SEC_PAD = 10;
var POST_LINE_H = 22;
var SEASON_HEADER_FULL = 20;
var SEASON_HEADER_COMPACT = 22;
var POST_HEADER_H = 14;
var POST_RESULT_H = 22;
function buildTimelineLayout({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  detailBand = DEFAULT_BAND,
  top = 0,
  seasonPadding = 6,
  offseasonPadding = 6,
  minOffseasonHeight = 6,
  minSeasonHeight = 14,
  showPlayoffs = true,
  // Viewport height; in page mode each year's offseason+season pair is
  // padded to at least this so seasons snap one-per-screen.
  pageHeight = 0
}) {
  const geom = geometryFor(detailBand);
  const isPage = geom.season.mode === "page";
  const sorted = [...seasons || []].sort((a, b) => a.year - b.year);
  const showModules = geom.offseason !== "hidden";
  const activeModules = showModules ? modules.filter((m) => bandAtLeast(detailBand, m.minBand)) : [];
  const blocks = [];
  const byYear = /* @__PURE__ */ new Map();
  let y = top;
  for (const s of sorted) {
    const year = s.year;
    const games = s.games || [];
    const offY0 = y;
    const reserve = Math.max(0, reserveByYear[year] || 0);
    const headerH = isPage ? OFF_HEADER_PAGE : geom.offseason === "hidden" ? 0 : geom.offseason === "full" ? OFF_HEADER_FULL : OFF_HEADER_COMPACT;
    const ribbonTop = isPage ? offY0 : offY0 + headerH;
    const headerY = isPage ? offY0 + reserve : offY0;
    const bodyTop = isPage ? headerY + headerH : ribbonTop + reserve;
    const moduleBoxes = [];
    let cursor = bodyTop + offseasonPadding;
    if (!isPage) {
      for (const m of activeModules) {
        const h = Math.max(
          0,
          m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0
        );
        if (h <= 0) continue;
        moduleBoxes.push({ id: m.id, module: m, y: cursor, height: h });
        cursor += h + offseasonPadding;
      }
    }
    const minOff = reserve + headerH + (headerH ? 0 : minOffseasonHeight);
    const offHeight = moduleBoxes.length ? Math.max(minOff, cursor - offY0) : minOff;
    const offY1 = offY0 + offHeight;
    const offBlock = {
      type: "offseason",
      year,
      y0: offY0,
      y1: offY1,
      height: offHeight,
      reserve,
      headerHeight: headerH,
      headerY,
      ribbonTop,
      tStart: year - OFF_FRAC,
      tEnd: year,
      modules: moduleBoxes
    };
    blocks.push(offBlock);
    y = offY1;
    const seaY0 = y;
    const seaHeaderH = isPage ? 0 : geom.offseason === "hidden" ? 0 : geom.season.mode === "rows" ? SEASON_HEADER_FULL : SEASON_HEADER_COMPACT;
    const playoffsResult = showPlayoffs ? s.season?.playoffs || null : null;
    let seaHeight;
    let gamePositions;
    let postseason = null;
    let page = null;
    let seaModules;
    if (isPage) {
      const reg = games.filter((g) => !g.is_playoff);
      const post = showPlayoffs ? games.filter((g) => g.is_playoff) : [];
      const regularLabelY = seaY0 + SEC_PAD;
      const recY = regularLabelY + SEC_LABEL_H;
      const chipsY = recY + REC_LINE_H + 4;
      let cursor2 = chipsY + CHIPS_H + SEC_PAD;
      seaModules = [];
      let draftLabelY = null;
      for (const m of activeModules) {
        const h = Math.max(
          0,
          m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0
        );
        if (h <= 0) continue;
        if (draftLabelY == null) {
          draftLabelY = cursor2;
          cursor2 += SEC_LABEL_H;
        }
        seaModules.push({ id: m.id, module: m, y: cursor2, height: h });
        cursor2 += h + SEC_PAD;
      }
      if (showPlayoffs) {
        const labelY = cursor2;
        const resultY = labelY + SEC_LABEL_H;
        const postChipsY = post.length ? resultY + POST_LINE_H + 2 : null;
        cursor2 = (postChipsY != null ? postChipsY + CHIPS_H : resultY + POST_LINE_H) + SEC_PAD;
        postseason = {
          kind: "pageSection",
          labelY,
          resultY,
          chipsY: postChipsY,
          chipsH: CHIPS_H,
          result: playoffsResult,
          games: post.map((g, i) => ({ g, i }))
        };
      }
      seaHeight = Math.max(minSeasonHeight, cursor2 - seaY0);
      if (pageHeight > 0) {
        seaHeight = Math.max(seaHeight, pageHeight - offHeight);
      }
      page = { regularLabelY, recY, chipsY, chipsH: CHIPS_H, draftLabelY };
      const mReg = reg.length || 1;
      gamePositions = reg.map((g, i) => ({ g, i, y: seaY0 + (i + 0.5) / mReg * seaHeight }));
    } else if (geom.season.mode === "rows") {
      const rh = geom.season.gameRowHeight;
      const reg = games.filter((g) => !g.is_playoff);
      const post = showPlayoffs ? games.filter((g) => g.is_playoff) : [];
      const regTop = seaY0 + seaHeaderH + seasonPadding / 2;
      gamePositions = reg.map((g, i) => ({ g, i, y: regTop + (i + 0.5) * rh }));
      let cursorY = regTop + reg.length * rh;
      const isDetail = detailBand === "GAME_DETAIL";
      if (isDetail && post.length) {
        const headerY2 = cursorY + seasonPadding;
        const rowsTop = headerY2 + POST_HEADER_H;
        postseason = {
          kind: "rows",
          y0: headerY2,
          headerH: POST_HEADER_H,
          rowH: rh,
          result: playoffsResult,
          games: post.map((g, i) => ({ g, i, y: rowsTop + (i + 0.5) * rh }))
        };
        cursorY = rowsTop + post.length * rh;
      } else if (!isDetail && (post.length || playoffsResult)) {
        const stripY = cursorY + seasonPadding;
        postseason = { kind: "result", y0: stripY, height: POST_RESULT_H, result: playoffsResult };
        cursorY = stripY + POST_RESULT_H;
      }
      seaHeight = Math.max(minSeasonHeight, cursorY + seasonPadding / 2 - seaY0);
    } else {
      seaHeight = Math.max(minSeasonHeight, seaHeaderH + geom.season.height);
      const lineY = seaY0 + seaHeaderH + (seaHeight - seaHeaderH) / 2;
      gamePositions = games.map((g, i) => ({ g, i, y: lineY }));
    }
    const seaY1 = seaY0 + seaHeight;
    const seaBlock = {
      type: "season",
      year,
      y0: seaY0,
      y1: seaY1,
      height: seaHeight,
      seasonHeaderHeight: seaHeaderH,
      postseason,
      tStart: year,
      tEnd: year + SEA_FRAC,
      mode: geom.season.mode,
      gameRowHeight: geom.season.mode === "rows" ? geom.season.gameRowHeight : null,
      games: gamePositions,
      season: s,
      // Page mode only: section offsets + the draft module box (the draft
      // renders as a season-page section, not in the offseason block).
      page,
      modules: seaModules
    };
    blocks.push(seaBlock);
    y = seaY1;
    byYear.set(year, { offseason: offBlock, season: seaBlock });
  }
  const totalHeight = y - top;
  const firstYear = sorted.length ? sorted[0].year : null;
  const lastYear = sorted.length ? sorted[sorted.length - 1].year : null;
  function tToY(t) {
    if (!blocks.length) return top;
    if (t <= blocks[0].tStart) return blocks[0].y0;
    const last = blocks[blocks.length - 1];
    if (t >= last.tEnd) return last.y1;
    for (const b of blocks) {
      if (t >= b.tStart && t <= b.tEnd) {
        const span = b.tEnd - b.tStart || 1;
        return b.y0 + (t - b.tStart) / span * b.height;
      }
    }
    return top;
  }
  function yToYear(yPix) {
    if (!blocks.length) return null;
    if (yPix <= blocks[0].y0) return blocks[0].tStart;
    const last = blocks[blocks.length - 1];
    if (yPix >= last.y1) return last.tEnd;
    for (const b of blocks) {
      if (yPix >= b.y0 && yPix <= b.y1) {
        const h = b.height || 1;
        return b.tStart + (yPix - b.y0) / h * (b.tEnd - b.tStart);
      }
    }
    return null;
  }
  const yearToY = (year) => tToY(year);
  return {
    blocks,
    byYear,
    totalHeight,
    top,
    detailBand,
    firstYear,
    lastYear,
    yearsSpan: firstYear != null ? lastYear - firstYear + 1 : 0,
    tToY,
    yToYear,
    yearToY
  };
}

// src/hooks/zoomMath.js
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var SCALE_LO = 0.32;
var SCALE_HI = 3.1;
function pickBand(gestureH, committed, heights, hyst = 0.12) {
  const n = heights.length;
  if (!n) return 0;
  const lnG = Math.log(Math.max(1, gestureH));
  let b = clamp(committed, 0, n - 1);
  while (b > 0) {
    const mid = Math.sqrt(heights[b] * heights[b - 1]);
    if (mid > 0 && lnG > Math.log(mid) + hyst) b -= 1;
    else break;
  }
  while (b < n - 1) {
    const mid = Math.sqrt(heights[b] * heights[b + 1]);
    if (mid > 0 && lnG < Math.log(mid) - hyst) b += 1;
    else break;
  }
  return b;
}
function visualScaleFor(gestureH, bandHeight) {
  if (!bandHeight) return 1;
  return clamp(gestureH / bandHeight, SCALE_LO, SCALE_HI);
}
function expSmooth(cur, target, dtMs, tau = 55) {
  if (tau <= 0) return target;
  const k = 1 - Math.exp(-Math.max(0, dtMs) / tau);
  return cur + (target - cur) * k;
}

// src/hooks/useTimelineViewport.js
var N = MOBILE_BANDS.length;
var TAP_SLOP = 5;
var AXIS_BIAS = 1.4;
var RAIL_MAX_REVEAL = 115;
var RAIL_LOCK_AT = 54;
var RAIL_LOCK_POS = 99;
var RAIL_RESIST = 0.6;
var RAIL_SPRING_TAU = 130;
var WHEEL_STEP = 90;
var ANIM_DONE_PX = 0.5;
var ANIM_TAU = 55;
function useTimelineViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  // Extra scroll range for the pinned-ribbon stack, which pushes the timeline
  // down by its live height (staffRibbonModel.maxStackHeight).
  ribbonSlack = 0,
  height = 0,
  initialBandIndex = 2,
  // SEASON_LINES
  focusYear = null,
  onFocusConsumed = null,
  showPlayoffs = true
}) {
  const [bandIndex, setBandIndex] = useState5(initialBandIndex);
  const [scrollYState, setScrollY] = useState5(0);
  const [railPan, setRailPan] = useState5(0);
  const [visualScale, setVisualScale] = useState5(1);
  const [scaleAnchorY, setScaleAnchorY] = useState5(0);
  const scrollRef = useRef5(null);
  const layouts = useMemo3(
    () => MOBILE_BANDS.map(
      (band) => buildTimelineLayout({
        seasons,
        modules,
        moduleData,
        reserveByYear,
        detailBand: band,
        top: 0,
        showPlayoffs,
        pageHeight: height
      })
    ),
    [seasons, modules, moduleData, reserveByYear, showPlayoffs, height]
  );
  const bandHeights = useMemo3(() => {
    const out = layouts.map((l) => Math.max(1, l.totalHeight));
    for (let i = out.length - 2; i >= 0; i--) {
      out[i] = Math.max(out[i], out[i + 1] * 1.3);
    }
    return out;
  }, [layouts]);
  const layout = layouts[clamp(bandIndex, 0, N - 1)];
  const scrollRange = layout.totalHeight + ribbonSlack;
  const maxScroll = Math.max(0, scrollRange - height);
  const scrollY = clamp(scrollYState, 0, maxScroll);
  const bandIndexRef = useRef5(bandIndex);
  bandIndexRef.current = bandIndex;
  const scrollYRef = useRef5(scrollY);
  scrollYRef.current = scrollY;
  const layoutsRef = useRef5(layouts);
  layoutsRef.current = layouts;
  const heightRef = useRef5(height);
  heightRef.current = height;
  const bandHeightsRef = useRef5(bandHeights);
  bandHeightsRef.current = bandHeights;
  const anchorYRef = useRef5(0);
  const gestureHRef = useRef5(bandHeights[initialBandIndex]);
  const zoomTargetRef = useRef5(bandHeights[initialBandIndex]);
  const rafRef = useRef5(0);
  const lastTRef = useRef5(0);
  const targetBandRef = useRef5(initialBandIndex);
  const wheelAccumRef = useRef5(0);
  const pinchActiveRef = useRef5(false);
  const d0Ref = useRef5(1);
  const pinchStartHRef = useRef5(bandHeights[initialBandIndex]);
  const railPanRef = useRef5(0);
  const railRestRef = useRef5(0);
  const railSpringRef = useRef5(0);
  const lastRailTRef = useRef5(0);
  const scrollRafRef = useRef5(0);
  const setScrollTop = useCallback3((y) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, y);
    const ny = el.scrollTop;
    scrollYRef.current = ny;
    setScrollY(ny);
  }, []);
  const onScroll = useCallback3(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const y = el.scrollTop;
      scrollYRef.current = y;
      setScrollY(y);
    });
  }, []);
  const anchorRef = useRef5(null);
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    const targetContentY = layout.tToY(a.focusT);
    setScrollTop(targetContentY - a.cursorY);
  }, [layout, setScrollTop]);
  useLayoutEffect(() => {
    if (focusYear == null) return;
    if (!layout?.blocks?.length || !height) return;
    setScrollTop(layout.yearToY(focusYear) - height * 0.25);
    if (onFocusConsumed) onFocusConsumed();
  }, [focusYear, layout, height, onFocusConsumed, setScrollTop]);
  const commitBand = useCallback3((nb) => {
    const old = layoutsRef.current[bandIndexRef.current];
    const focusT = old.yToYear(scrollYRef.current + anchorYRef.current);
    anchorRef.current = { focusT, cursorY: anchorYRef.current };
    bandIndexRef.current = nb;
    setBandIndex(nb);
  }, []);
  const applyGestureH = useCallback3(
    (h) => {
      const heights = bandHeightsRef.current;
      const ch = clamp(h, heights[N - 1], heights[0]);
      gestureHRef.current = ch;
      const nb = pickBand(ch, bandIndexRef.current, heights);
      if (nb !== bandIndexRef.current) commitBand(nb);
      setVisualScale(visualScaleFor(ch, heights[bandIndexRef.current]));
    },
    [commitBand]
  );
  const tick = useCallback3(
    (now) => {
      const dt = lastTRef.current ? now - lastTRef.current : 16;
      lastTRef.current = now;
      const target = zoomTargetRef.current;
      let h = expSmooth(gestureHRef.current, target, dt, ANIM_TAU);
      const done = Math.abs(target - h) < ANIM_DONE_PX;
      if (done) h = target;
      applyGestureH(h);
      if (done) {
        rafRef.current = 0;
        lastTRef.current = 0;
        setVisualScale(visualScaleFor(target, bandHeightsRef.current[bandIndexRef.current]));
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [applyGestureH]
  );
  const startAnim = useCallback3(
    (target, anchorY) => {
      zoomTargetRef.current = clamp(
        target,
        bandHeightsRef.current[N - 1] * 0.6,
        bandHeightsRef.current[0] * 1.6
      );
      anchorYRef.current = anchorY;
      setScaleAnchorY(anchorY);
      if (!rafRef.current) {
        lastTRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [tick]
  );
  const startAnimRef = useRef5(startAnim);
  startAnimRef.current = startAnim;
  const applyGestureHRef = useRef5(applyGestureH);
  applyGestureHRef.current = applyGestureH;
  useEffect5(() => {
    if (!rafRef.current && !pinchActiveRef.current) {
      gestureHRef.current = bandHeights[bandIndexRef.current];
      zoomTargetRef.current = gestureHRef.current;
      setVisualScale(1);
      setScaleAnchorY(0);
    }
  }, [bandHeights]);
  useEffect5(() => {
    const el = scrollRef.current;
    if (!el) return;
    const topOf = () => el.getBoundingClientRect().top;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const cursorY = e.clientY - topOf();
      if (!rafRef.current) {
        targetBandRef.current = bandIndexRef.current;
        wheelAccumRef.current = 0;
      }
      wheelAccumRef.current += e.deltaY;
      const steps = Math.trunc(wheelAccumRef.current / WHEEL_STEP);
      if (steps !== 0) {
        wheelAccumRef.current -= steps * WHEEL_STEP;
        targetBandRef.current = clamp(targetBandRef.current + steps, 0, N - 1);
      }
      startAnimRef.current(bandHeightsRef.current[targetBandRef.current], cursorY);
    };
    const dist2 = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        lastTRef.current = 0;
      }
      pinchActiveRef.current = true;
      d0Ref.current = Math.max(1, dist2(e.touches));
      pinchStartHRef.current = gestureHRef.current;
      const anchorY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - topOf();
      anchorYRef.current = anchorY;
      setScaleAnchorY(anchorY);
    };
    const onTouchMove = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (!pinchActiveRef.current) return;
      const d = Math.max(1, dist2(e.touches));
      applyGestureHRef.current(pinchStartHRef.current * (d / d0Ref.current));
    };
    const onTouchEnd = (e) => {
      if (!pinchActiveRef.current) return;
      if (e.touches.length >= 2) return;
      pinchActiveRef.current = false;
      startAnimRef.current(bandHeightsRef.current[bandIndexRef.current], anchorYRef.current);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);
  useEffect5(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (railSpringRef.current) cancelAnimationFrame(railSpringRef.current);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    },
    []
  );
  const applyRailPan = useCallback3((v) => {
    railPanRef.current = v;
    setRailPan(v);
  }, []);
  const stopRailSpring = useCallback3(() => {
    if (railSpringRef.current) {
      cancelAnimationFrame(railSpringRef.current);
      railSpringRef.current = 0;
    }
    lastRailTRef.current = 0;
  }, []);
  const railSpringTick = useCallback3(
    (now) => {
      const dt = clamp(lastRailTRef.current ? now - lastRailTRef.current : 16, 0, 50);
      lastRailTRef.current = now;
      const rest = railRestRef.current;
      let v = expSmooth(railPanRef.current, rest, dt, RAIL_SPRING_TAU);
      if (Math.abs(v - rest) < 0.5) v = rest;
      applyRailPan(v);
      if (v === rest) {
        railSpringRef.current = 0;
        lastRailTRef.current = 0;
      } else {
        railSpringRef.current = requestAnimationFrame(railSpringTick);
      }
    },
    [applyRailPan]
  );
  const dragXRef = useRef5(null);
  const pressXRef = useRef5(null);
  const pressYRef = useRef5(null);
  const axisRef = useRef5(null);
  const movedRef = useRef5(false);
  const onPointerDown = useCallback3(
    (e) => {
      stopRailSpring();
      if (e.pointerType === "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
      pressXRef.current = e.clientX;
      pressYRef.current = e.clientY;
      dragXRef.current = e.clientX;
      axisRef.current = null;
      movedRef.current = false;
    },
    [stopRailSpring]
  );
  const onPointerMove = useCallback3(
    (e) => {
      if (pinchActiveRef.current) return;
      if (pressXRef.current == null) return;
      if (axisRef.current == null) {
        const tdx = e.clientX - pressXRef.current;
        const tdy = e.clientY - pressYRef.current;
        if (Math.max(Math.abs(tdx), Math.abs(tdy)) > TAP_SLOP) {
          axisRef.current = Math.abs(tdx) > Math.abs(tdy) * AXIS_BIAS ? "h" : "v";
          movedRef.current = true;
        } else {
          dragXRef.current = e.clientX;
          return;
        }
      }
      if (axisRef.current === "h") {
        const dx = e.clientX - dragXRef.current;
        dragXRef.current = e.clientX;
        applyRailPan(
          clamp(railPanRef.current + dx * RAIL_RESIST, -RAIL_MAX_REVEAL, RAIL_MAX_REVEAL)
        );
      }
    },
    [applyRailPan]
  );
  const endPointer = useCallback3(
    (e) => {
      if (e.pointerType === "mouse") {
        try {
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        } catch {
        }
      }
      if (axisRef.current === "h") {
        const mag = Math.abs(railPanRef.current);
        const dir = railPanRef.current < 0 ? -1 : 1;
        railRestRef.current = mag >= RAIL_LOCK_AT ? dir * RAIL_LOCK_POS : 0;
        if (railPanRef.current !== railRestRef.current && !railSpringRef.current) {
          lastRailTRef.current = 0;
          railSpringRef.current = requestAnimationFrame(railSpringTick);
        }
      }
      axisRef.current = null;
      pressXRef.current = null;
      pressYRef.current = null;
    },
    [railSpringTick]
  );
  const didDrag = useCallback3(() => movedRef.current, []);
  const scrollBy = useCallback3(
    (dy) => {
      const el = scrollRef.current;
      if (el) setScrollTop(el.scrollTop + dy);
    },
    [setScrollTop]
  );
  return {
    band: MOBILE_BANDS[bandIndex],
    bandIndex,
    scrollY,
    maxScroll,
    layout,
    totalHeight: layout.totalHeight,
    scrollRange,
    visualScale,
    scaleAnchorY,
    railPan,
    scrollRef,
    scrollBy,
    didDrag,
    handlers: {
      onScroll,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer
    }
  };
}

// src/components/visualization/offseason/DraftModule.jsx
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
function tierTint(tier, alpha) {
  const hex = tierColor(tier);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function fmtScore(v) {
  return v == null ? "\u2014" : Math.round(v);
}
function Header2({ x, width, y, picks, grade, adjusted }) {
  const s = classSummary(picks, adjusted);
  const right = s.scored > 0 ? `${s.count} picks \xB7 ${s.hits} hit${s.hits === 1 ? "" : "s"} \xB7 avg ${fmtScore(s.avgScore)}` : `${s.count} pick${s.count === 1 ? "" : "s"}`;
  return /* @__PURE__ */ jsxs10("g", { style: { pointerEvents: "none" }, children: [
    /* @__PURE__ */ jsx10("text", { x: x + 4, y: y + HEADER_H2 - 5, fontSize: 11, fontWeight: 600, fill: "#333", children: "Draft" }),
    grade && /* @__PURE__ */ jsxs10("g", { children: [
      /* @__PURE__ */ jsx10(
        "rect",
        {
          x: x + 44,
          y: y + 2,
          width: 24,
          height: HEADER_H2 - 6,
          rx: 2,
          fill: tierColor(grade.tier)
        }
      ),
      /* @__PURE__ */ jsxs10(
        "text",
        {
          x: x + 56,
          y: y + HEADER_H2 / 2,
          fontSize: 9,
          fontWeight: 700,
          textAnchor: "middle",
          dominantBaseline: "middle",
          fill: tierTextColor(grade.tier),
          children: [
            grade.tier,
            grade.provisional ? "*" : ""
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx10(
      "text",
      {
        x: x + width - 4,
        y: y + HEADER_H2 - 5,
        fontSize: 10,
        textAnchor: "end",
        fill: "#888",
        children: right
      }
    ),
    /* @__PURE__ */ jsx10(
      "line",
      {
        x1: x + 4,
        x2: x + width - 4,
        y1: y + HEADER_H2 - 1,
        y2: y + HEADER_H2 - 1,
        stroke: "#e5e5e5",
        strokeWidth: 1
      }
    )
  ] });
}
function PickRow({ p, x, width, y, onSelect, adjusted }) {
  const labelX = x + 6;
  const nameX = x + 54;
  const right = x + width;
  const chipW = 20;
  const chipX = right - 6 - chipW;
  const scoreBarW = 34;
  const scoreBarX = chipX - 8 - scoreBarW;
  const g = gradeOf(p.value, adjusted);
  const score = g.score;
  const tier = g.tier;
  const star = g.provisional ? "*" : "";
  const color = tierColor(tier);
  const nameMax = Math.max(4, Math.floor((scoreBarX - nameX - 6) / 6));
  const label = `${p.name || "Unknown"}${p.position ? " \xB7 " + p.position : ""}`;
  const midY = y + PICK_ROW_H / 2;
  return /* @__PURE__ */ jsxs10(
    "g",
    {
      onClick: onSelect,
      style: onSelect ? { cursor: "pointer" } : void 0,
      children: [
        /* @__PURE__ */ jsx10("rect", { x, y, width, height: PICK_ROW_H, fill: "transparent" }),
        /* @__PURE__ */ jsx10("text", { x: labelX, y: midY, dominantBaseline: "middle", fontSize: 10, fill: "#666", children: pickLabel(p) }),
        /* @__PURE__ */ jsx10("text", { x: nameX, y: midY, dominantBaseline: "middle", fontSize: 10, fill: "#111", children: truncate(label, nameMax) }),
        /* @__PURE__ */ jsx10("rect", { x: scoreBarX, y: midY - 3, width: scoreBarW, height: 6, fill: "#eee", rx: 1 }),
        score != null && /* @__PURE__ */ jsx10(
          "rect",
          {
            x: scoreBarX,
            y: midY - 3,
            width: scoreBarW * Math.max(0, Math.min(100, score)) / 100,
            height: 6,
            fill: color,
            rx: 1
          }
        ),
        /* @__PURE__ */ jsx10("rect", { x: chipX, y: midY - 7, width: chipW, height: 14, rx: 2, fill: color }),
        /* @__PURE__ */ jsx10(
          "text",
          {
            x: chipX + chipW / 2,
            y: midY,
            dominantBaseline: "middle",
            textAnchor: "middle",
            fontSize: 9,
            fontWeight: 700,
            fill: tier ? tierTextColor(tier) : "#5a5a5a",
            children: tier ? tier + star : "\u2013"
          }
        )
      ]
    }
  );
}
function PageHeader({ x, width, y, picks, grade, adjusted }) {
  const s = classSummary(picks, adjusted);
  const right = s.scored > 0 ? `${s.count} picks \xB7 ${s.hits} hit${s.hits === 1 ? "" : "s"} \xB7 avg ${fmtScore(s.avgScore)}` : `${s.count} pick${s.count === 1 ? "" : "s"}`;
  return /* @__PURE__ */ jsxs10("g", { style: { pointerEvents: "none" }, children: [
    /* @__PURE__ */ jsx10("text", { x: x + 4, y: y + HEADER_H2 - 5, fontSize: 11, fontWeight: 700, fill: "#1d2534", children: "Grade" }),
    grade && /* @__PURE__ */ jsxs10("g", { children: [
      /* @__PURE__ */ jsx10("rect", { x: x + 44, y: y + 1, width: 24, height: HEADER_H2 - 4, rx: 4, fill: tierColor(grade.tier) }),
      /* @__PURE__ */ jsxs10(
        "text",
        {
          x: x + 56,
          y: y + HEADER_H2 / 2,
          fontSize: 9,
          fontWeight: 700,
          textAnchor: "middle",
          dominantBaseline: "middle",
          fill: tierTextColor(grade.tier),
          children: [
            grade.tier,
            grade.provisional ? "*" : ""
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx10("text", { x: x + width - 4, y: y + HEADER_H2 - 5, fontSize: 10, textAnchor: "end", fill: "#8a8f98", children: right })
  ] });
}
function CompactChips({ picks, x, width, y, adjusted }) {
  const n = picks.length;
  if (!n) return null;
  const avail = width - 8;
  const gap = 2;
  const sq = Math.max(4, Math.min(16, avail / n - gap));
  return /* @__PURE__ */ jsx10("g", { transform: `translate(${x + 4}, ${y + 2})`, style: { pointerEvents: "none" }, children: picks.map((p, i) => /* @__PURE__ */ jsx10(
    "rect",
    {
      x: i * (sq + gap),
      y: 0,
      width: sq,
      height: Math.min(COMPACT_H - 4, sq),
      rx: 2,
      fill: tierColor(gradeOf(p.value, adjusted).tier),
      stroke: "rgba(0,0,0,0.18)",
      strokeWidth: 0.75
    },
    p.player_id || i
  )) });
}
function renderDraft({ year, x, width, y, height, mode, detailBand, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return null;
  const compact = mode === "compact";
  const expanded = !compact || isExpandedYear(data, year);
  const canToggle = compact && typeof data.onToggleYear === "function";
  const grade = classGradeFor(data, year);
  const adjusted = !!data.adjusted;
  const tinted = detailBand === "GAME_DETAIL";
  const rowsTop = compact ? y : y + HEADER_H2;
  const guarded = (fn) => (e) => {
    e.stopPropagation();
    if (data.tapGuard && data.tapGuard()) return;
    fn();
  };
  return /* @__PURE__ */ jsxs10("g", { children: [
    /* @__PURE__ */ jsx10(
      "rect",
      {
        x,
        y,
        width,
        height,
        fill: tinted ? grade ? tierTint(grade.tier, 0.1) : "rgba(120,140,170,0.05)" : "transparent",
        stroke: tinted ? grade ? tierTint(grade.tier, 0.4) : "rgba(120,140,170,0.18)" : "none",
        strokeWidth: tinted ? 1 : 0,
        onClick: canToggle ? guarded(() => data.onToggleYear(year)) : void 0,
        style: canToggle ? { cursor: "pointer" } : void 0
      }
    ),
    !compact && (detailBand === "GAME_BANDS" ? /* @__PURE__ */ jsx10(PageHeader, { x, width, y, picks, grade, adjusted }) : /* @__PURE__ */ jsx10(Header2, { x, width, y, picks, grade, adjusted })),
    !expanded ? /* @__PURE__ */ jsx10("g", { className: "draft-reveal", children: /* @__PURE__ */ jsx10(CompactChips, { picks, x, width, y, adjusted }) }, "chips") : /* @__PURE__ */ jsx10("g", { className: "draft-reveal", children: picks.map((p, i) => /* @__PURE__ */ jsx10(
      PickRow,
      {
        p,
        x,
        width,
        y: rowsTop + i * PICK_ROW_H,
        adjusted,
        onSelect: typeof data.onSelectPick === "function" ? guarded(() => data.onSelectPick(p)) : void 0
      },
      p.player_id || `${year}-${i}`
    )) }, "rows")
  ] });
}
var DraftModule = {
  id: "draft",
  label: "Draft",
  minBand: "SEASON_LINES",
  enabledByDefault: true,
  measure: measureDraft,
  render: renderDraft
};
var DraftModule_default = DraftModule;

// src/components/visualization/offseason/registry.js
var OFFSEASON_MODULES = [DraftModule_default];
function getEnabledModules(settings = {}) {
  return OFFSEASON_MODULES.filter((m) => {
    const v = settings[m.id];
    return v === void 0 ? m.enabledByDefault : !!v;
  });
}
function buildModuleData({
  draftSegment,
  expandedDraftYears,
  onToggleDraftYear,
  onSelectPick,
  tapGuard,
  adjusted = false
} = {}) {
  return {
    draftByYear: draftSegment ? groupPicksByYear(draftSegment.picks) : {},
    classGrades: draftSegment?.class_grades ?? {},
    teamGrade: draftSegment?.team_grade ?? null,
    // unused in UI; kept for the future control panel
    expandedYears: expandedDraftYears,
    onToggleYear: onToggleDraftYear,
    onSelectPick,
    tapGuard,
    // Availability-adjusted grade lens (Settings toggle). Only affects which
    // per-pick score/tier is displayed; layout is unchanged.
    adjusted
  };
}

// src/components/Main.jsx
import { jsx as jsx11, jsxs as jsxs11 } from "react/jsx-runtime";
var Main = forwardRef(function Main2({
  mapped,
  draftSegment,
  settings,
  adminById,
  focusYear,
  onFocusConsumed,
  ribbonConfig = { roles: {}, players: [] },
  onFollow
}, externalRef) {
  const containerRef = useRef6(null);
  const [dimensions, setDimensions] = useState6({ width: 0, height: 0 });
  useLayoutEffect2(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: width2, height: height2 } = entry.contentRect;
          setDimensions({ width: width2, height: height2 });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      setDimensions({ width: r.width, height: r.height });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const { width, height } = dimensions;
  const showWinRate = settings?.showWinRate !== false;
  const showPlayoffs = settings?.showPlayoffs !== false;
  const adjustedGrades = settings?.availabilityAdjusted === true;
  const [expandedDraftYears, setExpandedDraftYears] = useState6(() => /* @__PURE__ */ new Set());
  const [selected, setSelected] = useState6(null);
  const didDragRef = useRef6(() => false);
  const tapGuard = useCallback4(() => didDragRef.current(), []);
  const onToggleDraftYear = useCallback4((year) => {
    setExpandedDraftYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);
  const onSelectPick = useCallback4((pick) => {
    setSelected({ type: "player", pick });
  }, []);
  const closeCard = useCallback4(() => setSelected(null), []);
  const modules = useMemo4(() => getEnabledModules(settings), [settings]);
  const moduleData = useMemo4(
    () => buildModuleData({
      draftSegment,
      expandedDraftYears,
      onToggleDraftYear,
      onSelectPick,
      tapGuard,
      adjusted: adjustedGrades
    }),
    [draftSegment, expandedDraftYears, onToggleDraftYear, onSelectPick, tapGuard, adjustedGrades]
  );
  const spans = useMemo4(() => {
    const out = [];
    for (const s of mapped?.staff || []) {
      if (ribbonConfig.roles?.[s.role] === false) continue;
      out.push(s);
    }
    for (const p of ribbonConfig.players || []) {
      out.push({
        admin_person_id: p.player_id,
        name: p.name,
        role: positionGroup(p.position),
        from: p.from,
        to: p.to,
        kind: "player",
        approx: p.source === "approx",
        position: p.position,
        // Career-follow links from the tenure pipeline.
        prev_team: p.prev_team || null,
        next_team: p.next_team || null,
        entry: p.entry || null,
        exit: p.exit || null,
        conf: p.conf || null
      });
    }
    return out;
  }, [mapped, ribbonConfig]);
  const reserveByYear = useMemo4(() => stripReserveByYear(spans), [spans]);
  const ribbonSlack = useMemo4(() => maxStackHeight(spans), [spans]);
  const viewport = useTimelineViewport({
    seasons: mapped?.seasons,
    modules,
    moduleData,
    reserveByYear,
    ribbonSlack,
    height,
    focusYear,
    onFocusConsumed,
    showPlayoffs
  });
  const {
    layout,
    scrollY,
    band,
    handlers,
    didDrag,
    visualScale,
    scaleAnchorY,
    railPan,
    scrollRef,
    scrollRange
  } = viewport;
  didDragRef.current = didDrag;
  const snapPages = useMemo4(() => {
    if (band !== "GAME_BANDS" || !layout?.byYear) return null;
    return [...layout.byYear.values()].map(({ offseason, season }) => ({
      top: offseason.y0,
      height: season.y1 - offseason.y0
    }));
  }, [band, layout]);
  useImperativeHandle(externalRef, () => scrollRef.current, [scrollRef]);
  const offseasonHidden = geometryFor(band).offseason === "hidden";
  useEffect6(() => {
    if (offseasonHidden && expandedDraftYears.size > 0) {
      setExpandedDraftYears(/* @__PURE__ */ new Set());
    }
  }, [offseasonHidden, expandedDraftYears]);
  const pickById = useMemo4(() => {
    const m = /* @__PURE__ */ new Map();
    for (const p of draftSegment?.picks || []) {
      if (p.player_id && !m.has(p.player_id)) m.set(p.player_id, p);
    }
    return m;
  }, [draftSegment]);
  const onSelectRibbon = useCallback4(
    (r) => {
      if (r.kind === "player") {
        const pick = pickById.get(r.id) || {
          player_id: r.id,
          name: r.name,
          position: r.position,
          year: r.from,
          value: null,
          career: null
        };
        setSelected({ type: "player", pick });
      } else {
        setSelected({ type: "staff", ribbon: r });
      }
    },
    [pickById]
  );
  const ready = width > 0 && height > 0;
  return /* @__PURE__ */ jsxs11(
    "div",
    {
      ref: containerRef,
      style: { height: "100%", overflow: "hidden", position: "relative" },
      children: [
        /* @__PURE__ */ jsx11(
          "div",
          {
            ref: scrollRef,
            onScroll: handlers.onScroll,
            onPointerDown: handlers.onPointerDown,
            onPointerMove: handlers.onPointerMove,
            onPointerUp: handlers.onPointerUp,
            onPointerCancel: handlers.onPointerCancel,
            onPointerLeave: handlers.onPointerLeave,
            style: {
              position: "absolute",
              inset: 0,
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pan-y",
              scrollSnapType: snapPages ? "y mandatory" : void 0
            },
            children: /* @__PURE__ */ jsxs11("div", { style: { height: Math.max(scrollRange, height), position: "relative" }, children: [
              snapPages?.map((p, i) => /* @__PURE__ */ jsx11(
                "div",
                {
                  style: {
                    position: "absolute",
                    top: p.top,
                    height: p.height,
                    left: 0,
                    right: 0,
                    scrollSnapAlign: "start",
                    pointerEvents: "none"
                  }
                },
                i
              )),
              ready && /* @__PURE__ */ jsxs11(
                "svg",
                {
                  width,
                  height,
                  style: { position: "sticky", top: 0, display: "block" },
                  children: [
                    /* @__PURE__ */ jsx11("rect", { x: 0, y: 0, width, height, fill: "transparent" }),
                    /* @__PURE__ */ jsx11("g", { transform: railPan ? `translate(${railPan} 0)` : void 0, children: /* @__PURE__ */ jsx11(
                      "g",
                      {
                        transform: `translate(0 ${scaleAnchorY}) scale(1 ${visualScale}) translate(0 ${-scaleAnchorY})`,
                        children: /* @__PURE__ */ jsx11(
                          TeamTimelineLayer_default,
                          {
                            layout,
                            scrollY,
                            width,
                            height,
                            band,
                            moduleData,
                            staff: spans,
                            pre1967: mapped?.pre1967,
                            adminById,
                            onSelectStaff: onSelectRibbon,
                            tapGuard,
                            railPan,
                            onFollow,
                            showWinRate,
                            showPlayoffs
                          }
                        )
                      }
                    ) })
                  ]
                }
              )
            ] })
          }
        ),
        /* @__PURE__ */ jsx11(InfoCard, { selection: selected, adminById, onClose: closeCard, adjusted: adjustedGrades }),
        /* @__PURE__ */ jsx11(ZoomHud, { band })
      ]
    }
  );
});
var Main_default = Main;

// src/components/Footer.jsx
import { useEffect as useEffect9, useState as useState9 } from "react";

// src/components/RibbonControls.jsx
import { useEffect as useEffect8, useMemo as useMemo6, useState as useState8 } from "react";

// src/hooks/useTeamTenures.js
import { useEffect as useEffect7, useMemo as useMemo5, useState as useState7 } from "react";
function useTeamTenures(teamId, draftSegment) {
  const [fetched, setFetched] = useState7(null);
  useEffect7(() => {
    if (!teamId) return;
    let cancelled = false;
    setFetched(null);
    fetch(`/data/segments/teams_tenures/${teamId}.json`).then((r) => r.ok ? r.json() : null).then((json) => {
      if (!cancelled) setFetched(json);
    }).catch(() => {
      if (!cancelled) setFetched(null);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId]);
  return useMemo5(() => {
    if (fetched?.tenures?.length) {
      const seen2 = /* @__PURE__ */ new Set();
      const tenures = [];
      for (const t of fetched.tenures) {
        const id = t.player_id ?? t.player_id_internal;
        if (!id || seen2.has(id)) continue;
        seen2.add(id);
        tenures.push({ ...t, player_id: id });
      }
      return { tenures, source: "pipeline" };
    }
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const p of draftSegment?.picks || []) {
      if (!p.player_id || seen.has(p.player_id)) continue;
      seen.add(p.player_id);
      const from = p.year;
      if (!from) continue;
      const to = Math.max(from, Math.round(p.career?.last_year || from));
      out.push({
        player_id: p.player_id,
        name: p.name,
        position: p.position,
        from,
        to,
        games: p.career?.games ?? 0,
        source: "approx"
      });
    }
    return { tenures: out, source: "approx-derived" };
  }, [fetched, draftSegment]);
}

// src/components/RibbonControls.jsx
import { jsx as jsx12, jsxs as jsxs12 } from "react/jsx-runtime";
var MAX_PLAYERS = 40;
var PAGE = 50;
var GROUPS = [
  ["all", "All"],
  ["qb", "QB"],
  ["rb", "RB"],
  ["wr", "WR"],
  ["te", "TE"],
  ["ol", "OL"],
  ["dl", "DL"],
  ["lb", "LB"],
  ["db", "DB"],
  ["st", "ST"]
];
var ROLES = [
  ["coach", "Coaches"],
  ["gm", "GMs"],
  ["owner", "Owners"]
];
var played = (t) => t.games == null ? true : t.games > 0;
function RibbonControls({ teamId, draftSegment, config, onChange }) {
  const { tenures, source } = useTeamTenures(teamId, draftSegment);
  const [query, setQuery] = useState8("");
  const [group, setGroup] = useState8("all");
  const [visibleCount, setVisibleCount] = useState8(PAGE);
  useEffect8(() => {
    setVisibleCount(PAGE);
  }, [query, group, teamId]);
  const selectedIds = useMemo6(
    () => new Set((config.players || []).map((p) => p.player_id)),
    [config.players]
  );
  const matches = useMemo6(() => {
    const q = query.trim().toLowerCase();
    return tenures.filter((t) => t.name).filter((t) => group === "all" || positionGroup(t.position) === group).filter((t) => !q || t.name.toLowerCase().includes(q)).sort((a, b) => (b.to || 0) - (a.to || 0) || String(a.name).localeCompare(b.name));
  }, [tenures, query, group]);
  const shown = matches.slice(0, visibleCount);
  const toggleRole = (role) => {
    onChange({
      ...config,
      roles: { ...config.roles, [role]: config.roles[role] === false }
    });
  };
  const togglePlayer = (t) => {
    if (selectedIds.has(t.player_id)) {
      onChange({
        ...config,
        players: config.players.filter((p) => p.player_id !== t.player_id)
      });
      return;
    }
    if ((config.players || []).length >= MAX_PLAYERS) return;
    onChange({ ...config, players: [...config.players || [], t] });
  };
  const bulkCandidates = useMemo6(
    () => matches.filter((t) => played(t) && !selectedIds.has(t.player_id)),
    [matches, selectedIds]
  );
  const room = MAX_PLAYERS - (config.players || []).length;
  const addAll = () => {
    if (room <= 0 || !bulkCandidates.length) return;
    onChange({
      ...config,
      players: [...config.players || [], ...bulkCandidates.slice(0, room)]
    });
  };
  const clearPlayers = () => onChange({ ...config, players: [] });
  const atCap = room <= 0;
  const nSel = (config.players || []).length;
  return /* @__PURE__ */ jsxs12("div", { style: { display: "flex", flexDirection: "column", height: "100%", fontSize: 12.5 }, children: [
    /* @__PURE__ */ jsxs12(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "8px 12px 6px",
          borderBottom: "1px solid #e8eaef"
        },
        children: [
          ROLES.map(([role, label]) => /* @__PURE__ */ jsxs12("label", { style: { display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }, children: [
            /* @__PURE__ */ jsx12(
              "input",
              {
                type: "checkbox",
                checked: config.roles[role] !== false,
                onChange: () => toggleRole(role)
              }
            ),
            /* @__PURE__ */ jsx12("span", { style: {
              width: 9,
              height: 9,
              borderRadius: 2,
              display: "inline-block",
              background: roleColor(role)
            } }),
            label
          ] }, role)),
          /* @__PURE__ */ jsx12("span", { style: { width: 1, height: 18, background: "#ddd" } }),
          /* @__PURE__ */ jsx12(
            "input",
            {
              value: query,
              onChange: (e) => setQuery(e.target.value),
              placeholder: "Search to add a player\u2026",
              style: {
                width: 180,
                height: 24,
                padding: "0 8px",
                fontSize: 12,
                borderRadius: 4,
                border: "1px solid #ccc",
                outline: "none"
              }
            }
          ),
          /* @__PURE__ */ jsx12("div", { style: { display: "flex", gap: 3, flexWrap: "wrap" }, children: GROUPS.map(([id, label]) => /* @__PURE__ */ jsx12(
            "button",
            {
              onClick: () => setGroup(id),
              title: id === "all" ? "Show all positions" : `Filter to ${label}`,
              style: {
                border: "none",
                borderRadius: 5,
                padding: "3px 8px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: group === id ? 700 : 400,
                background: group === id ? "#eef1f6" : "#f7f8fa",
                color: id !== "all" ? roleColor(id) : "#333"
              },
              children: label
            },
            id
          )) }),
          /* @__PURE__ */ jsxs12(
            "button",
            {
              onClick: addAll,
              disabled: atCap || !bulkCandidates.length,
              title: "Adds everyone in the current filter who took the field (games > 0); never-played picks are skipped",
              style: {
                border: "1px solid #c9d4e8",
                borderRadius: 5,
                padding: "3px 9px",
                fontSize: 11.5,
                cursor: atCap || !bulkCandidates.length ? "default" : "pointer",
                background: "#f0f5ff",
                color: atCap || !bulkCandidates.length ? "#9aa" : "#2d5cb8",
                fontWeight: 600
              },
              children: [
                "+ add all",
                group !== "all" ? ` ${group.toUpperCase()}s` : "",
                " who played (",
                Math.min(bulkCandidates.length, Math.max(0, room)),
                ")"
              ]
            }
          ),
          /* @__PURE__ */ jsx12("div", { style: { flex: 1 } }),
          /* @__PURE__ */ jsxs12("span", { style: { color: "#666", fontSize: 11.5 }, children: [
            /* @__PURE__ */ jsx12("b", { children: nSel }),
            " player track",
            nSel === 1 ? "" : "s",
            " (max ",
            MAX_PLAYERS,
            ")",
            nSel > 0 && /* @__PURE__ */ jsx12(
              "button",
              {
                onClick: clearPlayers,
                style: {
                  marginLeft: 6,
                  border: "none",
                  background: "none",
                  color: "#b55",
                  cursor: "pointer",
                  fontSize: 11,
                  padding: 0
                },
                children: "clear"
              }
            )
          ] })
        ]
      }
    ),
    nSel > 0 && /* @__PURE__ */ jsxs12(
      "div",
      {
        style: {
          padding: "7px 12px",
          borderBottom: "1px solid #e8eaef",
          background: "#fbfcfe",
          maxHeight: 96,
          overflowY: "auto"
        },
        children: [
          /* @__PURE__ */ jsxs12("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }, children: [
            /* @__PURE__ */ jsx12("span", { style: { fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 0.3 }, children: "SELECTED" }),
            /* @__PURE__ */ jsx12("span", { style: { fontSize: 11, color: "#999" }, children: nSel }),
            /* @__PURE__ */ jsx12("div", { style: { flex: 1 } }),
            /* @__PURE__ */ jsx12(
              "button",
              {
                onClick: clearPlayers,
                style: {
                  border: "none",
                  background: "none",
                  color: "#b55",
                  cursor: "pointer",
                  fontSize: 11,
                  padding: 0
                },
                children: "clear all"
              }
            )
          ] }),
          /* @__PURE__ */ jsx12("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: (config.players || []).map((p) => {
            const g = positionGroup(p.position);
            return /* @__PURE__ */ jsxs12(
              "button",
              {
                onClick: () => togglePlayer(p),
                title: "Remove from tracks",
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 7px 3px 8px",
                  borderRadius: 12,
                  border: "1px solid #dfe3ea",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 11.5
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "#f4f6fa";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "#fff";
                },
                children: [
                  /* @__PURE__ */ jsx12("span", { style: {
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: roleColor(g),
                    display: "inline-block"
                  } }),
                  /* @__PURE__ */ jsx12("span", { style: { fontWeight: 600, color: "#222" }, children: p.name }),
                  /* @__PURE__ */ jsxs12("span", { style: { color: "#999" }, children: [
                    p.position || "",
                    p.source === "approx" ? " ~" : ""
                  ] }),
                  /* @__PURE__ */ jsx12("span", { style: { color: "#aab", fontWeight: 700, fontSize: 14, lineHeight: 1 }, children: "\xD7" })
                ]
              },
              p.player_id
            );
          }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxs12("div", { style: { overflowY: "auto", flex: 1, padding: "4px 6px 8px" }, children: [
      /* @__PURE__ */ jsxs12("div", { style: { padding: "2px 8px 4px", color: "#999", fontSize: 11 }, children: [
        matches.length,
        " player",
        matches.length === 1 ? "" : "s",
        " match",
        source !== "pipeline" && " \xB7 drafted players only, tenures approximated (~) until the roster pipeline runs"
      ] }),
      shown.map((t) => {
        const on = selectedIds.has(t.player_id);
        const g = positionGroup(t.position);
        const sat = played(t);
        return /* @__PURE__ */ jsxs12(
          "div",
          {
            onClick: () => togglePlayer(t),
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px",
              borderRadius: 6,
              cursor: on || !atCap ? "pointer" : "not-allowed",
              opacity: !on && atCap ? 0.45 : 1,
              background: on ? "#eef6ee" : "none"
            },
            onMouseEnter: (e) => {
              if (on || !atCap) e.currentTarget.style.background = on ? "#e2f0e2" : "#f2f4f8";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = on ? "#eef6ee" : "none";
            },
            children: [
              /* @__PURE__ */ jsx12("span", { style: {
                width: 9,
                height: 9,
                borderRadius: 2,
                background: roleColor(g),
                display: "inline-block"
              } }),
              /* @__PURE__ */ jsxs12("span", { style: { fontWeight: 600, flex: 1, color: sat ? "#222" : "#999" }, children: [
                t.name,
                !sat && /* @__PURE__ */ jsx12("span", { style: { fontWeight: 400, fontSize: 10.5 }, children: " \xB7 never played" })
              ] }),
              /* @__PURE__ */ jsx12("span", { style: { color: "#888", width: 30 }, children: t.position || "\u2014" }),
              /* @__PURE__ */ jsxs12("span", { style: { color: "#888" }, children: [
                t.from,
                "\u2013",
                t.to,
                t.source === "approx" ? "~" : ""
              ] }),
              /* @__PURE__ */ jsx12("span", { style: { width: 18, textAlign: "center", color: on ? "#2a7" : "#bbb", fontWeight: 700 }, children: on ? "\u2713" : "+" })
            ]
          },
          t.player_id
        );
      }),
      matches.length > shown.length && /* @__PURE__ */ jsxs12(
        "button",
        {
          onClick: () => setVisibleCount((c) => c + 2 * PAGE),
          style: {
            display: "block",
            width: "100%",
            padding: "8px 0",
            border: "none",
            background: "#f5f7fa",
            borderRadius: 6,
            cursor: "pointer",
            color: "#2d5cb8",
            fontWeight: 600,
            fontSize: 12
          },
          children: [
            "Show more (",
            matches.length - shown.length,
            " remaining)"
          ]
        }
      ),
      !matches.length && /* @__PURE__ */ jsx12("div", { style: { padding: 12, color: "#999" }, children: "No matches." })
    ] })
  ] });
}

// src/components/SettingsDrawer.jsx
import { jsx as jsx13, jsxs as jsxs13 } from "react/jsx-runtime";
var FEATURES = [
  {
    key: "showWinRate",
    label: "Overall win-rate",
    hint: "The all-time franchise win-rate curve over the timeline, plus the % pill in each year banner.",
    defaultOn: true
  },
  {
    key: "showPlayoffs",
    label: "Playoffs",
    hint: "Postseason segments, playoff result strips, and the playoff-finish medals.",
    defaultOn: true
  },
  {
    key: "availabilityAdjusted",
    label: "Availability-adjusted grades",
    hint: "Grade picks on production per playing time, so a productive career cut short by injury isn't scored like a bust. Off = standard 'value delivered' grade.",
    defaultOn: false
  }
];
function Toggle({ on, onClick }) {
  return /* @__PURE__ */ jsx13(
    "button",
    {
      role: "switch",
      "aria-checked": on,
      onClick,
      style: {
        flexShrink: 0,
        width: 38,
        height: 22,
        borderRadius: 11,
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: on ? "#2d6cdf" : "#cfd3da",
        position: "relative",
        transition: "background 0.16s ease"
      },
      children: /* @__PURE__ */ jsx13(
        "span",
        {
          style: {
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transition: "left 0.16s ease"
          }
        }
      )
    }
  );
}
function SettingsDrawer({ settings = {}, onChange }) {
  const isOn = (key, defaultOn = true) => settings[key] === void 0 ? defaultOn : !!settings[key];
  const toggle = (f) => onChange({ ...settings, [f.key]: !isOn(f.key, f.defaultOn ?? true) });
  return /* @__PURE__ */ jsx13("div", { style: { display: "flex", flexDirection: "column", height: "100%", fontSize: 12.5 }, children: /* @__PURE__ */ jsx13("div", { style: { overflowY: "auto", flex: 1, padding: "6px 8px 10px" }, children: FEATURES.map((f) => {
    const on = isOn(f.key, f.defaultOn ?? true);
    return /* @__PURE__ */ jsxs13(
      "div",
      {
        onClick: () => toggle(f),
        style: {
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "11px 12px",
          borderRadius: 8,
          cursor: "pointer"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#f4f6fa";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "none";
        },
        children: [
          /* @__PURE__ */ jsxs13("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ jsx13("div", { style: { fontWeight: 600, color: "#222" }, children: f.label }),
            f.hint && /* @__PURE__ */ jsx13("div", { style: { color: "#888", fontSize: 11, marginTop: 2 }, children: f.hint })
          ] }),
          /* @__PURE__ */ jsx13(Toggle, { on, onClick: (e) => {
            e.stopPropagation();
            toggle(f);
          } })
        ]
      },
      f.key
    );
  }) }) });
}

// src/components/Footer.jsx
import { jsx as jsx14, jsxs as jsxs14 } from "react/jsx-runtime";
var BAR_H = 44;
var DRAWER_H = 300;
var ACCENT = "#2d6cdf";
function Footer({
  teamId,
  draftSegment,
  ribbonConfig,
  onRibbonConfigChange,
  settings,
  onSettingsChange
}) {
  const [openDrawer, setOpenDrawer] = useState9(null);
  const open = openDrawer !== null;
  useEffect9(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpenDrawer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const toggle = (which) => setOpenDrawer((cur) => cur === which ? null : which);
  const nPlayers = (ribbonConfig?.players || []).length;
  return /* @__PURE__ */ jsxs14(
    "footer",
    {
      style: {
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 25,
        display: "flex",
        flexDirection: "column",
        background: "#fafafa",
        borderTop: "1px solid #ccc",
        boxShadow: open ? "0 -8px 28px rgba(0,0,0,0.14)" : "none",
        transition: "box-shadow 0.2s"
      },
      children: [
        /* @__PURE__ */ jsxs14(
          "div",
          {
            style: {
              height: open ? DRAWER_H : 0,
              overflow: "hidden",
              transition: "height 0.22s ease",
              background: "#fff",
              borderBottom: open ? "1px solid #e8eaef" : "none"
            },
            children: [
              openDrawer === "settings" && /* @__PURE__ */ jsx14(SettingsDrawer, { settings, onChange: onSettingsChange }),
              openDrawer === "personnel" && ribbonConfig && /* @__PURE__ */ jsx14(
                RibbonControls,
                {
                  teamId,
                  draftSegment,
                  config: ribbonConfig,
                  onChange: onRibbonConfigChange
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxs14("div", { style: { height: BAR_H, display: "flex", alignItems: "stretch" }, children: [
          /* @__PURE__ */ jsx14(
            DrawerButton,
            {
              icon: "\u2699\uFE0F",
              label: "Settings",
              active: openDrawer === "settings",
              onClick: () => toggle("settings")
            }
          ),
          /* @__PURE__ */ jsx14("div", { style: { width: 1, background: "#e2e4ea" } }),
          /* @__PURE__ */ jsx14(
            DrawerButton,
            {
              icon: "\u{1F465}",
              label: "Personnel",
              active: openDrawer === "personnel",
              onClick: () => toggle("personnel"),
              badge: nPlayers > 0 ? nPlayers : null
            }
          )
        ] })
      ]
    }
  );
}
function DrawerButton({ icon, label, active, onClick, badge = null }) {
  return /* @__PURE__ */ jsxs14(
    "button",
    {
      onClick,
      "aria-expanded": active,
      style: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: "100%",
        border: "none",
        borderTop: `2px solid ${active ? ACCENT : "transparent"}`,
        background: active ? "#eef2fb" : "transparent",
        color: active ? "#1f2d4d" : "#3a3f47",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s ease, color 0.15s ease"
      },
      onMouseEnter: (e) => {
        if (!active) e.currentTarget.style.background = "#f1f2f5";
      },
      onMouseLeave: (e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      },
      children: [
        /* @__PURE__ */ jsx14("span", { style: { fontSize: 15, lineHeight: 1 }, children: icon }),
        label,
        badge != null && /* @__PURE__ */ jsx14(
          "span",
          {
            style: {
              background: ACCENT,
              color: "#fff",
              borderRadius: 8,
              padding: "0 6px",
              fontSize: 10.5,
              fontWeight: 700
            },
            children: badge
          }
        )
      ]
    }
  );
}

// src/components/LeagueView.jsx
import { useEffect as useEffect10, useState as useState10 } from "react";
import { jsx as jsx15, jsxs as jsxs15 } from "react/jsx-runtime";
var TABS = [
  ["classes", "Best drafts"],
  ["gms", "Best GMs"],
  ["steals", "Steals"],
  ["busts", "Busts"]
];
function Chip({ tier, provisional }) {
  return /* @__PURE__ */ jsxs15(
    "span",
    {
      style: {
        background: tierColor(tier),
        color: "#fff",
        fontWeight: 700,
        borderRadius: 4,
        padding: "1px 7px",
        fontSize: 12,
        minWidth: 26,
        textAlign: "center",
        display: "inline-block"
      },
      children: [
        tier,
        provisional ? "*" : ""
      ]
    }
  );
}
var rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13
};
function Row2({ onClick, children }) {
  return /* @__PURE__ */ jsx15(
    "div",
    {
      style: rowStyle,
      onClick,
      onMouseEnter: (e) => e.currentTarget.style.background = "#f2f4f8",
      onMouseLeave: (e) => e.currentTarget.style.background = "none",
      children
    }
  );
}
var dim = { color: "#888", fontSize: 12 };
function LeagueView({ onClose, onGoTo }) {
  const [data, setData] = useState10(null);
  const [error, setError] = useState10(false);
  const [tab, setTab] = useState10("classes");
  const [settledOnly, setSettledOnly] = useState10(false);
  useEffect10(() => {
    let cancelled = false;
    fetch("/data/league/leaderboards.json").then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((json) => {
      if (!cancelled) setData(json);
    }).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect10(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const list = (data?.[tab] || []).filter(
    (r) => !settledOnly || !r.provisional
  );
  return /* @__PURE__ */ jsx15(
    "div",
    {
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(20,25,35,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      children: /* @__PURE__ */ jsxs15(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            // % of the device frame, not vw/vh — the frame is the containing
            // block for this fixed overlay (see .app-frame in index.css).
            width: "min(580px, 94%)",
            maxHeight: "84%",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
            overflow: "hidden"
          },
          children: [
            /* @__PURE__ */ jsxs15(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 14px 8px",
                  gap: 12
                },
                children: [
                  /* @__PURE__ */ jsx15("div", { style: { fontSize: 15, fontWeight: 700 }, children: "League leaderboards" }),
                  /* @__PURE__ */ jsx15("div", { style: { flex: 1 } }),
                  /* @__PURE__ */ jsxs15("label", { style: { fontSize: 12, color: "#666", display: "flex", gap: 5, alignItems: "center" }, children: [
                    /* @__PURE__ */ jsx15(
                      "input",
                      {
                        type: "checkbox",
                        checked: settledOnly,
                        onChange: (e) => setSettledOnly(e.target.checked)
                      }
                    ),
                    "settled only"
                  ] }),
                  /* @__PURE__ */ jsx15(
                    "button",
                    {
                      onClick: onClose,
                      "aria-label": "Close",
                      style: {
                        border: "none",
                        background: "none",
                        fontSize: 18,
                        cursor: "pointer",
                        color: "#999",
                        lineHeight: 1
                      },
                      children: "\xD7"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsx15("div", { style: { display: "flex", gap: 4, padding: "0 12px 8px" }, children: TABS.map(([id, label]) => /* @__PURE__ */ jsx15(
              "button",
              {
                onClick: () => setTab(id),
                style: {
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 12.5,
                  cursor: "pointer",
                  fontWeight: tab === id ? 700 : 400,
                  background: tab === id ? "#eef1f6" : "none",
                  color: "#222"
                },
                children: label
              },
              id
            )) }),
            /* @__PURE__ */ jsxs15("div", { style: { overflowY: "auto", padding: "0 8px 10px" }, children: [
              error && /* @__PURE__ */ jsx15("div", { style: { padding: 16, color: "#999", fontSize: 13 }, children: "No leaderboards yet \u2014 run segment.py to generate data/league/leaderboards.json." }),
              !data && !error && /* @__PURE__ */ jsx15("div", { style: { padding: 16, color: "#999", fontSize: 13 }, children: "Loading\u2026" }),
              tab === "classes" && list.map((c, i) => /* @__PURE__ */ jsxs15(Row2, { onClick: () => onGoTo(c.team, c.year), children: [
                /* @__PURE__ */ jsx15("span", { style: { ...dim, width: 22, textAlign: "right" }, children: i + 1 }),
                /* @__PURE__ */ jsx15(Chip, { tier: c.tier, provisional: c.provisional }),
                /* @__PURE__ */ jsxs15("span", { style: { fontWeight: 700, width: 84 }, children: [
                  c.team,
                  " ",
                  c.year
                ] }),
                /* @__PURE__ */ jsxs15("span", { style: dim, children: [
                  "avg ",
                  Math.round(c.avg_score)
                ] }),
                /* @__PURE__ */ jsx15("span", { style: { ...dim, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: (c.headline || []).map((h) => `${h.name} (${h.tier}${h.provisional ? "*" : ""})`).join(", ") })
              ] }, `${c.team}-${c.year}`)),
              tab === "gms" && list.map((g, i) => /* @__PURE__ */ jsxs15(
                Row2,
                {
                  onClick: () => onGoTo(g.classes[0].team, g.classes[0].year),
                  children: [
                    /* @__PURE__ */ jsx15("span", { style: { ...dim, width: 22, textAlign: "right" }, children: i + 1 }),
                    /* @__PURE__ */ jsxs15("span", { style: { fontWeight: 700, flex: 1 }, children: [
                      g.name,
                      g.provisional ? "*" : ""
                    ] }),
                    /* @__PURE__ */ jsxs15("span", { style: dim, children: [
                      "pctl ",
                      Math.round(g.mean_pctl),
                      " \xB7 ",
                      g.n_classes,
                      " classes"
                    ] }),
                    /* @__PURE__ */ jsxs15("span", { style: { ...dim, width: 150, textAlign: "right" }, children: [
                      g.teams.join("/"),
                      " ",
                      g.from,
                      "\u2013",
                      g.to
                    ] })
                  ]
                },
                g.admin_person_id
              )),
              (tab === "steals" || tab === "busts") && list.map((p, i) => /* @__PURE__ */ jsxs15(Row2, { onClick: () => onGoTo(p.team, p.year), children: [
                /* @__PURE__ */ jsx15("span", { style: { ...dim, width: 22, textAlign: "right" }, children: i + 1 }),
                /* @__PURE__ */ jsx15(Chip, { tier: p.tier, provisional: p.provisional }),
                /* @__PURE__ */ jsx15("span", { style: { fontWeight: 700, flex: 1 }, children: p.name }),
                /* @__PURE__ */ jsxs15("span", { style: dim, children: [
                  p.team,
                  " ",
                  p.year,
                  " \xB7 R",
                  p.round,
                  " #",
                  p.pick_overall
                ] }),
                /* @__PURE__ */ jsxs15("span", { style: { ...dim, width: 56, textAlign: "right" }, children: [
                  Math.round(p.score),
                  " / 100"
                ] })
              ] }, `${p.player_id}-${p.team}-${p.year}`))
            ] })
          ]
        }
      )
    }
  );
}

// src/components/MethodologyView.jsx
import { useEffect as useEffect11 } from "react";
import { jsx as jsx16, jsxs as jsxs16 } from "react/jsx-runtime";
var TIER_ROWS = [
  ["S", "96\u2013100", "top 4% - franchise-altering return"],
  ["A+", "91\u201396", "elite return on the slot"],
  ["A", "78\u201391", "clearly beat the slot"],
  ["B", "58\u201378", "solid value"],
  ["C", "38\u201358", "roughly what the slot expects"],
  ["D", "15\u201338", "below expectation"],
  ["F", "0\u201315", "little or no return"]
];
function H({ children }) {
  return /* @__PURE__ */ jsx16("div", { style: { fontSize: 13.5, fontWeight: 700, margin: "16px 0 4px" }, children });
}
function P({ children }) {
  return /* @__PURE__ */ jsx16("p", { style: { margin: "4px 0 8px", lineHeight: 1.5, color: "#333" }, children });
}
function MethodologyView({ onClose }) {
  useEffect11(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return /* @__PURE__ */ jsx16(
    "div",
    {
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(20,25,35,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      children: /* @__PURE__ */ jsxs16(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            // % of the device frame, not vw/vh — see .app-frame in index.css.
            width: "min(560px, 94%)",
            maxHeight: "84%",
            overflowY: "auto",
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
            padding: "16px 20px 20px",
            fontSize: 12.5
          },
          children: [
            /* @__PURE__ */ jsxs16("div", { style: { display: "flex", alignItems: "center" }, children: [
              /* @__PURE__ */ jsx16("div", { style: { fontSize: 15, fontWeight: 700 }, children: "How draft grades work" }),
              /* @__PURE__ */ jsx16("div", { style: { flex: 1 } }),
              /* @__PURE__ */ jsx16(
                "button",
                {
                  onClick: onClose,
                  "aria-label": "Close",
                  style: {
                    border: "none",
                    background: "none",
                    fontSize: 18,
                    cursor: "pointer",
                    color: "#999",
                    lineHeight: 1
                  },
                  children: "\xD7"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs16(P, { children: [
              "Every grade answers one question:",
              " ",
              /* @__PURE__ */ jsx16("b", { children: "did this pick return more career than its draft slot should?" }),
              " ",
              'Not "was he good" - Peyton Manning was good. Whether a #1 overall pick beat ',
              /* @__PURE__ */ jsx16("i", { children: "the expectation of being #1 overall" }),
              " is a different and harder bar than whether a 6th-rounder beat his."
            ] }),
            /* @__PURE__ */ jsx16(H, { children: "1 \xB7 What a slot expects" }),
            /* @__PURE__ */ jsxs16(P, { children: [
              "For every overall pick slot (#1, #2, \u2026 #260+), we average the career production of ",
              /* @__PURE__ */ jsx16("b", { children: "every player ever drafted there since 1970" }),
              ` - including the ones who never played a down, because busting is part of a slot's reality. That gives an expected-return curve fitted purely from history (smoothed, and forced downhill: a later pick never "expects" more than an earlier one).`
            ] }),
            /* @__PURE__ */ jsx16(H, { children: "2 \xB7 What a career produced" }),
            /* @__PURE__ */ jsx16(P, { children: "Each player's career is summarized by a composite production measure that rolls up seasons played, starting jobs held, league honors, and on-field statistical output across his whole career - one number that lets a guard, a corner, and a quarterback sit on the same scale. It isn't perfect (trench play is harder to measure than passing yards; see Honesty, below) but it's consistent across 55+ years." }),
            /* @__PURE__ */ jsx16(H, { children: "3 \xB7 Surplus" }),
            /* @__PURE__ */ jsxs16(P, { children: [
              /* @__PURE__ */ jsx16("b", { children: "Surplus = what the career produced \u2212 what the slot expected." }),
              " ",
              `A 6th-rounder with a starter's career posts a huge surplus. A top-5 pick with a journeyman career posts a deeply negative one, even though he "made it." This is draft-capital efficiency, not player quality.`
            ] }),
            /* @__PURE__ */ jsx16(H, { children: "4 \xB7 Era fairness" }),
            /* @__PURE__ */ jsxs16(P, { children: [
              "Raw production numbers inflate and deflate across eras (season length, league size, stat environments). So surpluses are standardized ",
              /* @__PURE__ */ jsx16("b", { children: "within each draft class" }),
              " - you're compared to the other players drafted the same year. Classes too young to be mostly finished borrow a baseline from the most recent fully- settled classes instead, so a young class's few retirees aren't graded against each other in a tiny biased pool."
            ] }),
            /* @__PURE__ */ jsx16(H, { children: "5 \xB7 Score and letter" }),
            /* @__PURE__ */ jsxs16(P, { children: [
              "The era-adjusted surplus becomes a ",
              /* @__PURE__ */ jsx16("b", { children: "percentile" }),
              " against every graded pick in history - that's the 0\u2013100 score. Letters are fixed slices of that scale:"
            ] }),
            /* @__PURE__ */ jsx16("table", { style: { borderCollapse: "collapse", width: "100%", margin: "4px 0 8px" }, children: /* @__PURE__ */ jsx16("tbody", { children: TIER_ROWS.map(([t, range, desc]) => /* @__PURE__ */ jsxs16("tr", { children: [
              /* @__PURE__ */ jsx16("td", { style: { padding: "3px 6px", width: 34 }, children: /* @__PURE__ */ jsx16(
                "span",
                {
                  style: {
                    background: TIER_COLORS[t],
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: 4,
                    padding: "1px 7px",
                    fontSize: 11.5,
                    display: "inline-block",
                    minWidth: 22,
                    textAlign: "center"
                  },
                  children: t
                }
              ) }),
              /* @__PURE__ */ jsx16("td", { style: { padding: "3px 6px", color: "#666", width: 64 }, children: range }),
              /* @__PURE__ */ jsx16("td", { style: { padding: "3px 6px", color: "#333" }, children: desc })
            ] }, t)) }) }),
            /* @__PURE__ */ jsx16(H, { children: "6 \xB7 Verdicts vs. forecasts (the *)" }),
            /* @__PURE__ */ jsxs16(P, { children: [
              "A class is graded in full once it's ",
              /* @__PURE__ */ jsx16("b", { children: "three seasons old" }),
              "; a finished career is graded ",
              /* @__PURE__ */ jsx16("b", { children: "immediately" }),
              ", even sooner. But a grade on a player who's still active is a forecast that can move - those carry a ",
              /* @__PURE__ */ jsx16("b", { children: "*" }),
              ' everywhere they appear. A grade with no star is a closed case. Drafted players with no recorded production count as zero-return once their class is old enough that "still developing" is no longer plausible.'
            ] }),
            /* @__PURE__ */ jsx16(H, { children: "7 \xB7 Class and GM grades" }),
            /* @__PURE__ */ jsxs16(P, { children: [
              "A ",
              /* @__PURE__ */ jsx16("b", { children: "class grade" }),
              " is the average pick score of one team's draft year, percentile-ranked against all ~1,500 graded classes in history - same letters. Classes only grade once at least 85% of their picks have grades (and at least 3 graded picks), so a young class isn't judged by its early washouts. A ",
              /* @__PURE__ */ jsx16("b", { children: "GM's record" }),
              " ",
              "credits each class to whoever held the GM seat that season; mean class percentile across a minimum of four classes ranks the leaderboard. (Known rough edges: co-GM situations, and a new GM's first draft arguably riding his predecessor's scouting board.)"
            ] }),
            /* @__PURE__ */ jsx16(H, { children: "Honesty box" }),
            /* @__PURE__ */ jsxs16(P, { style: { color: "#555" }, children: [
              "\xB7 The timeline's data floor is 1967; drafts are graded from 1970.",
              /* @__PURE__ */ jsx16("br", {}),
              "\xB7 Composite production measures systematically flatter stat-rich positions and undervalue offensive linemen and specialists - grades are fairest ",
              /* @__PURE__ */ jsx16("i", { children: "within" }),
              " a position, sharpest for skill positions.",
              /* @__PURE__ */ jsx16("br", {}),
              "\xB7 Recent grades depend on how current the career data is; starred grades will move.",
              /* @__PURE__ */ jsx16("br", {}),
              "\xB7 Expected return is fitted on history, so the very newest slots of expansion-era rounds carry wider uncertainty than round one."
            ] }),
            /* @__PURE__ */ jsx16(H, { children: "Website analytics" }),
            /* @__PURE__ */ jsx16(P, { style: { color: "#555" }, children: "This website uses Umami Cloud to collect anonymous usage statistics, such as visited pages, approximate location, browser type, operating system and referring website. Umami does not use cookies and does not track visitors across websites. The information is used to understand website usage and improve the site." })
          ]
        }
      )
    }
  );
}

// src/ErrorBoundary.jsx
import * as React from "react";
var ErrorBoundary = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
};

// src/hooks/useTeamData.js
import { useEffect as useEffect12, useState as useState11, useMemo as useMemo7 } from "react";

// src/utils/mapTeamData.js
var SEASON_SPAN = 0.7;
function mapTeamData(teamSegment) {
  if (!teamSegment) return null;
  const { seasons, games, staff } = teamSegment;
  if (!seasons || !games) return null;
  const gamesBySeason = {};
  for (const g of games) {
    const yr = g.season;
    if (!gamesBySeason[yr]) gamesBySeason[yr] = [];
    gamesBySeason[yr].push(g);
  }
  for (const yr of Object.keys(gamesBySeason)) {
    gamesBySeason[yr].sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  const mappedSeasons = seasons.slice().sort((a, b) => a.year - b.year).map((season) => {
    const { year, wins, losses, ties } = season;
    const seasonGames = gamesBySeason[year] || [];
    const totalGames = seasonGames.length;
    const winRatio = totalGames > 0 ? wins / (wins + losses + (ties || 0)) : 0.5;
    const mappedGames = seasonGames.map((g, index) => {
      const t = year + (index + 0.5) / totalGames * SEASON_SPAN;
      return {
        ...g,
        t,
        points_for: Math.round(g.points_for),
        points_against: Math.round(g.points_against)
      };
    });
    const seasonTop = year;
    const seasonBottom = year + SEASON_SPAN;
    const offseasonTop = seasonBottom;
    const offseasonBottom = year + 1;
    return {
      season,
      year,
      winRatio,
      totalGames,
      games: mappedGames,
      seasonTop,
      seasonBottom,
      offseasonTop,
      offseasonBottom
    };
  });
  const totalWins = seasons.reduce((acc, s) => acc + s.wins, 0);
  const totalLosses = seasons.reduce((acc, s) => acc + s.losses, 0);
  const totalTies = seasons.reduce((acc, s) => acc + (s.ties || 0), 0);
  const totalGamesOverall = totalWins + totalLosses + totalTies;
  const overallRatio = totalGamesOverall > 0 ? totalWins / totalGamesOverall : 0.5;
  return {
    team: teamSegment.team,
    seasons: mappedSeasons,
    staff: teamSegment.staff || [],
    // Optional aggregate W-L-T from before the 1967 data floor; seeds the
    // all-time winrate curve so it starts at the franchise's TRUE ratio.
    pre1967: teamSegment.pre1967 || null,
    overallRatio,
    minYear: Math.min(...seasons.map((s) => s.year)),
    maxYear: Math.max(...seasons.map((s) => s.year)) + 1
    // include final offseason
  };
}

// src/hooks/useTeamData.js
function useTeamData(teamId) {
  const [loading, setLoading] = useState11(false);
  const [teamSegment, setTeamSegment] = useState11(null);
  const [draftSegment, setDraftSegment] = useState11(null);
  const [error, setError] = useState11(null);
  const [adminById, setAdminById] = useState11(() => /* @__PURE__ */ new Map());
  useEffect12(() => {
    if (!teamId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTeamSegment(null);
    fetch(`/data/segments/teams/${teamId}.json`).then((res) => {
      if (!res.ok) throw new Error(`Bad response ${res.status}`);
      return res.json();
    }).then((json) => {
      if (!cancelled) setTeamSegment(json);
    }).catch((err) => {
      if (!cancelled) setError(err);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId]);
  useEffect12(() => {
    if (!teamId) return;
    let cancelled = false;
    setDraftSegment(null);
    fetch(`/data/segments/teams_draft/${teamId}.json`).then((res) => res.ok ? res.json() : null).then((json) => {
      if (!cancelled) setDraftSegment(json);
    }).catch(() => {
      if (!cancelled) setDraftSegment(null);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId]);
  useEffect12(() => {
    if (!teamSegment?.staff?.length) return;
    let cancelled = false;
    const ids = [
      ...new Set(teamSegment.staff.map((s) => s.admin_person_id))
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
            title: getPersonnelTitle(segment)
          });
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [teamSegment]);
  const mapped = useMemo7(() => {
    if (!teamSegment) return null;
    return mapTeamData(teamSegment);
  }, [teamSegment]);
  const performanceLeft = 160;
  const performanceRight = null;
  const svgWidth = null;
  return {
    loading,
    error,
    teamSegment,
    draftSegment,
    mapped,
    performanceLeft,
    performanceRight,
    svgWidth,
    adminById
  };
}

// src/App.jsx
import { jsx as jsx17, jsxs as jsxs17 } from "react/jsx-runtime";
var DEFAULT_RIBBONS = {
  roles: { coach: true, gm: true, owner: true, unknown: true },
  players: []
};
function App() {
  const [selectedTeam, setSelectedTeam] = useState12("ARI");
  const [settings, setSettings] = useState12({});
  const [leagueOpen, setLeagueOpen] = useState12(false);
  const [methodologyOpen, setMethodologyOpen] = useState12(false);
  const [ribbonConfig, setRibbonConfig] = useState12(DEFAULT_RIBBONS);
  const [focusYear, setFocusYear] = useState12(null);
  const [pendingFollow, setPendingFollow] = useState12(null);
  const { mapped, loading, draftSegment, adminById } = useTeamData(selectedTeam);
  const mainRef = useRef7(null);
  const selectTeam = useCallback5((team) => {
    setSelectedTeam(team);
    setRibbonConfig((c) => ({ ...c, players: [] }));
  }, []);
  const goTo = useCallback5((team, year, follow = null) => {
    setLeagueOpen(false);
    setFocusYear(year ?? null);
    setPendingFollow(follow && follow.id ? follow : null);
    setSelectedTeam((prev) => {
      if (prev !== team) {
        setRibbonConfig((c) => ({
          ...c,
          players: [],
          // A followed staffer is shown via role toggles — make sure the role
          // is on so they're visible when we land.
          roles: follow && follow.kind === "staff" && follow.role ? { ...c.roles, [follow.role]: true } : c.roles
        }));
      } else if (follow && follow.kind === "staff" && follow.role) {
        setRibbonConfig((c) => ({ ...c, roles: { ...c.roles, [follow.role]: true } }));
      }
      return team;
    });
  }, []);
  const clearFocus = useCallback5(() => setFocusYear(null), []);
  useEffect13(() => {
    if (!pendingFollow) return;
    if (!mapped || mapped.team !== selectedTeam) return;
    const { id, kind } = pendingFollow;
    if (kind === "staff") {
      const span = (mapped.staff || []).find((s) => s.admin_person_id === id);
      if (span) setFocusYear(span.from);
      setPendingFollow(null);
      return;
    }
    let cancelled = false;
    fetch(`/data/segments/teams_tenures/${selectedTeam}.json`).then((r) => r.ok ? r.json() : null).then((json) => {
      if (cancelled) return;
      const row = (json?.tenures || []).find(
        (t) => (t.player_id_internal || t.player_id) === id
      );
      if (row) {
        setRibbonConfig((c) => ({
          ...c,
          players: [
            {
              player_id: id,
              name: row.name ?? pendingFollow.name,
              position: row.position ?? pendingFollow.position,
              from: row.from,
              to: row.to,
              source: row.source,
              prev_team: row.prev_team,
              next_team: row.next_team,
              entry: row.entry,
              exit: row.exit,
              conf: row.conf
            }
          ]
        }));
        setFocusYear(row.from);
      }
      setPendingFollow(null);
    }).catch(() => {
      if (!cancelled) setPendingFollow(null);
    });
    return () => {
      cancelled = true;
    };
  }, [pendingFollow, mapped, selectedTeam]);
  if (loading || !mapped)
    return /* @__PURE__ */ jsx17("div", { className: "app-frame", id: FRAME_ID, style: { display: "grid", placeItems: "center" }, children: "Loading\u2026" });
  const readyFocusYear = mapped.team === selectedTeam ? focusYear : null;
  return /* @__PURE__ */ jsxs17(ErrorBoundary, { fallback: /* @__PURE__ */ jsx17("div", { children: "Something went wrong." }), children: [
    /* @__PURE__ */ jsx17("div", { className: "app-frame", id: FRAME_ID, children: /* @__PURE__ */ jsxs17("div", { style: {
      maxHeight: "100%",
      height: "100%",
      boxSizing: "border-box",
      paddingBottom: BAR_H,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }, children: [
      /* @__PURE__ */ jsx17(
        Header,
        {
          scrollRef: mainRef,
          selectedTeam,
          setSelectedTeam: selectTeam,
          onOpenLeague: () => setLeagueOpen(true),
          onOpenMethodology: () => setMethodologyOpen(true),
          onSearchSelect: goTo
        }
      ),
      /* @__PURE__ */ jsx17("div", { style: { width: "100%", flex: 1, height: "100%" }, children: /* @__PURE__ */ jsx17(
        Main_default,
        {
          ref: mainRef,
          mapped,
          draftSegment,
          settings,
          adminById,
          focusYear: readyFocusYear,
          onFocusConsumed: clearFocus,
          ribbonConfig,
          onFollow: goTo
        }
      ) }),
      /* @__PURE__ */ jsx17(
        Footer,
        {
          teamId: selectedTeam,
          draftSegment,
          ribbonConfig,
          onRibbonConfigChange: setRibbonConfig,
          settings,
          onSettingsChange: setSettings
        }
      ),
      leagueOpen && /* @__PURE__ */ jsx17(LeagueView, { onClose: () => setLeagueOpen(false), onGoTo: goTo }),
      methodologyOpen && /* @__PURE__ */ jsx17(MethodologyView, { onClose: () => setMethodologyOpen(false) })
    ] }) }),
    /* @__PURE__ */ jsxs17("p", { className: "frame-hint", children: [
      "Built for mobile \u2014 hold ",
      /* @__PURE__ */ jsx17("kbd", { children: "Ctrl" }),
      " (or ",
      /* @__PURE__ */ jsx17("kbd", { children: "\u2318" }),
      ") and scroll to zoom."
    ] })
  ] });
}
var App_default = App;

// src/desktop/DesktopApp.jsx
import { useCallback as useCallback8, useEffect as useEffect17, useRef as useRef11, useState as useState15 } from "react";

// src/desktop/DesktopMain.jsx
import {
  forwardRef as forwardRef2,
  useCallback as useCallback7,
  useEffect as useEffect16,
  useImperativeHandle as useImperativeHandle2,
  useLayoutEffect as useLayoutEffect4,
  useMemo as useMemo10,
  useRef as useRef10,
  useState as useState14
} from "react";

// src/desktop/DesktopTimelineLayer.jsx
import { memo as memo3, useMemo as useMemo8 } from "react";

// src/desktop/desktopDetail.js
var DESKTOP_GEOMETRY = {
  GAME_DETAIL: { season: { mode: "cols", gameColWidth: 22 }, offseason: "full" },
  GAME_BANDS: { season: { mode: "cols", gameColWidth: 9 }, offseason: "full" },
  SEASON_LINES: { season: { mode: "line", width: 26 }, offseason: "compact" },
  ERA_SUMMARY: { season: { mode: "line", width: 12 }, offseason: "hidden" },
  FRANCHISE_OVERVIEW: { season: { mode: "line", width: 5 }, offseason: "hidden" }
};
var desktopGeometryFor = (band) => DESKTOP_GEOMETRY[band] || DESKTOP_GEOMETRY[DEFAULT_BAND];

// src/desktop/desktopRibbonModel.js
var BAND_H = 16;
var CONN_W = 16;
var BAND_GAP = 0;
var MIN_BAND_H = 6;
var SQUISH_FULL_SLOTS2 = 4;
var SQUISH_BUDGET2 = 6 * BAND_H;
var MAX_RAIL_SLOTS = Math.floor(SQUISH_BUDGET2 / MIN_BAND_H);
var PEEK2 = 3;
var PILL_H = 18;
var PILL_ROW_H = 22;
var PILL_MAX_ROWS = 2;
var pillWidth = (text) => Math.round(String(text).length * 6.6) + 18;
function entryInfo(r) {
  if (r.entry === "from_team" && r.prevTeam)
    return {
      text: `${teamName(r.prevTeam)} \u2192`,
      fid: r.prevTeam,
      year: Math.max(0, (r.from || 0) - 1),
      kind: "dest"
    };
  if (r.entry === "drafted") return { text: "Drafted", kind: "term" };
  return null;
}
function exitInfo(r) {
  if (!r.hasExit) return null;
  if (r.exit === "to_team" && r.nextTeam)
    return {
      text: `${teamName(r.nextTeam)} \u2192`,
      fid: r.nextTeam,
      year: (r.to || 0) + 1,
      kind: "dest"
    };
  if (r.exit === "retired") return { text: "Retired", kind: "term" };
  if (r.exit === "left_league") return { text: "Left NFL", kind: "term" };
  return null;
}
function layoutPillRows(pills, maxRows = PILL_MAX_ROWS, gap = 6) {
  const rowEnds = [];
  const out = /* @__PURE__ */ new Map();
  const sorted = [...pills || []].sort(
    (a, b) => a.x - a.w / 2 - (b.x - b.w / 2)
  );
  for (const p of sorted) {
    const left = p.x - p.w / 2;
    let placed = -1;
    for (let i = 0; i < maxRows; i++) {
      if (rowEnds[i] === void 0 || left >= rowEnds[i] + gap) {
        rowEnds[i] = p.x + p.w / 2;
        placed = i;
        break;
      }
    }
    out.set(p.key, placed);
  }
  return out;
}
function buildPillPlan(ribbons) {
  const entries = [];
  const exits = [];
  for (const r of ribbons || []) {
    const en = entryInfo(r);
    if (en) entries.push({ key: r.key, x: r.x0 + CONN_W / 2, w: pillWidth(en.text), info: en });
    const ex = exitInfo(r);
    if (ex) exits.push({ key: r.key, x: r.exitX + CONN_W / 2, w: pillWidth(ex.text), info: ex });
  }
  const entryRowsMap = layoutPillRows(entries);
  const exitRowsMap = layoutPillRows(exits);
  let entryRows = 0;
  let exitRows = 0;
  for (const p of entries) {
    p.row = entryRowsMap.get(p.key) ?? -1;
    if (p.row >= 0) entryRows = Math.max(entryRows, p.row + 1);
  }
  for (const p of exits) {
    p.row = exitRowsMap.get(p.key) ?? -1;
    if (p.row >= 0) exitRows = Math.max(exitRows, p.row + 1);
  }
  return {
    entryByKey: new Map(entries.map((p) => [p.key, p])),
    exitByKey: new Map(exits.map((p) => [p.key, p])),
    entryRows,
    exitRows
  };
}
var entryOrder2 = (a, b) => String(a.name).localeCompare(String(b.name)) || String(a.key || "").localeCompare(String(b.key || ""));
function buildDesktopRibbons({
  staff,
  layout,
  connWidth = CONN_W,
  bandHeight = BAND_H
} = {}) {
  if (!staff?.length || !layout?.blocks?.length) {
    return { ribbons: [], railHeight: 0, slotCount: 0, bandH: bandHeight };
  }
  const first = layout.blocks[0];
  const last = layout.blocks[layout.blocks.length - 1];
  const byFrom = /* @__PURE__ */ new Map();
  const spans = [];
  for (const s of staff) {
    if (s.from == null || s.to == null) continue;
    if (s.to < layout.firstYear || s.from > layout.lastYear) continue;
    const span = {
      key: `${s.admin_person_id}:${s.role}:${s.from}`,
      id: s.admin_person_id,
      name: s.name,
      role: s.role,
      color: roleColor(s.role),
      from: s.from,
      to: s.to,
      kind: s.kind || "staff",
      approx: !!s.approx,
      position: s.position || null,
      prevTeam: s.prev_team || null,
      nextTeam: s.next_team || null,
      entry: s.entry || null,
      exit: s.exit || null,
      conf: s.conf || null
    };
    spans.push(span);
    if (!byFrom.has(s.from)) byFrom.set(s.from, []);
    byFrom.get(s.from).push(span);
  }
  for (const group of byFrom.values()) group.sort(entryOrder2);
  const ribbons = [];
  for (const r of spans) {
    const fromB = layout.byYear.get(r.from);
    const toB = layout.byYear.get(r.to);
    const idx = byFrom.get(r.from).indexOf(r);
    let x0 = fromB ? fromB.offseason.ribbonLeft ?? fromB.offseason.x0 : layout.tToX(r.from);
    x0 += idx * (connWidth + BAND_GAP);
    let x1 = toB ? toB.season.x1 : layout.tToX(r.to + 1);
    x0 = Math.max(first.x0, Math.min(x0, last.x1 - connWidth));
    x1 = Math.max(first.x0, Math.min(x1, last.x1));
    if (x1 <= x0) continue;
    const hasExit = x1 - x0 >= 2 * connWidth;
    ribbons.push({
      ...r,
      x0,
      x1,
      hasExit,
      exitX: x1 - connWidth,
      tailEnd: x1
    });
  }
  const entryCols = new Set(ribbons.map((r) => r.x0));
  const exitGroups = /* @__PURE__ */ new Map();
  for (const r of ribbons) {
    if (!r.hasExit) continue;
    if (!exitGroups.has(r.exitX)) exitGroups.set(r.exitX, []);
    exitGroups.get(r.exitX).push(r);
  }
  for (const group of exitGroups.values()) {
    group.sort((a, b) => b.x0 - a.x0);
    group.forEach((r, i) => {
      r.exitX += (group.length - 1 - i) * connWidth;
    });
    let extra = 0;
    while (group.some((r) => entryCols.has(r.exitX + extra))) {
      extra += connWidth;
    }
    if (extra) {
      for (const r of group) r.exitX += extra;
    }
    for (const r of group) r.tailEnd = r.exitX + connWidth;
  }
  const slotMap = allocateTailSlots(
    ribbons.map((r) => ({ id: r.key, startY: r.x0, endY: r.tailEnd }))
  );
  const slotCount = ribbons.length ? Math.max(...slotMap.values()) + 1 : 0;
  let shown = ribbons;
  let slots = slotCount;
  if (slotCount > MAX_RAIL_SLOTS) {
    shown = ribbons.filter((r) => (slotMap.get(r.key) ?? 0) < MAX_RAIL_SLOTS);
    slots = MAX_RAIL_SLOTS;
  }
  let bandH = bandHeight;
  if (slots > SQUISH_FULL_SLOTS2) {
    bandH = Math.max(
      MIN_BAND_H,
      Math.min(bandHeight - 1, Math.floor(SQUISH_BUDGET2 / slots))
    );
  }
  const railHeight = slots * bandH;
  for (const r of shown) {
    r.slot = slotMap.get(r.key) ?? 0;
  }
  return { ribbons: shown, railHeight, slotCount: slots, bandH };
}

// src/desktop/DesktopRibbonLayer.jsx
import { jsx as jsx18, jsxs as jsxs18 } from "react/jsx-runtime";
var PX_PER_CHAR2 = 5.8;
var FADE_LEN = 26;
var DEST_BG2 = "#2e333a";
var DEST_FG2 = "#ffffff";
var TERM_BG2 = "#c3c8ce";
var TERM_FG2 = "#2a2d31";
function FollowTag2({ x, y, pill, person, conf, onFollow, tapGuard }) {
  const info = pill.info;
  const dest = info.kind === "dest";
  const navigable = dest && !!info.fid && conf !== "approx" && conf !== "low";
  const onClick = navigable ? (e) => {
    e.stopPropagation();
    if (tapGuard && tapGuard()) return;
    onFollow?.(info.fid, info.year, person);
  } : void 0;
  return /* @__PURE__ */ jsxs18(
    "g",
    {
      transform: `translate(${x} ${y})`,
      onClick,
      style: navigable ? { cursor: "pointer" } : { pointerEvents: "none" },
      children: [
        /* @__PURE__ */ jsx18("rect", { x: -pill.w / 2, y: -PILL_H / 2, width: pill.w, height: PILL_H, rx: PILL_H / 2, fill: dest ? DEST_BG2 : TERM_BG2 }),
        /* @__PURE__ */ jsx18(
          "text",
          {
            x: 0,
            y: 0.5,
            textAnchor: "middle",
            dominantBaseline: "middle",
            fontSize: 11,
            fontWeight: 700,
            fill: dest ? DEST_FG2 : TERM_FG2,
            style: { userSelect: "none" },
            children: info.text
          }
        )
      ]
    }
  );
}
function ribbonPath2({ x0, bandY, bandH, exitX, tailEnd, topY, botY, hasExit }) {
  const cb = bandY + bandH;
  if (hasExit && x0 < exitX) {
    return [
      `M ${x0} ${topY}`,
      `H ${x0 + CONN_W}`,
      `V ${bandY}`,
      `H ${tailEnd}`,
      `V ${botY}`,
      `H ${exitX}`,
      `V ${cb}`,
      `H ${x0}`,
      "Z"
    ].join(" ");
  }
  if (hasExit) {
    return `M ${x0} ${topY} H ${x0 + CONN_W} V ${botY} H ${x0} Z`;
  }
  return [
    `M ${x0} ${topY}`,
    `H ${x0 + CONN_W}`,
    `V ${bandY}`,
    `H ${tailEnd}`,
    `V ${cb}`,
    `H ${x0}`,
    "Z"
  ].join(" ");
}
function bandLabel(r, title, maxChars) {
  const approx = r.approx ? "~" : "";
  const roleLabel = r.kind === "player" ? String(r.position || r.role).toUpperCase() : String(r.role).toUpperCase();
  const full = title ? `${r.name} \xB7 ${title} \xB7 ${r.from}\u2013${r.to}${approx}` : `${r.name} \xB7 ${roleLabel} \xB7 ${r.from}\u2013${r.to}${approx}`;
  if (full.length <= maxChars) return full;
  const short = `${r.name} \xB7 ${r.from}\u2013${r.to}`;
  if (short.length <= maxChars) return short;
  return short.slice(0, Math.max(1, maxChars - 1)) + "\u2026";
}
function DesktopRibbonLayer({
  ribbons = [],
  pillPlan,
  width = 0,
  scrollX = 0,
  laneTop = 0,
  railTop = 0,
  slotCount = 0,
  bandH = 16,
  entryPillY,
  // (row) => center y of an entry pill row (above the lane)
  exitPillY,
  // (row) => center y of an exit pill row (below the rail)
  adminById,
  onSelect,
  onFollow,
  tapGuard
}) {
  if (!ribbons.length || !width) return null;
  const railBottom = railTop + slotCount * bandH;
  const bandYOf = (slot) => railTop + (slotCount - 1 - (slot ?? 0)) * bandH;
  const viewL = scrollX - 60;
  const viewR = scrollX + width + 60;
  const items = ribbons.filter((r) => r.tailEnd > viewL && r.x0 < viewR).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  return /* @__PURE__ */ jsxs18("g", { children: [
    /* @__PURE__ */ jsxs18("defs", { children: [
      /* @__PURE__ */ jsxs18("linearGradient", { id: "ribFadeUp", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ jsx18("stop", { offset: "0", stopColor: "#000" }),
        /* @__PURE__ */ jsx18("stop", { offset: "1", stopColor: "#fff" })
      ] }),
      /* @__PURE__ */ jsxs18("linearGradient", { id: "ribFadeDown", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ jsx18("stop", { offset: "0", stopColor: "#fff" }),
        /* @__PURE__ */ jsx18("stop", { offset: "1", stopColor: "#000" })
      ] }),
      /* @__PURE__ */ jsx18("mask", { id: "ribMaskUp", maskContentUnits: "objectBoundingBox", children: /* @__PURE__ */ jsx18("rect", { width: "1", height: "1", fill: "url(#ribFadeUp)" }) }),
      /* @__PURE__ */ jsx18("mask", { id: "ribMaskDown", maskContentUnits: "objectBoundingBox", children: /* @__PURE__ */ jsx18("rect", { width: "1", height: "1", fill: "url(#ribFadeDown)" }) })
    ] }),
    items.map((r) => {
      const bandY = bandYOf(r.slot);
      const title = adminById?.get?.(r.id)?.title;
      const enP = pillPlan?.entryByKey?.get(r.key) || null;
      const exP = pillPlan?.exitByKey?.get(r.key) || null;
      const enShown = enP && enP.row >= 0;
      const exShown = exP && exP.row >= 0;
      const topY = enShown ? entryPillY(enP.row) : laneTop - 6;
      const botY = exShown ? exitPillY(exP.row) : railBottom + PEEK2;
      const d = ribbonPath2({
        x0: r.x0,
        bandY,
        bandH,
        exitX: r.exitX,
        tailEnd: r.tailEnd,
        topY,
        botY,
        hasExit: r.hasExit
      });
      const handleClick = typeof onSelect === "function" ? (e) => {
        e.stopPropagation();
        if (tapGuard && tapGuard()) return;
        onSelect(r);
      } : void 0;
      const person = { id: r.id, kind: r.kind, role: r.role, name: r.name, position: r.position };
      const labelX = Math.max(r.x0, scrollX) + 6;
      const labelEnd = (r.hasExit && r.x0 < r.exitX ? r.exitX : r.tailEnd) - 4;
      const maxChars = Math.floor((Math.min(labelEnd, scrollX + width - 8) - labelX) / PX_PER_CHAR2);
      return /* @__PURE__ */ jsxs18("g", { children: [
        /* @__PURE__ */ jsx18(
          "path",
          {
            d,
            fill: r.color,
            stroke: "#111",
            strokeWidth: 1,
            strokeDasharray: r.approx ? "4 3" : void 0,
            strokeLinejoin: "miter",
            onClick: handleClick,
            style: handleClick ? { cursor: "pointer" } : void 0,
            children: /* @__PURE__ */ jsx18("title", { children: title ? `${r.name} \xB7 ${title} \xB7 ${r.from}\u2013${r.to}` : `${r.name} \xB7 ${r.from}\u2013${r.to}` })
          }
        ),
        enShown && enP.info.kind === "dest" && /* @__PURE__ */ jsx18(
          "rect",
          {
            x: r.x0,
            y: topY - FADE_LEN,
            width: CONN_W,
            height: FADE_LEN,
            fill: r.color,
            mask: "url(#ribMaskUp)",
            style: { pointerEvents: "none" }
          }
        ),
        exShown && exP.info.kind === "dest" && /* @__PURE__ */ jsx18(
          "rect",
          {
            x: r.exitX,
            y: botY,
            width: CONN_W,
            height: FADE_LEN,
            fill: r.color,
            mask: "url(#ribMaskDown)",
            style: { pointerEvents: "none" }
          }
        ),
        bandH >= 11 && maxChars > 3 && /* @__PURE__ */ jsx18(
          "text",
          {
            x: labelX,
            y: bandY + bandH / 2 + 0.5,
            fontSize: 10,
            fontWeight: 600,
            dominantBaseline: "middle",
            fill: "#fff",
            style: { pointerEvents: "none", userSelect: "none" },
            children: bandLabel(r, title, maxChars)
          }
        ),
        enShown && /* @__PURE__ */ jsx18(
          FollowTag2,
          {
            x: enP.x,
            y: topY,
            pill: enP,
            person,
            conf: r.conf,
            onFollow,
            tapGuard
          }
        ),
        exShown && /* @__PURE__ */ jsx18(
          FollowTag2,
          {
            x: exP.x,
            y: botY,
            pill: exP,
            person,
            conf: r.conf,
            onFollow,
            tapGuard
          }
        )
      ] }, r.key);
    })
  ] });
}

// src/desktop/DesktopTimelineLayer.jsx
import { Fragment as Fragment4, jsx as jsx19, jsxs as jsxs19 } from "react/jsx-runtime";
var WIN2 = "#2e9d51";
var LOSS2 = "#d0423f";
var TIE2 = "#b9bdc4";
var BORDER2 = "#d9d9d9";
var BORDER_W2 = 2;
var TEXTBG2 = "#d0d0d0";
var LABEL_FILL2 = "#1a1a1a";
var PLATE_W2 = 38;
var OFF_PAPER2 = "#fbfbfa";
var OFF_HAIR2 = "#ececec";
var OFF_YEAR2 = "#2e3338";
var CURVE2 = "#4a6fa5";
var RAIL_PAD2 = 10;
var AXIS_H = 18;
var LANE_MAX = 400;
var LANE_MIN = 140;
var MEDALS3 = [
  [/won (sb|super|champ)/i, "#d4af37"],
  // gold — won it all
  [/lost (sb|super)/i, "#b9bec7"],
  // silver — lost the big one
  [/lost conf|lost champ/i, "#8d99ae"],
  // steel — lost conference
  [/lost div/i, "#cd7f32"],
  // bronze — lost divisional
  [/lost wc/i, "#2b2b2b"]
  // black — lost wild card
];
function playoffMedal3(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS3) {
    if (re.test(playoffs)) return color;
  }
  return null;
}
function recordStr2(m) {
  if (!m) return "";
  return m.ties ? `${m.wins}-${m.losses}-${m.ties}` : `${m.wins}-${m.losses}`;
}
function divisionLabel3(s) {
  if (!s) return null;
  const m = /^\s*(\d+)\w*\s+of\s+(\d+)\s*$/.exec(s);
  if (!m) return { text: s, tone: "neutral" };
  const place = +m[1];
  const total = +m[2];
  if (place === 1) return { text: "Won Div", tone: "good" };
  if (place === total) return { text: "Last in Div", tone: "bad" };
  return { text: s, tone: "neutral" };
}
var toneColor2 = (tone) => tone === "good" ? "#3f8f2e" : tone === "bad" ? "#c0492b" : "#8a857c";
var GameCol = memo3(function GameCol2({ g, x, gw, laneTop, laneBottom }) {
  const colW = Math.max(3, gw - 2);
  const labels = gw >= 12;
  const laneH = Math.max(1, laneBottom - laneTop);
  const pf = g.points_for ?? 0;
  const pa = g.points_against ?? 0;
  const total = pf + pa || 1;
  const splitY = laneBottom - laneH * (pf / total);
  const isWin = g.result === "W";
  const isTie = g.result === "T";
  const tip = isWin ? Math.min(colW, Math.max(0, splitY - laneTop)) : Math.min(colW, Math.max(0, laneBottom - splitY));
  const tipY = isWin ? splitY - tip : splitY + tip;
  const left = x - colW / 2;
  const right = left + colW;
  const cx = left + colW / 2;
  const arrow = `${left},${laneBottom} ${left},${splitY} ${cx},${tipY} ${right},${splitY} ${right},${laneBottom}`;
  const bw = BORDER_W2;
  const greyArrow = `${left},${laneBottom - bw} ${left},${splitY - bw} ${cx},${tipY - bw} ${right},${splitY - bw} ${right},${laneBottom - bw}`;
  const bgH = Math.min(colW - 3, 14);
  return /* @__PURE__ */ jsxs19("g", { children: [
    /* @__PURE__ */ jsx19("rect", { x: left, y: laneTop, width: colW, height: laneH, fill: isTie ? TIE2 : LOSS2, children: /* @__PURE__ */ jsx19("title", { children: `${g.franchise_id} ${pf}\u2013${pa} ${g.opponent_id}${isTie ? " (T)" : isWin ? " (W)" : " (L)"}` }) }),
    !isTie && /* @__PURE__ */ jsxs19("g", { style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsx19("polygon", { points: greyArrow, fill: BORDER2 }),
      /* @__PURE__ */ jsx19("rect", { x: left, y: laneBottom - bw, width: colW, height: bw, fill: BORDER2 }),
      /* @__PURE__ */ jsx19("polygon", { points: arrow, fill: WIN2 })
    ] }),
    labels && /* @__PURE__ */ jsxs19("g", { style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsxs19("g", { transform: `translate(${cx}, ${laneBottom - 4}) rotate(-90)`, children: [
        /* @__PURE__ */ jsx19("rect", { x: 0, y: -bgH / 2, width: PLATE_W2, height: bgH, rx: 2, fill: TEXTBG2 }),
        /* @__PURE__ */ jsx19("text", { x: 3, y: 0.5, fontSize: 9, dominantBaseline: "central", fill: LABEL_FILL2, children: `${g.franchise_id} ${pf}` })
      ] }),
      /* @__PURE__ */ jsxs19("g", { transform: `translate(${cx}, ${laneTop + 4}) rotate(-90)`, children: [
        /* @__PURE__ */ jsx19("rect", { x: -PLATE_W2, y: -bgH / 2, width: PLATE_W2, height: bgH, rx: 2, fill: TEXTBG2 }),
        /* @__PURE__ */ jsx19("text", { x: -3, y: 0.5, fontSize: 9, textAnchor: "end", dominantBaseline: "central", fill: LABEL_FILL2, children: `${pa} ${g.opponent_id}` })
      ] })
    ] })
  ] });
});
var PostseasonSection3 = memo3(function PostseasonSection4({ post, laneTop, laneBottom }) {
  if (!post) return null;
  const medal = playoffMedal3(post.result);
  const laneH = Math.max(1, laneBottom - laneTop);
  if (post.kind === "result") {
    const { x0: x02, width: w, result: result2 } = post;
    return /* @__PURE__ */ jsxs19("g", { style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsx19(
        "rect",
        {
          x: x02,
          y: laneTop,
          width: w,
          height: laneH,
          rx: 3,
          fill: "#fafafa",
          stroke: medal || "#dcdcdc",
          strokeWidth: medal ? 1.75 : 1
        }
      ),
      /* @__PURE__ */ jsxs19("g", { transform: `translate(${x02 + w / 2 + 0.5}, ${laneBottom - 8}) rotate(-90)`, children: [
        /* @__PURE__ */ jsx19(
          "text",
          {
            x: 0,
            y: 0,
            dominantBaseline: "central",
            fontSize: 9,
            fontWeight: 700,
            fill: "#9a9a9a",
            style: { letterSpacing: 1.5 },
            children: "POSTSEASON"
          }
        ),
        /* @__PURE__ */ jsx19(
          "text",
          {
            x: laneH - 16,
            y: 0,
            dominantBaseline: "central",
            textAnchor: "end",
            fontSize: 11,
            fontWeight: 700,
            fill: medal ? "#2b2b2b" : "#777",
            children: result2 || "\u2014"
          }
        )
      ] })
    ] });
  }
  const { x0, headerW, colW, result, games } = post;
  return /* @__PURE__ */ jsxs19("g", { children: [
    /* @__PURE__ */ jsx19(
      "g",
      {
        transform: `translate(${x0 + headerW - 5}, ${laneBottom}) rotate(-90)`,
        style: { pointerEvents: "none" },
        children: /* @__PURE__ */ jsxs19("text", { x: 0, y: 0, fontSize: 9, fontWeight: 700, fill: "#9a9a9a", style: { letterSpacing: 1.5 }, children: [
          "POSTSEASON",
          result ? ` \xB7 ${result}` : ""
        ] })
      }
    ),
    /* @__PURE__ */ jsx19(
      "line",
      {
        x1: x0 + headerW - 1,
        x2: x0 + headerW - 1,
        y1: laneTop,
        y2: laneBottom,
        stroke: medal || "#e0e0e0",
        strokeWidth: medal ? 2 : 1
      }
    ),
    games.map(({ g, i, x }) => /* @__PURE__ */ jsx19(
      GameCol,
      {
        g,
        x,
        gw: colW,
        laneTop,
        laneBottom
      },
      g.game_id || `p-${i}`
    ))
  ] });
});
var SeasonBlock3 = memo3(function SeasonBlock4({ block, laneTop, laneBottom, meta, showPlayoffs = true }) {
  const raw = block.season?.season || {};
  if (block.mode === "cols") {
    const gw = block.gameColWidth;
    return /* @__PURE__ */ jsxs19("g", { children: [
      block.games.map(({ g, i, x }) => /* @__PURE__ */ jsx19(
        GameCol,
        {
          g,
          x,
          gw,
          laneTop,
          laneBottom
        },
        g.game_id || `${block.year}-${i}`
      )),
      /* @__PURE__ */ jsx19(PostseasonSection3, { post: block.postseason, laneTop, laneBottom })
    ] });
  }
  const laneH = Math.max(1, laneBottom - laneTop);
  const wins = raw.wins ?? 0;
  const losses = raw.losses ?? 0;
  const diff = wins - losses;
  const unit = laneH / 2 / 16;
  const midY = laneTop + laneH / 2;
  const cx = block.x0 + block.width / 2;
  const barH = Math.min(laneH / 2, Math.abs(diff) * unit);
  const y0 = diff >= 0 ? midY - barH : midY;
  const color = diff >= 0 ? WIN2 : LOSS2;
  const medal = showPlayoffs ? playoffMedal3(raw.playoffs) : null;
  const frameW = Math.max(4, Math.min(block.width - 1, 12));
  const barW = Math.min(6, Math.max(2, block.width - 2));
  const tip = `${block.year} \xB7 ${recordStr2(meta || raw)}${showPlayoffs && raw.playoffs ? ` \xB7 ${raw.playoffs}` : ""}`;
  return /* @__PURE__ */ jsxs19("g", { children: [
    /* @__PURE__ */ jsx19("rect", { x: block.x0, y: laneTop, width: block.width, height: laneH, fill: "transparent", children: /* @__PURE__ */ jsx19("title", { children: tip }) }),
    medal && /* @__PURE__ */ jsx19(
      "rect",
      {
        x: cx - frameW / 2,
        y: laneTop,
        width: frameW,
        height: laneH,
        fill: "none",
        stroke: medal,
        strokeWidth: 1.5,
        rx: 2,
        style: { pointerEvents: "none" }
      }
    ),
    /* @__PURE__ */ jsx19("rect", { x: cx - barW / 2, y: y0, width: barW, height: Math.max(0, barH), fill: color, rx: 1, style: { pointerEvents: "none" } })
  ] });
});
var OffseasonBlock3 = memo3(function OffseasonBlock4({
  block,
  laneTop,
  laneBottom,
  paperTop,
  paperBottom,
  offMode,
  detailBand,
  moduleData,
  meta,
  showWinRate = true,
  showPlayoffs = true
}) {
  const showBanner = offMode !== "hidden";
  if ((!block.modules || !block.modules.length) && !showBanner) return null;
  const headerW = block.headerWidth || 0;
  const laneH = Math.max(1, laneBottom - laneTop);
  const big = offMode === "full";
  const yearSize = big ? 24 : 19;
  const yearY = laneTop + (big ? 24 : 20);
  const lines = [];
  if (meta) {
    lines.push({ text: recordStr2(meta), color: "#4a4640", weight: 700 });
    if (showPlayoffs && meta.playoffs) {
      const medal = playoffMedal3(meta.playoffs);
      lines.push({ text: meta.playoffs, color: medal || "#8a857c", weight: 700 });
    }
    const df = divisionLabel3(meta.divisionFinish);
    if (df) lines.push({ text: df.text, color: toneColor2(df.tone), weight: 600 });
    if (meta.pointDiff != null) {
      const pd = meta.pointDiff;
      lines.push({
        text: pd > 0 ? `+${pd}` : `${pd}`,
        color: pd > 0 ? "#3f8f2e" : pd < 0 ? "#c0492b" : "#8a857c",
        weight: 700
      });
    }
  }
  let win = null;
  if (showWinRate && showBanner && detailBand !== "GAME_DETAIL" && meta && meta.enterPct != null) {
    const fs = big ? 11 : 10;
    const pct = Math.round(meta.enterPct * 100);
    const caretW = fs * 0.62;
    const gap = 4;
    const mk = (label) => {
      const textW = Math.round(label.length * fs * 0.52);
      return { label, w: caretW + gap + textW + 16 };
    };
    let p = mk(`${pct}% (${meta.enterWins}/${meta.enterLosses})`);
    if (p.w > block.width - 4) p = mk(`${pct}%`);
    if (p.w <= block.width - 4) {
      const ph = 18;
      const curveY = laneBottom - meta.enterPct * laneH;
      const cy = Math.max(laneTop + ph, Math.min(laneBottom - ph, curveY));
      const cx = Math.max(
        block.x0 + p.w / 2 + 2,
        Math.min(block.x1 - p.w / 2 - 2, block.x0 + block.width / 2)
      );
      const dir = meta.prevPct == null ? 0 : meta.enterPct > meta.prevPct ? 1 : meta.enterPct < meta.prevPct ? -1 : 0;
      win = { fs, label: p.label, w: p.w, ph, cx, cy, caretW, gap, dir };
    }
  }
  return /* @__PURE__ */ jsxs19("g", { children: [
    showBanner && /* @__PURE__ */ jsxs19("g", { style: { pointerEvents: "none" }, children: [
      /* @__PURE__ */ jsx19("rect", { x: block.x0, y: paperTop, width: block.width, height: paperBottom - paperTop, fill: OFF_PAPER2 }),
      headerW > 0 && /* @__PURE__ */ jsxs19("g", { children: [
        /* @__PURE__ */ jsx19(
          "text",
          {
            x: block.x0 + 6,
            y: yearY,
            fontSize: yearSize,
            fontWeight: 600,
            fill: OFF_YEAR2,
            style: { letterSpacing: -0.4 },
            children: block.year
          }
        ),
        lines.map((l, i) => /* @__PURE__ */ jsx19(
          "text",
          {
            x: block.x0 + 7,
            y: yearY + 17 + i * 13,
            fontSize: 10,
            fontWeight: l.weight,
            fill: l.color,
            style: { letterSpacing: 0.2 },
            children: l.text
          },
          i
        )),
        win && (() => {
          const innerLeft = win.cx - win.w / 2 + 8;
          const caretLeft = innerLeft;
          const textX = innerLeft + win.caretW + win.gap;
          const ch = win.caretW * 0.92;
          const up = `${caretLeft},${win.cy + ch / 2} ${caretLeft + win.caretW},${win.cy + ch / 2} ${caretLeft + win.caretW / 2},${win.cy - ch / 2}`;
          const down = `${caretLeft},${win.cy - ch / 2} ${caretLeft + win.caretW},${win.cy - ch / 2} ${caretLeft + win.caretW / 2},${win.cy + ch / 2}`;
          return /* @__PURE__ */ jsxs19("g", { children: [
            /* @__PURE__ */ jsx19(
              "rect",
              {
                x: win.cx - win.w / 2,
                y: win.cy - win.ph / 2,
                width: win.w,
                height: win.ph,
                rx: win.ph / 2,
                fill: CURVE2
              }
            ),
            win.dir !== 0 && /* @__PURE__ */ jsx19(
              "polygon",
              {
                points: win.dir > 0 ? up : down,
                fill: win.dir > 0 ? "#4ade80" : "#ff6b6b",
                stroke: "#ffffff",
                strokeWidth: 0.75,
                strokeLinejoin: "round"
              }
            ),
            /* @__PURE__ */ jsx19(
              "text",
              {
                x: win.dir !== 0 ? textX : win.cx,
                y: win.cy,
                fontSize: win.fs,
                fontWeight: 600,
                textAnchor: win.dir !== 0 ? "start" : "middle",
                dominantBaseline: "central",
                fill: "#ffffff",
                children: win.label
              }
            )
          ] });
        })(),
        /* @__PURE__ */ jsx19(
          "line",
          {
            x1: block.x0 + headerW - 0.5,
            x2: block.x0 + headerW - 0.5,
            y1: laneTop,
            y2: laneBottom,
            stroke: OFF_HAIR2,
            strokeWidth: 1
          }
        )
      ] })
    ] }),
    block.modules.map((box) => /* @__PURE__ */ jsx19("g", { children: box.module.render({
      year: block.year,
      x: box.x,
      width: box.width,
      y: laneTop,
      height: laneH,
      mode: offMode,
      detailBand,
      data: moduleData
    }) }, `${block.year}-${box.id}`))
  ] });
});
var DesktopTimelineLayer = memo3(function DesktopTimelineLayer2({
  layout,
  scrollX = 0,
  width,
  height,
  band,
  moduleData = {},
  staff = [],
  pre1967 = null,
  adminById,
  onSelectStaff,
  tapGuard,
  onFollow,
  showWinRate = true,
  showPlayoffs = true
}) {
  const ribbonLayout = useMemo8(
    () => buildDesktopRibbons({ staff, layout }),
    [staff, layout]
  );
  const pillPlan = useMemo8(
    () => buildPillPlan(ribbonLayout.ribbons),
    [ribbonLayout]
  );
  const offMode = desktopGeometryFor(band).offseason;
  const railH = ribbonLayout.railHeight;
  const topZone = pillPlan.entryRows ? pillPlan.entryRows * PILL_ROW_H + 6 : 10;
  const axisH = offMode === "hidden" ? AXIS_H : 0;
  const railBlock = railH ? RAIL_PAD2 + railH : 0;
  const botZone = railH ? PEEK2 + (pillPlan.exitRows ? pillPlan.exitRows * PILL_ROW_H + 6 : 8) : 8;
  const fixedH = topZone + axisH + railBlock + botZone;
  const laneH = Math.max(LANE_MIN, Math.min(LANE_MAX, height - 16 - fixedH));
  const assemblyH = fixedH + laneH;
  const assemblyTop = Math.max(8, (height - assemblyH) * 0.45);
  const assemblyBottom = assemblyTop + assemblyH;
  const laneTop = assemblyTop + topZone;
  const laneBottom = laneTop + laneH;
  const railTop = laneBottom + axisH + (railH ? RAIL_PAD2 : 0);
  const railBottom = railTop + railH;
  const entryPillY = (row) => laneTop - 10 - PILL_H / 2 - row * PILL_ROW_H;
  const exitPillY = (row) => railBottom + PEEK2 + 4 + PILL_H / 2 + row * PILL_ROW_H;
  const winCurve = useMemo8(() => {
    if (!layout?.blocks?.length) return null;
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    const pts = [];
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const reg = b.games || [];
      const post = b.postseason?.games || [];
      const seq = post.length ? [...reg, ...post] : reg;
      const m = seq.length || 1;
      seq.forEach(({ g }, idx) => {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
        const x = b.mode === "cols" ? seq[idx].x : b.x0 + (idx + 0.5) / m * b.width;
        pts.push([x, (w + t / 2) / n]);
      });
    }
    return pts.length ? pts : null;
  }, [layout, pre1967]);
  const seasonMeta = useMemo8(() => {
    const map = /* @__PURE__ */ new Map();
    if (!layout?.blocks?.length) return map;
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    let prevPct = null;
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const raw = b.season?.season || {};
      const enterPct = n > 0 ? (w + t / 2) / n : null;
      map.set(b.year, {
        enterPct,
        enterWins: w,
        enterLosses: n - w - t,
        prevPct,
        wins: raw.wins ?? 0,
        losses: raw.losses ?? 0,
        ties: raw.ties ?? 0,
        playoffs: raw.playoffs || null,
        pointDiff: raw.point_diff ?? null,
        divisionFinish: raw.division_finish || null
      });
      prevPct = enterPct;
      const post = b.postseason?.games || [];
      const seq = post.length ? [...b.games || [], ...post] : b.games || [];
      for (const { g } of seq) {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
      }
    }
    return map;
  }, [layout, pre1967]);
  const visible = useMemo8(() => {
    if (!layout?.blocks) return [];
    const l = scrollX - 60;
    const r = scrollX + width + 60;
    return layout.blocks.filter((b) => b.x1 > l && b.x0 < r);
  }, [layout, scrollX, width]);
  const winCurvePoints = useMemo8(() => {
    if (!winCurve) return null;
    return winCurve.map(([x, r]) => `${x.toFixed(1)},${(laneBottom - r * laneH).toFixed(1)}`).join(" ");
  }, [winCurve, laneBottom, laneH]);
  if (!layout || !width || !height) return null;
  const axisStep = band === "FRANCHISE_OVERVIEW" ? 10 : 5;
  return /* @__PURE__ */ jsxs19(Fragment4, { children: [
    /* @__PURE__ */ jsx19("defs", { children: /* @__PURE__ */ jsxs19("linearGradient", { id: "offPaperShadowH", x1: "0", y1: "0", x2: "1", y2: "0", children: [
      /* @__PURE__ */ jsx19("stop", { offset: "0%", stopColor: "#3a2f1a", stopOpacity: "0.18" }),
      /* @__PURE__ */ jsx19("stop", { offset: "100%", stopColor: "#3a2f1a", stopOpacity: "0" })
    ] }) }),
    /* @__PURE__ */ jsxs19("g", { transform: `translate(${-scrollX}, 0)`, children: [
      showWinRate && winCurve && band !== "GAME_DETAIL" && /* @__PURE__ */ jsxs19("g", { style: { pointerEvents: "none" }, children: [
        /* @__PURE__ */ jsx19(
          "line",
          {
            x1: 0,
            x2: layout.totalWidth,
            y1: laneTop + laneH / 2,
            y2: laneTop + laneH / 2,
            stroke: "#d8dde6",
            strokeWidth: 1,
            strokeDasharray: "2 6"
          }
        ),
        /* @__PURE__ */ jsx19(
          "polyline",
          {
            fill: "none",
            stroke: CURVE2,
            strokeWidth: 1.5,
            strokeOpacity: 0.7,
            points: winCurvePoints
          }
        )
      ] }),
      visible.map(
        (b) => b.type === "season" ? /* @__PURE__ */ jsx19(
          SeasonBlock3,
          {
            block: b,
            laneTop,
            laneBottom,
            meta: seasonMeta.get(b.year),
            showPlayoffs
          },
          `s-${b.year}`
        ) : /* @__PURE__ */ jsx19(
          OffseasonBlock3,
          {
            block: b,
            laneTop,
            laneBottom,
            paperTop: assemblyTop,
            paperBottom: assemblyBottom,
            offMode,
            detailBand: band,
            moduleData,
            meta: seasonMeta.get(b.year),
            showWinRate,
            showPlayoffs
          },
          `o-${b.year}`
        )
      ),
      offMode !== "hidden" && visible.filter((b) => b.type === "offseason").map((b) => /* @__PURE__ */ jsx19(
        "rect",
        {
          x: b.x1,
          y: assemblyTop,
          width: 6,
          height: assemblyH,
          fill: "url(#offPaperShadowH)",
          style: { pointerEvents: "none" }
        },
        `osh-${b.year}`
      )),
      offMode === "hidden" && visible.filter((b) => b.type === "season" && b.year % axisStep === 0).map((b) => /* @__PURE__ */ jsx19(
        "text",
        {
          x: b.x0 + b.width / 2,
          y: laneBottom + 13,
          fontSize: 10,
          textAnchor: "middle",
          fill: "#555",
          style: { pointerEvents: "none" },
          children: b.year
        },
        `y-${b.year}`
      )),
      /* @__PURE__ */ jsx19(
        DesktopRibbonLayer,
        {
          ribbons: ribbonLayout.ribbons,
          pillPlan,
          width,
          scrollX,
          laneTop,
          railTop,
          slotCount: ribbonLayout.slotCount,
          bandH: ribbonLayout.bandH,
          entryPillY,
          exitPillY,
          adminById,
          onSelect: onSelectStaff,
          onFollow,
          tapGuard
        }
      )
    ] })
  ] });
});
var DesktopTimelineLayer_default = DesktopTimelineLayer;

// src/desktop/DesktopZoomHud.jsx
import { useEffect as useEffect14, useRef as useRef8 } from "react";
import { jsx as jsx20, jsxs as jsxs20 } from "react/jsx-runtime";
function LevelBars2({ zoom }) {
  const levels = Array.from({ length: ZOOM_LEVELS }, (_, i) => ZOOM_LEVELS - i);
  return /* @__PURE__ */ jsx20(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2.5,
        marginBottom: 2
      },
      children: levels.map((level) => /* @__PURE__ */ jsx20(
        "span",
        {
          style: {
            width: 5 + (ZOOM_LEVELS + 1 - level) * 3.5,
            height: 3,
            borderRadius: 2,
            background: level === zoom ? "#fff" : "rgba(255,255,255,0.32)"
          }
        },
        level
      ))
    }
  );
}
function DesktopZoomHud({ band }) {
  const { zoom, name } = zoomLabelFor(band);
  const firstRef = useRef8(true);
  useEffect14(() => {
    firstRef.current = false;
  }, []);
  if (firstRef.current) return null;
  return /* @__PURE__ */ jsx20(
    "div",
    {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 5
      },
      children: /* @__PURE__ */ jsxs20(
        "div",
        {
          className: "zoom-hud",
          style: {
            width: "100%",
            height: 74,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 11,
            paddingBottom: 13,
            boxSizing: "border-box",
            background: "linear-gradient(to top, rgba(16,19,26,0.82) 0%, rgba(16,19,26,0.5) 42%, rgba(16,19,26,0) 100%)"
          },
          children: [
            /* @__PURE__ */ jsx20(LevelBars2, { zoom }),
            /* @__PURE__ */ jsx20(
              "span",
              {
                style: {
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  color: "#fff",
                  textShadow: "0 1px 3px rgba(0,0,0,0.45)",
                  whiteSpace: "nowrap"
                },
                children: name
              }
            )
          ]
        },
        band
      )
    }
  );
}

// src/desktop/useDesktopViewport.js
import {
  useCallback as useCallback6,
  useEffect as useEffect15,
  useLayoutEffect as useLayoutEffect3,
  useMemo as useMemo9,
  useRef as useRef9,
  useState as useState13
} from "react";

// src/desktop/buildDesktopLayout.js
var OFF_FRAC2 = 0.4;
var SEA_FRAC2 = 0.6;
var OFF_HEADER_W_FULL = 58;
var OFF_HEADER_W_COMPACT = 46;
var POST_HEADER_W = 14;
var POST_RESULT_W = 22;
function buildDesktopLayout({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  detailBand = DEFAULT_BAND,
  left = 0,
  seasonPadding = 6,
  offseasonPadding = 6,
  minOffseasonWidth = 6,
  // Lower floor than mobile's 14px tap-target minimum: desktop pointers are
  // precise, and clamping would squeeze ERA_SUMMARY (12) and
  // FRANCHISE_OVERVIEW (5) toward identical widths — leaving the two coarse
  // bands indistinguishable and their total widths too close for the zoom's
  // log-space hysteresis to ever walk between them.
  minSeasonWidth = 5,
  showPlayoffs = true
}) {
  const geom = desktopGeometryFor(detailBand);
  const sorted = [...seasons || []].sort((a, b) => a.year - b.year);
  const showModules = geom.offseason !== "hidden";
  const activeModules = showModules ? modules.filter((m) => bandAtLeast(detailBand, m.minBand)) : [];
  const blocks = [];
  const byYear = /* @__PURE__ */ new Map();
  let x = left;
  for (const s of sorted) {
    const year = s.year;
    const games = s.games || [];
    const offX0 = x;
    const reserve = Math.max(0, reserveByYear[year] || 0);
    const headerW = geom.offseason === "hidden" ? 0 : geom.offseason === "full" ? OFF_HEADER_W_FULL : OFF_HEADER_W_COMPACT;
    const ribbonLeft = offX0 + headerW;
    const bodyLeft = ribbonLeft + reserve;
    const moduleBoxes = [];
    let cursor = bodyLeft + offseasonPadding;
    for (const m of activeModules) {
      const w = Math.max(
        0,
        m.measure({ year, detailBand, mode: geom.offseason, data: moduleData }) || 0
      );
      if (w <= 0) continue;
      moduleBoxes.push({ id: m.id, module: m, x: cursor, width: w });
      cursor += w + offseasonPadding;
    }
    const minOff = reserve + headerW + (headerW ? 0 : minOffseasonWidth);
    const offWidth = moduleBoxes.length ? Math.max(minOff, cursor - offX0) : minOff;
    const offX1 = offX0 + offWidth;
    const offBlock = {
      type: "offseason",
      year,
      x0: offX0,
      x1: offX1,
      width: offWidth,
      reserve,
      headerWidth: headerW,
      ribbonLeft,
      tStart: year - OFF_FRAC2,
      tEnd: year,
      modules: moduleBoxes
    };
    blocks.push(offBlock);
    x = offX1;
    const seaX0 = x;
    const playoffsResult = showPlayoffs ? s.season?.playoffs || null : null;
    let seaWidth;
    let gamePositions;
    let postseason = null;
    if (geom.season.mode === "cols") {
      const gw = geom.season.gameColWidth;
      const reg = games.filter((g) => !g.is_playoff);
      const post = showPlayoffs ? games.filter((g) => g.is_playoff) : [];
      const regLeft = seaX0 + seasonPadding / 2;
      gamePositions = reg.map((g, i) => ({ g, i, x: regLeft + (i + 0.5) * gw }));
      let cursorX = regLeft + reg.length * gw;
      const isDetail = detailBand === "GAME_DETAIL";
      if (isDetail && post.length) {
        const headerX = cursorX + seasonPadding;
        const colsLeft = headerX + POST_HEADER_W;
        postseason = {
          kind: "cols",
          x0: headerX,
          headerW: POST_HEADER_W,
          colW: gw,
          result: playoffsResult,
          games: post.map((g, i) => ({ g, i, x: colsLeft + (i + 0.5) * gw }))
        };
        cursorX = colsLeft + post.length * gw;
      } else if (!isDetail && (post.length || playoffsResult)) {
        const stripX = cursorX + seasonPadding;
        postseason = { kind: "result", x0: stripX, width: POST_RESULT_W, result: playoffsResult };
        cursorX = stripX + POST_RESULT_W;
      }
      seaWidth = Math.max(minSeasonWidth, cursorX + seasonPadding / 2 - seaX0);
    } else {
      seaWidth = Math.max(minSeasonWidth, geom.season.width);
      const lineX = seaX0 + seaWidth / 2;
      gamePositions = games.map((g, i) => ({ g, i, x: lineX }));
    }
    const seaX1 = seaX0 + seaWidth;
    const seaBlock = {
      type: "season",
      year,
      x0: seaX0,
      x1: seaX1,
      width: seaWidth,
      postseason,
      tStart: year,
      tEnd: year + SEA_FRAC2,
      mode: geom.season.mode,
      gameColWidth: geom.season.mode === "cols" ? geom.season.gameColWidth : null,
      games: gamePositions,
      season: s
    };
    blocks.push(seaBlock);
    x = seaX1;
    byYear.set(year, { offseason: offBlock, season: seaBlock });
  }
  const totalWidth = x - left;
  const firstYear = sorted.length ? sorted[0].year : null;
  const lastYear = sorted.length ? sorted[sorted.length - 1].year : null;
  function tToX(t) {
    if (!blocks.length) return left;
    if (t <= blocks[0].tStart) return blocks[0].x0;
    const lastB = blocks[blocks.length - 1];
    if (t >= lastB.tEnd) return lastB.x1;
    for (const b of blocks) {
      if (t >= b.tStart && t <= b.tEnd) {
        const span = b.tEnd - b.tStart || 1;
        return b.x0 + (t - b.tStart) / span * b.width;
      }
    }
    return left;
  }
  function xToYear(xPix) {
    if (!blocks.length) return null;
    if (xPix <= blocks[0].x0) return blocks[0].tStart;
    const lastB = blocks[blocks.length - 1];
    if (xPix >= lastB.x1) return lastB.tEnd;
    for (const b of blocks) {
      if (xPix >= b.x0 && xPix <= b.x1) {
        const w = b.width || 1;
        return b.tStart + (xPix - b.x0) / w * (b.tEnd - b.tStart);
      }
    }
    return null;
  }
  const yearToX = (year) => tToX(year);
  return {
    blocks,
    byYear,
    totalWidth,
    left,
    detailBand,
    firstYear,
    lastYear,
    yearsSpan: firstYear != null ? lastYear - firstYear + 1 : 0,
    tToX,
    xToYear,
    yearToX
  };
}

// src/desktop/useDesktopViewport.js
var N2 = DETAIL_BANDS.length;
var TAP_SLOP2 = 5;
var AXIS_BIAS2 = 1.4;
var WHEEL_STEP2 = 90;
var ANIM_DONE_PX2 = 0.5;
var ANIM_TAU2 = 55;
function useDesktopViewport({
  seasons,
  modules = [],
  moduleData = {},
  reserveByYear = {},
  width = 0,
  initialBandIndex = 2,
  // SEASON_LINES
  focusYear = null,
  onFocusConsumed = null,
  showPlayoffs = true
}) {
  const [bandIndex, setBandIndex] = useState13(initialBandIndex);
  const [scrollXState, setScrollX] = useState13(0);
  const [visualScale, setVisualScale] = useState13(1);
  const [scaleAnchorX, setScaleAnchorX] = useState13(0);
  const scrollRef = useRef9(null);
  const layouts = useMemo9(
    () => DETAIL_BANDS.map(
      (band) => buildDesktopLayout({
        seasons,
        modules,
        moduleData,
        reserveByYear,
        detailBand: band,
        left: 0,
        showPlayoffs
      })
    ),
    [seasons, modules, moduleData, reserveByYear, showPlayoffs]
  );
  const bandWidths = useMemo9(
    () => layouts.map((l) => Math.max(1, l.totalWidth)),
    [layouts]
  );
  const layout = layouts[clamp(bandIndex, 0, N2 - 1)];
  const maxScroll = Math.max(0, layout.totalWidth - width);
  const scrollX = clamp(scrollXState, 0, maxScroll);
  const bandIndexRef = useRef9(bandIndex);
  bandIndexRef.current = bandIndex;
  const scrollXRef = useRef9(scrollX);
  scrollXRef.current = scrollX;
  const layoutsRef = useRef9(layouts);
  layoutsRef.current = layouts;
  const widthRef = useRef9(width);
  widthRef.current = width;
  const bandWidthsRef = useRef9(bandWidths);
  bandWidthsRef.current = bandWidths;
  const anchorXRef = useRef9(0);
  const gestureWRef = useRef9(bandWidths[initialBandIndex]);
  const zoomTargetRef = useRef9(bandWidths[initialBandIndex]);
  const rafRef = useRef9(0);
  const lastTRef = useRef9(0);
  const targetBandRef = useRef9(initialBandIndex);
  const wheelAccumRef = useRef9(0);
  const pinchActiveRef = useRef9(false);
  const d0Ref = useRef9(1);
  const pinchStartWRef = useRef9(bandWidths[initialBandIndex]);
  const scrollRafRef = useRef9(0);
  const setScrollLeft = useCallback6((x) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, x);
    const nx = el.scrollLeft;
    scrollXRef.current = nx;
    setScrollX(nx);
  }, []);
  const onScroll = useCallback6(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const x = el.scrollLeft;
      scrollXRef.current = x;
      setScrollX(x);
    });
  }, []);
  const anchorRef = useRef9(null);
  useLayoutEffect3(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    const targetContentX = layout.tToX(a.focusT);
    setScrollLeft(targetContentX - a.cursorX);
  }, [layout, setScrollLeft]);
  useLayoutEffect3(() => {
    if (focusYear == null) return;
    if (!layout?.blocks?.length || !width) return;
    setScrollLeft(layout.yearToX(focusYear) - width * 0.25);
    if (onFocusConsumed) onFocusConsumed();
  }, [focusYear, layout, width, onFocusConsumed, setScrollLeft]);
  const commitBand = useCallback6((nb) => {
    const old = layoutsRef.current[bandIndexRef.current];
    const focusT = old.xToYear(scrollXRef.current + anchorXRef.current);
    anchorRef.current = { focusT, cursorX: anchorXRef.current };
    bandIndexRef.current = nb;
    setBandIndex(nb);
  }, []);
  const applyGestureW = useCallback6(
    (w) => {
      const widths = bandWidthsRef.current;
      const cw = clamp(w, widths[N2 - 1], widths[0]);
      gestureWRef.current = cw;
      const nb = pickBand(cw, bandIndexRef.current, widths);
      if (nb !== bandIndexRef.current) commitBand(nb);
      setVisualScale(visualScaleFor(cw, widths[bandIndexRef.current]));
    },
    [commitBand]
  );
  const tick = useCallback6(
    (now) => {
      const dt = lastTRef.current ? now - lastTRef.current : 16;
      lastTRef.current = now;
      const target = zoomTargetRef.current;
      let w = expSmooth(gestureWRef.current, target, dt, ANIM_TAU2);
      const done = Math.abs(target - w) < ANIM_DONE_PX2;
      if (done) w = target;
      applyGestureW(w);
      if (done) {
        rafRef.current = 0;
        lastTRef.current = 0;
        setVisualScale(visualScaleFor(target, bandWidthsRef.current[bandIndexRef.current]));
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [applyGestureW]
  );
  const startAnim = useCallback6(
    (target, anchorX) => {
      zoomTargetRef.current = clamp(
        target,
        bandWidthsRef.current[N2 - 1] * 0.6,
        bandWidthsRef.current[0] * 1.6
      );
      anchorXRef.current = anchorX;
      setScaleAnchorX(anchorX);
      if (!rafRef.current) {
        lastTRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [tick]
  );
  const startAnimRef = useRef9(startAnim);
  startAnimRef.current = startAnim;
  const applyGestureWRef = useRef9(applyGestureW);
  applyGestureWRef.current = applyGestureW;
  useEffect15(() => {
    if (!rafRef.current && !pinchActiveRef.current) {
      gestureWRef.current = bandWidths[bandIndexRef.current];
      zoomTargetRef.current = gestureWRef.current;
    }
  }, [bandWidths]);
  useEffect15(() => {
    const el = scrollRef.current;
    if (!el) return;
    const leftOf = () => el.getBoundingClientRect().left;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const cursorX = e.clientX - leftOf();
        if (!rafRef.current) {
          targetBandRef.current = bandIndexRef.current;
          wheelAccumRef.current = 0;
        }
        wheelAccumRef.current += e.deltaY;
        const steps = Math.trunc(wheelAccumRef.current / WHEEL_STEP2);
        if (steps !== 0) {
          wheelAccumRef.current -= steps * WHEEL_STEP2;
          targetBandRef.current = clamp(targetBandRef.current + steps, 0, N2 - 1);
        }
        startAnimRef.current(bandWidthsRef.current[targetBandRef.current], cursorX);
        return;
      }
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (d !== 0) {
        e.preventDefault();
        el.scrollLeft += d;
      }
    };
    const dist2 = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        lastTRef.current = 0;
      }
      pinchActiveRef.current = true;
      d0Ref.current = Math.max(1, dist2(e.touches));
      pinchStartWRef.current = gestureWRef.current;
      const anchorX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - leftOf();
      anchorXRef.current = anchorX;
      setScaleAnchorX(anchorX);
    };
    const onTouchMove = (e) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      if (!pinchActiveRef.current) return;
      const d = Math.max(1, dist2(e.touches));
      applyGestureWRef.current(pinchStartWRef.current * (d / d0Ref.current));
    };
    const onTouchEnd = (e) => {
      if (!pinchActiveRef.current) return;
      if (e.touches.length >= 2) return;
      pinchActiveRef.current = false;
      startAnimRef.current(bandWidthsRef.current[bandIndexRef.current], anchorXRef.current);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);
  useEffect15(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    },
    []
  );
  const dragXRef = useRef9(null);
  const dragYRef = useRef9(null);
  const pressXRef = useRef9(null);
  const pressYRef = useRef9(null);
  const axisRef = useRef9(null);
  const movedRef = useRef9(false);
  const onPointerDown = useCallback6((e) => {
    if (e.pointerType === "mouse") e.currentTarget.setPointerCapture?.(e.pointerId);
    pressXRef.current = e.clientX;
    pressYRef.current = e.clientY;
    dragXRef.current = e.clientX;
    dragYRef.current = e.clientY;
    axisRef.current = null;
    movedRef.current = false;
  }, []);
  const onPointerMove = useCallback6(
    (e) => {
      if (pinchActiveRef.current) return;
      if (pressXRef.current == null) return;
      if (axisRef.current == null) {
        const tdx = e.clientX - pressXRef.current;
        const tdy = e.clientY - pressYRef.current;
        if (Math.max(Math.abs(tdx), Math.abs(tdy)) > TAP_SLOP2) {
          axisRef.current = Math.abs(tdy) > Math.abs(tdx) * AXIS_BIAS2 ? "v" : "h";
          movedRef.current = true;
        } else {
          dragXRef.current = e.clientX;
          dragYRef.current = e.clientY;
          return;
        }
      }
      if (axisRef.current === "h" && e.pointerType === "mouse") {
        const dx = e.clientX - dragXRef.current;
        dragXRef.current = e.clientX;
        const el = scrollRef.current;
        if (el) el.scrollLeft -= dx;
      }
    },
    []
  );
  const endPointer = useCallback6((e) => {
    if (e.pointerType === "mouse") {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
      }
    }
    axisRef.current = null;
    pressXRef.current = null;
    pressYRef.current = null;
  }, []);
  const didDrag = useCallback6(() => movedRef.current, []);
  const scrollBy = useCallback6(
    (dx) => {
      const el = scrollRef.current;
      if (el) setScrollLeft(el.scrollLeft + dx);
    },
    [setScrollLeft]
  );
  return {
    band: DETAIL_BANDS[bandIndex],
    bandIndex,
    scrollX,
    maxScroll,
    layout,
    totalWidth: layout.totalWidth,
    visualScale,
    scaleAnchorX,
    scrollRef,
    scrollBy,
    didDrag,
    handlers: {
      onScroll,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer
    }
  };
}

// src/desktop/desktopDraftModel.js
var HEADER_ROW_H = 18;
var PICK_ROW_H2 = 16;
var CHIP_COL_W = 18;
var FULL_COL_W = 176;
function measureDraftDesktop({ year, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return 0;
  if (mode === "compact" && !isExpandedYear(data, year)) return CHIP_COL_W;
  return FULL_COL_W;
}

// src/desktop/DesktopDraftModule.jsx
import { jsx as jsx21, jsxs as jsxs21 } from "react/jsx-runtime";
function tierTint2(tier, alpha) {
  const hex = tierColor(tier);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function fmtScore2(v) {
  return v == null ? "\u2014" : Math.round(v);
}
function Header3({ x, width, y, picks, grade, adjusted }) {
  const s = classSummary(picks, adjusted);
  const right = s.scored > 0 ? `${s.count} picks \xB7 ${s.hits} hit${s.hits === 1 ? "" : "s"} \xB7 avg ${fmtScore2(s.avgScore)}` : `${s.count} pick${s.count === 1 ? "" : "s"}`;
  return /* @__PURE__ */ jsxs21("g", { style: { pointerEvents: "none" }, children: [
    /* @__PURE__ */ jsx21("text", { x: x + 4, y: y + HEADER_ROW_H - 5, fontSize: 11, fontWeight: 600, fill: "#333", children: "Draft" }),
    grade && /* @__PURE__ */ jsxs21("g", { children: [
      /* @__PURE__ */ jsx21(
        "rect",
        {
          x: x + 44,
          y: y + 2,
          width: 24,
          height: HEADER_ROW_H - 6,
          rx: 2,
          fill: tierColor(grade.tier)
        }
      ),
      /* @__PURE__ */ jsxs21(
        "text",
        {
          x: x + 56,
          y: y + HEADER_ROW_H / 2,
          fontSize: 9,
          fontWeight: 700,
          textAnchor: "middle",
          dominantBaseline: "middle",
          fill: tierTextColor(grade.tier),
          children: [
            grade.tier,
            grade.provisional ? "*" : ""
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx21(
      "text",
      {
        x: x + width - 4,
        y: y + HEADER_ROW_H - 5,
        fontSize: 10,
        textAnchor: "end",
        fill: "#888",
        children: right
      }
    ),
    /* @__PURE__ */ jsx21(
      "line",
      {
        x1: x + 4,
        x2: x + width - 4,
        y1: y + HEADER_ROW_H - 1,
        y2: y + HEADER_ROW_H - 1,
        stroke: "#e5e5e5",
        strokeWidth: 1
      }
    )
  ] });
}
function PickRow2({ p, x, width, y, onSelect, adjusted }) {
  const labelX = x + 6;
  const nameX = x + 54;
  const right = x + width;
  const chipW = 20;
  const chipX = right - 6 - chipW;
  const scoreBarW = 34;
  const scoreBarX = chipX - 8 - scoreBarW;
  const g = gradeOf(p.value, adjusted);
  const score = g.score;
  const tier = g.tier;
  const star = g.provisional ? "*" : "";
  const color = tierColor(tier);
  const nameMax = Math.max(4, Math.floor((scoreBarX - nameX - 6) / 6));
  const label = `${p.name || "Unknown"}${p.position ? " \xB7 " + p.position : ""}`;
  const midY = y + PICK_ROW_H2 / 2;
  return /* @__PURE__ */ jsxs21("g", { onClick: onSelect, style: onSelect ? { cursor: "pointer" } : void 0, children: [
    /* @__PURE__ */ jsx21("rect", { x, y, width, height: PICK_ROW_H2, fill: "transparent" }),
    /* @__PURE__ */ jsx21("text", { x: labelX, y: midY, dominantBaseline: "middle", fontSize: 10, fill: "#666", children: pickLabel(p) }),
    /* @__PURE__ */ jsx21("text", { x: nameX, y: midY, dominantBaseline: "middle", fontSize: 10, fill: "#111", children: truncate(label, nameMax) }),
    /* @__PURE__ */ jsx21("rect", { x: scoreBarX, y: midY - 3, width: scoreBarW, height: 6, fill: "#eee", rx: 1 }),
    score != null && /* @__PURE__ */ jsx21(
      "rect",
      {
        x: scoreBarX,
        y: midY - 3,
        width: scoreBarW * Math.max(0, Math.min(100, score)) / 100,
        height: 6,
        fill: color,
        rx: 1
      }
    ),
    /* @__PURE__ */ jsx21("rect", { x: chipX, y: midY - 7, width: chipW, height: 14, rx: 2, fill: color }),
    /* @__PURE__ */ jsx21(
      "text",
      {
        x: chipX + chipW / 2,
        y: midY,
        dominantBaseline: "middle",
        textAnchor: "middle",
        fontSize: 9,
        fontWeight: 700,
        fill: tier ? tierTextColor(tier) : "#5a5a5a",
        children: tier ? tier + star : "\u2013"
      }
    )
  ] });
}
function CompactChips2({ picks, x, width, y, height, adjusted }) {
  const n = picks.length;
  if (!n) return null;
  const avail = height - 8;
  const gap = 2;
  const sq = Math.max(4, Math.min(12, avail / n - gap));
  const w = Math.min(width - 4, sq);
  return /* @__PURE__ */ jsx21("g", { transform: `translate(${x + (width - w) / 2}, ${y + 4})`, style: { pointerEvents: "none" }, children: picks.map((p, i) => /* @__PURE__ */ jsx21(
    "rect",
    {
      x: 0,
      y: i * (sq + gap),
      width: w,
      height: sq,
      rx: 1,
      fill: tierColor(gradeOf(p.value, adjusted).tier)
    },
    p.player_id || i
  )) });
}
function renderDraft2({ year, x, width, y, height, mode, data }) {
  const picks = picksForYear(data, year);
  if (!picks.length) return null;
  const expanded = mode !== "compact" || isExpandedYear(data, year);
  const canToggle = mode === "compact" && typeof data.onToggleYear === "function";
  const grade = classGradeFor(data, year);
  const adjusted = !!data.adjusted;
  const guarded = (fn) => (e) => {
    e.stopPropagation();
    if (data.tapGuard && data.tapGuard()) return;
    fn();
  };
  const maxRows = Math.max(1, Math.floor((height - HEADER_ROW_H - 4) / PICK_ROW_H2));
  const clamped = expanded && picks.length > maxRows;
  const shown = clamped ? picks.slice(0, maxRows - 1) : picks;
  const moreY = y + HEADER_ROW_H + shown.length * PICK_ROW_H2;
  return /* @__PURE__ */ jsxs21("g", { children: [
    /* @__PURE__ */ jsx21(
      "rect",
      {
        x,
        y,
        width,
        height,
        fill: grade ? tierTint2(grade.tier, 0.1) : "rgba(120,140,170,0.05)",
        stroke: grade ? tierTint2(grade.tier, 0.4) : "rgba(120,140,170,0.18)",
        strokeWidth: 1,
        onClick: canToggle ? guarded(() => data.onToggleYear(year)) : void 0,
        style: canToggle ? { cursor: "pointer" } : void 0,
        children: !expanded && /* @__PURE__ */ jsx21("title", { children: `${year} draft \u2014 ${picks.length} pick${picks.length === 1 ? "" : "s"}${grade ? ` \xB7 class ${grade.tier}` : ""}` })
      }
    ),
    !expanded ? /* @__PURE__ */ jsx21("g", { className: "draft-reveal", children: /* @__PURE__ */ jsx21(CompactChips2, { picks, x, width, y, height, adjusted }) }, "chips") : /* @__PURE__ */ jsxs21("g", { className: "draft-reveal", children: [
      /* @__PURE__ */ jsx21(Header3, { x, width, y, picks, grade, adjusted }),
      shown.map((p, i) => /* @__PURE__ */ jsx21(
        PickRow2,
        {
          p,
          x,
          width,
          y: y + HEADER_ROW_H + i * PICK_ROW_H2,
          adjusted,
          onSelect: typeof data.onSelectPick === "function" ? guarded(() => data.onSelectPick(p)) : void 0
        },
        p.player_id || `${year}-${i}`
      )),
      clamped && /* @__PURE__ */ jsxs21(
        "text",
        {
          x: x + 6,
          y: moreY + PICK_ROW_H2 / 2,
          dominantBaseline: "middle",
          fontSize: 10,
          fontStyle: "italic",
          fill: "#888",
          style: { pointerEvents: "none" },
          children: [
            "+",
            picks.length - shown.length,
            " more picks"
          ]
        }
      )
    ] }, "rows")
  ] });
}
var DesktopDraftModule = {
  id: "draft",
  label: "Draft",
  minBand: "SEASON_LINES",
  enabledByDefault: true,
  measure: measureDraftDesktop,
  render: renderDraft2
};
var DesktopDraftModule_default = DesktopDraftModule;

// src/desktop/registry.js
var DESKTOP_OFFSEASON_MODULES = [DesktopDraftModule_default];
function getEnabledDesktopModules(settings = {}) {
  return DESKTOP_OFFSEASON_MODULES.filter((m) => {
    const v = settings[m.id];
    return v === void 0 ? m.enabledByDefault : !!v;
  });
}

// src/desktop/DesktopMain.jsx
import { jsx as jsx22, jsxs as jsxs22 } from "react/jsx-runtime";
var DesktopMain = forwardRef2(function DesktopMain2({
  mapped,
  draftSegment,
  settings,
  adminById,
  focusYear,
  onFocusConsumed,
  ribbonConfig = { roles: {}, players: [] },
  onFollow
}, externalRef) {
  const containerRef = useRef10(null);
  const [dimensions, setDimensions] = useState14({ width: 0, height: 0 });
  useLayoutEffect4(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: width2, height: height2 } = entry.contentRect;
          setDimensions({ width: width2, height: height2 });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      setDimensions({ width: r.width, height: r.height });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const { width, height } = dimensions;
  const showWinRate = settings?.showWinRate !== false;
  const showPlayoffs = settings?.showPlayoffs !== false;
  const adjustedGrades = settings?.availabilityAdjusted === true;
  const [expandedDraftYears, setExpandedDraftYears] = useState14(() => /* @__PURE__ */ new Set());
  const [selected, setSelected] = useState14(null);
  const didDragRef = useRef10(() => false);
  const tapGuard = useCallback7(() => didDragRef.current(), []);
  const onToggleDraftYear = useCallback7((year) => {
    setExpandedDraftYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);
  const onSelectPick = useCallback7((pick) => {
    setSelected({ type: "player", pick });
  }, []);
  const closeCard = useCallback7(() => setSelected(null), []);
  const modules = useMemo10(() => getEnabledDesktopModules(settings), [settings]);
  const moduleData = useMemo10(
    () => buildModuleData({
      draftSegment,
      expandedDraftYears,
      onToggleDraftYear,
      onSelectPick,
      tapGuard,
      adjusted: adjustedGrades
    }),
    [draftSegment, expandedDraftYears, onToggleDraftYear, onSelectPick, tapGuard, adjustedGrades]
  );
  const spans = useMemo10(() => {
    const out = [];
    for (const s of mapped?.staff || []) {
      if (ribbonConfig.roles?.[s.role] === false) continue;
      out.push(s);
    }
    for (const p of ribbonConfig.players || []) {
      out.push({
        admin_person_id: p.player_id,
        name: p.name,
        role: positionGroup(p.position),
        from: p.from,
        to: p.to,
        kind: "player",
        approx: p.source === "approx",
        position: p.position,
        prev_team: p.prev_team || null,
        next_team: p.next_team || null,
        entry: p.entry || null,
        exit: p.exit || null,
        conf: p.conf || null
      });
    }
    return out;
  }, [mapped, ribbonConfig]);
  const reserveByYear = useMemo10(() => stripReserveByYear(spans), [spans]);
  const viewport = useDesktopViewport({
    seasons: mapped?.seasons,
    modules,
    moduleData,
    reserveByYear,
    width,
    focusYear,
    onFocusConsumed,
    showPlayoffs
  });
  const {
    layout,
    scrollX,
    band,
    handlers,
    didDrag,
    visualScale,
    scaleAnchorX,
    scrollRef,
    totalWidth
  } = viewport;
  didDragRef.current = didDrag;
  useImperativeHandle2(externalRef, () => scrollRef.current, [scrollRef]);
  const offseasonHidden = desktopGeometryFor(band).offseason === "hidden";
  useEffect16(() => {
    if (offseasonHidden && expandedDraftYears.size > 0) {
      setExpandedDraftYears(/* @__PURE__ */ new Set());
    }
  }, [offseasonHidden, expandedDraftYears]);
  const pickById = useMemo10(() => {
    const m = /* @__PURE__ */ new Map();
    for (const p of draftSegment?.picks || []) {
      if (p.player_id && !m.has(p.player_id)) m.set(p.player_id, p);
    }
    return m;
  }, [draftSegment]);
  const onSelectRibbon = useCallback7(
    (r) => {
      if (r.kind === "player") {
        const pick = pickById.get(r.id) || {
          player_id: r.id,
          name: r.name,
          position: r.position,
          year: r.from,
          value: null,
          career: null
        };
        setSelected({ type: "player", pick });
      } else {
        setSelected({ type: "staff", ribbon: r });
      }
    },
    [pickById]
  );
  const ready = width > 0 && height > 0;
  return /* @__PURE__ */ jsxs22(
    "div",
    {
      ref: containerRef,
      style: { height: "100%", overflow: "hidden", position: "relative" },
      children: [
        /* @__PURE__ */ jsx22(
          "div",
          {
            ref: scrollRef,
            onScroll: handlers.onScroll,
            onPointerDown: handlers.onPointerDown,
            onPointerMove: handlers.onPointerMove,
            onPointerUp: handlers.onPointerUp,
            onPointerCancel: handlers.onPointerCancel,
            onPointerLeave: handlers.onPointerLeave,
            style: {
              position: "absolute",
              inset: 0,
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pan-x"
            },
            children: /* @__PURE__ */ jsx22("div", { style: { width: Math.max(totalWidth, width), height: "100%", position: "relative" }, children: ready && /* @__PURE__ */ jsxs22(
              "svg",
              {
                width,
                height,
                style: { position: "sticky", left: 0, display: "block" },
                children: [
                  /* @__PURE__ */ jsx22("rect", { x: 0, y: 0, width, height, fill: "transparent" }),
                  /* @__PURE__ */ jsx22(
                    "g",
                    {
                      transform: `translate(${scaleAnchorX} 0) scale(${visualScale} 1) translate(${-scaleAnchorX} 0)`,
                      children: /* @__PURE__ */ jsx22(
                        DesktopTimelineLayer_default,
                        {
                          layout,
                          scrollX,
                          width,
                          height,
                          band,
                          moduleData,
                          staff: spans,
                          pre1967: mapped?.pre1967,
                          adminById,
                          onSelectStaff: onSelectRibbon,
                          tapGuard,
                          onFollow,
                          showWinRate,
                          showPlayoffs
                        }
                      )
                    }
                  )
                ]
              }
            ) })
          }
        ),
        /* @__PURE__ */ jsx22(InfoCard, { selection: selected, adminById, onClose: closeCard, adjusted: adjustedGrades }),
        /* @__PURE__ */ jsx22(DesktopZoomHud, { band })
      ]
    }
  );
});
var DesktopMain_default = DesktopMain;

// src/desktop/DesktopApp.jsx
import { jsx as jsx23, jsxs as jsxs23 } from "react/jsx-runtime";
var SIDEBAR_W = 320;
function SidebarHeading({ icon, label, badge = null }) {
  return /* @__PURE__ */ jsxs23(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px 8px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: "#3a3f47",
        borderBottom: "1px solid #e8eaef",
        background: "#f4f5f8",
        flexShrink: 0
      },
      children: [
        /* @__PURE__ */ jsx23("span", { style: { fontSize: 14, lineHeight: 1 }, children: icon }),
        label,
        badge != null && /* @__PURE__ */ jsx23(
          "span",
          {
            style: {
              background: "#2d6cdf",
              color: "#fff",
              borderRadius: 8,
              padding: "0 6px",
              fontSize: 10.5,
              fontWeight: 700
            },
            children: badge
          }
        )
      ]
    }
  );
}
var DEFAULT_RIBBONS2 = {
  roles: { coach: true, gm: true, owner: true, unknown: true },
  players: []
};
function DesktopApp() {
  const [selectedTeam, setSelectedTeam] = useState15("ARI");
  const [settings, setSettings] = useState15({});
  const [leagueOpen, setLeagueOpen] = useState15(false);
  const [methodologyOpen, setMethodologyOpen] = useState15(false);
  const [ribbonConfig, setRibbonConfig] = useState15(DEFAULT_RIBBONS2);
  const [focusYear, setFocusYear] = useState15(null);
  const [pendingFollow, setPendingFollow] = useState15(null);
  const { mapped, loading, draftSegment, adminById } = useTeamData(selectedTeam);
  const mainRef = useRef11(null);
  const selectTeam = useCallback8((team) => {
    setSelectedTeam(team);
    setRibbonConfig((c) => ({ ...c, players: [] }));
  }, []);
  const goTo = useCallback8((team, year, follow = null) => {
    setLeagueOpen(false);
    setFocusYear(year ?? null);
    setPendingFollow(follow && follow.id ? follow : null);
    setSelectedTeam((prev) => {
      if (prev !== team) {
        setRibbonConfig((c) => ({
          ...c,
          players: [],
          roles: follow && follow.kind === "staff" && follow.role ? { ...c.roles, [follow.role]: true } : c.roles
        }));
      } else if (follow && follow.kind === "staff" && follow.role) {
        setRibbonConfig((c) => ({ ...c, roles: { ...c.roles, [follow.role]: true } }));
      }
      return team;
    });
  }, []);
  const clearFocus = useCallback8(() => setFocusYear(null), []);
  useEffect17(() => {
    if (!pendingFollow) return;
    if (!mapped || mapped.team !== selectedTeam) return;
    const { id, kind } = pendingFollow;
    if (kind === "staff") {
      const span = (mapped.staff || []).find((s) => s.admin_person_id === id);
      if (span) setFocusYear(span.from);
      setPendingFollow(null);
      return;
    }
    let cancelled = false;
    fetch(`/data/segments/teams_tenures/${selectedTeam}.json`).then((r) => r.ok ? r.json() : null).then((json) => {
      if (cancelled) return;
      const row = (json?.tenures || []).find(
        (t) => (t.player_id_internal || t.player_id) === id
      );
      if (row) {
        setRibbonConfig((c) => ({
          ...c,
          players: [
            {
              player_id: id,
              name: row.name ?? pendingFollow.name,
              position: row.position ?? pendingFollow.position,
              from: row.from,
              to: row.to,
              source: row.source,
              prev_team: row.prev_team,
              next_team: row.next_team,
              entry: row.entry,
              exit: row.exit,
              conf: row.conf
            }
          ]
        }));
        setFocusYear(row.from);
      }
      setPendingFollow(null);
    }).catch(() => {
      if (!cancelled) setPendingFollow(null);
    });
    return () => {
      cancelled = true;
    };
  }, [pendingFollow, mapped, selectedTeam]);
  if (loading || !mapped)
    return /* @__PURE__ */ jsx23("div", { className: "desktop-frame", id: FRAME_ID, style: { display: "grid", placeItems: "center" }, children: "Loading\u2026" });
  const readyFocusYear = mapped.team === selectedTeam ? focusYear : null;
  return /* @__PURE__ */ jsx23(ErrorBoundary, { fallback: /* @__PURE__ */ jsx23("div", { children: "Something went wrong." }), children: /* @__PURE__ */ jsx23("div", { className: "desktop-frame", id: FRAME_ID, children: /* @__PURE__ */ jsxs23("div", { style: {
    height: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  }, children: [
    /* @__PURE__ */ jsx23(
      Header,
      {
        scrollRef: mainRef,
        selectedTeam,
        setSelectedTeam: selectTeam,
        onOpenLeague: () => setLeagueOpen(true),
        onOpenMethodology: () => setMethodologyOpen(true),
        onSearchSelect: goTo
      }
    ),
    /* @__PURE__ */ jsxs23("div", { style: { display: "flex", flex: 1, minHeight: 0 }, children: [
      /* @__PURE__ */ jsx23("div", { style: { flex: 1, minWidth: 0, height: "100%" }, children: /* @__PURE__ */ jsx23(
        DesktopMain_default,
        {
          ref: mainRef,
          mapped,
          draftSegment,
          settings,
          adminById,
          focusYear: readyFocusYear,
          onFocusConsumed: clearFocus,
          ribbonConfig,
          onFollow: goTo
        }
      ) }),
      /* @__PURE__ */ jsxs23(
        "aside",
        {
          style: {
            width: SIDEBAR_W,
            flexShrink: 0,
            borderLeft: "1px solid #dfe3ea",
            background: "#fafbfc",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          },
          children: [
            /* @__PURE__ */ jsx23(SidebarHeading, { icon: "\u2699\uFE0F", label: "SETTINGS" }),
            /* @__PURE__ */ jsx23("div", { style: { flexShrink: 0, background: "#fff" }, children: /* @__PURE__ */ jsx23(SettingsDrawer, { settings, onChange: setSettings }) }),
            /* @__PURE__ */ jsx23(
              SidebarHeading,
              {
                icon: "\u{1F465}",
                label: "PERSONNEL TRACKS",
                badge: (ribbonConfig.players || []).length || null
              }
            ),
            /* @__PURE__ */ jsx23("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#fff" }, children: /* @__PURE__ */ jsx23(
              RibbonControls,
              {
                teamId: selectedTeam,
                draftSegment,
                config: ribbonConfig,
                onChange: setRibbonConfig
              }
            ) })
          ]
        }
      )
    ] }),
    leagueOpen && /* @__PURE__ */ jsx23(LeagueView, { onClose: () => setLeagueOpen(false), onGoTo: goTo }),
    methodologyOpen && /* @__PURE__ */ jsx23(MethodologyView, { onClose: () => setMethodologyOpen(false) })
  ] }) }) });
}
var DesktopApp_default = DesktopApp;
export {
  App_default as App,
  DesktopApp_default as DesktopApp
};
