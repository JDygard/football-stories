// Desktop (landscape) app shell — the wide-viewport sibling of App.jsx.
//
// Deliberately a SEPARATE component tree: it duplicates App's small amount of
// top-level state/wiring (team selection, settings, ribbon config, deep-link
// focus, career-follow handoff) instead of sharing it, so desktop and mobile
// work never step on each other. The chrome (Header, League / Methodology
// modals, InfoCard) is reused as-is: those components position themselves
// `fixed` and are contained by this shell's `.desktop-frame` wrapper, which
// carries the same load-bearing transform trick as the mobile `.app-frame`
// (see desktop.css) — here the frame IS the whole window instead of a phone
// letterbox.
//
// No footer/drawers on desktop: Settings and Personnel Tracks (the mobile
// drawers' content components, reused unchanged) live in a PERSISTENT CONTROL
// DOCK — always open, fixed height, no toggling.
//
// The dock runs along the BOTTOM of the window rather than down one side. Width
// is the axis the timeline is built on (time flows left→right), so a side rail
// taxed the single dimension that matters most, while squeezing its own
// controls into a 320px column. Along the bottom, RibbonControls gets its full
// horizontal control strip and the timeline gets every pixel of width; the only
// cost is a fixed slice of height, which the lane caps anyway (LANE_MAX in
// DesktopTimelineLayer — it never stretches to fill the window).

import { useCallback, useEffect, useRef, useState } from 'react'

import './desktop.css'
import '../App.css'
import Header from '../components/header/Header.jsx'
import DesktopMain from './DesktopMain.jsx'
import SettingsDrawer from '../components/SettingsDrawer.jsx'
import RibbonControls from '../components/RibbonControls.jsx'
import LeagueView from '../components/LeagueView.jsx'
import MethodologyView from '../components/MethodologyView.jsx'
import AboutView from '../components/AboutView.jsx'
import DesktopTeamDrawer from './DesktopTeamDrawer.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import useTeamData from '../hooks/useTeamData'
import { FRAME_ID } from '../utils/frameRect'

// Control dock geometry. DOCK_H is deliberately a constant rather than a
// fraction of the window: the timeline lane is content-capped, so giving the
// dock a stable height keeps the timeline's vertical composition identical at
// every window size.
//
// It's tall because the Personnel Tracks panel is a working surface, not a
// legend — a filter strip, the selected-player chips, and a scrolling tenure
// list of everyone who ever played for the franchise. At 196px that list showed
// about three rows at a time and you scrolled for everything.
const DOCK_H = 344
const DOCK_SETTINGS_W = 360 // the toggle rows read comfortably at this width

// SWEEP — following a career link moves the whole timeline AWAY from where the
// destination lies, then brings that team in from the side it sits on. The
// travel is vertical, because the ribbons already put the next team below the
// screen (a tenure's exit connector drops downward to its "To <team>" pill) and
// the previous team above it. See .desktop-sweep-* in desktop.css.
// Durations must match those keyframes.
const SWEEP_OUT_MS = 220
const SWEEP_IN_MS = 280

