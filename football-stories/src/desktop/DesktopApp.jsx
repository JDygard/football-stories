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
// No footer/drawers on desktop: the width pays for a PERSISTENT SIDEBAR that
// keeps Settings and Personnel Tracks (the mobile drawers' content
// components, reused unchanged) on-screen at all times next to the timeline.

import { useCallback, useEffect, useRef, useState } from 'react'

import './desktop.css'
import '../App.css'
import Header from '../components/header/Header.jsx'
import DesktopMain from './DesktopMain.jsx'
import SettingsDrawer from '../components/SettingsDrawer.jsx'
import RibbonControls from '../components/RibbonControls.jsx'
import LeagueView from '../components/LeagueView.jsx'
import MethodologyView from '../components/MethodologyView.jsx'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import useTeamData from '../hooks/useTeamData'
import { FRAME_ID } from '../utils/frameRect'

const SIDEBAR_W = 320

function SidebarHeading({ icon, label, badge = null }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px 8px',
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
  const [ribbonConfig, setRibbonConfig] = useState(DEFAULT_RIBBONS);
  // Deep-link target: when set, the timeline scrolls to this year once the
  // right team's data is mounted.
  const [focusYear, setFocusYear] = useState(null);
  // Career-follow handoff (see App.jsx).
  const [pendingFollow, setPendingFollow] = useState(null);

  const { mapped, loading, draftSegment, adminById } = useTeamData(selectedTeam);

  const mainRef = useRef(null);

  // Team switches clear player-ribbon selections (they're per-franchise).
  const selectTeam = useCallback((team) => {
    setSelectedTeam(team);
    setRibbonConfig((c) => ({ ...c, players: [] }));
  }, []);

  const goTo = useCallback((team, year, follow = null) => {
    setLeagueOpen(false);
    setFocusYear(year ?? null);
    setPendingFollow(follow && follow.id ? follow : null);
    setSelectedTeam((prev) => {
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

  if (loading || !mapped)
    return (
      <div className="desktop-frame" id={FRAME_ID} style={{ display: 'grid', placeItems: 'center' }}>
        Loading…
      </div>
    );

  // Only hand the focus target to the timeline once the CORRECT team's data
  // is mounted — otherwise the old team's layout would consume it.
  const readyFocusYear = mapped.team === selectedTeam ? focusYear : null;

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
        <Header
          scrollRef={mainRef}
          selectedTeam={selectedTeam}
          setSelectedTeam={selectTeam}
          onOpenLeague={() => setLeagueOpen(true)}
          onOpenMethodology={() => setMethodologyOpen(true)}
          onSearchSelect={goTo}
        />
        {/* timeline pane + persistent controls sidebar */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
            <DesktopMain
              ref={mainRef}
              mapped={mapped}
              draftSegment={draftSegment}
              settings={settings}
              adminById={adminById}
              focusYear={readyFocusYear}
              onFocusConsumed={clearFocus}
              ribbonConfig={ribbonConfig}
              onFollow={goTo}
            />
          </div>
          <aside
            style={{
              width: SIDEBAR_W,
              flexShrink: 0,
              borderLeft: '1px solid #dfe3ea',
              background: '#fafbfc',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <SidebarHeading icon="⚙️" label="SETTINGS" />
            <div style={{ flexShrink: 0, background: '#fff' }}>
              <SettingsDrawer settings={settings} onChange={setSettings} />
            </div>
            <SidebarHeading
              icon="👥"
              label="PERSONNEL TRACKS"
              badge={(ribbonConfig.players || []).length || null}
            />
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
              <RibbonControls
                teamId={selectedTeam}
                draftSegment={draftSegment}
                config={ribbonConfig}
                onChange={setRibbonConfig}
              />
            </div>
          </aside>
        </div>
        {leagueOpen && (
          <LeagueView onClose={() => setLeagueOpen(false)} onGoTo={goTo} />
        )}
        {methodologyOpen && (
          <MethodologyView onClose={() => setMethodologyOpen(false)} />
        )}
      </div>
      </div>
    </ErrorBoundary>
  )
}

export default DesktopApp
