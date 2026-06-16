// Footer bar + the ribbon-controls drawer that slides out of it.
// Collapsed: a 36px status bar with a "🎚 Ribbons" handle on the right.
// Expanded: a ~300px panel rises above the bar holding all staff/player
// ribbon controls (RibbonControls). Esc or the handle closes it.

import { useEffect, useState } from "react";
import RibbonControls from "./RibbonControls.jsx";

const BAR_H = 36;
const DRAWER_H = 300;

export default function Footer({
  message = "",
  teamId,
  draftSegment,
  ribbonConfig,
  onRibbonConfigChange,
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
            config={ribbonConfig}
            onChange={onRibbonConfigChange}
          />
        )}
      </div>

      {/* bar */}
      <div
        style={{
          height: BAR_H,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          boxSizing: "border-box",
          fontSize: 12,
          color: "#444",
        }}
      >
        <span>{message || ""}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{
            border: "1px solid #d6dae2",
            borderRadius: 6,
            background: open ? "#eef1f6" : "#fff",
            padding: "3px 10px",
            fontSize: 12,
            cursor: "pointer",
            color: "#333",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🎚 Ribbons
          {nPlayers > 0 && (
            <span
              style={{
                background: "#2d6cdf",
                color: "#fff",
                borderRadius: 8,
                padding: "0 6px",
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              {nPlayers}
            </span>
          )}
          <span style={{ fontSize: 10, color: "#888" }}>{open ? "⌄" : "⌃"}</span>
        </button>
      </div>
    </footer>
  );
}