function PanelHeading({ icon, label, badge = null }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px 7px',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: '#3a3f47',
        borderBottom: '1px solid #e8eaef',
        background: '#f4f5f8',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      {label}
      {badge != null && (
        <span
          style={{
            background: '#2d6cdf',
            color: '#fff',
            borderRadius: 8,
            padding: '0 6px',
            fontSize: 10.5,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

const DEFAULT_RIBBONS = {
  roles: { coach: true, gm: true, owner: true, unknown: true },
  players: [],
};

function DesktopApp() {
  const [selectedTeam, setSelectedTeam] = useState("ARI");
  // Display toggles surfaced in the Settings drawer. Missing key => on.
  const [settings, setSettings] = useState({});
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [teamDrawerOpen, setTeamDrawerOpen] = useState(false);
  const [ribbonConfig, setRibbonConfig] = useState(DEFAULT_RIBBONS);
  // Deep-link target: when set, the timeline scrolls to this year once the
  // right team's data is mounted.
  const [focusYear, setFocusYear] = useState(null);
  // Career-follow handoff (see App.jsx).
  const [pendingFollow, setPendingFollow] = useState(null);

  // Career-follow sweep: { dir, phase }. dir is +1 (following someone onward —
  // the destination is below, so the view exits upward) or -1 (following them
  // back, which is above). See SWEEP above.
  const [sweep, setSweep] = useState(null);
  const [outElapsed, setOutElapsed] = useState(false);

  const { mapped, draftSegment, erasSegment, adminById } = useTeamData(selectedTeam);

  // LAST GOOD DATA. useTeamData nulls its segment the moment the team id
  // changes, so `mapped` goes null for the whole fetch. The shell used to
  // return a bare "Loading…" div at that point, tearing down the header, the
  // control dock and the timeline and rebuilding them a moment later — the
  // flash. Holding the previous team's data lets the chrome stay put and the
  // outgoing timeline stay on screen until the new one is genuinely ready.
  const lastGoodRef = useRef(null);
  if (mapped) lastGoodRef.current = { mapped, draftSegment, erasSegment };

  // Frozen snapshot displayed for the duration of a sweep's OUT phase, so the
  // content can't swap under the animation if the fetch resolves early.
  const [frozen, setFrozen] = useState(null);
  const liveRef = useRef({ mapped, draftSegment, erasSegment });
  liveRef.current = { mapped, draftSegment, erasSegment };

  const mainRef = useRef(null);
  // The header row + team drawer together; the drawer dismisses on a
  // pointer-down outside THIS, not outside itself (see DesktopTeamDrawer).
  const headerZoneRef = useRef(null);

  // Team switches clear player-ribbon selections (they're per-franchise).
  const selectTeam = useCallback((team) => {
    setSelectedTeam(team);
    setRibbonConfig((c) => ({ ...c, players: [] }));
  }, []);

  const goTo = useCallback((team, year, follow = null, dir = 0) => {
    setLeagueOpen(false);
    setFocusYear(year ?? null);
    setPendingFollow(follow && follow.id ? follow : null);
    // Only a career-follow sweeps: it has a direction to express (this person
    // went from here to there). Picking a team from the header, the search box
    // or the league view is a jump, not a journey — it swaps in place.
    setSelectedTeam((prev) => {
      if (dir && prev !== team) {
        setSweep({ dir, phase: "out" });
        setOutElapsed(false);
        setFrozen(liveRef.current);
      }
      if (prev !== team) {
        setRibbonConfig((c) => ({
          ...c,
          players: [],
          roles:
            follow && follow.kind === "staff" && follow.role
              ? { ...c.roles, [follow.role]: true }
              : c.roles,
        }));
      } else if (follow && follow.kind === "staff" && follow.role) {
        setRibbonConfig((c) => ({ ...c, roles: { ...c.roles, [follow.role]: true } }));
      }
      return team;
    });
  }, []);
  const clearFocus = useCallback(() => setFocusYear(null), []);

  // ---- SWEEP state machine ----
  // out: the outgoing timeline slides away and fades. It ends only when BOTH
  // the animation has run its course AND the destination data has arrived, so a
  // fast fetch never cuts the motion short and a slow one never leaves a gap —
  // the frozen snapshot simply holds until the new team is ready.
  useEffect(() => {
    if (sweep?.phase !== "out") return undefined;
    const t = setTimeout(() => setOutElapsed(true), SWEEP_OUT_MS);
    return () => clearTimeout(t);
  }, [sweep]);

  const destReady = !!mapped && mapped.team === selectedTeam;
  useEffect(() => {
    if (sweep?.phase !== "out" || !outElapsed || !destReady) return;
    setFrozen(null); // release the old team; the new one renders…
    setSweep({ dir: sweep.dir, phase: "in" }); // …entering from the far side
  }, [sweep, outElapsed, destReady]);

  useEffect(() => {
    if (sweep?.phase !== "in") return undefined;
    const t = setTimeout(() => setSweep(null), SWEEP_IN_MS);
    return () => clearTimeout(t);
  }, [sweep]);

  // Resolve a career-follow once the destination team's data is mounted.
  useEffect(() => {
    if (!pendingFollow) return;
    if (!mapped || mapped.team !== selectedTeam) return; // wait for dest data

    const { id, kind } = pendingFollow;
    if (kind === "staff") {
      const span = (mapped.staff || []).find((s) => s.admin_person_id === id);
      if (span) setFocusYear(span.from);
      setPendingFollow(null);
      return;
    }

    // Player: find their stint with this franchise, select it, scroll to it.
    let cancelled = false;
    fetch(`/data/segments/teams_tenures/${selectedTeam}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        const row = (json?.tenures || []).find(
          (t) => (t.player_id_internal || t.player_id) === id,
        );
        if (row) {
          setRibbonConfig((c) => ({
            ...c,
            players: [
              {
                player_id: id,
                name: row.name ?? pendingFollow.name,
                position: row.position ?? pendingFollow.position,
                from: row.from,
                to: row.to,
                source: row.source,
                prev_team: row.prev_team,
                next_team: row.next_team,
                entry: row.entry,
                exit: row.exit,
                conf: row.conf,
              },
            ],
          }));
          setFocusYear(row.from);
        }
        setPendingFollow(null);
      })
      .catch(() => {
        if (!cancelled) setPendingFollow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pendingFollow, mapped, selectedTeam]);

  // What the timeline actually renders. During a sweep's OUT phase it's the
  // frozen snapshot; otherwise the live data, falling back to the last team we
  // successfully loaded while the next one is in flight. Only on a genuine cold
  // start is there nothing to draw — and even then the shell below still
  // renders, so the header and dock never blink out of existence.
  const shown =
    frozen || (mapped ? { mapped, draftSegment, erasSegment } : lastGoodRef.current);
  const coldStart = !shown;

  // Only hand the focus target to the timeline once the CORRECT team's data
  // is mounted — otherwise the old team's layout would consume it.
  const readyFocusYear =
    !frozen && mapped && mapped.team === selectedTeam ? focusYear : null;

  const sweepClass = sweep
    ? `desktop-sweep-${sweep.phase}-${sweep.dir > 0 ? 'fwd' : 'back'}`
    : '';

  return (
    <ErrorBoundary fallback={<div>Something went wrong.</div>}>
      {/* Full-window landscape frame. Containing block for every
          `position: fixed` overlay in the app (see .desktop-frame in
          desktop.css) — don't remove its transform. */}
      <div className="desktop-frame" id={FRAME_ID}>
      <div style={{
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header row, and the anchor for the team drawer. The drawer is
            absolutely positioned at this wrapper's bottom edge, so it hangs
            under the header WITHOUT taking layout: the timeline keeps its box
            and its scroll position, and closing the drawer restores the view
            exactly rather than reflowing it back. */}
        <div ref={headerZoneRef} style={{ position: 'relative', flexShrink: 0, zIndex: 40 }}>
          <Header
            scrollRef={mainRef}
            selectedTeam={selectedTeam}
            setSelectedTeam={selectTeam}
            onOpenLeague={() => setLeagueOpen(true)}
            onOpenMethodology={() => setMethodologyOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
            onSearchSelect={goTo}
            onOpenTeams={() => setTeamDrawerOpen((v) => !v)}
          />
          {teamDrawerOpen && (
            <DesktopTeamDrawer
              selectedTeam={selectedTeam}
              boundaryRef={headerZoneRef}
              onClose={() => setTeamDrawerOpen(false)}
              onSelect={(teamId) => {
                setTeamDrawerOpen(false);
                selectTeam(teamId);
              }}
            />
          )}
        </div>
        {/* Timeline pane — full window width, no side rail.
            The sweep class lives on this wrapper, so the animation moves the
            timeline WITHOUT touching the surrounding layout: the header and
            dock hold still, the pane keeps its box, and only the painted
            content travels. The edge-fade mask is part of that class (see
            desktop.css) rather than a layout inset, for the same reason. */}
        <div className={sweepClass} style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {coldStart ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#8b93a1' }}>
              Loading…
            </div>
          ) : (
            <DesktopMain
              ref={mainRef}
              mapped={shown.mapped}
              draftSegment={shown.draftSegment}
              erasSegment={shown.erasSegment}
              settings={settings}
              adminById={adminById}
              focusYear={readyFocusYear}
              onFocusConsumed={clearFocus}
              ribbonConfig={ribbonConfig}
              onFollow={goTo}
            />
          )}
        </div>
        {/* Persistent control dock along the bottom: Settings left, Personnel
            Tracks right. Always open, fixed height. */}
        <aside
          style={{
            height: DOCK_H,
            flexShrink: 0,
            borderTop: '1px solid #dfe3ea',
            background: '#fafbfc',
            display: 'flex',
            minHeight: 0,
          }}
        >
          <section
            style={{
              width: DOCK_SETTINGS_W,
              flexShrink: 0,
              borderRight: '1px solid #e4e7ee',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <PanelHeading icon="⚙️" label="SETTINGS" />
            <div style={{ flex: 1, minHeight: 0 }}>
              <SettingsDrawer desktop settings={settings} onChange={setSettings} />
            </div>
          </section>
          <section
            style={{
              flex: 1,
              minWidth: 0,
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <PanelHeading
              icon="👥"
              label="PERSONNEL TRACKS"
              badge={(ribbonConfig.players || []).length || null}
            />
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <RibbonControls
                teamId={selectedTeam}
                draftSegment={draftSegment}
                config={ribbonConfig}
                onChange={setRibbonConfig}
              />
            </div>
          </section>
        </aside>
        {leagueOpen && (
          <LeagueView onClose={() => setLeagueOpen(false)} onGoTo={goTo} />
        )}
        {methodologyOpen && (
          <MethodologyView onClose={() => setMethodologyOpen(false)} />
        )}
        {aboutOpen && (
          <AboutView
            onClose={() => setAboutOpen(false)}
            onOpenMethodology={() => setMethodologyOpen(true)}
          />
        )}
      </div>
      </div>
    </ErrorBoundary>
  )
}

export default DesktopApp
