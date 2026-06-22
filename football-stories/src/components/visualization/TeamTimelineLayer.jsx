// Renders the content-stacked timeline from a prebuilt layout, scrolled by
// `scrollY` and virtualized (only blocks intersecting the viewport are drawn).
//
// Two season representations by detail band:
//   rows  -> one win/loss band per game (GAME_DETAIL / GAME_BANDS)
//   line  -> a single season summary strip (SEASON_LINES and coarser)
// Offseason blocks delegate to their content modules (draft, …).
// Personnel tenure ribbons: opaque bordered bands — entry band from the far
// left screen edge (anchored in the offseason's reserved space, or pinned to
// the viewport top), vertical tail in the right gutter, exit band trailing
// off the right edge — all anchored to the same layout coordinates.

import { useMemo } from "react";
import { geometryFor } from "./detail.js";
import { buildStaffRibbons, PEEK } from "./staffRibbonModel.js";
import StaffRibbonLayer from "./StaffRibbonLayer.jsx";

const WIN = "#2e9d51"; // victory green — winner
const LOSS = "#d0423f"; // loss red — loser (vivid but not neon)
const TIE = "#b9bdc4"; // neutral gray — tie
const BORDER = "#d9d9d9"; // hairline separator between the win/loss colors
const BORDER_W = 2; // px the grey underlay is offset toward the loser
const TEXTBG = "#d0d0d0"; // silver label backdrop (~11:1 contrast with dark label)
const LABEL_FILL = "#1a1a1a";
const PLATE_W = 38; // fixed label-plate width — uniform across every row
const MARGIN = { top: 8, left: 52, right: 16, bottom: 8 };

// Offseason "year banner" palette — a clean Material "paper" surface lifted off
// the game rows by a soft elevation shadow (no border). The year is set in a
// sterile, modern sans; each card's separation comes from the shadow, not a rule.
const OFF_PAPER = "#fbfbfa";        // paper surface — near-white, neutral
const OFF_HAIR = "#ececec";         // soft divider hairline on paper
const OFF_YEAR = "#2e3338";         // year — cool near-black, minimalist
const SEASON_HEADER_BG = "#f4f4f3"; // faint strip behind the record header
const CURVE = "#4a6fa5";            // win-rate line (matches the polyline)

// Playoff finish -> outline color at Zoom 1/2 (line modes). Tune freely.
// NOTE: user spec'd gold/silver(conf)/bronze(div)/black(WC); "Lost SB" was
// unassigned, so it took silver and Lost Conf shifted to steel.
const MEDALS = [
  [/won (sb|super|champ)/i, "#d4af37"], // gold — won it all
  [/lost (sb|super)/i, "#b9bec7"],      // silver — lost the big one
  [/lost conf|lost champ/i, "#8d99ae"], // steel — lost conference
  [/lost div/i, "#cd7f32"],             // bronze — lost divisional
  [/lost wc/i, "#2b2b2b"],              // black — lost wild card
];

function playoffMedal(playoffs) {
  if (!playoffs) return null;
  for (const [re, color] of MEDALS) {
    if (re.test(playoffs)) return color;
  }
  return null;
}

