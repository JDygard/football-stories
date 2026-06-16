// League leaderboards overlay (hamburger menu → 🏆). Tabs: best draft
// classes, best drafting GMs, steals, busts. Provisional entries carry a
// "*" and a "settled only" toggle filters them out (a class topping the
// board on active careers is a forecast, not a verdict). Every row
// deep-links into the timeline: tap → that team, scrolled to that year.

import { useEffect, useState } from "react";
import { tierColor } from "./visualization/offseason/draftModel.js";

const TABS = [
  ["classes", "Best drafts"],
  ["gms", "Best GMs"],
  ["steals", "Steals"],
  ["busts", "Busts"],
];

function Chip({ tier, provisional }) {
  return (
    <span
      style={{
        background: tierColor(tier),
        color: "#fff",
        fontWeight: 700,
        borderRadius: 4,
        padding: "1px 7px",
        fontSize: 12,
        minWidth: 26,
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {tier}
      {provisional ? "*" : ""}
    </span>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

function Row({ onClick, children }) {
  return (
    <div
      style={rowStyle}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f2f4f8")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {children}
    </div>
  );
}

const dim = { color: "#888", fontSize: 12 };

export default function LeagueView({ onClose, onGoTo }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("classes");
  const [settledOnly, setSettledOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/league/leaderboards.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = (data?.[tab] || []).filter(
    (r) => !settledOnly || !r.provisional,
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,25,35,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(580px, 94vw)",
          maxHeight: "84vh",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 14px 8px",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>League leaderboards</div>
          <div style={{ flex: 1 }} />
          <label style={{ fontSize: 12, color: "#666", display: "flex", gap: 5, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={settledOnly}
              onChange={(e) => setSettledOnly(e.target.checked)}
            />
            settled only
          </label>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none", background: "none", fontSize: 18,
              cursor: "pointer", color: "#999", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "0 12px 8px" }}>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                border: "none",
                borderRadius: 6,
                padding: "5px 10px",
                fontSize: 12.5,
                cursor: "pointer",
                fontWeight: tab === id ? 700 : 400,
                background: tab === id ? "#eef1f6" : "none",
                color: "#222",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: "auto", padding: "0 8px 10px" }}>
          {error && (
            <div style={{ padding: 16, color: "#999", fontSize: 13 }}>
              No leaderboards yet — run segment.py to generate
              data/league/leaderboards.json.
            </div>
          )}
          {!data && !error && (
            <div style={{ padding: 16, color: "#999", fontSize: 13 }}>Loading…</div>
          )}

          {tab === "classes" &&
            list.map((c, i) => (
              <Row key={`${c.team}-${c.year}`} onClick={() => onGoTo(c.team, c.year)}>
                <span style={{ ...dim, width: 22, textAlign: "right" }}>{i + 1}</span>
                <Chip tier={c.tier} provisional={c.provisional} />
                <span style={{ fontWeight: 700, width: 84 }}>
                  {c.team} {c.year}
                </span>
                <span style={dim}>avg {Math.round(c.avg_score)}</span>
                <span style={{ ...dim, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {(c.headline || [])
                    .map((h) => `${h.name} (${h.tier}${h.provisional ? "*" : ""})`)
                    .join(", ")}
                </span>
              </Row>
            ))}

          {tab === "gms" &&
            list.map((g, i) => (
              <Row
                key={g.admin_person_id}
                onClick={() => onGoTo(g.classes[0].team, g.classes[0].year)}
              >
                <span style={{ ...dim, width: 22, textAlign: "right" }}>{i + 1}</span>
                <span style={{ fontWeight: 700, flex: 1 }}>
                  {g.name}
                  {g.provisional ? "*" : ""}
                </span>
                <span style={dim}>
                  pctl {Math.round(g.mean_pctl)} · {g.n_classes} classes
                </span>
                <span style={{ ...dim, width: 150, textAlign: "right" }}>
                  {g.teams.join("/")} {g.from}–{g.to}
                </span>
              </Row>
            ))}

          {(tab === "steals" || tab === "busts") &&
            list.map((p, i) => (
              <Row key={`${p.player_id}-${p.team}-${p.year}`} onClick={() => onGoTo(p.team, p.year)}>
                <span style={{ ...dim, width: 22, textAlign: "right" }}>{i + 1}</span>
                <Chip tier={p.tier} provisional={p.provisional} />
                <span style={{ fontWeight: 700, flex: 1 }}>{p.name}</span>
                <span style={dim}>
                  {p.team} {p.year} · R{p.round} #{p.pick_overall}
                </span>
                <span style={{ ...dim, width: 56, textAlign: "right" }}>
                  {Math.round(p.score)} / 100
                </span>
              </Row>
            ))}
        </div>
      </div>
    </div>
  );
}
