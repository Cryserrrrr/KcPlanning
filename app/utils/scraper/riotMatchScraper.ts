import puppeteer from "puppeteer";
import { MatchType } from "./lolscraper";
import { Caster, Caster as CasterType } from "../../models/caster";
import { Types } from "mongoose";
import { Match } from "../../models/match";
import { correctLolName, correctValorantName } from "../utilsFunctions";

export const riotEsportScraper = async ({
  game,
  url,
}: {
  game: string;
  url: string;
}) => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2" });

  const containerDiv = await page.waitForSelector(
    "div.d_flex.flex-d_column.flex_1_auto.w_100\\%"
  );

  if (!containerDiv) {
    await browser.close();
    return [];
  }

  await page.waitForFunction(
    (): boolean => {
      const container: Element | null = document.querySelector(
        "div.d_flex.flex-d_column.flex_1_auto.w_100\\%"
      );
      const content: string = container?.innerHTML || "";
      return content.includes("div");
    },
    { timeout: 10000 }
  );

  const karmineCorpMatches: (MatchType | null)[] = await containerDiv.evaluate(
    (containerDiv, gameType): (MatchType | null)[] => {
      const container: Element | null = document.querySelector(
        "div.d_flex.flex-d_column.flex_1_auto.w_100\\%"
      );
      if (!container) return [];

      const temp: HTMLDivElement = document.createElement("div");
      temp.innerHTML = container.innerHTML;

      const targetClass: string =
        "bg-c_black.501 px_200 py_75 [&:has(+section)]:bdr-b_8px [&:has(+section)]:pb_200 [&:has(+section)]:smDown:bdr-b_0";
      const matchDivs: Element[] = Array.from(
        temp.getElementsByClassName(targetClass)
      );

      return matchDivs
        .filter((div: Element): boolean =>
          div.innerHTML.includes("Karmine Corp")
        )
        .map((div: Element): MatchType | null => {
          const matchDiv: HTMLDivElement = document.createElement("div");
          matchDiv.innerHTML = div.innerHTML;

          // Extract the date and time from the time element
          const timeElement: HTMLTimeElement | null =
            matchDiv.querySelector("time");
          const date: Date =
            (timeElement?.getAttribute("datetime") as unknown as Date) || "";
          if (!date) {
            return null;
          }

          // Extract the league and the type
          const leagueAndType: string =
            matchDiv
              .querySelector(".c_\\[\\#8C8C8C\\].grid-c_2_\\/_2")
              ?.textContent?.trim() || "";

          let league: string = leagueAndType.split("•")[0].trim();
          if (league === "La Ligue Française") {
            league = "LFL";
          }
          const type: string = leagueAndType.split("•")[1].trim();

          // Extract the team names
          const teamElements: NodeListOf<Element> =
            matchDiv.querySelectorAll("p.tt_uppercase");
          const teams: {
            acronym: string;
            name: string;
            logoUrl: string;
            players: { position: string; name: string }[];
          }[] = Array.from(teamElements).map((team: Element) => {
            const acronym: string = team.textContent?.trim() || "";
            const imageElement: HTMLImageElement | null =
              team.querySelector("img");
            let name: string = imageElement?.getAttribute("alt")?.trim() || "";
            const logoUrl: string = imageElement?.getAttribute("src") || "";
            return { acronym, name, logoUrl, players: [] };
          });

          const seriesInfo: string =
            matchDiv
              .querySelector(".c_\\[\\#8C8C8C\\].grid-c_3_\\/_3")
              ?.textContent?.trim()
              .match(/\d+/)?.[0] || "";

          let status: number = 0;
          if (date < new Date()) {
            status = 2;
          }

          return {
            matchId: null,
            date,
            teams,
            seriesType: seriesInfo,
            score: null,
            league,
            type,
            game: gameType,
            status,
            rounds: parseInt(seriesInfo),
          };
        })
        .filter((match): match is MatchType => match !== null);
    },
    game
  );

  // Add ObjectId after evaluate
  const matches: (MatchType | null)[] = await Promise.all(
    karmineCorpMatches.map(async (match) => {
      if (!match) {
        return null;
      }
      const casters: CasterType[] = await Caster.find({
        leagues: { $in: match.league },
      });
      // correct the name of the teams
      match.teams.forEach((team) => {
        if (game === "League of Legends") {
          team.name = correctLolName(team.name);
        } else if (game === "Valorant") {
          team.name = correctValorantName(team.name, match.league);
        }
      });
      return {
        ...match,
        matchId: new Types.ObjectId(),
        casters: casters,
      };
    })
  );

  await browser.close();

  // Check if matchs is already in the database
  const existingMatches: MatchType[] = await Match.find({
    date: { $gte: new Date() },
  });

  // If match is already in the database and if the team is not TBD, skip
  const matchesToAdd: (MatchType | null)[] = matches
    .filter((m) => {
      if (!m?.date) return false;
      if (
        existingMatches.some(
          (em) => new Date(em.date).getTime() === new Date(m?.date).getTime()
        )
      ) {
        return existingMatches.some((em) => em.teams === m?.teams);
      }
      return true;
    })
    .map((match) => {
      if (!match) return null;
      return {
        ...match,
        date: new Date(match.date),
        teams: match.teams.map((team) => ({
          ...team,
          stats: null,
          players: team.players.map((player) => ({
            ...player,
            stats: null,
          })),
        })),
      };
    });

  return matchesToAdd;
};
