import { NFL_STRUCTURE } from "./data/nflStructure";

export default function TeamSelect({ onSelect, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        padding: "12px",
        overflowY: "auto",
        zIndex: 20,
        boxSizing: "border-box"
      }}
    >

      {Object.entries(NFL_STRUCTURE).map(([conference, divisions]) => (
        <div key={conference} style={{ marginBottom: "24px" }}>
          <h2 style={{ margin: "8px 0" }}>{conference}</h2>

          {/* each conference has 4 divisions → render 2 rows of 2 division blocks */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px"
            }}
          >
            {Object.entries(divisions).map(([division, teams]) => (
              <div
                key={division}
                style={{
                  background: "#f6f6f6",
                  borderRadius: "6px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {division}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                  }}
                >
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      onClick={() => onSelect(team.id)}
                      style={{
                        padding: "8px 4px",
                        background: "#ddd",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {team.id}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
