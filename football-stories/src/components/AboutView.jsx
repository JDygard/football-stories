// "About this project" - why this exists and how it was built, in the
// maintainer's own voice. Static content, opened from the hamburger menu
// (both the mobile and desktop trees mount it; Header is shared).
//
// NOTE ON WORDING: same constraint as MethodologyView - the public copy
// describes the career-production measure generically and never names the
// third-party metric or its publisher. The underlying inputs are licensed for
// internal modeling only. Keep it that way.
//
// The Credits block below is a LICENSE OBLIGATION, not decoration: the Kaggle
// draft set is CC BY 4.0 (attribution + "changes were made" required) and the
// local Wikipedia short descriptions are CC BY-SA 4.0. See
// football-stories/ATTRIBUTIONS.md and dataset_generation/DATA_SOURCES.md.
// Don't delete rows here without checking those files first.
//
// House style for this page: first person, plain language, no emoji.

import { useEffect } from "react";

// Headline counts. These are the shipped segment totals - if the pipeline is
// re-run with a new season, refresh them (segment.py output / index files).
const STATS = [
  ["32", "franchises, each one continuous timeline"],
  ["1967–2025", "the entire common-draft era, season by season"],
  ["27,462", "individual game results"],
  ["16,808", "draft picks, graded from 1970"],
  ["1,540", "draft classes with a class grade"],
  ["16,483", "searchable people, from franchise players to one-year owners"],
];

const CREDITS = [
  {
    title: "NFL Draft 1985–2015",
    by: "Ulrik Thyge Pedersen, via Kaggle",
    license: "CC BY 4.0",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
    href: "https://www.kaggle.com/datasets/ulrikthygepedersen/nfl-draft-1985-2015",
    note: "Changes were made: filtered, normalized, and used as an input to derived grades.",
  },
  {
    title: "1926–2024 NFL Scores",
    by: "flynn28, via Kaggle",
    license: "MIT",
    href: "https://www.kaggle.com/datasets/flynn28/1926-2024-nfl-scores",
    note: "Historical game results.",
  },
  {
    title: "nflverse / nfl_data_py",
    by: "the nflverse community",
    license: "MIT",
    href: "https://github.com/nflverse/nfl_data_py",
    note: "Player ID crosswalks, seasonal rosters, modern statistics.",
  },
  {
    title: "Wikidata short descriptions",
    by: "Wikidata contributors",
    license: "CC0",
    licenseHref: "https://creativecommons.org/publicdomain/zero/1.0/",
    href: "https://www.wikidata.org",
    note: "The one-line description under a person's name. Nothing else is ingested - no article text, no images.",
  },
  {
    title: "English Wikipedia short descriptions",
    by: "Wikipedia contributors",
    license: "CC BY-SA 4.0",
    licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/",
    href: "https://en.wikipedia.org",
    note: "Used only where Wikidata has no entry; each one ships with a link back to its article.",
  },
  {
    title: "Franchise history mapping",
    by: "original work by the maintainer",
    license: null,
    href: null,
    note: "Franchise identifiers, names, cities, and active-year ranges.",
  },
];

function H({ children }) {
  return (
    <div style={{ fontSize: 13.5, fontWeight: 700, margin: "16px 0 4px" }}>
      {children}
    </div>
  );
}

function P({ children }) {
  return (
    <p style={{ margin: "4px 0 8px", lineHeight: 1.5, color: "#333" }}>
      {children}
    </p>
  );
}

function A({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "#2d6cdf", textDecoration: "none" }}
    >
      {children}
    </a>
  );
}

