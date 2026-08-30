// Footer bar — ONE primary button, opening a drawer above it:
//   👥 Personnel -> "Personnel Tracks": staff + player tenure bands on the
//      timeline (RibbonControls).
// Esc or tapping the button closes it.
//
// It used to be two buttons, with ⚙️ Settings sharing the bar. The display
// toggles now live on the MENU-ZOOM rung — the fully-zoomed-out start page
// (src/menu/) — so the footer has a single job and does it full width.

import { useEffect, useState } from "react";
import RibbonControls from "./RibbonControls.jsx";

export const BAR_H = 44;
const DRAWER_H = 300;

const ACCENT = "#2d6cdf";

export default function Footer({
  teamId,
  draftSegment,
  staff,
  ribbonConfig,
  onRibbonConfigChange,
  onFocusYear,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        {open && ribbonConfig && (
          <RibbonControls
            teamId={teamId}
            draftSegment={draftSegment}
            staff={staff}
            config={ribbonConfig}
            onChange={onRibbonConfigChange}
            onFocusYear={onFocusYear}
          />
        )}
      </div>

      {/* bar */}
      <div style={{ height: BAR_H, display: "flex", alignItems: "stretch" }}>
        <DrawerButton
          icon="👥"
          label="Personnel"
          active={open}
          onClick={() => setOpen((v) => !v)}
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
