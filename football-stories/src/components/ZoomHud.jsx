// Transient zoom-level HUD — a full-width caption that surfaces just above the
// footer whenever the committed detail band changes, then fades. Rendered as a
// bottom-anchored band whose background gradient fades out upward (no pill, no
// hard edge), with the plain-language band name spanning the viewport and a
// little vertically-stepped level indicator to its left.
//
// It reads the post-hysteresis band (the one that actually rendered) so the
// label never disagrees with the view. No state / timers: the band is keyed by
// detail band, so each zoom change remounts it and replays a self-contained CSS
// animation that ends at opacity 0. Purely informational — no pointer events.

import { useEffect, useRef } from "react";
import { ZOOM_LEVELS, zoomLabelFor } from "./visualization/detail.js";

const FOOTER_BAR_H = 44; // keep in sync with Footer's BAR_H

// Left-of-text level indicator: a left-aligned stack of horizontal bars that
// grow wider as they go up, with the active level lit.
function LevelBars({ zoom }) {
  // top -> bottom = highest level -> lowest, so the stack steps up to the left.
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
            // widest = least detail (Eras / Franchise = Zoom 1)
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

export default function ZoomHud({ band }) {
  const { zoom, name } = zoomLabelFor(band);
  // Suppress the caption on first paint — only surface on an actual zoom change.
  const firstRef = useRef(true);
  useEffect(() => {
    firstRef.current = false;
  }, []);
  if (firstRef.current) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: FOOTER_BAR_H,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 24, // below the footer (25) so an open drawer covers it
      }}
    >
      {/* keyed by band: a new caption mounts on every zoom change and replays
          the self-fading animation */}
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
          // gradient fades out going up — strongest at the footer edge, gone by
          // the top of the band
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
