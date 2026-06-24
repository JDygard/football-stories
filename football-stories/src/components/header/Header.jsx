import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import TeamTab from "./TeamTab";
import TeamSelect from "./TeamSelect";

const HEADER_H = 48;
const HIDE_THRESHOLD = 0;

function MenuItem({ children, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        border: "none",
        background: "none",
        fontSize: 13,
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        color: disabled ? "#aaa" : "#222",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "#f2f4f8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
      }}
    >
      {children}
    </button>
  );
}

export default function Header({
  scrollRef,
  selectedTeam,
  setSelectedTeam,
  onOpenLeague,
  onOpenMethodology,
}) {
  const controls = useAnimation();

  const [teamSelectOpen, setTeamSelectOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [lastY, setLastY] = useState(0);
  const [accumulatedDown, setAccumulatedDown] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastY;

      if (delta > 0) {
        const nextAccum = accumulatedDown + delta;
        if (visible && nextAccum > HIDE_THRESHOLD) {
          setVisible(false);
          controls.start({
            height: 0,
            y: -HEADER_H,
            transition: { duration: 0.25 }
          });
        }
        setAccumulatedDown(nextAccum);
      }

      if (delta < 0) {
        if (!visible) {
          setVisible(true);
          controls.start({
            height: HEADER_H,
            y: 0,
            transition: { duration: 0.25 }
          });
        }
        setAccumulatedDown(0);
      }

      setLastY(y);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, lastY, accumulatedDown, visible, controls]);

  // close the menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <motion.header
        animate={controls}
        initial={{ height: HEADER_H, y: 0 }}
        style={{
          width: "100%",
          overflow: "hidden",
          borderBottom: "1px solid #ccc",
          background: "#fff",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          boxSizing: "border-box",
          position: "relative"
        }}
      >
        <button
          aria-label="Menu"
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            border: "none",
            background: "none",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 8px 2px 0",
            color: "#333",
            lineHeight: 1,
          }}
        >
          ☰
        </button>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Football Stories</div>
        <div style={{ flex: 1 }} />

        {/* centered team pill — the header's focal point */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
          }}
        >
          <TeamTab
            teamId={selectedTeam}
            onOpen={() => setTeamSelectOpen(true)}
          />
        </div>

        <input
          type="text"
          placeholder="Search player/coach/owner"
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
      </motion.header>

      {menuOpen && (
        <>
          {/* click-away catcher */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 39 }}
          />
          <div
            style={{
              position: "fixed",
              top: HEADER_H + 4,
              left: 8,
              zIndex: 40,
              background: "#fff",
              border: "1px solid #d6dae2",
              borderRadius: 8,
              boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
              minWidth: 220,
              padding: 6,
            }}
          >
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                onOpenLeague && onOpenLeague();
              }}
            >
              🏆 League leaderboards
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                onOpenMethodology && onOpenMethodology();
              }}
            >
              ⓘ How grades work
            </MenuItem>
          </div>
        </>
      )}

      {teamSelectOpen && (
        <TeamSelect
          onClose={() => setTeamSelectOpen(false)}
          onSelect={(teamId) => {
            setSelectedTeam(teamId);
            setTeamSelectOpen(false);
          }}
        />
      )}
    </>
  );
}