// The season header: a faint strip at the top of the season block, under the
// offseason paper and directly above the games, laying out the year's record
// and — except at zoom 4 — the all-time overall winrate as a tight pill.
function SeasonHeader({ block, contentLeft, contentRight, meta, showPlayoffs = true }) {
  const h = block.seasonHeaderHeight || 0;
  if (h <= 0 || !meta) return null;
  const y0 = block.y0;
  const cy = y0 + h / 2; // shared centerline — every element aligns to it
  const cw = Math.max(0, contentRight - contentLeft);

  const pd = meta.pointDiff;
  const pdStr = pd == null ? null : pd > 0 ? `+${pd}` : `${pd}`;
  const pdColor = pd > 0 ? "#3f8f2e" : pd < 0 ? "#c0492b" : "#8a857c";

  const df = divisionLabel(meta.divisionFinish);
  const dfColor = df
    ? df.tone === "good"
      ? "#3f8f2e"
      : df.tone === "bad"
        ? "#c0492b"
        : "#8a857c"
    : null;

  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={contentLeft} y={y0} width={cw} height={h} fill={SEASON_HEADER_BG} />
      <text
        x={contentLeft + 7}
        y={cy}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill="#4a4640"
        style={{ letterSpacing: 0.2 }}
      >
        Record: {recordStr(meta, showPlayoffs)}
        {df && (
          <tspan fill={dfColor} fontWeight={600}>{`    ·    ${df.text}`}</tspan>
        )}
        {pdStr && (
          <tspan fill={pdColor} fontWeight={700}>{`    ${pdStr}`}</tspan>
        )}
      </text>
      <line
        x1={contentLeft} x2={contentRight}
        y1={y0 + h - 0.5} y2={y0 + h - 0.5}
        stroke="#e3ddd2" strokeWidth={1}
      />
    </g>
  );
}

// One win/loss arrow row: franchise green (left, by its own score) vs opponent
// red (right), split by score, with an arrow-tip bump marking the win/loss and
// a grey hairline along the boundary. Shared by regular-season and postseason.
function GameRow({ g, y, rh, contentLeft, contentRight, cw }) {
  const rowH = Math.max(3, rh - 2);
  const labels = rh >= 12;
  const pf = g.points_for ?? 0;
  const pa = g.points_against ?? 0;
  const total = pf + pa || 1;
  const splitX = contentLeft + cw * (pf / total);
  const isWin = g.result === "W";
  const isTie = g.result === "T";
  const tip = isWin
    ? Math.min(rowH, Math.max(0, contentRight - splitX))
    : Math.min(rowH, Math.max(0, splitX - contentLeft));
  const tipX = isWin ? splitX + tip : splitX - tip;
  const arrow = `${contentLeft},0 ${splitX},0 ${tipX},${rowH / 2} ${splitX},${rowH} ${contentLeft},${rowH}`;
  const bw = BORDER_W;
  const greyArrow = `${contentLeft + bw},0 ${splitX + bw},0 ${tipX + bw},${rowH / 2} ${splitX + bw},${rowH} ${contentLeft + bw},${rowH}`;
  const leftLabel = `${g.franchise_id} ${pf}`;
  const rightLabel = `${pa} ${g.opponent_id}`;
  const bgH = Math.min(rowH - 3, 14);
  const bgY = (rowH - bgH) / 2;
  const plateMidY = bgY + bgH / 2;
  return (
    <g transform={`translate(0, ${y - rowH / 2})`}>
      <rect x={contentLeft} y={0} width={Math.max(0, cw)} height={rowH} fill={isTie ? TIE : LOSS} />
      {!isTie && (
        <>
          <polygon points={greyArrow} fill={BORDER} />
          <rect x={contentLeft} y={0} width={bw} height={rowH} fill={BORDER} />
          <polygon points={arrow} fill={WIN} />
        </>
      )}
      {labels && (
        <g>
          <rect x={contentLeft + 2} y={bgY} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
          <text x={contentLeft + 5} y={plateMidY} fontSize={9} dominantBaseline="central" fill={LABEL_FILL}>
            {leftLabel}
          </text>
          <rect x={contentRight - 2 - PLATE_W} y={bgY} width={PLATE_W} height={bgH} rx={2} fill={TEXTBG} />
          <text x={contentRight - 5} y={plateMidY} fontSize={9} textAnchor="end" dominantBaseline="central" fill={LABEL_FILL}>
            {rightLabel}
          </text>
        </g>
      )}
    </g>
  );
}

