// Desktop team picker — a drawer that descends from the header.
//
// The shared TeamSelect (components/header/TeamSelect.jsx) is `position: fixed;
// inset: 0`: a full-screen takeover. On a phone that's right — the whole screen
// IS the app. On desktop it blanketed the timeline, the control dock and the
// header itself to show a grid that needs a fraction of that room.
//
// Two rules shape this one:
//   IT DOESN'T DISPLACE ANYTHING. It's an overlay anchored under the header, not
//     a layout row, so the timeline keeps its box: the year you were looking at
//     is still exactly where you left it when the drawer closes, with no
//     re-centring of the lane and no springing back.
//   IT'S WIDE AND SHORT, because desktop has width to spend and height is what
//     the timeline needs. All eight divisions sit side by side in one row of
//     columns rather than stacking into a tall scrolling list, which keeps the
//     drawer to roughly the depth of the timeline's top margin — so what it
//     covers is mostly whitespace rather than the lane.
//
// Mobile keeps TeamSelect exactly as it was; the two share the NFL structure
// data and nothing else.

import { useEffect } from "react";
import { NFL_STRUCTURE } from "../components/header/data/nflStructure.js";

const CONF_LABEL = {
  color: "#8b93a1",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: "uppercase",
};

function TeamButton({ team, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(team.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        width: "100%",
        padding: "5px 8px",
        background: selected ? "#eaf0fb" : "#fff",
        border: `1px solid ${selected ? "#9dbaf0" : "#dfe3ea"}`,
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        color: "#1f2430",
        textAlign: "left",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = selected ? "#e1eaf9" : "#f4f6fa";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = selected ? "#eaf0fb" : "#fff";
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: selected ? "#2d6cdf" : "#8b93a1",
          minWidth: 24,
        }}
      >
        {team.id}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</span>
    </button>
  );
}

export default function DesktopTeamDrawer({ selectedTeam, onSelect, onClose, boundaryRef }) {
  // Escape, and a pointer-down outside the header ZONE — the wrapper holding
  // both the header and this drawer, not the drawer alone.
  //
  // That boundary matters. Dismiss-on-outside-click fires on pointerdown, and
  // the team pill's own toggle fires on the click that follows: if the pill
  // counted as "outside", pressing it while open would close the drawer and
  // then immediately reopen it, and the button would look dead. Treating the
  // whole header row as inside leaves the pill in sole charge of toggling.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e) => {
      const zone = boundaryRef?.current;
      if (zone && !zone.contains(e.target)) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose, boundaryRef]);

  return (
    <div
      className="desktop-team-drawer"
      role="dialog"
      aria-label="Select team"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#fff",
        borderBottom: "1px solid #cfd5df",
        boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
        padding: "12px 14px 14px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "#3a3f47" }}>
          SELECT TEAM
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            border: "1px solid #d5dae3",
            borderRadius: 6,
            background: "#fff",
            color: "#5b6472",
            fontSize: 11.5,
            fontWeight: 600,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      {/* Every division as its own column — eight across, four teams deep. */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {Object.entries(NFL_STRUCTURE).map(([conference, divisions], ci) => (
          <div
            key={conference}
            style={{
              display: "flex",
              gap: 8,
              flex: 1,
              minWidth: 0,
              paddingLeft: ci ? 12 : 0,
              borderLeft: ci ? "1px solid #e8eaef" : "none",
            }}
          >
            {Object.entries(divisions).map(([division, teams]) => (
              <div key={division} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...CONF_LABEL, marginBottom: 6 }}>
                  {conference} {division}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {teams.map((team) => (
                    <TeamButton
                      key={team.id}
                      team={team}
                      selected={team.id === selectedTeam}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
