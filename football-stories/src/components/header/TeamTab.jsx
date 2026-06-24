import { teamName } from "../visualization/teamMeta";

export default function TeamTab({ teamId, onOpen }) {
  const label = teamId ? teamName(teamId) : "Select team";

  return (
    <button
      onClick={onOpen}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        height: "32px",
        padding: "0 16px",
        background: "#fff",
        border: "1.5px solid #b8bdc7",
        borderRadius: "999px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        color: "#1f2430",
        boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
        whiteSpace: "nowrap",
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
      {teamId && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "#7c8390",
          }}
        >
          {teamId}
        </span>
      )}
      <span>{label}</span>
      <span style={{ fontSize: "10px", color: "#9aa0ab", lineHeight: 1 }}>▼</span>
    </button>
  );
}
