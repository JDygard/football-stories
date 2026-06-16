const SEASON_SPAN = 0.70;  // portion of year used for games

export default function mapTeamData(teamSegment) {
  if (!teamSegment) return null;

  const { seasons, games, staff } = teamSegment;

  if (!seasons || !games) return null;
  // ---- Normalize games: sort by date and by season ----
  const gamesBySeason = {};
  for (const g of games) {
    const yr = g.season;
    if (!gamesBySeason[yr]) gamesBySeason[yr] = [];
    gamesBySeason[yr].push(g);
  }

  // Sort all season arrays by date ascending
  for (const yr of Object.keys(gamesBySeason)) {
    gamesBySeason[yr].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // ---- Compute per-season game placement + stats ----
  const mappedSeasons = seasons
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((season) => {
      const { year, wins, losses, ties } = season;

      const seasonGames = gamesBySeason[year] || [];

      const totalGames = seasonGames.length;
      const winRatio =
        totalGames > 0 ? wins / (wins + losses + (ties || 0)) : 0.5;

      // Build mapped game entries with fractional vertical positions.
      const mappedGames = seasonGames.map((g, index) => {
        const t = year + ((index + 0.5) / totalGames) * SEASON_SPAN;
        return {
          ...g,
          t,
          points_for: Math.round(g.points_for),
          points_against: Math.round(g.points_against),
        };
      });

      const seasonTop = year;                    // start of season block
      const seasonBottom = year + SEASON_SPAN;   // end of regular season block
      const offseasonTop = seasonBottom;         // start of offseason
      const offseasonBottom = year + 1;          // end of offseason

      return {
        season,
        year,
        winRatio,
        totalGames,
        games: mappedGames,
        seasonTop,
        seasonBottom,
        offseasonTop,
        offseasonBottom,
      };
    });

  // ---- Compute overall franchise win ratio ----
  const totalWins = seasons.reduce((acc, s) => acc + s.wins, 0);
  const totalLosses = seasons.reduce((acc, s) => acc + s.losses, 0);
  const totalTies = seasons.reduce((acc, s) => acc + (s.ties || 0), 0);
  const totalGamesOverall = totalWins + totalLosses + totalTies;

  const overallRatio =
    totalGamesOverall > 0 ? totalWins / totalGamesOverall : 0.5;

  return {
    team: teamSegment.team,
    seasons: mappedSeasons,
    staff: teamSegment.staff || [],
    // Optional aggregate W-L-T from before the 1967 data floor; seeds the
    // all-time winrate curve so it starts at the franchise's TRUE ratio.
    pre1967: teamSegment.pre1967 || null,
    overallRatio,
    minYear: Math.min(...seasons.map((s) => s.year)),
    maxYear: Math.max(...seasons.map((s) => s.year)) + 1, // include final offseason
  };
}
