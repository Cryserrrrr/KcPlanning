import puppeteer from "puppeteer";
import { Caster } from "~/models/caster";
import { Match } from "~/models/match";
import {
  Round,
  Div2Match,
  PlayerType,
  TeamsType,
  MatchType,
  TeamStats,
  RankingData,
  ScrapingResult,
} from "~/types/match";
import { Links } from "~/utils/links";
import { connectDB } from "~/db";
import { scrapeLolStats } from "../lolScraper/lolStatsScraper";
import { scrapeLolTeams } from "../lolScraper/lolTeamScraper";
import { correctLolName } from "~/utils/utilsFunctions";

/**
 * Scrapes Division 2 League of Legends matches from division2lol.fr
 *
 * This function:
 * 1. Connects to the database
 * 2. Uses puppeteer to scrape match data from Division 2 website
 * 3. Intercepts API responses to gather round and match information
 * 4. Filters matches to only include KCorp matches scheduled after 2025-01-01
 * 5. Checks for duplicate matches already in the database
 * 6. For each new match, fetches team rosters and statistics
 * 7. Formats the data and saves new matches to the database
 *
 * @returns {Promise<void>}
 */
export const getDiv2Matches = async (): Promise<void> => {
  await connectDB();
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
    timeout: 120000,
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    await page.setRequestInterception(true);

    let roundsData: Round[] = [];
    let tournamentId: string = "";

    page.on("request", (request) => {
      request.continue();
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/rounds")) {
        try {
          roundsData = await response.json();
          tournamentId = url.split("tournament_ids=")[1].split("&")[0];
        } catch (error) {
          console.error("Erreur lors de la récupération des données:", error);
        }
      }
    });

    page.setDefaultNavigationTimeout(120000);
    page.setDefaultTimeout(120000);

    await page.goto(Links.div2Matches, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });

    let attempts = 0;
    const maxAttempts = 10;
    const attemptDelay = 1000;

    while (!roundsData.length && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attemptDelay));
      attempts++;
    }

    const matchesData: Div2Match[] = [];

    const fetchPromises: Promise<Div2Match[]>[] = roundsData.map((round) => {
      const matchesUrl: string = `https://www.division2lol.fr/api/matches?tournament_ids=${tournamentId}&stage_ids=${round.group.stage.id}&group_ids=${round.group.id}&round_ids=${round.id}&sort=scheduled_asc`;

      return page.evaluate(async (url) => {
        const resp = await fetch(url, {
          headers: {
            accept: "*/*",
            "accept-encoding": "identity",
            "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "no-cache",
            "content-type": "application/json",
            pragma: "no-cache",
            priority: "u=1, i",
            range: "matches=0-9",
            "sec-ch-ua":
              '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "same-origin",
            "sec-fetch-site": "same-origin",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
          },
        });
        return await resp.json();
      }, matchesUrl);
    });

    const responses: Div2Match[][] = await Promise.all(fetchPromises);

    await browser.close();

    responses.forEach((response) => {
      if (response && Array.isArray(response)) {
        matchesData.push(...response);
      }
    });

    // filter matchesData to keep only the match of KCorp
    const kcorpMatches: Div2Match[] = matchesData.filter((match) => {
      if (new Date(match.scheduledDatetime) < new Date("2025-01-01")) {
        return false;
      } else {
        return match.opponents.some((opponent) =>
          opponent.participant.name.includes("KCorp")
        );
      }
    });

    // Check for existing matches in database to avoid duplicates
    const existingMatchIds: { matchId: string }[] = await Match.find(
      { matchId: { $in: kcorpMatches.map((match) => match.id) } },
      { matchId: 1, _id: 0 }
    ).lean();

    const existingMatchIdSet: Set<string> = new Set(
      existingMatchIds.map((match) => match.matchId)
    );

    // Filter out matches that already exist in the database
    const newMatches: Div2Match[] = kcorpMatches.filter(
      (match) => !existingMatchIdSet.has(match.id)
    );

    console.log(
      `Found ${kcorpMatches.length} KCorp matches, ${newMatches.length} are new`
    );

    const casters: Caster[] = await Caster.find({
      leagues: { $in: ["Div2"] },
    });

    let rosterAlreadyAdded: { [key: string]: PlayerType[] } = {};
    let teamStatsCache: { [key: string]: TeamStats } = {};
    let rankingDataCache: { [key: string]: RankingData[] } = {};
    const formattedMatches: MatchType[] = [];

    for (const match of newMatches) {
      let teams: TeamsType[] = match.opponents.map((opponent) => {
        const name: string = opponent.participant.name;
        const acronym: string = name
          .split(" ")
          .map((word) => word[0])
          .join("");
        const logoId: string = opponent.participant.logo.id;
        const logoUrl: string = `https://www.division2lol.fr/media/file/${logoId}/icon_medium`;
        return {
          name,
          acronym,
          logoUrl,
          players: [],
          stats: {},
          numberOfChampionsPlayed: 0,
          score: null,
        };
      });

      for (const team of teams) {
        if (rosterAlreadyAdded[team.name]) {
          team.players = rosterAlreadyAdded[team.name];
        } else {
          const roster = await scrapeLolTeams(correctLolName(team.name));
          team.players = roster.map((player) => ({
            name: player.name,
            position: player.position,
          }));
          rosterAlreadyAdded[team.name] = roster;
        }
      }

      const statsData: ScrapingResult = await scrapeLolStats(
        correctLolName(teams[0].name),
        correctLolName(teams[1].name),
        "div2",
        match.type,
        new Date(match.scheduledDatetime),
        teamStatsCache,
        rankingDataCache
      );

      if (!teamStatsCache[teams[0].name] && statsData.firstTeamStats) {
        teamStatsCache[teams[0].name] = statsData.firstTeamStats;
      }
      if (!teamStatsCache[teams[1].name] && statsData.secondTeamStats) {
        teamStatsCache[teams[1].name] = statsData.secondTeamStats;
      }

      if (
        !rankingDataCache[
          statsData.rankingDataAndCurrentSplit.currentSplit || "div2"
        ] &&
        statsData.rankingDataAndCurrentSplit.rankingData
      ) {
        rankingDataCache[
          statsData.rankingDataAndCurrentSplit.currentSplit || "div2"
        ] = statsData.rankingDataAndCurrentSplit.rankingData;
      }

      teams[0].stats = statsData.firstTeamStats?.championTableData;
      teams[1].stats = statsData.secondTeamStats?.championTableData;
      teams[0].numberOfChampionsPlayed =
        statsData.firstTeamStats?.numberOfChampionsPlayed;
      teams[1].numberOfChampionsPlayed =
        statsData.secondTeamStats?.numberOfChampionsPlayed;

      teams[0].players.forEach((player) => {
        const playerStats = statsData.firstTeamStats?.playerTableData?.find(
          (p) => p.name === player.name
        );
        player.stats = playerStats;
      });

      teams[1].players.forEach((player) => {
        const playerStats = statsData.secondTeamStats?.playerTableData?.find(
          (p) => p.name === player.name
        );
        player.stats = playerStats;
      });

      const date: Date = new Date(match.scheduledDatetime);
      formattedMatches.push({
        date,
        teams,
        league: "div2",
        leagueLogoUrl:
          "https://www.division2lol.fr/media/7301732705288822784/original",
        type: match.round.name,
        game: "League of Legends",
        matchId: match.id,
        status: 0,
        rounds: 0,
        casters: casters,
        rankingData:
          rankingDataCache[
            statsData.rankingDataAndCurrentSplit.currentSplit || "div2"
          ],
        kcStats: statsData.kcStats,
      });
    }

    await Match.insertMany(formattedMatches);

    console.log("✅ Scraping completed:", formattedMatches.length, "matches");
  } catch (error) {
    console.error("Erreur lors du scraping:", error);
    throw error;
  } finally {
    if (browser && browser.isConnected()) {
      await browser.close();
    }
  }
};
