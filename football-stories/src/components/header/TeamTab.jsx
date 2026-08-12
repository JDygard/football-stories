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
        // White-on-navy pill riding the dark header (mockup palette).
        background: "rgba(255,255,255,0.08)",
        border: "1.5px solid rgba(255,255,255,0.28)",
        borderRadius: "999px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        color: "#fff",
        whiteSpace: "nowrap",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
        e.currentTarget.style.background = "rgba(255,255,255,0.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      }}
    >
      {teamId && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {teamId}
        </span>
      )}
      <span>{label}</span>
      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", lineHeight: 1 }}>▼</span>
    </button>
  );
}
