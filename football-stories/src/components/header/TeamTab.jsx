import { teamName } from "../visualization/teamMeta";

// `prominent` is the desktop treatment. The resting pill — 8% white fill, 28%
// border — is right on a phone, where the header is three items and the team
// name is obviously the middle one. On a wide header, next to a hamburger and a
// search box, it read as a label rather than a control and people hunted for
// the team picker. So desktop gets a filled, clearly-clickable tab and shows
// its open state in the caret it already had. No new furniture, just contrast.
export default function TeamTab({ teamId, onOpen, prominent = false, open = false }) {
  const label = teamId ? teamName(teamId) : "Select team";

  const rest = prominent
    ? { bg: open ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.18)", border: "rgba(255,255,255,0.62)" }
    : { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.28)" };
  const hover = prominent
    ? { bg: "rgba(255,255,255,0.3)", border: "rgba(255,255,255,0.85)" }
    : { bg: "rgba(255,255,255,0.16)", border: "rgba(255,255,255,0.5)" };

  return (
    <button
      onClick={onOpen}
      aria-haspopup={prominent ? "dialog" : undefined}
      aria-expanded={prominent ? open : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        height: "32px",
        padding: "0 16px",
        // White-on-navy pill riding the dark header (mockup palette).
        background: rest.bg,
        border: `1.5px solid ${rest.border}`,
        borderRadius: "999px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        color: "#fff",
        whiteSpace: "nowrap",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hover.border;
        e.currentTarget.style.background = hover.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = rest.border;
        e.currentTarget.style.background = rest.bg;
      }}
    >
      {teamId && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: prominent ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.6)",
          }}
        >
          {teamId}
        </span>
      )}
      <span>{label}</span>
      <span
        style={{
          fontSize: "10px",
          color: prominent ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.65)",
          lineHeight: 1,
        }}
      >
        {open ? "\u25b2" : "\u25bc"}
      </span>
    </button>
  );
}