export default function AboutView({ onClose, onOpenMethodology }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,25,35,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          // % of the device frame, not vw/vh — see .app-frame in index.css.
          width: "min(560px, 94%)",
          maxHeight: "84%",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
          padding: "16px 20px 20px",
          fontSize: 12.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>About this project</div>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none", background: "none", fontSize: 18,
              cursor: "pointer", color: "#999", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <P>
          Even if you have followed a team your whole life, you inherited most
          of its history. The Super Bowl it won thirty years ago, the two it
          missed in a row, the head coach people still bring up - all of that
          is the story of your team, and nearly all of it happened before your
          first memory of watching them play. I found that I felt disconnected
          from that history, because I hadn't lived it. I didn't even know it.
        </P>
        <P>
          So I wanted a way to see those stories for myself. Specifically, I
          wanted to watch decisions land: how something a front office did five
          years earlier sets the wheels in motion to step up and win on the
          biggest stage in the NFL.
        </P>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
            gap: 8,
            margin: "12px 0 4px",
          }}
        >
          {STATS.map(([n, label]) => (
            <div
              key={label}
              style={{
                background: "#f4f6f9",
                borderRadius: 6,
                padding: "7px 9px",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f2036" }}>
                {n}
              </div>
              <div style={{ fontSize: 11, color: "#666", lineHeight: 1.35 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <H>Learning it by building it</H>
        <P>
          I work with a lot of talented data scientists professionally, building
          data dashboards and HMIs, but I never got to see how they actually
          manage their data. This seemed like the perfect opportunity to learn
          by doing. So the entire dataset and pipeline here is built from
          publicly available sources, and the draft grades are a metric I
          derived myself rather than a number I borrowed.
        </P>

        <H>Grading picks, and where grading fails</H>
        <P>
          Grading draft picks is integral to understanding the sorts of
          decisions that lead to success. It is also where the whole thing gets
          uncomfortable, in two ways I have not fully solved.
        </P>
        <P>
          The first: how do you rate a pick that was smart at the time and only
          turned out badly through misfortune? The grade sees what happened, not
          the reasoning that led there.
        </P>
        <P>
          The second I call the Marlin Jackson Problem. By my scale, Jackson
          gets an unqualified F - a high pick, injured early, not much
          production to show for it. And then there is{" "}
          <A href="https://www.youtube.com/watch?v=p3h7GvEjnas">this</A>. Say
          "Marlin's got it" to a Colts fan of that era and they know exactly
          what you mean. The grade is correct and it misses everything that
          mattered, and that gap is precisely the kind of story I am trying to
          tell with this tool. A grade is one line in a much longer story, which
          is why it sits inside a timeline instead of on a leaderboard by
          itself.
        </P>

        <H>Zoom levels</H>
        <P>
          I thought about doing smooth zooming with breakpoints along the way,
          but it was clumsy and it missed the point of what I wanted. Zooming
          here is not meant to make the picture bigger, it is meant to change
          what you are looking at. So I settled on a set of fixed levels: the
          franchise as a run of eras, then seasons as a list, then a full page
          for each season, then the individual games. Each level is its own
          drawing rather than a scaled version of the one before it. The fixed
          steps do the same trick without the extra machinery, and the extra
          machinery would not have bought much.
        </P>

        <H>People don't fit on a timeline of years</H>
        <P>
          A season sits at a point in time. A career is a stretch of them, and
          careers overlap. So coaches, general managers, owners and any player
          you pick out get a track of their own: a label where they arrive, a
          band running the length of their time with the team, and an exit where
          they go. Overlapping tenures share lanes, so twelve people at once
          don't need twelve columns.
        </P>
        <P>
          The tracks run off both edges of the screen on purpose. Everyone came
          from somewhere and went somewhere afterwards, and following a track
          off the edge takes you to that franchise, at the right year, with the
          person still selected.
        </P>

        <H>Two builds</H>
        <P>
          The design was mobile-first from the start - time runs down the screen
          and you scroll it with a thumb - but the intent was always to go
          horizontal for the desktop version. On a wide screen time runs left to
          right, win rate runs vertically, and the personnel tracks ride along
          the bottom. It is the same model turned sideways. The two layouts are
          built separately; everything underneath them is shared.
        </P>

        <H>The data pipeline</H>
        <P>
          Nothing is fetched from a third party at runtime and there is no
          backend. An offline Python pipeline does the work in two stages:{" "}
          <b>ingest</b> merges several historical datasets plus live league data
          into one canonical schema, and <b>segment</b> cuts that schema into
          the small per-entity JSON files the app actually loads - one per team,
          one per team's draft history, one per person. Opening a franchise is a
          handful of static file reads.
        </P>
        <P>
          The hard part was never volume, it was <b>identity</b>. The same
          player appears in four datasets under four different ID schemes, with
          name spellings that don't agree. And franchises are worse than
          players, because team codes fork over time. "BAL" before 1984 is the
          Colts, who are now <i>Indianapolis</i>, while "BAL" after it is a
          different franchise entirely. "STL" is the Cardinals until 1988 and
          the Rams later. "HOU" is the Oilers, who became Tennessee, before it
          is the Texans. Every one of those lineages has to be resolved by code{" "}
          <i>and</i> year, in the pipeline and in the link reconciler, or a
          player's career quietly reattaches to the wrong team.
        </P>
        <P>
          The data starts in 1967, which is not an arbitrary floor: it is the
          first common draft. The timeline therefore covers the entire
          common-draft era, and grading begins with the 1970 classes at the
          merger. Everything before 1967 is folded in as a single aggregate
          record, so a franchise's all-time win rate still tells the truth.
        </P>

        <H>Grades</H>
        <P>
          Every letter in the app answers one question: did this pick return
          more than its draft slot should have? Expected return per slot is
          fitted from history, surplus is measured against it, standardized
          within a draft class, then ranked.
          {onOpenMethodology ? (
            <>
              {" "}
              The full method, including what it gets wrong, is in{" "}
              <button
                onClick={() => {
                  onClose();
                  onOpenMethodology();
                }}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  font: "inherit",
                  color: "#2d6cdf",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                How draft grades work
              </button>
              .
            </>
          ) : (
            <> The full method is in "How draft grades work".</>
          )}
        </P>

        <H>Honest about the limits</H>
        <P style={{ color: "#555" }}>
          · A grade on a player who is still active is a forecast and can move.
          Those carry a star wherever they appear.
          <br />
          · The production measure behind the grades is fairest within a
          position. It flatters positions that accumulate counting stats and
          undersells linemen and specialists.
          <br />
          · Games are covered from 1967 and drafts are graded from 1970. Older
          history exists here only as an aggregate.
        </P>

        <H>Credits</H>
        <P style={{ color: "#555", margin: "4px 0 6px" }}>
          Built on public data. Where a license requires it, note that the
          source data was modified: in every case it was filtered, normalized,
          and used as input to derived metrics that are original work, not a
          redistribution of the source.
        </P>
        <div style={{ margin: "6px 0 8px" }}>
          {CREDITS.map((c) => (
            <div
              key={c.title}
              style={{
                borderTop: "1px solid #eceef2",
                padding: "6px 0 5px",
                lineHeight: 1.45,
              }}
            >
              <div>
                {c.href ? <A href={c.href}>{c.title}</A> : <b>{c.title}</b>}
                <span style={{ color: "#666" }}> — {c.by}</span>
                {c.license && (
                  <span style={{ color: "#666" }}>
                    {" · "}
                    {c.licenseHref ? (
                      <A href={c.licenseHref}>{c.license}</A>
                    ) : (
                      c.license
                    )}
                  </span>
                )}
              </div>
              <div style={{ color: "#888", fontSize: 11.5 }}>{c.note}</div>
            </div>
          ))}
        </div>

        <P style={{ color: "#888", fontSize: 11.5 }}>
          NFL, team names and player names are used for factual and editorial
          reference only. This project is independent and is not affiliated
          with, endorsed by, or sponsored by the National Football League or any
          of its teams.
        </P>
      </div>
    </div>
  );
}
