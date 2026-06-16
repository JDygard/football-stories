// "How grades work" - the methodology behind every Value number in the app.
// Static content, opened from the hamburger menu.
//
// NOTE ON WORDING: the public copy describes our career-production measure
// generically and never names third-party metrics or sources. Keep it that
// way - the underlying inputs are licensed for internal modeling only.

import { useEffect } from "react";
import { TIER_COLORS } from "./visualization/offseason/draftModel.js";

const TIER_ROWS = [
  ["S", "96–100", "top 4% - franchise-altering return"],
  ["A+", "91–96", "elite return on the slot"],
  ["A", "78–91", "clearly beat the slot"],
  ["B", "58–78", "solid value"],
  ["C", "38–58", "roughly what the slot expects"],
  ["D", "15–38", "below expectation"],
  ["F", "0–15", "little or no return"],
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

export default function MethodologyView({ onClose }) {
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
          width: "min(560px, 94vw)",
          maxHeight: "84vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
          padding: "16px 20px 20px",
          fontSize: 12.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            How draft grades work
          </div>
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
          Every grade answers one question:{" "}
          <b>did this pick return more career than its draft slot should?</b>{" "}
          Not "was he good" - Peyton Manning was good. Whether a #1 overall
          pick beat <i>the expectation of being #1 overall</i> is a different
          and harder bar than whether a 6th-rounder beat his.
        </P>

        <H>1 · What a slot expects</H>
        <P>
          For every overall pick slot (#1, #2, … #260+), we average the
          career production of <b>every player ever drafted there since
          1970</b> - including the ones who never played a down, because
          busting is part of a slot's reality. That gives an expected-return
          curve fitted purely from history (smoothed, and forced downhill:
          a later pick never "expects" more than an earlier one).
        </P>

        <H>2 · What a career produced</H>
        <P>
          Each player's career is summarized by a composite production
          measure that rolls up seasons played, starting jobs held,
          league honors, and on-field statistical output across his whole
          career - one number that lets a guard, a corner, and a
          quarterback sit on the same scale. It isn't perfect (trench play
          is harder to measure than passing yards; see Honesty, below) but
          it's consistent across 55+ years.
        </P>

        <H>3 · Surplus</H>
        <P>
          <b>Surplus = what the career produced − what the slot expected.</b>{" "}
          A 6th-rounder with a starter's career posts a huge surplus. A top-5
          pick with a journeyman career posts a deeply negative one, even
          though he "made it." This is draft-capital efficiency, not player
          quality.
        </P>

        <H>4 · Era fairness</H>
        <P>
          Raw production numbers inflate and deflate across eras (season
          length, league size, stat environments). So surpluses are
          standardized <b>within each draft class</b> - you're compared to
          the other players drafted the same year. Classes too young to be
          mostly finished borrow a baseline from the most recent fully-
          settled classes instead, so a young class's few retirees aren't
          graded against each other in a tiny biased pool.
        </P>

        <H>5 · Score and letter</H>
        <P>
          The era-adjusted surplus becomes a <b>percentile</b> against every
          graded pick in history - that's the 0–100 score. Letters are fixed
          slices of that scale:
        </P>
        <table style={{ borderCollapse: "collapse", width: "100%", margin: "4px 0 8px" }}>
          <tbody>
            {TIER_ROWS.map(([t, range, desc]) => (
              <tr key={t}>
                <td style={{ padding: "3px 6px", width: 34 }}>
                  <span
                    style={{
                      background: TIER_COLORS[t],
                      color: "#fff",
                      fontWeight: 700,
                      borderRadius: 4,
                      padding: "1px 7px",
                      fontSize: 11.5,
                      display: "inline-block",
                      minWidth: 22,
                      textAlign: "center",
                    }}
                  >
                    {t}
                  </span>
                </td>
                <td style={{ padding: "3px 6px", color: "#666", width: 64 }}>{range}</td>
                <td style={{ padding: "3px 6px", color: "#333" }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <H>6 · Verdicts vs. forecasts (the *)</H>
        <P>
          A class is graded in full once it's <b>three seasons old</b>;
          a finished career is graded <b>immediately</b>, even sooner.
          But a grade on a player who's still active is a forecast that can
          move - those carry a <b>*</b> everywhere they appear. A grade with
          no star is a closed case. Drafted players with no recorded
          production count as zero-return once their class is old enough
          that "still developing" is no longer plausible.
        </P>

        <H>7 · Class and GM grades</H>
        <P>
          A <b>class grade</b> is the average pick score of one team's draft
          year, percentile-ranked against all ~1,500 graded classes in
          history - same letters. Classes only grade once at least 85% of
          their picks have grades (and at least 3 graded picks), so a young
          class isn't judged by its early washouts. A <b>GM's record</b>{" "}
          credits each class to whoever held the GM seat that season; mean
          class percentile across a minimum of four classes ranks the
          leaderboard. (Known rough edges: co-GM situations, and a new GM's
          first draft arguably riding his predecessor's scouting board.)
        </P>

        <H>Honesty box</H>
        <P style={{ color: "#555" }}>
          · The timeline's data floor is 1967; drafts are graded from 1970.
          <br />
          · Composite production measures systematically flatter stat-rich
          positions and undervalue offensive linemen and specialists -
          grades are fairest <i>within</i> a position, sharpest for skill
          positions.
          <br />
          · Recent grades depend on how current the career data is; starred
          grades will move.
          <br />
          · Expected return is fitted on history, so the very newest slots
          of expansion-era rounds carry wider uncertainty than round one.
        </P>
      </div>
    </div>
  );
}
