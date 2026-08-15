// Info card for a tapped player (draft pick) or staff member (tenure ribbon).
// Fetches the full player/admin segment for rich stats but renders immediately
// from what the tap already knows.
//
// Stats are position-relevant: a QB card shows passing, a corner shows
// coverage numbers — no interception column for Peyton Manning.
//
// TWO PRESENTATIONS, one card body:
//   floating (default — mobile) one card at a time, pinning itself to the
//     corner over the timeline, dismissed by tapping anywhere outside it.
//   docked (`docked` — desktop) the card is laid out by a parent shelf instead
//     of positioning itself, and does NOT self-dismiss on an outside click, so
//     several can stay open side by side and be compared. Closing is explicit,
//     via the × (or Escape, which clears them all).
// Only the chrome differs; everything below the header is shared, so the two
// modes can't drift apart on content.

import { useEffect, useRef, useState } from "react";
import { tierColor, tierTextColor, gradeOf } from "./visualization/offseason/draftModel.js";
import { ROLE_COLORS } from "./visualization/staffRibbonModel.js";
import { roleLabelFromFlags } from "../utils/getPersonnelTitle.js";

const fmt = (v) =>
  v == null || Number.isNaN(Number(v)) ? null : Number(v).toLocaleString();

// Position group -> the stats worth showing, in order.
const STAT_DEFS = {
  passing: [
    ["pass_yds", "Pass yds"],
    ["pass_tds", "Pass TD"],
    ["pass_int", "INT thrown"],
    ["rush_yds", "Rush yds"],
  ],
  rushing: [
    ["rush_att", "Carries"],
    ["rush_yds", "Rush yds"],
    ["rush_tds", "Rush TD"],
    ["rec", "Receptions"],
  ],
  receiving: [
    ["rec", "Receptions"],
    ["rec_yds", "Rec yds"],
    ["rec_tds", "Rec TD"],
    ["rush_yds", "Rush yds"],
  ],
  frontSeven: [
    ["sacks", "Sacks"],
    ["tackles", "Tackles"],
    ["def_int", "INT"],
  ],
  secondary: [
    ["def_int", "INT"],
    ["tackles", "Tackles"],
    ["sacks", "Sacks"],
  ],
  none: [],
};

