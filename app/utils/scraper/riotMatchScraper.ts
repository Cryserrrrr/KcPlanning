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
  console.log("🚀 Démarrage du scraper avec:", { game, url });

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();
  let eventsData: any[] = [];

  page.on("console", (msg) => console.log("Page console:", msg.text()));

  // Configurer un user-agent réaliste
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  try {
    // Intercepter toutes les requêtes réseau
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      // Enregistrer les URLs des requêtes GraphQL
      if (request.url().includes("/api/gql")) {
        console.log("API Request URL:", request.url());
      }
      request.continue();
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    eventsData = await page.evaluate((gameSport) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = today.toISOString();

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 2);
      endDate.setHours(endDate.getHours() + 1);
      const endDateStr = endDate.toISOString();

      const valorantLeagues = [
        "106109559530232966",
        "107019646737643925",
        "107566807613828723",
        "109222784797127274",
        "109940824119741550",
        "113991317635212236",
      ];

      const lolLeagues = [
        "100695891328981122",
        "105266103462388553",
        "113464388705111224",
        "98767975604431411",
        "98767991302996019",
        "98767991325878492",
      ];
      const variables = {
        hl: "fr-FR",
        sport: gameSport === "League of Legends" ? "lol" : "val",
        eventDateStart: startDate,
        eventDateEnd: endDateStr,
        eventState: ["unstarted"],
        eventType: "match",
        pageSize: 40,
      };

      const domain =
        gameSport === "League of Legends"
          ? "https://lolesports.com"
          : "https://valorantesports.com";

      const apiUrl = `${domain}/api/gql?operationName=homeEvents&variables=${encodeURIComponent(
        JSON.stringify(variables)
      )}&extensions=${encodeURIComponent(
        '{"persistedQuery":{"version":1,"sha256Hash":"089916a64423fe9796f6e81b30e9bda7e329366a5b06029748c610a8e486d23f"}}'
      )}`;

      return fetch(apiUrl)
        .then((response) => {
          console.log(`Response status: ${response.status}`);
          if (!response.ok) {
            console.error(`Response not OK: ${response.statusText}`);
            return response.text().then((text) => {
              console.error("Error response body:", text);
              console.log("Response", response.url);
            });
          }
          return response.json();
        })
        .then((data) => {
          if (data?.data?.esports?.events) {
            console.log(`Found ${data.data.esports.events.length} events`);
            return data.data.esports.events;
          }
          console.log(
            "No events found in response:",
            JSON.stringify(data).substring(0, 200) + "..."
          );
          return [];
        })
        .catch((error) => {
          console.error("Fetch error:", error);
          return [];
        });
    }, game);

    console.log(
      `✅ API request completed, retrieved ${eventsData?.length || 0} events`
    );
  } catch (error) {
    console.error("❌ Erreur critique dans le scraper:", error);
    eventsData = [];
  } finally {
    console.log("🔚 Fermeture du navigateur");
    await browser.close();
  }

  if (eventsData.length === 0) {
    console.log("No events data retrieved");
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
