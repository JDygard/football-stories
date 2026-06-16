import { useCallback, useRef, useState } from 'react'

import './App.css'
import Header from './components/header/Header.jsx'
import Main from './components/Main.jsx'
import Footer from './components/Footer.jsx'
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
  const [settings] = useState({}); // offseason module toggles (control panel will lift this)
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  // What the ribbon layer shows: staff role toggles + selected player spans.
  const [ribbonConfig, setRibbonConfig] = useState(DEFAULT_RIBBONS);
  // Deep-link target: when set, the timeline scrolls to this year once the
  // right team's data is mounted (leaderboard rows, future career-follow).
  const [focusYear, setFocusYear] = useState(null);

  const { mapped, loading, draftSegment, adminById } = useTeamData(selectedTeam);

  const mainRef = useRef(null);

  // Team switches clear player-ribbon selections (they're per-franchise).
  const selectTeam = useCallback((team) => {
    setSelectedTeam(team);
    setRibbonConfig((c) => ({ ...c, players: [] }));
  }, []);

  const goTo = useCallback((team, year) => {
    setLeagueOpen(false);
    setFocusYear(year ?? null);
    setSelectedTeam((prev) => {
      if (prev !== team) setRibbonConfig((c) => ({ ...c, players: [] }));
      return team;
    });
  }, []);
  const clearFocus = useCallback(() => setFocusYear(null), []);

  if (loading || !mapped) return <div>Loading…</div>;

  // Only hand the focus target to the timeline once the CORRECT team's data
  // is mounted — otherwise the old team's layout would consume it.
  const readyFocusYear = mapped.team === selectedTeam ? focusYear : null;

  return (
    <ErrorBoundary fallback={<div>Something went wrong.</div>}>
      <div style={{
        maxHeight: '100vh',
        height: "100vh",
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
          />
        </div>
        <Footer
          teamId={selectedTeam}
          draftSegment={draftSegment}
          ribbonConfig={ribbonConfig}
          onRibbonConfigChange={setRibbonConfig}
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
