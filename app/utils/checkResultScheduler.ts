import { connectDB } from "~/db";
import { MatchType, Match } from "~/models/match";
import { getRiotResults } from "../scraper/scraperStarter/getResult";
import { getDiv2Results } from "~/scraper/div2Scraper/div2Results";

/**
 * Combines the functionality of checking for live matches and scraping results.
 * This function will:
 * 1. Check if there are any live matches
 * 2. Immediately scrape results if live matches are found
 * 3. Wait 10 minutes and check again
 * @returns void
 * @throws Error if there is an error checking for live matches or scraping results
 */
export async function checkLiveMatchesAndScrapeResults() {
  try {
    await connectDB();

    // Find matches that are currently live
    const liveMatches = await Match.find({
      status: 1,
      game: { $in: ["League of Legends", "Valorant"] },
    });

    if (liveMatches.length) {
      console.log("pass");
      await scrapeResults(liveMatches);
      await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
      await checkLiveMatchesAndScrapeResults();
    } else {
      console.log("🔴 No live matches found");
      return;
    }
  } catch (error) {
    console.error("Error checking for live matches status:", error);
  }
}

/**
 * Helper function to scrape match results
 */
async function scrapeResults(liveMatches: MatchType[]) {
  // create variable by game
  const liveMatchesByGame = liveMatches.reduce<{ [key: string]: MatchType[] }>(
    (acc, match) => {
      const game = match.league === "div2" ? "div2" : match.game;
      acc[game] = acc[game] || [];
      acc[game].push(match);
      return acc;
    },
    {}
  );

  try {
    for (const game in liveMatchesByGame) {
      if (game === "League of Legends" || game === "Valorant") {
        console.log("🔄 Scraping League of Legends and Valorant results...");
        await getRiotResults(liveMatchesByGame[game]);
      } else if (game === "div2") {
        console.log("🔄 Scraping Div2 results...");
        await getDiv2Results(liveMatchesByGame[game]);
      }
    }
  } catch (error) {
    console.error("Error scraping results:", error);
  }
}
