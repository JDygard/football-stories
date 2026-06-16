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
import { buildStaffRibbons } from "./staffRibbonModel.js";
import StaffRibbonLayer from "./StaffRibbonLayer.jsx";

const WIN = "#5ec235";
const LOSS = "#e5b02b";
const TIE = "#ddd8aa";
const MARGIN = { top: 8, left: 52, right: 16, bottom: 8 };

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

function SeasonBlock({ block, contentLeft, contentRight, centerX, cw }) {
  const sm = block.season || {};
  const raw = sm.season || {};

  if (block.mode === "rows") {
    const rh = block.gameRowHeight;
    const rowH = Math.max(3, rh - 2);
    const labels = rh >= 12;
    return (
      <g>
        {block.games.map(({ g, i, y }) => {
          const pf = g.points_for ?? 0;
          const pa = g.points_against ?? 0;
          const total = pf + pa || 1;
          const splitX = contentLeft + cw * (pf / total);
          const isWin = g.result === "W";
          const isTie = g.result === "T";
          const left = isTie ? TIE : isWin ? WIN : LOSS;
          const right = isTie ? TIE : isWin ? LOSS : WIN;
          return (
            <g key={g.game_id || `${block.year}-${i}`} transform={`translate(0, ${y - rowH / 2})`}>
              <rect x={contentLeft} y={0} width={Math.max(0, splitX - contentLeft)} height={rowH} fill={left} />
              <rect x={splitX} y={0} width={Math.max(0, contentRight - splitX)} height={rowH} fill={right} />
              {labels && (
                <text x={contentLeft + 4} y={rowH / 2} fontSize={9} dominantBaseline="middle" fill="#1a1a1a">
                  {g.franchise_id} {pf}
                </text>
              )}
              {labels && (
                <text x={contentRight - 4} y={rowH / 2} fontSize={9} textAnchor="end" dominantBaseline="middle" fill="#1a1a1a">
                  {pa} {g.opponent_id}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  // line mode: a season summary strip (W-L differential bar from center).
  const wins = raw.wins ?? 0;
  const losses = raw.losses ?? 0;
  const diff = wins - losses;
  const unit = cw / 2 / 16; // a 16-game swing fills half the width
  const y = (block.y0 + block.y1) / 2;
  const barW = Math.min(cw / 2, Math.abs(diff) * unit);
  const x0 = diff >= 0 ? centerX : centerX - barW;
  const color = diff >= 0 ? WIN : LOSS;
  const medal = playoffMedal(raw.playoffs);
  const frameH = Math.max(8, Math.min(block.height - 1, 12));
  return (
    <g>
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
      <text x={contentLeft + 4} y={y} fontSize={10} dominantBaseline="middle" fill="#333">
        {block.year} · {wins}-{losses}
        {raw.playoffs ? ` · ${raw.playoffs}` : ""}
      </text>
    </g>
  );
}

function OffseasonBlock({ block, contentLeft, cw, offMode, detailBand, moduleData }) {
  const styled = offMode === "full"; // Zoom 3/4: make the offseason zone read as its own place
  if ((!block.modules || !block.modules.length) && !styled) return null;
  return (
    <g>
      {styled && (
        <g style={{ pointerEvents: "none" }}>
          <rect
            x={contentLeft}
            y={block.y0}
            width={cw}
            height={block.height}
            fill="rgba(110, 130, 170, 0.08)"
          />
          <line
            x1={contentLeft} x2={contentLeft + cw}
            y1={block.y0 + 0.5} y2={block.y0 + 0.5}
            stroke="#c3cbdc" strokeWidth={1} strokeDasharray="5 3"
          />
          <line
            x1={contentLeft} x2={contentLeft + cw}
            y1={block.y1 - 0.5} y2={block.y1 - 0.5}
            stroke="#c3cbdc" strokeWidth={1} strokeDasharray="5 3"
          />
          {block.height >= 14 && (
            <text
              x={contentLeft + cw - 6}
              y={block.y0 + 11}
              fontSize={8}
              textAnchor="end"
              fill="#93a0b8"
              style={{ letterSpacing: 2 }}
            >
              {block.year} OFFSEASON
            </text>
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
      const games = b.games || [];
      const m = games.length || 1;
      games.forEach(({ g }, idx) => {
        n += 1;
        if (g.result === "W") w += 1;
        else if (g.result === "T") t += 1;
        const y =
          b.mode === "rows"
            ? games[idx].y
            : b.y0 + ((idx + 0.5) / m) * b.height;
        pts.push([y, (w + t / 2) / n]);
      });
    }
    return pts.length ? pts : null;
  }, [layout, pre1967]);

  if (!layout || !width || !height) return null;

  const railWidth = ribbonLayout.railWidth;
  // Tails hug the right screen edge (exit bands run from them off-screen).
  const railLeft = width - railWidth;
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
    <g transform={`translate(0, ${-scrollY})`}>
      {/* all-time winrate-by-game curve (0..1 across the content width) */}
      {winCurve && (
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
            stroke="#4a6fa5"
            strokeWidth={1.5}
            strokeOpacity={0.65}
            points={winCurve
              .map(([y, r]) => `${(contentLeft + r * cw).toFixed(1)},${y.toFixed(1)}`)
              .join(" ")}
          />
        </g>
      )}
      {visible.map((b) =>
        b.type === "season" ? (
          <SeasonBlock
            key={`s-${b.year}`}
            block={b}
            contentLeft={contentLeft}
            contentRight={contentRight}
            centerX={centerX}
            cw={cw}
          />
        ) : (
          <OffseasonBlock
            key={`o-${b.year}`}
            block={b}
            contentLeft={contentLeft}
            cw={cw}
            offMode={offMode}
            detailBand={band}
            moduleData={moduleData}
          />
        ),
      )}

      {/* year labels at each visible season's top (the integer-year boundary) */}
      {visible
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
        railLeft={railLeft}
        width={width}
        scrollY={scrollY}
        viewBottom={vBot}
        adminById={adminById}
        onSelect={onSelectStaff}
        tapGuard={tapGuard}
      />
    </g>

    </>
  );
}
