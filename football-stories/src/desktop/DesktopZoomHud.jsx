// Desktop zoom HUD — the landscape sibling of components/ZoomHud.jsx. Same
// self-fading caption keyed by the committed band, positioned ABSOLUTE at the
// bottom of the timeline pane — it fades out over the timeline and stops at the
// control dock rather than overlaying it.
//
// The desktop ladder is exactly ZOOM_LEVELS rungs now (DESKTOP_BANDS drops the
// duplicate coarse band), so LevelBars maps one bar per rung with none doubled.

import { useEffect, useRef } from "react";
import { ZOOM_LEVELS, isMenuBand, zoomLabelFor } from "./desktopDetail.js";

function LevelBars({ zoom }) {
  const levels = Array.from({ length: ZOOM_LEVELS }, (_, i) => ZOOM_LEVELS - i);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2.5,
        marginBottom: 2,
      }}
    >
      {levels.map((level) => (
        <span
          key={level}
          style={{
            width: 5 + (ZOOM_LEVELS + 1 - level) * 3.5,
            height: 3,
            borderRadius: 2,
            background: level === zoom ? "#fff" : "rgba(255,255,255,0.32)",
          }}
        />
      ))}
    </div>
  );
}

export default function DesktopZoomHud({ band }) {
  const { zoom, name } = zoomLabelFor(band);
  // Suppress the caption on first paint — only surface on an actual change.
  const firstRef = useRef(true);
  useEffect(() => {
    firstRef.current = false;
  }, []);
  if (firstRef.current) return null;
  // The menu rung is not a level of detail — see the mobile HUD.
  if (isMenuBand(band)) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <div
        key={band}
        className="zoom-hud"
        style={{
          width: "100%",
          height: 74,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 11,
          paddingBottom: 13,
          boxSizing: "border-box",
          background:
            "linear-gradient(to top, rgba(16,19,26,0.82) 0%, rgba(16,19,26,0.5) 42%, rgba(16,19,26,0) 100%)",
        }}
      >
        <LevelBars zoom={zoom} />
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 0.4,
            color: "#fff",
            textShadow: "0 1px 3px rgba(0,0,0,0.45)",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
}
