import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { scrapeLeagueOfLegendsMatches } from "~/utils/scraper/lolscraper";
import { scrapeValorantMatches } from "~/utils/scraper/valorantScraper";

export const action: ActionFunction = async ({ request }) => {
  const authHeader = request.headers.get("Authorization");
  console.log("🔄 Scraping matches...", authHeader);
  if (!authHeader) {
    return json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (authHeader !== process.env.SCRAPER_SECRET) {
    return json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    console.log("🔄 Scraping matches...");
    await Promise.all([
      scrapeLeagueOfLegendsMatches(),
      scrapeValorantMatches(),
    ]);
    return json({ success: true }, { status: 200 });
  } catch (error) {
    return json(
      { success: false, error: "Error scraping matches" },
      { status: 500 }
    );
  }
};
