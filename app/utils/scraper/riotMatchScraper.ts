import puppeteer from "puppeteer";
import { MatchType } from "./lolscraper";
import { Caster, Caster as CasterType } from "../../models/caster";
import { Match } from "../../models/match";
import { correctLolName, correctValorantName } from "../utilsFunctions";

/**
 * Scrape matches from Riot Esports to find those involving Karmine Corp
 * @param {Object} params - Function parameters
 * @param {string} params.game - The game to scrape (League of Legends or Valorant)
 * @param {string} params.url - The URL of the Riot Esports site to scrape
 * @returns {Promise<Array>} List of upcoming Karmine Corp matches
 */
export const riotMatchScraper = async ({
  game,
  url,
}: {
  game: string;
  url: string;
}) => {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-dev-shm-usage",
    ],
    headless: true,
  });

  const page = await browser.newPage();
  let eventsData: any[] = [];

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const dataPromise = new Promise<any[]>((resolve) => {
    // Add request interception for debugging
    page.on("request", (request) => {
      const requestUrl = request.url();
      if (requestUrl.includes("api/gql")) {
        console.log("DEBUG - Request URL:", requestUrl);
      }
    });

    page.on("response", async (response) => {
      const responseUrl: string = response.url();
      if (
        responseUrl.includes("api/gql") &&
        responseUrl.includes("operationName=homeEvents") &&
        responseUrl.includes("leagues")
      ) {
        console.log("🔄 Scraping new Riot Esport matches... intercepted");
        try {
          const responseData: any = await response.json();
          if (responseData.data?.esports?.events) {
            resolve(responseData.data.esports.events);
          }
        } catch (error) {
          console.error("Error parsing response:", error);
        }
      }
    });

    page.waitForResponse((response) => {
      const responseUrl = response.url();
      return (
        responseUrl.includes("api/gql") &&
        responseUrl.includes("operationName=homeEvents") &&
        responseUrl.includes("leagues")
      );
    });
  });

  await page.goto(url, { waitUntil: "networkidle2" });

  const timeoutPromise = new Promise<any[]>((resolve) =>
    setTimeout(() => resolve([]), 10000)
  );
  eventsData = await Promise.race([dataPromise, timeoutPromise]);

  await browser.close();

  if (eventsData.length === 0) {
    console.log("No events data intercepted");
    return [];
  }

  const existingMatches: Array<{
    matchId: string;
    teams: Array<{ name: string }>;
  }> = await Match.find({
    date: { $gte: new Date() },
    game,
  })
    .select("matchId teams.name")
    .lean();

  /**
   * Filter events to keep only those involving Karmine Corp
   * which are not already in the database and which are not duplicates
   */
  const eventKarmineCorpMatches: any[] = eventsData.filter((event) => {
    const hasKC: boolean = event.match.matchTeams.some((team: any) =>
      team.code.includes("KC")
    );
    const isNewMatch: boolean = !existingMatches.some(
      (match) => match.matchId === event.id
    );
    const isNotDuplicate: boolean = !existingMatches.some((match) =>
      match.teams.some(
        (team: any) => team.name === event.match.matchTeams[0].name
      )
    );

    return hasKC && isNewMatch && isNotDuplicate;
  });

  const castersCache: Record<string, CasterType[]> = {};

  /**
   * Transform raw data into structured match objects
   */
  const karmineCorpMatches: MatchType[] = await Promise.all(
    eventKarmineCorpMatches.map(async (event) => {
      const league: string = event.league.name;

      const teams = event.match.matchTeams.map((team: any) => ({
        name:
          game === "League of Legends"
            ? correctLolName(team.name)
            : correctValorantName(team.name, league),
        acronym: team.code,
        logoUrl: team.image,
        players: [],
        stats: null,
        numberOfChampionsPlayed: null,
        score: null,
      }));

      if (!castersCache[league]) {
        castersCache[league] = await Caster.find({
          leagues: { $in: league },
        }).lean();
      }

      return {
        matchId: event.id,
        rounds: event.match.strategy.count,
        date: new Date(event.startTime),
        league,
        leagueLogoUrl: event.league.image,
        type: event.blockName,
        game,
        status: 0,
        teams,
        casters: castersCache[league],
      };
    })
  );

  return karmineCorpMatches;
};
