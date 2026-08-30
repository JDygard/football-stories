// The display toggles for the timeline. Named for the footer drawer it used to
// live in; that drawer is gone and this is now rendered on the MENU-ZOOM rung
// (src/menu/), which is its only consumer. Each feature is on
// unless its key is explicitly false, so an empty settings object shows
// everything (see App's DEFAULT settings note).

// The optional features we expose. Add a row here to surface a new toggle;
// the rendering side reads the same keys (see Main -> TeamTimelineLayer /
// buildTimelineLayout).
// `defaultOn` is the state when the key is absent from settings. Most features
// are on by default (absent => on); the availability-adjusted grade is a lens
// that defaults OFF so the standard "value delivered" grade is the baseline.
//
// `desktopOnly` hides a row from the mobile drawer. One component serves both
// trees, and a toggle that flips a setting nothing in this orientation reads is
// worse than no toggle at all — so a feature that has only shipped on desktop
// says so here rather than showing up dead on the phone. No row carries it
// today (Named eras was the last one, and now renders in both trees); the
// mechanism stays for the next feature that lands on one orientation first.
const FEATURES = [
  {
    key: "showWinRate",
    label: "Overall win-rate",
    hint: "The all-time franchise win-rate curve over the timeline, plus the % pill in each year banner.",
    defaultOn: true,
  },
  {
    key: "showPlayoffs",
    label: "Playoffs",
    hint: "Postseason segments, playoff result strips, and the playoff-finish medals.",
    defaultOn: true,
  },
  {
    key: "showEras",
    label: "Named eras",
    hint: "The curated chapters of a franchise's story (\"The Peyton Manning Era\"), framed around the years they cover at the two most zoomed-out levels.",
    defaultOn: true,
  },
  {
    key: "availabilityAdjusted",
    label: "Availability-adjusted grades",
    hint: "Grade picks on production per playing time, so a productive career cut short by injury isn't scored like a bust. Off = standard 'value delivered' grade.",
    defaultOn: false,
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

// `scroll` false renders the rows at their natural height with no scroller of
// its own. That is not cosmetic: on the menu-zoom rung this list covers most of
// a phone slide, and a nested scroll container SWALLOWS THE SWIPE — the gesture
// goes to the list (which may have nothing to scroll) and never reaches the
// slide strip underneath. The rung sizes itself so every row fits instead.
export default function SettingsDrawer({ settings = {}, onChange, desktop = false, scroll = true }) {
  const features = desktop ? FEATURES : FEATURES.filter((f) => !f.desktopOnly);
  // absent => the feature's default (most on; the adjusted-grade lens off).
  const isOn = (key, defaultOn = true) =>
    settings[key] === undefined ? defaultOn : !!settings[key];
  const toggle = (f) =>
    onChange({ ...settings, [f.key]: !isOn(f.key, f.defaultOn ?? true) });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 12.5 }}>
      <div
        style={{
          overflowY: scroll ? "auto" : "visible",
          flex: scroll ? 1 : "0 0 auto",
          padding: "6px 8px 10px",
        }}
      >
        {features.map((f) => {
          const on = isOn(f.key, f.defaultOn ?? true);
          return (
            <div
              key={f.key}
              onClick={() => toggle(f)}
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#222" }}>{f.label}</div>
                {f.hint && (
                  <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>{f.hint}</div>
                )}
              </div>
              <Toggle on={on} onClick={(e) => { e.stopPropagation(); toggle(f); }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
