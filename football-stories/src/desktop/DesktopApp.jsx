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
// No footer/drawers on desktop: Personnel Tracks (the mobile drawer's content
// component, reused unchanged) lives in a PERSISTENT CONTROL DOCK — always
// open, fixed height, no toggling. Settings used to share that dock; the
// display toggles now live on the MENU-ZOOM rung (src/menu/), the fully
// zoomed-out start page, so the dock is personnel and nothing else.
//
// The dock runs along the BOTTOM of the window rather than down one side. Width
// is the axis the timeline is built on (time flows left→right), so a side rail
// taxed the single dimension that matters most, while squeezing its own
// controls into a 320px column. Along the bottom, RibbonControls gets its full
// horizontal control strip and the timeline gets every pixel of width; the only
// cost is a fixed slice of height, which the lane caps anyway (LANE_MAX in
// DesktopTimelineLayer — it never stretches to fill the window).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import './desktop.css'
import '../App.css'
import Header from '../components/header/Header.jsx'
import DesktopMain from './DesktopMain.jsx'
import RibbonControls from '../components/RibbonControls.jsx'
import ChapterCard from '../components/ChapterCard.jsx'
import LeagueView from '../components/LeagueView.jsx'
import MethodologyView from '../components/MethodologyView.jsx'
import AboutView from '../components/AboutView.jsx'
import DesktopTeamDrawer from './DesktopTeamDrawer.jsx'
import { eraCast, resolveEraStaff, resolveEraPlayers } from '../utils/eraCast.js';
import { staffTrackRow } from '../hooks/useTeamTenures.js';
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

// SWEEP — following a career link moves the whole timeline AWAY from where the
// destination lies, then brings that team in from the side it sits on. The
// travel is vertical, because the ribbons already put the next team below the
// screen (a tenure's exit connector drops downward to its "To <team>" pill) and
// the previous team above it. See .desktop-sweep-* in desktop.css.
// Durations must match those keyframes.
const SWEEP_OUT_MS = 220
const SWEEP_IN_MS = 280

// A team PICKED from the drawer sweeps too, but unlike a career follow it has
// no direction to express — nobody travelled anywhere — so it always travels
// the same way. Deriving one from alphabetical or division order would be
// motion the user can't read: it would look meaningful and mean nothing.
const PICK_SWEEP_DIR = 1

