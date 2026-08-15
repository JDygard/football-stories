// One "Season by season" page (zoom 3 / GAME_BANDS): a story card for a single
// year, in the mockup's section order —
//   [arriving personnel ribbons ride the reserved strip at the very top]
//   big year + navy all-time win-rate pill
//   REGULAR SEASON  — record line + one W/L chip per game
//   DRAFT CLASS     — grade + summary + full pick rows (the draft module)
//   PLAYOFFS        — finish (or "Missed Playoffs") + playoff-game chips
// Section offsets come precomputed from buildTimelineLayout's page branch
// (block.page / block.postseason / block.modules); this file only draws.
//
// "Page" is now a section layout, not a screen: these were once padded to a
// full viewport and scroll-snapped one per screen, and both are gone — the band
// scrolls normally and a page is exactly as tall as its own sections.
//
// The page paints an opaque white surface over the win-rate curve layer, so
// the curve reads at the list-like zooms and yields to the dossier here.

import { memo } from "react";

const PAGE_BG = "#ffffff";
const HAIR = "#e7e4dd";
const SEC_LABEL = "#3c4350";
const INK = "#1d2534";
const MUTED = "#8a8f98";
const NAVY_PILL = "#2c4f8f";

// W/L chips — vivid fills with a darker border of the same hue (mockup).
const CHIP = {
  W: { fill: "#2e9d51", stroke: "#20713a" },
  L: { fill: "#d0423f", stroke: "#9c322f" },
  T: { fill: "#b9bdc4", stroke: "#8f959d" },
};

// Playoff finish -> accent color (same mapping as the timeline layer).
const MEDALS = [
  [/won (sb|super|champ)/i, "#d4af37"],
  [/lost (sb|super)/i, "#b9bec7"],
  [/lost conf|lost champ/i, "#8d99ae"],
  [/lost div/i, "#cd7f32"],
  [/lost wc/i, "#2b2b2b"],
];
function playoffMedal(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS) {
    if (re.test(playoffs)) return color;
  }
  return null;
}

// "Nth of M" -> humanized division finish + tone (mirror of the layer's).
function divisionLabel(s) {
  if (!s) return null;
  const m = /^\s*(\d+)\w*\s+of\s+(\d+)\s*$/.exec(s);
  if (!m) return { text: s, tone: "neutral" };
  const place = +m[1];
  const total = +m[2];
  if (place === 1) return { text: "Won Division", tone: "good" };
  if (place === total) return { text: "Last in Division", tone: "bad" };
  return { text: s, tone: "neutral" };
}
const toneColor = (tone) =>
  tone === "good" ? "#3f8f2e" : tone === "bad" ? "#c0492b" : "#8a857c";

// A section heading: hairline + letterspaced label.
function SectionLabel({ x, right, y, children }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={x} x2={right} y1={y + 0.5} y2={y + 0.5} stroke={HAIR} strokeWidth={1} />
      <text x={x} y={y + 17} fontSize={10} fontWeight={800} fill={SEC_LABEL} style={{ letterSpacing: 1.3 }}>
        {children}
      </text>
    </g>
  );
}

