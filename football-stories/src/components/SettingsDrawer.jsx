// Settings drawer — lives inside the footer, opened by the left "Settings"
// button. Holds optional display toggles for the timeline. Each feature is on
// unless its key is explicitly false, so an empty settings object shows
// everything (see App's DEFAULT settings note).

// The optional features we expose. Add a row here to surface a new toggle;
// the rendering side reads the same keys (see Main -> TeamTimelineLayer /
// buildTimelineLayout).
const FEATURES = [
  {
    key: "showWinRate",
    label: "Overall win-rate",
    hint: "The all-time franchise win-rate curve over the timeline, plus the % pill in each year banner.",
  },
  {
    key: "showPlayoffs",
    label: "Playoffs",
    hint: "Postseason segments, playoff result strips, and the playoff-finish medals.",
  },
];

function Toggle({ on, onClick }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: 38,
        height: 22,
        borderRadius: 11,
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: on ? "#2d6cdf" : "#cfd3da",
        position: "relative",
        transition: "background 0.16s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
          transition: "left 0.16s ease",
        }}
      />
    </button>
  );
}

export default function SettingsDrawer({ settings = {}, onChange }) {
  const isOn = (key) => settings[key] !== false; // absent => on
  const toggle = (key) => onChange({ ...settings, [key]: !isOn(key) });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 12.5 }}>
      <div style={{ overflowY: "auto", flex: 1, padding: "6px 8px 10px" }}>
        {FEATURES.map((f) => {
          const on = isOn(f.key);
          return (
            <div
              key={f.key}
              onClick={() => toggle(f.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "11px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f4f6fa"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <div style={{ flex: 1, fontWeight: 600, color: "#222" }}>{f.label}</div>
              <Toggle on={on} onClick={(e) => { e.stopPropagation(); toggle(f.key); }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
