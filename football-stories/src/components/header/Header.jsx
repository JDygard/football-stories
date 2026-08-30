import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import TeamTab from "./TeamTab";
import TeamSelect from "./TeamSelect";
import SearchBox from "./SearchBox";

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
  onSearchSelect,
  onOpenAbout,
  onOpenTeams = null,
  teamsOpen = false,
  // Hold the header open regardless of scrolling. Set while the menu-zoom rung
  // owns the surface: there the scroller is paging between tutorial slides, not
  // reading a timeline, and one of those slides draws an arrow to the team tab
  // in this very header — hide-on-scroll would have taken the target away at
  // exactly the moment it was being pointed at.
  pinned = false,
}) {
  const controls = useAnimation();

  const [teamSelectOpen, setTeamSelectOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll bookkeeping for the hide-on-scroll-down / show-on-scroll-up header.
  // None of these feed render — the visible hide/show is animated by
  // framer-motion `controls` — so they live in refs. That keeps the scroll
  // handler entirely off React's render path: no setState per scroll frame and
  // no listener re-subscription (the effect binds once), which matters on iOS
  // where this fires alongside the timeline's own scroll handler.
  const lastYRef = useRef(0);
  const accumulatedDownRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (pinned) {
      // Re-show if a previous scroll had tucked it away, then bind nothing.
      if (!visibleRef.current) {
        visibleRef.current = true;
        controls.start({ height: HEADER_H, y: 0, transition: { duration: 0.2 } });
      }
      accumulatedDownRef.current = 0;
      return;
    }
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastYRef.current;

      if (delta > 0) {
        accumulatedDownRef.current += delta;
        if (visibleRef.current && accumulatedDownRef.current > HIDE_THRESHOLD) {
          visibleRef.current = false;
          controls.start({
            height: 0,
            y: -HEADER_H,
            transition: { duration: 0.25 },
          });
        }
      } else if (delta < 0) {
        if (!visibleRef.current) {
          visibleRef.current = true;
          controls.start({
            height: HEADER_H,
            y: 0,
            transition: { duration: 0.25 },
          });
        }
        accumulatedDownRef.current = 0;
      }

      lastYRef.current = y;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, controls, pinned]);

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
          borderBottom: "1px solid #0a1626",
          background: "#0f2036", // deep navy chrome (mockup palette)
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          boxSizing: "border-box",
          position: "relative"
        }}
      >
        {/* left: hamburger */}
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <button
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              border: "none",
              background: "none",
              fontSize: 18,
              cursor: "pointer",
              padding: "2px 8px 2px 0",
              color: "#fff",
              lineHeight: 1,
            }}
          >
            ☰
          </button>
        </div>

        {/* center: team pill. `onOpenTeams` lets a shell own the picker
            itself — desktop opens a drawer anchored under this header instead
            of TeamSelect's full-screen takeover. Absent (mobile), the header
            keeps handling it. */}
        <TeamTab
          teamId={selectedTeam}
          onOpen={() => (onOpenTeams ? onOpenTeams() : setTeamSelectOpen(true))}
          // A shell that owns the picker is the desktop one, and that's the
          // header where the tab needs to look like a control.
          prominent={!!onOpenTeams}
          open={teamsOpen}
        />

        {/* right: search */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <SearchBox onSelect={onSearchSelect} />
        </div>
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
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                onOpenAbout && onOpenAbout();
              }}
            >
              ✎ About this project
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
