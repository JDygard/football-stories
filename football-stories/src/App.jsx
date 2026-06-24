import { useCallback, useEffect, useRef, useState } from 'react'

import './App.css'
import Header from './components/header/Header.jsx'
import Main from './components/Main.jsx'
import Footer, { BAR_H } from './components/Footer.jsx'
import LeagueView from './components/LeagueView.jsx'
import MethodologyView from './components/MethodologyView.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import useTeamData from './hooks/useTeamData'

const DEFAULT_RIBBONS = {
  roles: { coach: true, gm: true, owner: true, unknown: true },
  players: [],
};

function App() {
  const [selectedTeam, setSelectedTeam] = useState("ARI");
  // Display toggles surfaced in the Settings drawer (footer). Missing key =>
  // feature on, so an empty object means "everything shown" by default.
  const [settings, setSettings] = useState({});
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  // What the ribbon layer shows: staff role toggles + selected player spans.
  const [ribbonConfig, setRibbonConfig] = useState(DEFAULT_RIBBONS);
  // Deep-link target: when set, the timeline scrolls to this year once the
  // right team's data is mounted (leaderboard rows, future career-follow).
  const [focusYear, setFocusYear] = useState(null);
  // Career-follow handoff: the person tapped on the previous team, to be
  // re-selected + scrolled to once the destination team's data has mounted.
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
          // A followed staffer is shown via role toggles — make sure the role
          // is on so they're visible when we land.
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

  // Resolve a career-follow once the destination team's data is mounted:
  // re-select the person and scroll to where they are on this team.
  useEffect(() => {
    if (!pendingFollow) return;
    if (!mapped || mapped.team !== selectedTeam) return; // wait for dest data

    const { id, kind } = pendingFollow;
    if (kind === "staff") {
      // Staff ribbons render via role toggles (enabled above); just scroll to
      // the start of their tenure with this franchise.
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

  if (loading || !mapped) return <div>Loading…</div>;

  // Only hand the focus target to the timeline once the CORRECT team's data
  // is mounted — otherwise the old team's layout would consume it.
  const readyFocusYear = mapped.team === selectedTeam ? focusYear : null;

  return (
    <ErrorBoundary fallback={<div>Something went wrong.</div>}>
      {/* Reserve the fixed footer BAR's height (border-box padding) so the
          scroll area ends above it — otherwise the bottom BAR_H of content
          (latest season) is parked behind the bar and can't be scrolled into
          view. dvh keeps this aligned with the visual viewport on iOS, where
          the fixed bar sits at the dynamic-viewport bottom, not the 100vh one. */}
      <div style={{
        maxHeight: '100dvh',
        height: '100dvh',
        boxSizing: 'border-box',
        paddingBottom: BAR_H,
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
        />
        <div style={{ width: '100vw', flex: 1, height: '100%' }}>
          <Main
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
        <Footer
          teamId={selectedTeam}
          draftSegment={draftSegment}
          ribbonConfig={ribbonConfig}
          onRibbonConfigChange={setRibbonConfig}
          settings={settings}
          onSettingsChange={setSettings}
        />
        {leagueOpen && (
          <LeagueView onClose={() => setLeagueOpen(false)} onGoTo={goTo} />
        )}
        {methodologyOpen && (
          <MethodologyView onClose={() => setMethodologyOpen(false)} />
        )}
      </div>
    </ErrorBoundary>
  )
}

export default App