// One W/L chip per game, laid out left-to-right in a single row.
function ChipRow({ games, x, y, width, h }) {
  const n = games.length;
  if (!n) return null;
  const gap = 3;
  const size = Math.max(10, Math.min(h - 6, (width - (n - 1) * gap) / n));
  const letters = size >= 12;
  return (
    <g style={{ pointerEvents: "none" }}>
      {games.map(({ g }, i) => {
        const c = CHIP[g.result] || CHIP.T;
        const cx = x + i * (size + gap);
        return (
          <g key={g.game_id || i}>
            <rect x={cx} y={y} width={size} height={size} rx={3.5} fill={c.fill} stroke={c.stroke} strokeWidth={1} />
            {letters && (
              <text
                x={cx + size / 2}
                y={y + size / 2 + 0.5}
                fontSize={Math.min(10, size * 0.58)}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
              >
                {g.result}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

const SeasonPage = memo(function SeasonPage({
  offBlock,
  seaBlock,
  contentLeft,
  contentRight,
  fullWidth,
  meta,
  moduleData,
  detailBand,
  showWinRate = true,
}) {
  const cw = Math.max(0, contentRight - contentLeft);
  const page = seaBlock.page || {};
  const post = seaBlock.postseason;
  const headerY = offBlock.headerY ?? offBlock.y0;

  // ---- year header: big year left, navy win-rate pill right ----
  // +12 of breathing room over the old baseline: the arriving-ribbon rows land
  // immediately above headerY, so the year needs air under them.
  const yearBase = headerY + 52;
  let pill = null;
  if (showWinRate && meta && meta.enterPct != null) {
    const pct = Math.round(meta.enterPct * 100);
    const label = `${pct}% (${meta.enterWins}–${meta.enterLosses})`;
    const fs = 12;
    const caretW = fs * 0.62;
    const gap = 4;
    const dir =
      meta.prevPct == null ? 0 : meta.enterPct > meta.prevPct ? 1 : meta.enterPct < meta.prevPct ? -1 : 0;
    const textW = Math.round(label.length * fs * 0.52);
    const w = (dir !== 0 ? caretW + gap : 0) + textW + 20;
    pill = { label, fs, caretW, gap, dir, w, h: 24, cx: contentRight - w / 2, cy: yearBase - 8 };
  }

  // ---- record line pieces ----
  const rec = meta
    ? meta.ties
      ? `${meta.wins}-${meta.losses}-${meta.ties}`
      : `${meta.wins}-${meta.losses}`
    : "";
  const df = meta ? divisionLabel(meta.divisionFinish) : null;
  const pd = meta?.pointDiff;
  const pdStr = pd == null ? null : pd > 0 ? `(+${pd})` : `(${pd})`;
  const pdColor = pd > 0 ? "#3f8f2e" : pd < 0 ? "#c0492b" : "#8a857c";

  const medal = post ? playoffMedal(post.result) : null;

  return (
    <g>
      {/* page surface — full-bleed, hairline seam at the page boundary */}
      <rect
        x={0}
        y={offBlock.y0}
        width={fullWidth}
        height={seaBlock.y1 - offBlock.y0}
        fill={PAGE_BG}
        style={{ pointerEvents: "none" }}
      />
      <line
        x1={0} x2={fullWidth} y1={seaBlock.y1 - 0.5} y2={seaBlock.y1 - 0.5}
        stroke={HAIR} strokeWidth={1} style={{ pointerEvents: "none" }}
      />

      {/* year + win-rate pill */}
      <g style={{ pointerEvents: "none" }}>
        <text x={contentLeft} y={yearBase} fontSize={30} fontWeight={600} fill={INK} style={{ letterSpacing: -0.5 }}>
          {seaBlock.year}
        </text>
        {pill && (
          <g>
            <rect
              x={pill.cx - pill.w / 2} y={pill.cy - pill.h / 2}
              width={pill.w} height={pill.h} rx={pill.h / 2} fill={NAVY_PILL}
            />
            {pill.dir !== 0 && (() => {
              const cl = pill.cx - pill.w / 2 + 10;
              const ch = pill.caretW * 0.92;
              const up = `${cl},${pill.cy + ch / 2} ${cl + pill.caretW},${pill.cy + ch / 2} ${cl + pill.caretW / 2},${pill.cy - ch / 2}`;
              const down = `${cl},${pill.cy - ch / 2} ${cl + pill.caretW},${pill.cy - ch / 2} ${cl + pill.caretW / 2},${pill.cy + ch / 2}`;
              return (
                <polygon
                  points={pill.dir > 0 ? up : down}
                  fill={pill.dir > 0 ? "#4ade80" : "#ff6b6b"}
                  stroke="#fff" strokeWidth={0.75} strokeLinejoin="round"
                />
              );
            })()}
            <text
              x={pill.dir !== 0 ? pill.cx - pill.w / 2 + 10 + pill.caretW + pill.gap : pill.cx}
              y={pill.cy}
              fontSize={pill.fs} fontWeight={400}
              textAnchor={pill.dir !== 0 ? "start" : "middle"}
              dominantBaseline="central" fill="#fff"
            >
              {pill.label}
            </text>
          </g>
        )}
      </g>

      {/* REGULAR SEASON */}
      <SectionLabel x={contentLeft} right={contentRight} y={page.regularLabelY}>
        REGULAR SEASON
      </SectionLabel>
      {meta && (
        <text x={contentLeft} y={page.recY + 14} fontSize={12} fill={INK} style={{ pointerEvents: "none" }}>
          <tspan fontWeight={700}>Record</tspan>
          <tspan fontWeight={700}>{`  ${rec}`}</tspan>
          {df && <tspan fill={toneColor(df.tone)} fontWeight={700}>{`   ${df.text}`}</tspan>}
          {pdStr && <tspan fill={pdColor} fontWeight={700}>{`  ${pdStr}`}</tspan>}
        </text>
      )}
      <ChipRow games={seaBlock.games} x={contentLeft} y={page.chipsY} width={cw} h={page.chipsH || 26} />

      {/* DRAFT CLASS (label + the draft module's grade row + pick rows) */}
      {page.draftLabelY != null && (
        <SectionLabel x={contentLeft} right={contentRight} y={page.draftLabelY}>
          DRAFT CLASS
        </SectionLabel>
      )}
      {(seaBlock.modules || []).map((box) => (
        <g key={`${seaBlock.year}-${box.id}`}>
          {box.module.render({
            year: seaBlock.year,
            x: contentLeft,
            width: cw,
            y: box.y,
            height: box.height,
            mode: "full",
            detailBand,
            data: moduleData,
          })}
        </g>
      ))}

      {/* PLAYOFFS */}
      {post && (
        <g>
          <SectionLabel x={contentLeft} right={contentRight} y={post.labelY}>
            PLAYOFFS
          </SectionLabel>
          <text
            x={contentLeft}
            y={post.resultY + 14}
            fontSize={12}
            fontWeight={700}
            fill={post.result ? (medal ? "#2b2b2b" : INK) : MUTED}
            style={{ pointerEvents: "none" }}
          >
            {post.result || "Missed Playoffs"}
            {medal && <tspan fill={medal}>{"  ●"}</tspan>}
          </text>
          {post.chipsY != null && (
            <ChipRow games={post.games} x={contentLeft} y={post.chipsY} width={cw} h={post.chipsH || 26} />
          )}
        </g>
      )}
    </g>
  );
});

export default SeasonPage;
