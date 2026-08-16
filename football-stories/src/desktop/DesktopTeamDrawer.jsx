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
//   IT'S SHAPED LIKE THE LEAGUE. Two conference blocks side by side, each a 2x2
//     of its divisions, each division a labelled column of its four teams. Eight
//     divisions in one long row (an earlier layout) fits in less height but asks
//     you to read a flat list of eight headings; as 2x2 blocks you find a team
//     the way you know the league — conference, then division. The conference is
//     named once per block instead of repeated in all eight headings, so this
//     reads as LESS chrome, not more.
//   IT'S THE SIZE OF ITS CONTENTS. The buttons are a fixed, legible width and
//     the drawer is however wide that makes it, centred under the header rather
//     than stretched from edge to edge. A team button has no reason to be
//     400px wide on a big monitor, and a picker that spans the whole screen
//     reads as a page rather than a menu.
//
// Mobile keeps TeamSelect exactly as it was; the two share the NFL structure
// data and nothing else.

import { useEffect } from "react";
import { NFL_STRUCTURE } from "../components/header/data/nflStructure.js";

// Two label weights, because the block now carries the conference and the cell
// only has to carry the division.
const CONF_LABEL = {
  color: "#5b6472",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
};

// A team button is sized once, here, and everything upstream is measured from
// it — the grid columns and therefore the whole drawer. Set by the LONGEST team
// name ("Washington Commanders"): at 192 it ellipsized, which is the one thing
// a picker must never do to the thing you're picking.
const BTN_W = 206;

// THE COMPASS ROSE, offset a quarter turn: North upper-left, East upper-right,
// South lower-right, West lower-left. Reading order in the source data is
// alphabetical-ish (East, North, South, West) and means nothing; laying the four
// out where they'd sit on a rotated compass makes the 2x2 something you can aim
// at instead of scan.
const DIVISION_GRID = ["North", "East", "West", "South"];

const DIV_LABEL = {
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
        width: BTN_W,
        boxSizing: "border-box",
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
        // Centred under the header — which is where the tab that opens it is —
        // and only as wide as the two blocks of buttons need.
        left: "50%",
        transform: "translateX(-50%)",
        width: "max-content",
        maxWidth: "100%",
        zIndex: 40,
        background: "#fff",
        border: "1px solid #cfd5df",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
        padding: "12px 16px 14px",
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

      {/* One block per conference, each a 2x2 of divisions. */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {Object.entries(NFL_STRUCTURE).map(([conference, divisions], ci) => (
          <div
            key={conference}
            style={{
              paddingLeft: ci ? 14 : 0,
              borderLeft: ci ? "1px solid #e8eaef" : "none",
            }}
          >
            {/* Conference names face each other across the divide: the left
                block's is right-aligned, the right block's left-aligned. */}
            <div
              style={{
                ...CONF_LABEL,
                marginBottom: 8,
                textAlign: ci ? "left" : "right",
              }}
            >
              {conference}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(2, ${BTN_W}px)`,
                columnGap: 12,
                rowGap: 12,
              }}
            >
              {DIVISION_GRID.map((division) => (
                <div key={division}>
                  <div style={{ ...DIV_LABEL, marginBottom: 5 }}>{division}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {divisions[division].map((team) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
