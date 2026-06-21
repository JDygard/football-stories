// Footer bar — two equal primary buttons that each open a drawer above the bar.
//   Left:  ⚙️ Settings  -> display toggles (SettingsDrawer)
//   Right: 👥 Personnel -> "Personnel Tracks": staff + player tenure bands
//          on the timeline (RibbonControls).
// Only one drawer is open at a time (they share the space above the bar).
// Esc or tapping the active button closes it.

import { useEffect, useState } from "react";
import RibbonControls from "./RibbonControls.jsx";
import SettingsDrawer from "./SettingsDrawer.jsx";

const BAR_H = 44;
const DRAWER_H = 300;

const ACCENT = "#2d6cdf";

export default function Footer({
  teamId,
  draftSegment,
  ribbonConfig,
  onRibbonConfigChange,
  settings,
  onSettingsChange,
}) {
  // null | "settings" | "personnel"
  const [openDrawer, setOpenDrawer] = useState(null);
  const open = openDrawer !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpenDrawer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = (which) => setOpenDrawer((cur) => (cur === which ? null : which));
  const nPlayers = (ribbonConfig?.players || []).length;

  return (
    <footer
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        zIndex: 25,
        display: "flex",
        flexDirection: "column",
        background: "#fafafa",
        borderTop: "1px solid #ccc",
        boxShadow: open ? "0 -8px 28px rgba(0,0,0,0.14)" : "none",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* drawer */}
      <div
        style={{
          height: open ? DRAWER_H : 0,
          overflow: "hidden",
          transition: "height 0.22s ease",
          background: "#fff",
          borderBottom: open ? "1px solid #e8eaef" : "none",
        }}
      >
        {openDrawer === "settings" && (
          <SettingsDrawer settings={settings} onChange={onSettingsChange} />
        )}
        {openDrawer === "personnel" && ribbonConfig && (
          <RibbonControls
            teamId={teamId}
            draftSegment={draftSegment}
            config={ribbonConfig}
            onChange={onRibbonConfigChange}
          />
        )}
      </div>

      {/* bar — only these two buttons, splitting the width evenly */}
      <div style={{ height: BAR_H, display: "flex", alignItems: "stretch" }}>
        <DrawerButton
          icon="⚙️"
          label="Settings"
          active={openDrawer === "settings"}
          onClick={() => toggle("settings")}
        />
        <div style={{ width: 1, background: "#e2e4ea" }} />
        <DrawerButton
          icon="👥"
          label="Personnel"
          active={openDrawer === "personnel"}
          onClick={() => toggle("personnel")}
          badge={nPlayers > 0 ? nPlayers : null}
        />
      </div>
    </footer>
  );
}

function DrawerButton({ icon, label, active, onClick, badge = null }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={active}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: "100%",
        border: "none",
        borderTop: `2px solid ${active ? ACCENT : "transparent"}`,
        background: active ? "#eef2fb" : "transparent",
        color: active ? "#1f2d4d" : "#3a3f47",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f1f2f5"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      {label}
      {badge != null && (
        <span
          style={{
            background: ACCENT,
            color: "#fff",
            borderRadius: 8,
            padding: "0 6px",
            fontSize: 10.5,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
