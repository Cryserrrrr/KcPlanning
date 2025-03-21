import { connectDB } from "~/db";
import { MatchType, Match } from "~/models/match";
import { getRiotResult } from "../scraper/scraperStarter/getResult";
let liveMatchesInterval: NodeJS.Timeout | null = null;
let hasLiveMatches = false;
let isCheckingLiveMatches = false;

export function startLolResultScheduler() {
  if (!isCheckingLiveMatches) {
    checkLiveMatchesAndScrapeResults();
  } else {
    console.log("⏳ Previous live match check still running, skipping...");
  }
}

/**
 * Combines the functionality of checking for live matches and scraping results.
 * This function will:
 * 1. Check if there are any live matches
 * 2. Start or stop the scraping interval as needed
 * 3. Immediately scrape results if live matches are found
 * @returns void
 * @throws Error if there is an error checking for live matches or scraping results
 */
async function checkLiveMatchesAndScrapeResults() {
  try {
    isCheckingLiveMatches = true;
    await connectDB();

    // Find matches that are currently live
    const liveMatches = await Match.find({
      status: 1,
      game: { $in: ["League of Legends", "Valorant"] },
    }).select("id, matchId");

    // If we have live matches but the interval isn't running
    if (liveMatches.length && !hasLiveMatches) {
      console.log(
        `🟢 Starting result scraper (${liveMatches.length} live matches found)`
      );
      hasLiveMatches = true;

      if (liveMatchesInterval === null) {
        await scrapeResults(liveMatches);
        liveMatchesInterval = setInterval(
          () => scrapeResults(liveMatches),
          10 * 60 * 1000
        );
      }
    }
    // If we have no live matches but the interval is running
    else if (liveMatches.length === 0 && hasLiveMatches) {
      console.log("🔴 Stopping result scraper (no live matches)");
      hasLiveMatches = false;

      // Clear the interval
      if (liveMatchesInterval !== null) {
        clearInterval(liveMatchesInterval);
        liveMatchesInterval = null;
      }
    }
    // If there are live matches and the interval is already running,
    // still scrape results immediately for fresh data
    else if (liveMatches.length) {
      await scrapeResults(liveMatches);
    }
  } catch (error) {
    console.error("Error checking for live matches status:", error);
  } finally {
    console.log("🔴 No live matches found");
    isCheckingLiveMatches = false;
  }
}

/**
 * Helper function to scrape match results
 */
async function scrapeResults(liveMatches: MatchType[]) {
  try {
    console.log("🔄 Scraping match results...");
    await getRiotResult(liveMatches);
  } catch (error) {
    console.error("Error scraping results:", error);
  }
}
