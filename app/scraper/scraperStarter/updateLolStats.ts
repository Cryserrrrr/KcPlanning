import { correctLolName } from "~/utils/utilsFunctions";
import { Match } from "../../models/match";
import { scrapeLolStats } from "../lolStatsScraper";

/**
 * Updates team statistics with scraped data
 * @param team The team object to update
 * @param teamStats The scraped stats for the team
 */
function updateTeamStats(team: any, teamStats: any): void {
  if (!teamStats) return;

  if (teamStats.championTableData) {
    team.stats = teamStats.championTableData;
  }

  if (teamStats.numberOfChampionsPlayed) {
    team.numberOfChampionsPlayed = teamStats.numberOfChampionsPlayed;
  }

  team.players.forEach((player: any) => {
    // find player by name and add his stats
    const playerStats = teamStats?.playerTableData?.find(
      (p: any) => p.name === player.name
    );
    // Only update stats if playerStats exists
    if (playerStats) {
      player.stats = playerStats;
    }
  });
}

/**
 * Updates League of Legends statistics for upcoming matches
 */
export async function updateLolStats(): Promise<void> {
  try {
    console.log("🔄 Starting LOL stats update process");

    // Find upcoming LOL matches that don't have stats yet
    const upcomingMatches = await Match.find({
      game: "League of Legends",
      status: 0,
      date: { $gte: new Date() },
    });

    let teamStatsCache: { [key: string]: any } = {};
    let rankingDataCache: { [key: string]: any } = {};

    // Process each match
    for (const match of upcomingMatches) {
      try {
        // Extract team names
        const teamOneName = correctLolName(match.teams[0].name);
        const teamTwoName = correctLolName(match.teams[1].name);

        // Scrape stats for the match
        const scrapedStats = await scrapeLolStats(
          teamOneName,
          teamTwoName,
          match.league,
          match.type,
          match.date,
          teamStatsCache,
          rankingDataCache
        );

        if (!teamStatsCache[match.teams[0].name]) {
          teamStatsCache[match.teams[0].name] = scrapedStats.firstTeamStats;
        }
        if (!teamStatsCache[match.teams[1].name]) {
          teamStatsCache[match.teams[1].name] = scrapedStats.secondTeamStats;
        }

        if (
          !rankingDataCache[
            scrapedStats.rankingDataAndCurrentSplit.currentSplit || match.league
          ]
        ) {
          rankingDataCache[
            scrapedStats.rankingDataAndCurrentSplit.currentSplit || match.league
          ] = scrapedStats.rankingDataAndCurrentSplit.rankingData;
        }

        // Update match with scraped stats
        if (scrapedStats.kcStats) {
          match.kcStats = scrapedStats.kcStats;
        }
        if (scrapedStats.rankingDataAndCurrentSplit.rankingData) {
          match.rankingData =
            scrapedStats.rankingDataAndCurrentSplit.rankingData;
        }

        // Update team stats using the function
        updateTeamStats(match.teams[0], scrapedStats.firstTeamStats);
        updateTeamStats(match.teams[1], scrapedStats.secondTeamStats);

        // Save updated match
        await match.save();
      } catch (error) {
        console.error(
          `❌ Error updating stats for match ${match.matchId}:`,
          error
        );
      }
    }

    console.log("✅ LOL stats update process completed");
  } catch (error) {
    console.error("❌ Error in updateLolStats function:", error);
    throw error;
  }
}
