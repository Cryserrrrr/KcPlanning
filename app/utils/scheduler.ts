import { scrapeLeagueOfLegendsMatches } from "./scraper/lolscraper";
import { scrapeRiotResults } from "./scraper/riotResultScraper";
import { scrapeLolStats } from "./scraper/lolStatScraper";
import { updateTodayMatchesStatus } from "./changeStatus";
import { scrapeValorantMatches } from "./scraper/valorantScraper";
import { connectDB } from "~/db";
import { Match } from "~/models/match";
import { updateLolStats } from "./updateLolStats";

let liveMatchesInterval: NodeJS.Timeout | null = null;
let hasLiveMatches = false;
let isCheckingLiveMatches = false;

export async function startScheduler() {
  updateLolStatsScheduler();
  startMatchesScheduler();
  startChangeStatusScheduler();
  startLolResultScheduler();
}

async function startMatchesScheduler() {
  // Lunch it every day at 23:00
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  nextDay.setHours(22, 0, 0, 0);

  const delay = nextDay.getTime() - now.getTime();

  setTimeout(async () => {
    scrapeKCMatchesScheduler();
  }, delay);
}

const scrapeKCMatchesScheduler = async () => {
  console.log("🔄 Scraping KC matches...");
  await Promise.all([scrapeLeagueOfLegendsMatches(), scrapeValorantMatches()]);
  setInterval(async () => {
    console.log("🔄 Scraping KC matches...");
    await Promise.all([
      scrapeLeagueOfLegendsMatches(),
      scrapeValorantMatches(),
    ]);
  }, 86400000);
};

function startLolResultScheduler() {
  // Initial check
  checkLiveMatchesStatus();

  // Check every hour if we need to start or stop the scraping interval
  setInterval(async () => {
    if (!isCheckingLiveMatches) {
      await checkLiveMatchesStatus();
    } else {
      console.log("⏳ Previous live match check still running, skipping...");
    }
  }, 60 * 60 * 1000);
}

async function checkLiveMatchesStatus() {
  //await scrapeRiotResults();
  try {
    isCheckingLiveMatches = true;
    await connectDB();
    // Find matches that are currently live
    const liveMatches = await Match.find({
      status: 1,
    });

    // If we have live matches but the interval isn't running
    if (liveMatches.length > 0 && !hasLiveMatches) {
      console.log(
        `🟢 Starting result scraper (${liveMatches.length} live matches found)`
      );
      hasLiveMatches = true;

      // Start the 5-minute interval for scraping results
      if (liveMatchesInterval === null) {
        checkAndScrapeResults();
        liveMatchesInterval = setInterval(checkAndScrapeResults, 5 * 60 * 1000);
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
  } catch (error) {
    console.error("Error checking for live matches status:", error);
  } finally {
    isCheckingLiveMatches = false;
  }
}

async function checkAndScrapeResults() {
  try {
    console.log("🔄 Scraping match results...");
    await scrapeRiotResults();
  } catch (error) {
    console.error("Error scraping results:", error);
  }
}

// Only for testing
// function startLolStatScheduler() {
//   scrapeLolStats("Solary", "Karmine Corp Blue", "First Stand", "Tour 1");
//   return;
// }

function startChangeStatusScheduler() {
  // lunch it every hour at 01 minutes
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1);
  nextHour.setMinutes(1);
  nextHour.setSeconds(0);
  nextHour.setMilliseconds(0);

  const delay = nextHour.getTime() - now.getTime();

  setTimeout(async () => {
    updateMatchesStatusScheduler();
  }, delay);
}

const updateMatchesStatusScheduler = async () => {
  console.log("🔄 Changing status of matches...");
  await updateTodayMatchesStatus();
  setInterval(async () => {
    console.log("🔄 Changing status of matches...");
    await updateTodayMatchesStatus();
  }, 60 * 60 * 1000);
};

const updateLolStatsScheduler = async () => {
  // Update stats all days at 02:00
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  nextDay.setHours(2, 0, 0, 0);

  const delay = nextDay.getTime() - now.getTime();

  setTimeout(async () => {
    console.log("🔄 Updating LOL stats...");
    await updateLolStats();
  }, delay);
};
