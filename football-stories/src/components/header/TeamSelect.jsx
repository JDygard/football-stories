import { NFL_STRUCTURE } from "./data/nflStructure";

export default function TeamSelect({ onSelect, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f4f5f7",
        overflowY: "auto",
        zIndex: 20,
        boxSizing: "border-box",
      }}
    >
      {/* header row matching the pill style */}
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "#fff",
          borderBottom: "1px solid #d8dbe1",
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: 600, color: "#1f2430" }}>
          Select team
        </span>
        <button
          onClick={onClose}
          style={{
            height: "32px",
            padding: "0 14px",
            background: "#fff",
            border: "1.5px solid #b8bdc7",
            borderRadius: "999px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            color: "#1f2430",
          }}
        >
          Close
        </button>
      </div>

      <div style={{ padding: "16px", boxSizing: "border-box" }}>
        {Object.entries(NFL_STRUCTURE).map(([conference, divisions]) => (
          <div key={conference} style={{ marginBottom: "28px" }}>
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#7c8390",
                textTransform: "uppercase",
              }}
            >
              {conference}
            </h2>

            {/* each conference has 4 divisions → 2 rows of 2 division blocks */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {Object.entries(divisions).map(([division, teams]) => (
                <div
                  key={division}
                  style={{
                    background: "#fff",
                    border: "1px solid #e1e3e8",
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: "#9aa0ab",
                      textAlign: "center",
                      textTransform: "uppercase",
                    }}
                  >
                    {division}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => onSelect(team.id)}
                        style={{
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
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#7c8390";
                          e.currentTarget.style.background = "#f6f7f9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#b8bdc7";
                          e.currentTarget.style.background = "#fff";
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            color: "#7c8390",
                            minWidth: "30px",
                          }}
                        >
                          {team.id}
                        </span>
                        <span>{team.name}</span>
                      </button>
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
