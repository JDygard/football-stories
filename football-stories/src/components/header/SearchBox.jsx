// NFL-wide search box in the header. Type a name → matching people, expanded
// to one row per franchise stint. Selecting a row calls onSelect(team, year,
// follow), which is App.goTo: it switches franchise, enables/adds that
// person's ribbon, and scrolls to their era.
//
// The header has overflow:hidden, so the results panel is rendered as a fixed
// overlay anchored under the input (measured on open) rather than inline.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSearchIndex from "../../hooks/useSearchIndex.js";
import { frameRect } from "../../utils/frameRect.js";
import { roleColor, positionGroup } from "../visualization/staffRibbonModel.js";
import { teamName } from "../visualization/teamMeta.js";

const ROLE_LABEL = { coach: "Coach", gm: "GM", owner: "Owner", unknown: "Staff" };
const MIN_CHARS = 2;
const MAX_ROWS = 40;

function dotColor(row) {
  return row.kind === "staff"
    ? roleColor(row.role || "unknown")
    : roleColor(positionGroup(row.position));
}

function metaLabel(row) {
  if (row.kind === "staff") return ROLE_LABEL[row.role] || "Staff";
  return row.position || "Player";
}

export default function SearchBox({ onSelect }) {
  const { status, ensureLoaded, search } = useSearchIndex();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const blurTimer = useRef(null);

  const rows = useMemo(
    () => (query.trim().length >= MIN_CHARS ? search(query, MAX_ROWS) : []),
    [query, search],
  );

  // Keep the highlighted row in range as the result set shrinks/grows; the
  // highlight is also reset to the top on each keystroke (see onChange).
  const activeIndex = Math.min(active, Math.max(0, rows.length - 1));

  const measure = useCallback(() => {
    const el = inputRef.current;
    if (el) setRect(el.getBoundingClientRect());
  }, []);

  // Keep the panel pinned under the input while it's open.
  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  const openMenu = useCallback(() => {
    clearTimeout(blurTimer.current);
    ensureLoaded();
    measure();
    setOpen(true);
  }, [ensureLoaded, measure]);

  const choose = useCallback(
    (row) => {
      const follow =
        row.kind === "staff"
          ? { id: row.id, kind: "staff", role: row.role, name: row.name }
          : { id: row.id, kind: "player", name: row.name, position: row.position };
      onSelect && onSelect(row.team, row.from, follow);
      setQuery("");
      setOpen(false);
      inputRef.current && inputRef.current.blur();
    },
    [onSelect],
  );

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      openMenu();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (rows[activeIndex]) {
        e.preventDefault();
        choose(rows[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current && inputRef.current.blur();
    }
  };

  // Close shortly after blur, but not when the blur is caused by clicking a
  // row (rows preventDefault on mousedown so focus never actually leaves).
  const onBlur = () => {
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const showPanel = open && query.trim().length >= MIN_CHARS;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) openMenu();
        }}
        onFocus={openMenu}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder="Search player/coach/owner"
        aria-label="Search players, coaches, and owners"
        style={{
          width: "160px",
          height: "24px",
          padding: "0 8px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          outline: "none",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      />

      {showPanel && rect && (
        <div
          style={{
            position: "fixed",
            // `fixed` here resolves against the device frame, not the viewport
            // (see .app-frame in index.css), so the measured input rect —
            // viewport coordinates — is rebased onto the frame's origin.
            top: rect.bottom - frameRect().top + 4,
            right: Math.max(8, Math.round(frameRect().right - rect.right)),
            width: "min(320px, calc(100% - 16px))",
            maxHeight: 360,
            overflowY: "auto",
            zIndex: 50,
            background: "#fff",
            border: "1px solid #d6dae2",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
            padding: 4,
          }}
        >
          {status === "loading" && !rows.length && (
            <div style={MSG}>Loading search index…</div>
          )}
          {status === "error" && <div style={MSG}>Search is unavailable.</div>}
          {status === "ready" && !rows.length && (
            <div style={MSG}>No matches.</div>
          )}

          {rows.map((row, i) => (
            <button
              key={row.key}
              // mousedown (not click) + preventDefault keeps focus on the input
              // so onBlur doesn't close the panel before the selection lands.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(row);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                textAlign: "left",
                border: "none",
                borderRadius: 6,
                padding: "6px 8px",
                cursor: "pointer",
                background: i === activeIndex ? "#f2f4f8" : "none",
                fontSize: 12.5,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: dotColor(row),
                  flex: "0 0 auto",
                }}
              />
              <span
                style={{
                  fontWeight: 600,
                  color: "#222",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1,
                }}
              >
                {row.name}
              </span>
              <span style={{ color: "#888", flex: "0 0 auto" }}>
                {metaLabel(row)}
              </span>
              <span
                style={{ color: "#2d5cb8", fontWeight: 600, flex: "0 0 auto" }}
              >
                {teamName(row.team)}
              </span>
              <span
                style={{ color: "#aab", flex: "0 0 auto", fontVariantNumeric: "tabular-nums" }}
              >
                {row.from}
                {row.to && row.to !== row.from ? `–${row.to}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const MSG = { padding: "10px 12px", color: "#999", fontSize: 12.5 };
