// Inline ribbon controls — lives inside the footer drawer.
//   - Staff role toggles: coaches / GMs / owners independently.
//   - Individual players: click any row to add/remove its ribbon.
//   - Bulk: pick a position chip, then "+ add all who played" — adds every
//     player in that group WHO TOOK THE FIELD (games > 0); never-played
//     picks are skipped by bulk (you can still add them individually).
//   - The list is the franchise's full tenure set, paged with "show more".
//     Approximate tenures (no roster data yet) are marked ~.

import { useEffect, useMemo, useState } from "react";
import useTeamTenures from "../hooks/useTeamTenures.js";
import { roleColor, positionGroup } from "./visualization/staffRibbonModel.js";

// Selection guard. Concurrency is what actually matters visually (tail
// slots are reused after a tenure ends, and >5 concurrent collapses to
// thin tails), so this is a sanity cap, not a readability cap.
export const MAX_PLAYERS = 40;

const PAGE = 50;

const GROUPS = [
  ["all", "All"],
  ["qb", "QB"], ["rb", "RB"], ["wr", "WR"], ["te", "TE"],
  ["ol", "OL"], ["dl", "DL"], ["lb", "LB"], ["db", "DB"], ["st", "ST"],
];

const ROLES = [
  ["coach", "Coaches"],
  ["gm", "GMs"],
  ["owner", "Owners"],
];

// "Took snaps" proxy: career games when we know them (approx tenures carry
// games); pipeline roster rows count as played (you were on a roster).
const played = (t) => (t.games == null ? true : t.games > 0);

