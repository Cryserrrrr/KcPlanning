import { connectDB } from "~/db";
import { scrapeLolTeams } from "../lolTeamScraper";
import { Match } from "~/models/match";
import { scrapeLolStats } from "../lolStatsScraper";
import { ScrapingResult, MatchType, PlayerType } from "~/types/match";
import { riotMatchScraper } from "./riotMatch";
import { Links } from "~/utils/links";

/**
 * Scrapes League of Legends matches from the specified URL.
 *
 * This function:
 * 1. Connects to the database
 * 2. Fetches match data using the Riot API scraper
 * 3. Adds player rosters to each team in the matches
 * 4. Retrieves and adds statistics for teams and players
 * 5. Stores complete match data in the database
 *
 * @returns {Promise<void>} A promise that resolves when scraping is complete
 */
export async function scrapeLeagueOfLegendsMatches(): Promise<void> {
  await connectDB();

  const matchesToAdd: (MatchType | null)[] = await riotMatchScraper({
    game: "League of Legends",
    url: Links.lolEsports,
  });

  if (matchesToAdd.length === 0) {
    console.log("🟥 No matches to add", "League of Legends");
    return;
  }

  // Add roster to matches
  let rosterAlreadyAdded: { [key: string]: PlayerType[] } = {};
  let teamStatsCache: { [key: string]: any } = {};
  let rankingDataCache: { [key: string]: any } = {};
  for (const match of matchesToAdd) {
    if (!match) {
      continue;
    }
    for (const team of match.teams) {
      if (rosterAlreadyAdded[team.name]) {
        team.players = rosterAlreadyAdded[team.name].map(
          (player: PlayerType) => ({
            ...player,
            stats: null,
          })
        );
      } else if (team.name === "TBD") {
        team.players = [];
      } else {
        const roster: PlayerType[] = await scrapeLolTeams(team.name);
        team.players = roster.map((player: PlayerType) => ({
          ...player,
          stats: null,
        }));
        rosterAlreadyAdded[team.name] = roster;
      }
    }

    const statsData: ScrapingResult = await scrapeLolStats(
      match.teams[0].name,
      match.teams[1].name,
      match.league,
      match.type,
      match.date,
      teamStatsCache,
      rankingDataCache
    );

    if (!teamStatsCache[match.teams[0].name]) {
      teamStatsCache[match.teams[0].name] = statsData.firstTeamStats;
    }
    if (!teamStatsCache[match.teams[1].name]) {
      teamStatsCache[match.teams[1].name] = statsData.secondTeamStats;
    }

    if (
      !rankingDataCache[
        statsData.rankingDataAndCurrentSplit.currentSplit || match.league
      ]
    ) {
      rankingDataCache[
        statsData.rankingDataAndCurrentSplit.currentSplit || match.league
      ] = statsData.rankingDataAndCurrentSplit.rankingData;
    }

    match.rankingData = statsData.rankingDataAndCurrentSplit.rankingData;
    match.kcStats = statsData.kcStats;

    match.teams[0].stats = statsData.firstTeamStats?.championTableData;
    match.teams[1].stats = statsData.secondTeamStats?.championTableData;
    match.teams[0].numberOfChampionsPlayed =
      statsData.firstTeamStats?.numberOfChampionsPlayed;
    match.teams[1].numberOfChampionsPlayed =
      statsData.secondTeamStats?.numberOfChampionsPlayed;

    match.teams[0].players.forEach((player: PlayerType) => {
      // find player by name and add his stats
      const playerStats = statsData.firstTeamStats?.playerTableData?.find(
        (p) => p.name === player.name
      );
      player.stats = playerStats;
    });
    match.teams[1].players.forEach((player: PlayerType) => {
      const playerStats = statsData.secondTeamStats?.playerTableData?.find(
        (p) => p.name === player.name
      );
      player.stats = playerStats;
    });
  }

  // Add match to database
  for (const match of matchesToAdd) {
    if (!match) {
      continue;
    }

    await Match.create(match);
    console.log(`🟩 Match ${match.date} added to database`);
  }
}