// The postseason segment under a season's games. Zoom 4: a "POSTSEASON" label
// (medal-accented by finish) over win/loss arrow rows for the playoff games.
// Zoom 3: a compact strip that just states the result, gold-bordered for a
// title, silver for runner-up (other finishes take their medal color).
function PostseasonSection({ post, contentLeft, contentRight, cw }) {
  if (!post) return null;
  const medal = playoffMedal(post.result);
  if (post.kind === "result") {
    const { y0, height: h, result } = post;
    return (
      <g style={{ pointerEvents: "none" }}>
        <rect
          x={contentLeft} y={y0} width={Math.max(0, cw)} height={h} rx={3}
          fill="#fafafa" stroke={medal || "#dcdcdc"} strokeWidth={medal ? 1.75 : 1}
        />
        <text
          x={contentLeft + 8} y={y0 + h / 2 + 0.5} dominantBaseline="central"
          fontSize={9} fontWeight={700} fill="#9a9a9a" style={{ letterSpacing: 1.5 }}
        >
          POSTSEASON
        </text>
        <text
          x={contentRight - 8} y={y0 + h / 2 + 0.5} dominantBaseline="central"
          textAnchor="end" fontSize={11} fontWeight={700} fill={medal ? "#2b2b2b" : "#777"}
        >
          {result || "—"}
        </text>
      </g>
    );
  }
  const { y0, headerH, rowH, result, games } = post;
  return (
    <g>
      <text
        x={contentLeft} y={y0 + headerH - 4} fontSize={9} fontWeight={700}
        fill="#9a9a9a" style={{ letterSpacing: 1.5 }}
      >
        POSTSEASON{result ? ` · ${result}` : ""}
      </text>
      <line
        x1={contentLeft} x2={contentRight} y1={y0 + headerH - 1} y2={y0 + headerH - 1}
        stroke={medal || "#e0e0e0"} strokeWidth={medal ? 2 : 1}
      />
      {games.map(({ g, i, y }) => (
        <GameRow
          key={g.game_id || `p-${i}`}
          g={g} y={y} rh={rowH}
          contentLeft={contentLeft} contentRight={contentRight} cw={cw}
        />
      ))}
    </g>
  );
}

function SeasonBlock({ block, contentLeft, contentRight, centerX, cw, labelInline, meta, showPlayoffs = true }) {
  const sm = block.season || {};
  const raw = sm.season || {};
  const header = (
    <SeasonHeader
      block={block}
      contentLeft={contentLeft}
      contentRight={contentRight}
      meta={meta}
      showPlayoffs={showPlayoffs}
    />
  );

  if (block.mode === "rows") {
    const rh = block.gameRowHeight;
    return (
      <g>
        {header}
        {block.games.map(({ g, i, y }) => (
          <GameRow
            key={g.game_id || `${block.year}-${i}`}
            g={g} y={y} rh={rh}
            contentLeft={contentLeft} contentRight={contentRight} cw={cw}
          />
        ))}
        <PostseasonSection
          post={block.postseason}
          contentLeft={contentLeft}
          contentRight={contentRight}
          cw={cw}
        />
      </g>
    );
  }

  // line mode: a season summary strip (W-L differential bar from center).
  const wins = raw.wins ?? 0;
  const losses = raw.losses ?? 0;
  const diff = wins - losses;
  const unit = cw / 2 / 16; // a 16-game swing fills half the width
  const hh = block.seasonHeaderHeight || 0;
  const y = block.y0 + hh + (block.height - hh) / 2; // center in the content, below the header
  const barW = Math.min(cw / 2, Math.abs(diff) * unit);
  const x0 = diff >= 0 ? centerX : centerX - barW;
  const color = diff >= 0 ? WIN : LOSS;
  const medal = showPlayoffs ? playoffMedal(raw.playoffs) : null;
  const frameH = Math.max(8, Math.min(block.height - 1, 12));
  return (
    <g>
      {header}
      {medal && (
        <rect
          x={contentLeft}
          y={y - frameH / 2}
          width={cw}
          height={frameH}
          fill="none"
          stroke={medal}
          strokeWidth={1.5}
          rx={2}
        />
      )}
      <rect x={x0} y={y - 3} width={barW} height={6} fill={color} rx={1} />
      {/* The record lives in the year banner above the season; only show it
          inline at the most-zoomed-out bands where no banner is drawn. */}
      {labelInline && (
        <text x={contentLeft + 4} y={y} fontSize={10} dominantBaseline="middle" fill="#333">
          {block.year} · {wins}-{losses}
          {showPlayoffs && raw.playoffs ? ` · ${raw.playoffs}` : ""}
        </text>
      )}
    </g>
  );
}