export default function RibbonControls({ teamId, draftSegment, config, onChange }) {
  const { tenures, source } = useTeamTenures(teamId, draftSegment);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE);

  // new filter -> back to page one
  useEffect(() => {
    setVisibleCount(PAGE);
  }, [query, group, teamId]);

  const selectedIds = useMemo(
    () => new Set((config.players || []).map((p) => p.player_id)),
    [config.players],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenures
      .filter((t) => t.name)
      .filter((t) => group === "all" || positionGroup(t.position) === group)
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => (b.to || 0) - (a.to || 0) || String(a.name).localeCompare(b.name));
  }, [tenures, query, group]);

  const shown = matches.slice(0, visibleCount);

  const toggleRole = (role) => {
    onChange({
      ...config,
      roles: { ...config.roles, [role]: config.roles[role] === false },
    });
  };

  const togglePlayer = (t) => {
    if (selectedIds.has(t.player_id)) {
      onChange({
        ...config,
        players: config.players.filter((p) => p.player_id !== t.player_id),
      });
      return;
    }
    if ((config.players || []).length >= MAX_PLAYERS) return;
    onChange({ ...config, players: [...(config.players || []), t] });
  };

  // Bulk: everyone in the current filter who actually played and isn't
  // already selected, up to the cap.
  const bulkCandidates = useMemo(
    () => matches.filter((t) => played(t) && !selectedIds.has(t.player_id)),
    [matches, selectedIds],
  );
  const room = MAX_PLAYERS - (config.players || []).length;
  const addAll = () => {
    if (room <= 0 || !bulkCandidates.length) return;
    onChange({
      ...config,
      players: [...(config.players || []), ...bulkCandidates.slice(0, room)],
    });
  };
  const clearPlayers = () => onChange({ ...config, players: [] });

  const atCap = room <= 0;
  const nSel = (config.players || []).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 12.5 }}>
      {/* control strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "8px 12px 6px",
          borderBottom: "1px solid #e8eaef",
        }}
      >
        {ROLES.map(([role, label]) => (
          <label key={role} style={{ display: "flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.roles[role] !== false}
              onChange={() => toggleRole(role)}
            />
            <span style={{
              width: 9, height: 9, borderRadius: 2, display: "inline-block",
              background: roleColor(role),
            }} />
            {label}
          </label>
        ))}

        <span style={{ width: 1, height: 18, background: "#ddd" }} />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search to add a player…"
          style={{
            width: 180, height: 24, padding: "0 8px", fontSize: 12,
            borderRadius: 4, border: "1px solid #ccc", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {GROUPS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setGroup(id)}
              title={id === "all" ? "Show all positions" : `Filter to ${label}`}
              style={{
                border: "none", borderRadius: 5, padding: "3px 8px",
                fontSize: 11, cursor: "pointer",
                fontWeight: group === id ? 700 : 400,
                background: group === id ? "#eef1f6" : "#f7f8fa",
                color: id !== "all" ? roleColor(id) : "#333",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={addAll}
          disabled={atCap || !bulkCandidates.length}
          title="Adds everyone in the current filter who took the field (games > 0); never-played picks are skipped"
          style={{
            border: "1px solid #c9d4e8",
            borderRadius: 5,
            padding: "3px 9px",
            fontSize: 11.5,
            cursor: atCap || !bulkCandidates.length ? "default" : "pointer",
            background: "#f0f5ff",
            color: atCap || !bulkCandidates.length ? "#9aa" : "#2d5cb8",
            fontWeight: 600,
          }}
        >
          + add all{group !== "all" ? ` ${group.toUpperCase()}s` : ""} who played
          ({Math.min(bulkCandidates.length, Math.max(0, room))})
        </button>

        <div style={{ flex: 1 }} />
        <span style={{ color: "#666", fontSize: 11.5 }}>
          <b>{nSel}</b> player track{nSel === 1 ? "" : "s"} (max {MAX_PLAYERS})
          {nSel > 0 && (
            <button
              onClick={clearPlayers}
              style={{
                marginLeft: 6, border: "none", background: "none",
                color: "#b55", cursor: "pointer", fontSize: 11, padding: 0,
              }}
            >
              clear
            </button>
          )}
        </span>
      </div>

      {/* selected set — the whole selection in one place, removable without
          hunting through the tenure list (§4g) */}
      {nSel > 0 && (
        <div
          style={{
            padding: "7px 12px",
            borderBottom: "1px solid #e8eaef",
            background: "#fbfcfe",
            maxHeight: 96,
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 0.3 }}>
              SELECTED
            </span>
            <span style={{ fontSize: 11, color: "#999" }}>{nSel}</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={clearPlayers}
              style={{
                border: "none", background: "none", color: "#b55",
                cursor: "pointer", fontSize: 11, padding: 0,
              }}
            >
              clear all
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(config.players || []).map((p) => {
              const g = positionGroup(p.position);
              return (
                <button
                  key={p.player_id}
                  onClick={() => togglePlayer(p)}
                  title="Remove from tracks"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 7px 3px 8px",
                    borderRadius: 12,
                    border: "1px solid #dfe3ea",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 11.5,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f4f6fa"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: roleColor(g), display: "inline-block",
                  }} />
                  <span style={{ fontWeight: 600, color: "#222" }}>{p.name}</span>
                  <span style={{ color: "#999" }}>
                    {p.position || ""}{p.source === "approx" ? " ~" : ""}
                  </span>
                  <span style={{ color: "#aab", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* tenure list */}
      <div style={{ overflowY: "auto", flex: 1, padding: "4px 6px 8px" }}>
        <div style={{ padding: "2px 8px 4px", color: "#999", fontSize: 11 }}>
          {matches.length} player{matches.length === 1 ? "" : "s"} match
          {source !== "pipeline" &&
            " · drafted players only, tenures approximated (~) until the roster pipeline runs"}
        </div>
        {shown.map((t) => {
          const on = selectedIds.has(t.player_id);
          const g = positionGroup(t.position);
          const sat = played(t);
          return (
            <div
              key={t.player_id}
              onClick={() => togglePlayer(t)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "4px 8px", borderRadius: 6,
                cursor: on || !atCap ? "pointer" : "not-allowed",
                opacity: !on && atCap ? 0.45 : 1,
                background: on ? "#eef6ee" : "none",
              }}
              onMouseEnter={(e) => { if (on || !atCap) e.currentTarget.style.background = on ? "#e2f0e2" : "#f2f4f8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = on ? "#eef6ee" : "none"; }}
            >
              <span style={{
                width: 9, height: 9, borderRadius: 2,
                background: roleColor(g), display: "inline-block",
              }} />
              <span style={{ fontWeight: 600, flex: 1, color: sat ? "#222" : "#999" }}>
                {t.name}
                {!sat && <span style={{ fontWeight: 400, fontSize: 10.5 }}> · never played</span>}
              </span>
              <span style={{ color: "#888", width: 30 }}>{t.position || "—"}</span>
              <span style={{ color: "#888" }}>
                {t.from}–{t.to}
                {t.source === "approx" ? "~" : ""}
              </span>
              <span style={{ width: 18, textAlign: "center", color: on ? "#2a7" : "#bbb", fontWeight: 700 }}>
                {on ? "✓" : "+"}
              </span>
            </div>
          );
        })}
        {matches.length > shown.length && (
          <button
            onClick={() => setVisibleCount((c) => c + 2 * PAGE)}
            style={{
              display: "block", width: "100%", padding: "8px 0",
              border: "none", background: "#f5f7fa", borderRadius: 6,
              cursor: "pointer", color: "#2d5cb8", fontWeight: 600, fontSize: 12,
            }}
          >
            Show more ({matches.length - shown.length} remaining)
          </button>
        )}
        {!matches.length && <div style={{ padding: 12, color: "#999" }}>No matches.</div>}
      </div>
    </div>
  );
}
