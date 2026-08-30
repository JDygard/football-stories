import { useCallback, useEffect, useRef, useState } from 'react'

import './App.css'
import Header from './components/header/Header.jsx'
import Main from './components/Main.jsx'
import Footer, { BAR_H } from './components/Footer.jsx'
import LeagueView from './components/LeagueView.jsx'
import MethodologyView from './components/MethodologyView.jsx'
import AboutView from './components/AboutView.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import useTeamData from './hooks/useTeamData'
import { FRAME_ID } from './utils/frameRect'
import { eraCast, resolveEraStaff, resolveEraPlayers } from './utils/eraCast.js';
import { staffTrackRow } from './hooks/useTeamTenures.js';

// Every ribbon on the timeline is an explicitly chosen track now — coaches,
// GMs and owners included. There used to be a `roles` map switching whole
// categories of staff on by default, and a `staffOnly` allowlist that overrode
// it while a chapter or a career was in focus. Two mechanisms governing the
// same ribbons is what let a role toggle hide a chapter's own coach. One list.
const DEFAULT_RIBBONS = { players: [] };

function App() {
  const [selectedTeam, setSelectedTeam] = useState("ARI");
  // Display toggles, surfaced on the menu-zoom rung (they used to live in a
  // footer Settings drawer). Missing key => feature on, so an empty object
  // means "everything shown" by default.
  const [settings, setSettings] = useState({});
  // True while the fully-zoomed-out MENU rung owns the surface. The app opens
  // there, hence the initial `true`. The shell needs to know because the tour
  // draws arrows to the header — which would otherwise slide away the moment
  // the reader swiped to the slide that points at it.
  const [menuActive, setMenuActive] = useState(true);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // What the ribbon layer shows: staff role toggles + selected player spans.
  const [ribbonConfig, setRibbonConfig] = useState(DEFAULT_RIBBONS);
  // Deep-link target: when set, the timeline scrolls to this year once the
  // right team's data is mounted (leaderboard rows, future career-follow).
  const [focusYear, setFocusYear] = useState(null);
  // Career-follow handoff: the person tapped on the previous team, to be
  // re-selected + scrolled to once the destination team's data has mounted.
  const [pendingFollow, setPendingFollow] = useState(null);
  // Which Named Era chapter is open (tapped plaque), or null. Held HERE rather
  // than in Main because opening a chapter does two things at once: the plaque
  // grows to print its blurb (Main's business) and the people who made the era
  // get their personnel ribbons turned on (ribbonConfig, which is App's).
  const [focusedEraId, setFocusedEraId] = useState(null);

  const { mapped, loading, draftSegment, erasSegment, adminById } =
    useTeamData(selectedTeam);

  const mainRef = useRef(null);

  // Read-latest refs for the era-focus handler, which runs from a tap and then
  // from an async fetch, and must not close over a stale team or segment.
  const erasRef = useRef(erasSegment);
  erasRef.current = erasSegment;
  const selectedTeamRef = useRef(selectedTeam);
  selectedTeamRef.current = selectedTeam;
  // The franchise's staff rows, for resolving a chapter's staff cast.
  const staffRef = useRef(null);
  staffRef.current = mapped?.staff || null;

  // Team switches clear player-ribbon selections (they're per-franchise) and
  // the open chapter with them — era ids are per-franchise too.
  const selectTeam = useCallback((team) => {
    setSelectedTeam(team);
    setRibbonConfig((c) => ({ ...c, players: [] }));
    setFocusedEraId(null);
  }, []);

  // Tapping an era plaque. Same contract as the desktop shell (DesktopApp's
  // focusEra), with one difference: `box` arrives null when the open chapter is
  // tapped again, which closes it. See EraLayer for why a phone needs that and
  // desktop doesn't.
  //
  // Highlighting is name-matched, not id-matched, because the curated
  // highlights in eras.json name people ("Ja'Marr Chase") while the tenure
  // segment keys them by resolved person id. Names are normalised hard
  // (lowercase, alphanumerics only) and a hit must OVERLAP the era's years —
  // a journeyman with the same name in another decade is not who the chapter
  // meant. Low-confidence tenure rows are skipped outright.
  const focusEra = useCallback((box) => {
    setFocusedEraId(box?.id ?? null);
    // Closing hands the rail back: the reader's own role toggles were never
    // altered, only overridden, so there is nothing to restore.
    if (!box) {
      return;
    }
    const era = (erasRef.current?.eras || []).find((e) => e.id === box.id);
    const { players: wanted, staffNames } = eraCast(era);

    // THE STAFF CAST lands immediately — those rows are already in hand. It
    // REPLACES the selection rather than adding to it, which is what takes the
    // rest of the coaching and front-office ribbons off the rail: a chapter
    // shows its own cast, not three decades of everyone else's.
    const staffPicked = resolveEraStaff(staffRef.current, staffNames, box, staffTrackRow);
    setRibbonConfig((c) => ({ ...c, players: staffPicked }));
    if (!wanted.length) return;

    const team = selectedTeamRef.current;
    fetch(`/data/segments/teams_tenures/${team}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        // The team may have changed while this was in flight.
        if (!json || selectedTeamRef.current !== team) return;
        const picked = resolveEraPlayers(json.tenures, wanted, box);
        // Appended, not assigned: the staff cast is already on the rail and
        // this fetch is the slow half of the same selection.
        if (picked.length) {
          setRibbonConfig((c) => ({ ...c, players: [...staffPicked, ...picked] }));
        }
      })
      .catch(() => {});
  }, []);

  const goTo = useCallback((team, year, follow = null) => {
    setLeagueOpen(false);
    setFocusYear(year ?? null);
    setPendingFollow(follow && follow.id ? follow : null);
    // A CAREER FOCUS is one person's path, so the rail shows one track: the
    // person you followed, and nobody else. A player's stint is resolved from
    // the destination team's tenure segment once it mounts (below); a staffer
    // is resolved from that team's own staff rows in the same place. Either
    // way the selection is REPLACED, which is what clears every other coach,
    // GM and owner — the thing that used to need a separate allowlist.
    //
    // A plain jump (league view, search box) carries no `follow` and touches
    // the selection only when the team changes.
    const following = !!(follow && follow.id);
    if (following) setFocusedEraId(null);
    setSelectedTeam((prev) => {
      if (prev !== team) {
        setFocusedEraId(null);
        setRibbonConfig((c) => ({ ...c, players: [] }));
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
      const span = (mapped.staff || []).find((s) => s.admin_person_id === id);
      if (span) {
        setFocusYear(span.from);
        // Select the destination's own row, found by id (exact). This IS the
        // career focus: one track, the person you followed.
        const row = staffTrackRow(span);
        if (row) setRibbonConfig((c) => ({ ...c, players: [row] }));
      }
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
                // Same stint key the panel builds, so the row/chip reads as
                // selected when we land (see useTeamTenures.tenureKey).
                key: `${id}:${row.from}:${row.to}`,
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
      <div className="app-frame" id={FRAME_ID} style={{ display: 'grid', placeItems: 'center' }}>
        Loading…
      </div>
    );

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
      {/* Portrait device frame. On phones it's a transparent full-bleed
          wrapper; on wider viewports index.css letterboxes it into a centred
          phone-shaped window. It is also the containing block for every
          `position: fixed` overlay in the app (see .app-frame in index.css) —
          don't remove its transform. */}
      <div className="app-frame" id={FRAME_ID}>
      <div style={{
        maxHeight: '100%',
        height: '100%',
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
          onOpenAbout={() => setAboutOpen(true)}
          onSearchSelect={goTo}
          pinned={menuActive}
        />
        <div style={{ width: '100%', flex: 1, height: '100%' }}>
          <Main
            ref={mainRef}
            mapped={mapped}
            draftSegment={draftSegment}
            erasSegment={erasSegment}
            settings={settings}
            adminById={adminById}
            focusYear={readyFocusYear}
            onFocusConsumed={clearFocus}
            ribbonConfig={ribbonConfig}
            onFollow={goTo}
            onFocusEra={focusEra}
            focusedEraId={focusedEraId}
            onSettingsChange={setSettings}
            onOpenLeague={() => setLeagueOpen(true)}
            onOpenMethodology={() => setMethodologyOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
            onMenuChange={setMenuActive}
          />
        </div>
        <Footer
          teamId={selectedTeam}
          draftSegment={draftSegment}
          staff={mapped?.staff}
          ribbonConfig={ribbonConfig}
          onRibbonConfigChange={setRibbonConfig}
          // Switching a personnel track on scrolls the timeline to that
          // stint's first year — same deep-link path as the league view.
          onFocusYear={setFocusYear}
        />
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

export default App