function recordStr(m, showPlayoffs = true) {
  if (!m) return "";
  const wlt = m.ties ? `${m.wins}-${m.losses}-${m.ties}` : `${m.wins}-${m.losses}`;
  return showPlayoffs && m.playoffs ? `${wlt} · ${m.playoffs}` : wlt;
}

// Humanize a "Nth of M" division finish: first = won the division, last = last.
// Middle finishes keep their ordinal. tone drives the header color.
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

// The offseason is the centerpiece: a full-bleed Material "paper" card spanning
// the whole interface width (zooms 2/3/4), borderless and softly elevated,
// fronted by a header carrying the minimalist sans year (far left) and the
// all-time overall-winrate pill in line with it (right) — both above the draft.
// Winrate is hidden at zoom 4. Content modules (draft, …) stack below.
function OffseasonBlock({
  block,
  contentLeft,
  contentRight,
  cw,
  fullWidth,
  offMode,
  detailBand,
  moduleData,
  meta,
  showWinRate = true,
}) {
  const showBanner = offMode !== "hidden"; // zoom 2 (compact) + zoom 3/4 (full)
  if ((!block.modules || !block.modules.length) && !showBanner) return null;

  const headerH = block.headerHeight || 0;
  // Header (year marker) sits at the very top of the block, ABOVE the ribbon
  // reserve (which now begins at block.ribbonTop).
  const headTop = block.y0;
  const headBot = headTop + headerH;
  const headMid = headTop + headerH / 2; // shared centerline for year + winrate
  const big = offMode === "full";
  const yearSize = big ? 24 : 19;

  // Overall winrate pill, right-aligned and vertically in line with the year.
  // Hidden at zoom 4 (GAME_DETAIL), where individual games are the focus.
  let win = null;
  if (showWinRate && headerH > 0 && detailBand !== "GAME_DETAIL" && meta && meta.enterPct != null) {
    const fs = big ? 11 : 10;
    const label = `Franchise record: ${(meta.enterPct * 100).toFixed(1)}%`;
    const w = Math.round(label.length * fs * 0.52) + 16; // hug the text
    const ph = Math.min(headerH - 8, 18);
    const cx = contentRight - 6 - w / 2; // right-aligned in the content
    win = { fs, label, w, ph, cx };
  }

  return (
    <g>
      {showBanner && (
        <g style={{ pointerEvents: "none" }}>
          {/* Material "paper" surface — full interface width, softly elevated,
              no border (separation comes from the shadow alone) */}
          <rect
            x={0}
            y={block.y0}
            width={fullWidth}
            height={block.height}
            fill={OFF_PAPER}
            filter="url(#offPaperShadow)"
          />

          {headerH > 0 && (
            <g>
              {/* the year — sterile, modern, minimalist sans, at the far left
                  of the viewport, centered on the header line */}
              <text
                x={6}
                y={headMid}
                dominantBaseline="central"
                fontSize={yearSize}
                fontWeight={600}
                fill={OFF_YEAR}
                style={{ letterSpacing: -0.4 }}
              >
                {block.year}
              </text>

              {/* overall winrate, in line with the year, above the draft */}
              {win && (
                <g>
                  <rect
                    x={win.cx - win.w / 2}
                    y={headMid - win.ph / 2}
                    width={win.w}
                    height={win.ph}
                    rx={win.ph / 2}
                    fill={CURVE}
                  />
                  <text
                    x={win.cx}
                    y={headMid}
                    fontSize={win.fs}
                    fontWeight={600}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                  >
                    {win.label}
                  </text>
                </g>
              )}

              {/* hairline closing the header off from the content below */}
              <line
                x1={contentLeft} x2={contentRight}
                y1={headBot - 0.5} y2={headBot - 0.5}
                stroke={OFF_HAIR} strokeWidth={1}
              />
            </g>
          )}
        </g>
      )}
      {block.modules.map((box) => (
        <g key={`${block.year}-${box.id}`}>
          {box.module.render({
            year: block.year,
            x: contentLeft,
            width: cw,
            y: box.y,
            height: box.height,
            mode: offMode,
            detailBand,
            data: moduleData,
          })}
        </g>
      ))}
    </g>
  );
}

