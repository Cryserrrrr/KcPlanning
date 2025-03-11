import { Match, MatchType } from "../models/match";
import { scrapeLolStats } from "./scraper/lolStatScraper";

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

    console.log(
      `Found ${upcomingMatches.length} upcoming LOL matches to update`
    );

    // Process each match
    for (const match of upcomingMatches) {
      try {
        // Extract team names
        const teamOneName = match.teams[0].name;
        const teamTwoName = match.teams[1].name;

        // Scrape stats for the match
        const scrapedStats = await scrapeLolStats(
          teamOneName,
          teamTwoName,
          match.league,
          match.type
        );

        // Update match with scraped stats
        match.kcStats = scrapedStats.kcStats;
        match.rankingData = scrapedStats.rankingData;

        // Update team stats
        if (scrapedStats.firstTeamStats) {
          match.teams[0].stats = scrapedStats.firstTeamStats.championTableData;
          match.teams[0].numberOfChampionsPlayed =
            scrapedStats.firstTeamStats.numberOfChampionsPlayed;
          match.teams[0].players.forEach((player) => {
            // find player by name and add his stats
            const playerStats =
              scrapedStats.firstTeamStats?.playerTableData?.find(
                (p) => p.name === player.name
              );
            player.stats = playerStats;
          });
        }

        if (scrapedStats.secondTeamStats) {
          match.teams[1].stats = scrapedStats.secondTeamStats.championTableData;
          match.teams[1].numberOfChampionsPlayed =
            scrapedStats.secondTeamStats.numberOfChampionsPlayed;
          match.teams[1].players.forEach((player) => {
            // find player by name and add his stats
            const playerStats =
              scrapedStats.secondTeamStats?.playerTableData?.find(
                (p) => p.name === player.name
              );
            player.stats = playerStats;
          });
        }

        // Save updated match
        await match.save();
        console.log(
          `✅ Updated stats for match: ${teamOneName} vs ${teamTwoName}`
        );
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