function DockTab({ icon, label, badge = null, active, onClick, onClose = null }) {
  return (
    <div
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
        padding: '8px 14px 7px',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: active ? '#1f2430' : '#7a8190',
        background: active ? '#fff' : 'transparent',
        borderRight: '1px solid #e8eaef',
        boxShadow: active ? 'inset 0 -2px 0 #2d6cdf' : 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420 }}>{label}</span>
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
      {onClose && (
        <button
          aria-label="Close chapter"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            border: 'none',
            background: 'none',
            color: '#7a8190',
            fontSize: 15,
            lineHeight: 1,
            padding: '0 2px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// Every ribbon on the timeline is an explicitly chosen track now — coaches,
// GMs and owners included. There used to be a `roles` map switching whole
// categories of staff on by default, and a `staffOnly` allowlist that overrode
// it while a chapter or a career was in focus. Two mechanisms governing the
// same ribbons is what let a role toggle hide a chapter's own coach. One list.
const DEFAULT_RIBBONS = { players: [] };

function DesktopApp() {
  const [selectedTeam, setSelectedTeam] = useState("ARI");
  // Display toggles, surfaced on the menu-zoom rung. Missing key => on.
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
  // Which Named Era chapter is currently focused (clicked plaque). The zoom
  // itself lives in the viewport; this is only the selection.
  const [focusedEraId, setFocusedEraId] = useState(null);
  // Which tab of the bottom dock is showing. Opening a chapter brings its tab
  // forward; closing it (or the chapter going away) falls back to Personnel.
  const [dockTab, setDockTab] = useState('personnel');

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

  // Read-latest refs for the era-focus handler, which runs from a click and an
  // async fetch and must not close over a stale team or segment.
  const erasRef = useRef(erasSegment);
  erasRef.current = erasSegment;
  const selectedTeamRef = useRef(selectedTeam);
  selectedTeamRef.current = selectedTeam;
  // The franchise's staff rows, for resolving a chapter's staff cast.
  const staffRef = useRef(null);
  staffRef.current = mapped?.staff || null;

  const mainRef = useRef(null);
  // The header row + team drawer together; the drawer dismisses on a
  // pointer-down outside THIS, not outside itself (see DesktopTeamDrawer).
  const headerZoneRef = useRef(null);

  // Team switches clear player-ribbon selections (they're per-franchise), and
  // they SWEEP: the outgoing team leaves the moment you pick, while its
  // replacement loads, and the new one arrives only once its data is ready.
  // The OUT phase below already waits on both the animation and the fetch, so
  // a fast fetch can't cut the motion short and a slow one can't leave a gap —
  // which is exactly the "out during load, in when ready" behaviour wanted
  // here, without a spinner.
  //
  // Picking is still not a journey the way a career follow is (see goTo), so
  // it borrows the motion, not the meaning: PICK_SWEEP_DIR is constant.
  const selectTeam = useCallback((team) => {
    setSelectedTeam((prev) => {
      if (prev !== team) {
        setSweep({ dir: PICK_SWEEP_DIR, phase: "out" });
        setOutElapsed(false);
        setFrozen(liveRef.current);
      }
      return team;
    });
    setRibbonConfig((c) => ({ ...c, players: [] }));
    setFocusedEraId(null);
  }, []);

  // The open chapter, for the dock's Chapter tab. Gone when the eras toggle
  // is off or the team changes, and the dock falls back to Personnel with it.
  const focusedEra = useMemo(
    () =>
      focusedEraId && settings.showEras !== false
        ? (erasSegment?.eras || []).find((e) => e.id === focusedEraId) || null
        : null,
    [focusedEraId, erasSegment, settings.showEras],
  );
  const tab = focusedEra ? dockTab : 'personnel';

  const goTo = useCallback((team, year, follow = null, dir = 0) => {
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
        setFocusedEraId(null);
        setRibbonConfig((c) => ({ ...c, players: [] }));
      }
      return team;
    });
  }, []);
  // ERA FOCUS. Clicking a chapter's plaque maximizes it (DesktopMain drives the
  // zoom) and puts its cast on the rail.
  //
  // Highlights are matched by NAME against this team's own tenure rows, never
  // by player_id_internal: those ids are a uuid5 of the identity key, so every
  // improvement to identity matching rewrites them and would silently empty
  // every authored story. A name plus the team's tenures survives that.
  //
  // The stint chosen for a name is the one that actually overlaps the era —
  // a player can have several stints with one franchise, and the chapter means
  // the one inside it.
  const focusEra = useCallback((box) => {
    setFocusedEraId(box?.id ?? null);
    setDockTab(box ? 'chapter' : 'personnel');
    if (!box) {
      // Nothing to restore: the reader's role toggles were overridden, never
      // altered, so clearing the override hands the rail straight back.
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
            teamsOpen={teamDrawerOpen}
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
              onFocusEra={focusEra}
              focusedEraId={focusedEraId}
              onSettingsChange={setSettings}
              onOpenLeague={() => setLeagueOpen(true)}
              onOpenMethodology={() => setMethodologyOpen(true)}
              onOpenAbout={() => setAboutOpen(true)}
            />
          )}
        </div>
        {/* Persistent control dock along the bottom: Personnel Tracks, full
            width. Always open, fixed height. */}
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
              flex: 1,
              minWidth: 0,
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            {/* TABS: Personnel Tracks always; the open chapter beside it. The
                chapter's reading lives here rather than over the timeline,
                where it covered the far end of the lane and the ribbons. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                borderBottom: '1px solid #e8eaef',
                background: '#f4f5f8',
                flexShrink: 0,
              }}
            >
              <DockTab
                active={tab === 'personnel'}
                onClick={() => setDockTab('personnel')}
                icon="👥"
                label="PERSONNEL TRACKS"
                badge={(ribbonConfig.players || []).length || null}
              />
              {focusedEra && (
                <DockTab
                  active={tab === 'chapter'}
                  onClick={() => setDockTab('chapter')}
                  icon="⚑"
                  label={`CHAPTER · ${focusedEra.label}`}
                  onClose={() => focusEra(null)}
                />
              )}
            </div>
            {tab === 'chapter' && <ChapterCard docked era={focusedEra} />}
            {/* Kept mounted while hidden so its search and filters survive a
                trip to the chapter tab. */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: tab === 'personnel' ? 'flex' : 'none',
                flexDirection: 'column',
              }}
            >
              <RibbonControls
                teamId={selectedTeam}
                draftSegment={draftSegment}
                staff={mapped?.staff}
                config={ribbonConfig}
                onChange={setRibbonConfig}
                // Switching a personnel track on sweeps the timeline to that
                // stint's first year — same deep-link path as the league view.
                onFocusYear={setFocusYear}
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