const RAIL_PAD = 10; // gap between timeline content and the tail gutter

export default function TeamTimelineLayer({
  layout,
  scrollY = 0,
  width,
  height,
  band,
  moduleData = {},
  staff = [],
  pre1967 = null,
  adminById,
  onSelectStaff,
  tapGuard,
  railPan = 0,
  onFollow,
  showWinRate = true,
  showPlayoffs = true,
}) {
  const ribbonLayout = useMemo(
    () => buildStaffRibbons({ staff, layout }),
    [staff, layout],
  );

  // Cumulative franchise winrate AFTER EACH GAME, spanning the entire
  // timeline height. y comes from the layout (true game rows at Zoom 3/4;
  // games spread evenly through the season block at Zoom 1/2), x is the
  // running win% — so the curve survives every band change.
  const winCurve = useMemo(() => {
    if (!layout?.blocks?.length) return null;
    // Seed with pre-1967 aggregate W-L-T when available, so the curve
    // starts at the franchise's TRUE all-time ratio instead of swinging
    // 0-or-1 on the 1967 opener (the data floor isn't the founding date —
    // the Colts had 14 Baltimore seasons before our first row).
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    const pts = [];
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const reg = b.games || [];
      const post = b.postseason?.games || [];
      // chronological: regular season, then that year's playoff games
      const seq = post.length ? [...reg, ...post] : reg;
      const m = seq.length || 1;
      seq.forEach(({ g }, idx) => {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
        const y =
          b.mode === "rows"
            ? seq[idx].y
            : b.y0 + ((idx + 0.5) / m) * b.height;
        pts.push([y, (w + t / 2) / n]);
      });
    }
    return pts.length ? pts : null;
  }, [layout, pre1967]);

  // Per-year banner facts: the season's record, and the all-time win-rate
  // ENTERING that year (the curve's value at the year boundary, where the
  // banner sits). Same accumulation as winCurve, sampled before each season.
  const seasonMeta = useMemo(() => {
    const map = new Map();
    if (!layout?.blocks?.length) return map;
    let w = pre1967?.wins || 0;
    let t = pre1967?.ties || 0;
    let n = (pre1967?.wins || 0) + (pre1967?.losses || 0) + (pre1967?.ties || 0);
    for (const b of layout.blocks) {
      if (b.type !== "season") continue;
      const raw = b.season?.season || {};
      map.set(b.year, {
        enterPct: n > 0 ? (w + t / 2) / n : null,
        wins: raw.wins ?? 0,
        losses: raw.losses ?? 0,
        ties: raw.ties ?? 0,
        playoffs: raw.playoffs || null,
        pointDiff: raw.point_diff ?? null,
        divisionFinish: raw.division_finish || null,
      });
      const post = b.postseason?.games || [];
      const seq = post.length ? [...(b.games || []), ...post] : b.games || [];
      for (const { g } of seq) {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
      }
    }
    return map;
  }, [layout, pre1967]);

  if (!layout || !width || !height) return null;

  const railWidth = ribbonLayout.railWidth;
  // Tails sit just inside the right screen edge (inset by PEEK so exit bands
  // leave a 3px leaving-stub); exit bands still run off-screen from there.
  const railLeft = width - railWidth - PEEK;
  const contentLeft = MARGIN.left;
  const contentRight = railWidth
    ? railLeft - RAIL_PAD
    : width - MARGIN.right;
  const cw = Math.max(0, contentRight - contentLeft);
  const centerX = (contentLeft + contentRight) / 2;
  const offMode = geometryFor(band).offseason;

  // virtualize: only blocks intersecting [scrollY, scrollY+height] (+pad)
  const vTop = scrollY - 60;
  const vBot = scrollY + height + 60;
  const visible = layout.blocks.filter((b) => b.y1 > vTop && b.y0 < vBot);

  return (
    <>
    <defs>
      {/* soft elevation for the offseason "paper" surface */}
      <filter id="offPaperShadow" x="-5%" y="-60%" width="110%" height="220%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#3a2f1a" floodOpacity="0.18" />
      </filter>
    </defs>
    <g transform={`translate(0, ${-scrollY})`}>
      {visible.map((b) =>
        b.type === "season" ? (
          <SeasonBlock
            key={`s-${b.year}`}
            block={b}
            contentLeft={contentLeft}
            contentRight={contentRight}
            centerX={centerX}
            cw={cw}
            labelInline={offMode === "hidden"}
            meta={seasonMeta.get(b.year)}
            showPlayoffs={showPlayoffs}
          />
        ) : (
          <OffseasonBlock
            key={`o-${b.year}`}
            block={b}
            contentLeft={contentLeft}
            contentRight={contentRight}
            cw={cw}
            fullWidth={width}
            offMode={offMode}
            detailBand={band}
            moduleData={moduleData}
            meta={seasonMeta.get(b.year)}
            showWinRate={showWinRate}
          />
        ),
      )}

      {/* all-time win-rate curve (0..1 across the content width), drawn OVER
          the banners so the labeled line stays crisp through every year.
          Hidden at zoom 4 (GAME_DETAIL), where individual games are the focus. */}
      {showWinRate && winCurve && band !== "GAME_DETAIL" && (
        <g style={{ pointerEvents: "none" }}>
          <line
            x1={contentLeft + cw / 2}
            x2={contentLeft + cw / 2}
            y1={0}
            y2={layout.totalHeight}
            stroke="#d8dde6"
            strokeWidth={1}
            strokeDasharray="2 6"
          />
          <polyline
            fill="none"
            stroke={CURVE}
            strokeWidth={1.5}
            strokeOpacity={0.7}
            points={winCurve
              .map(([y, r]) => `${(contentLeft + r * cw).toFixed(1)},${y.toFixed(1)}`)
              .join(" ")}
          />
        </g>
      )}

      {/* year labels only at the most-zoomed-out bands; otherwise the banner
          above each season carries the (much bigger) year */}
      {offMode === "hidden" &&
        visible
          .filter((b) => b.type === "season")
          .map((b) => (
            <text
              key={`y-${b.year}`}
              x={MARGIN.left - 6}
              y={b.y0 + 10}
              fontSize={10}
              textAnchor="end"
              fill="#555"
            >
              {b.year}
            </text>
          ))}

      {/* personnel tenure ribbons (entry band + gutter tail + exit band) */}
      <StaffRibbonLayer
        ribbons={ribbonLayout.ribbons}
        width={width}
        slotCount={ribbonLayout.slotCount}
        tailWidth={ribbonLayout.tailW}
        railPan={railPan}
        scrollY={scrollY}
        viewBottom={vBot}
        adminById={adminById}
        onSelect={onSelectStaff}
        onFollow={onFollow}
        tapGuard={tapGuard}
      />
    </g>

    </>
  );
}