const POS_TO_GROUP = {
  QB: "passing",
  RB: "rushing", FB: "rushing", HB: "rushing",
  WR: "receiving", TE: "receiving",
  DE: "frontSeven", DT: "frontSeven", NT: "frontSeven", DL: "frontSeven",
  LB: "frontSeven", OLB: "frontSeven", ILB: "frontSeven", MLB: "frontSeven",
  EDGE: "frontSeven",
  CB: "secondary", S: "secondary", FS: "secondary", SS: "secondary",
  DB: "secondary",
  // OL / specialists: universal rows only
  C: "none", G: "none", T: "none", OG: "none", OT: "none", OL: "none",
  K: "none", P: "none", LS: "none",
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

// Collapse an admin segment's year rows into stints per (team, role).
// The stint title is the generic boolean-derived role label — never any
// verbatim source title text.
function collapseStints(records) {
  const rows = [...(records || [])].sort((a, b) => a.year - b.year);
  const stints = [];
  let cur = null;
  for (const r of rows) {
    const title = roleLabelFromFlags(r);
    if (
      cur &&
      r.team_label === cur.team &&
      title === cur.title &&
      r.year === cur.to + 1
    ) {
      cur.to = r.year;
      continue;
    }
    if (cur) stints.push(cur);
    cur = { team: r.team_label, title, from: r.year, to: r.year };
  }
  if (cur) stints.push(cur);
  return stints;
}

const CARD_BODY = {
  width: 280,
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  padding: "12px 14px",
  fontSize: 12,
  color: "#222",
};

// Floating pins itself over the timeline; docked lets the shelf place it and
// fills the height the shelf allows.
const cardStyleFor = (docked) =>
  docked
    ? { ...CARD_BODY, position: "relative", flex: "0 0 auto", maxHeight: "100%" }
    : { ...CARD_BODY, position: "absolute", top: 12, right: 12, maxHeight: "75%", zIndex: 30 };

// Close when a pointer-down lands outside the card. The opening tap has
// already completed by the time this effect attaches its listener, so it
// won't immediately self-dismiss.
//
// Disabled when docked: several cards are open on purpose there, and an
// outside-click dismiss would close them all the moment you clicked the
// timeline to open the next one.
function useDismiss(onClose, enabled = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onClose, enabled]);
  return ref;
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
      <span style={{ color: "#777" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function CloseButton({ onClose }) {
  return (
    <button
      onClick={onClose}
      style={{
        position: "absolute", top: 6, right: 8, border: "none",
        background: "none", fontSize: 16, cursor: "pointer", color: "#999",
        lineHeight: 1, padding: 4,
      }}
      aria-label="Close"
    >
      ×
    </button>
  );
}

function PlayerCard({ pick, onClose, adjusted, docked }) {
  const [career, setCareer] = useState(pick.career || null);
  const cardRef = useDismiss(onClose, !docked);

  useEffect(() => {
    if (!pick.player_id) return;
    let cancelled = false;
    fetch(`/data/segments/players/${pick.player_id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((seg) => {
        if (!cancelled && seg?.career?.length) setCareer(seg.career[0]);
      })
      .catch(() => {});
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

  return (
    <div style={cardStyleFor(docked)} ref={cardRef}>
      <CloseButton onClose={onClose} />
      <div style={{ fontSize: 14, fontWeight: 700, paddingRight: 16 }}>
        {pick.name || "Unknown"}
      </div>
      <div style={{ color: "#666", marginBottom: 6 }}>
        {[pick.position, pick.college].filter(Boolean).join(" · ")}
      </div>
      <div style={{ marginBottom: 8 }}>
        Drafted {pick.year}
        {pick.round != null ? ` · R${pick.round} #${pick.pick_overall}` : ""}
        {pick.age_at_draft ? ` · age ${pick.age_at_draft}` : ""}
      </div>

      {/* draft grade */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            background: tierColor(tier), color: tier ? tierTextColor(tier) : "#5a5a5a",
            fontWeight: 700, borderRadius: 4, padding: "2px 8px", fontSize: 13,
          }}
        >
          {tier ? tier + (provisional ? "*" : "") : "–"}
        </span>
        {score != null ? (
          <span style={{ color: "#555" }}>
            {Math.round(score)} / 100
            {pct != null ? ` · ${Math.round(pct * 100)}th pct` : ""}
            {adjusted ? " · availability-adj." : ""}
          </span>
        ) : (
          <span style={{ color: "#999" }}>not yet graded</span>
        )}
      </div>
      {provisional && (
        <div style={{ color: "#999", fontSize: 11, marginTop: -4, marginBottom: 8 }}>
          * still active — grade can move
        </div>
      )}

      <div style={{ borderTop: "1px solid #eee", paddingTop: 6 }}>
        {pick.year != null && (
          <Row
            label="Active"
            value={lastYear ? `${pick.year}–${Math.round(lastYear)}` : `${pick.year}–?`}
          />
        )}
        {universalStats(career).map(([l, v]) => (
          <Row key={l} label={l} value={v} />
        ))}
        {positionStats(pick.position, career).map(([l, v]) => (
          <Row key={l} label={l} value={v} />
        ))}
        {hof && hof !== "No" && <Row label="Hall of Fame" value="Yes" />}
      </div>
    </div>
  );
}

function StaffCard({ ribbon, adminById, onClose, docked }) {
  const [records, setRecords] = useState(null);
  const cardRef = useDismiss(onClose, !docked);

  useEffect(() => {
    if (!ribbon.id) return;
    let cancelled = false;
    fetch(`/data/segments/admin/${ribbon.id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((seg) => {
        if (!cancelled && seg?.records) setRecords(seg.records);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ribbon.id]);

  const title = adminById?.get?.(ribbon.id)?.title;
  const stints = collapseStints(records);

  return (
    <div style={cardStyleFor(docked)} ref={cardRef}>
      <CloseButton onClose={onClose} />
      <div style={{ fontSize: 14, fontWeight: 700, paddingRight: 16 }}>
        {ribbon.name}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 0 8px" }}>
        <span
          style={{
            width: 10, height: 10, borderRadius: 2, display: "inline-block",
            background: ROLE_COLORS[ribbon.role] || ROLE_COLORS.unknown,
          }}
        />
        <span style={{ color: "#666" }}>
          {title || ribbon.role.toUpperCase()} · {ribbon.from}–{ribbon.to}
        </span>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 6 }}>
        {stints.length ? (
          stints.map((s, i) => (
            <div key={i} style={{ padding: "3px 0" }}>
              <div style={{ fontWeight: 600 }}>
                {s.team || "—"} · {s.from}
                {s.to !== s.from ? `–${s.to}` : ""}
              </div>
              <div style={{ color: "#777" }}>{s.title}</div>
            </div>
          ))
        ) : (
          <div style={{ color: "#999" }}>Loading tenure…</div>
        )}
      </div>
    </div>
  );
}

export default function InfoCard({ selection, adminById, onClose, adjusted, docked = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!selection) return null;
  if (selection.type === "player") {
    return (
      <PlayerCard pick={selection.pick} onClose={onClose} adjusted={adjusted} docked={docked} />
    );
  }
  if (selection.type === "staff") {
    return (
      <StaffCard
        ribbon={selection.ribbon}
        adminById={adminById}
        onClose={onClose}
        docked={docked}
      />
    );
  }
  return null;
}
