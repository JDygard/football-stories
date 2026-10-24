// The open Named Era chapter, as READING MATTER.
//
// The chapter's paragraph used to be printed into the plaque itself as SVG
// text: wrapped by an estimated glyph width (so lines could run past the frame
// on a font the estimate didn't expect), set at 12.5px, and painted over the
// win-rate curve and whatever personnel ribbons crossed the plaque. On desktop
// the narrow lanes often had no room for it at all. It is HTML now, in a card
// over the timeline: real text wrapping, a reading size and measure, and room
// for the part of the chapter the plaque could never show, the people the
// curators credit with it (the same ones whose ribbons the tap switched on).
//
// Two placements. On a phone it is a bottom sheet over the timeline that can be
// folded down to its title bar so the ribbons it lit up can be read; the plaque
// tap that opened it (or the ×) closes it. On desktop (`docked`) it is the
// content of the Chapter tab in the bottom dock, beside Personnel Tracks: an
// overlay there sat on top of the far end of the timeline and the ribbons, with
// no way to move it. The dock's tab carries the title and the ×, so the docked
// body is just the reading: blurb on the left, the people on the right.

import { useState } from "react";
import { eraYearsLabel } from "./visualization/eraModel.js";

const NAVY = "#0f2036";
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

function recordText(era) {
  const r = era?.record;
  if (!r) return null;
  const wl = `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ""}`;
  const pct = era.win_pct != null ? ` · ${era.win_pct.toFixed(3).replace(/^0/, "")}` : "";
  return wl + pct;
}

function Facts({ era }) {
  const record = recordText(era);
  const playoffs = era.playoff_appearances?.length || 0;
  const titles = era.championships?.length || 0;
  if (!record && !playoffs && !titles) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {record && <Chip>{record}</Chip>}
      {playoffs > 0 && (
        <Chip>
          {playoffs} playoff trip{playoffs === 1 ? "" : "s"}
        </Chip>
      )}
      {titles > 0 && (
        <Chip strong>
          {titles} championship{titles === 1 ? "" : "s"}
        </Chip>
      )}
    </div>
  );
}

function Blurb({ era }) {
  if (!era.blurb) return null;
  return (
    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#1f2430", maxWidth: "62ch" }}>
      {era.blurb}
    </p>
  );
}

function People({ people }) {
  if (!people.length) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "#7a8494",
          marginBottom: 6,
        }}
      >
        Who made it
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {people.map((h) => (
          <li
            key={h.name}
            style={{
              padding: "7px 0",
              borderTop: "1px solid #eef0f4",
              fontSize: 13.5,
              lineHeight: 1.45,
              color: "#3a4352",
            }}
          >
            <span style={{ fontWeight: 700, color: NAVY }}>{h.name}</span>
            {h.why && <span> — {h.why}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const chapterSubtitle = (era) =>
  [eraYearsLabel(era), era?.seasons ? `${era.seasons} season${era.seasons === 1 ? "" : "s"}` : null]
    .filter(Boolean)
    .join(" · ");

export default function ChapterCard({ era, onClose, docked = false }) {
  const [folded, setFolded] = useState(false);
  if (!era) return null;
  const people = (era.highlights || []).filter((h) => h?.name);

  if (docked) {
    // Two equal halves split down the middle of the dock, each hugging the
    // centre line: the blurb's column ends at the middle, the people start
    // there. Text inside each stays left-aligned for reading; it is the blocks
    // that meet at the centre. A chapter with nobody credited centres alone.
    const half = { minWidth: 0, display: "flex", padding: "16px 28px 20px" };
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          display: "grid",
          gridTemplateColumns: people.length ? "1fr 1fr" : "1fr",
          alignItems: "start",
        }}
      >
        <div style={{ ...half, justifyContent: people.length ? "flex-end" : "center" }}>
          <div style={{ width: "100%", maxWidth: "62ch" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: "#7a8494",
              }}
            >
              {chapterSubtitle(era)}
            </div>
            <h2
              style={{
                margin: "3px 0 10px",
                fontFamily: SERIF,
                fontSize: 24,
                lineHeight: 1.2,
                fontWeight: 600,
                color: NAVY,
              }}
            >
              {era.label}
            </h2>
            <Facts era={era} />
            <Blurb era={era} />
          </div>
        </div>
        {people.length > 0 && (
          <div
            style={{
              ...half,
              justifyContent: "flex-start",
              alignSelf: "stretch",
              borderLeft: "1px solid #e8eaef",
            }}
          >
            <div style={{ width: "100%", maxWidth: "62ch", paddingTop: 4 }}>
              <People people={people} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const placement = { left: 8, right: 8, bottom: 8, maxHeight: "58%" };

  return (
    <section
      aria-label={`Chapter: ${era.label}`}
      style={{
        position: "absolute",
        ...placement,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #dfe3ea",
        boxShadow: "0 10px 32px rgba(15,32,54,0.22)",
        overflow: "hidden",
      }}
    >
      {/* Title bar: always visible, and the fold toggle. */}
      <div
        onClick={() => setFolded((f) => !f)}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: folded ? "10px 12px 10px 16px" : "14px 12px 4px 18px",
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#7a8494",
            }}
          >
            {chapterSubtitle(era)}
          </div>
          <h2
            style={{
              margin: "3px 0 0",
              fontFamily: SERIF,
              fontSize: folded ? 18 : 22,
              lineHeight: 1.2,
              fontWeight: 600,
              color: NAVY,
              whiteSpace: folded ? "nowrap" : "normal",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {era.label}
          </h2>
        </div>
        <button
          aria-label={folded ? "Expand chapter" : "Fold chapter"}
          onClick={(e) => {
            e.stopPropagation();
            setFolded((f) => !f);
          }}
          style={iconButton}
        >
          {folded ? "▴" : "▾"}
        </button>
        <button
          aria-label="Close chapter"
          onClick={(e) => {
            e.stopPropagation();
            onClose && onClose();
          }}
          style={iconButton}
        >
          ×
        </button>
      </div>

      {!folded && (
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "6px 18px 18px",
          }}
        >
          <Facts era={era} />
          <Blurb era={era} />
          {people.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <People people={people} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const iconButton = {
  flexShrink: 0,
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 8,
  background: "#f2f4f7",
  color: "#4a5363",
  fontSize: 17,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
};

function Chip({ children, strong = false }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 9px",
        borderRadius: 999,
        background: strong ? "#fff3d6" : "#f2f4f7",
        color: strong ? "#7a5200" : "#3a4352",
      }}
    >
      {children}
    </span>
  );
}
