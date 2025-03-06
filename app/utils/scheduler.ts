import { scrapeKCMatches } from "./scraper/lolscraper";
import { scrapeLolResults } from "./scraper/lolResultScraper";
import { scrapeLolStats } from "./scraper/lolStatScraper";
import { updateTodayMatchesStatus } from "./changeStatus";

export function startScheduler() {
  // scrapeKCMatches();
  // Lunch it every day at 23:00
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  nextDay.setHours(23, 0, 0, 0);

  const delay = nextDay.getTime() - now.getTime();

  setTimeout(async () => {
    scrapeKCMatchesScheduler();
  }, delay);
}

const scrapeKCMatchesScheduler = async () => {
  console.log("🔄 Scraping KC matches...");
  await scrapeKCMatches();
  setInterval(async () => {
    console.log("🔄 Scraping KC matches...");
    await scrapeKCMatches();
  }, 86400000);
};
export function startLolResultScheduler() {
  //scrapeLolResults();
  // Lunch it every hour

  setInterval(async () => {
    console.log("🔄 Scraping LFL matches...");
    await scrapeLolResults();
  }, 60 * 60 * 1000);
}

// Only for testing
export function startLolStatScheduler() {
  scrapeLolStats("Solary", "Karmine Corp Blue", "First Stand", "Tour 1");
  return;
}

export function startChangeStatusScheduler() {
  // lunch it every hour at 01 minutes
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1);
  nextHour.setMinutes(1);
  nextHour.setSeconds(0);
  nextHour.setMilliseconds(0);

  console.log(nextHour);

  const delay = nextHour.getTime() - now.getTime();

  console.log(delay);

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
