import puppeteer from "puppeteer";
import { connectDB } from "~/db";
import { scrapeLolTeams } from "./lolTeamScraper";
import { Caster as CasterType } from "~/models/caster";
import { Types } from "mongoose";
import { Match } from "~/models/match";
import { KcStats, RankingData, scrapeLolStats } from "./lolStatScraper";
import { ScrapingResult } from "./lolStatScraper";
import { riotEsportScraper } from "./riotMatchScraper";

export type MatchType = {
  matchId: Types.ObjectId | null;
  date: Date;
  teams: {
    acronym: string;
    name: string;
    logoUrl: string;
    players: { position: string | null; name: string; stats?: any | null }[];
    stats?: any | null;
    numberOfChampionsPlayed?: number | null;
  }[];
  seriesType: string;
  score: { team1: number; team2: number } | null;
  league: string;
  type: string;
  game: string;
  status: number;
  rounds: number;
  casters?: CasterType[] | null;
  rankingData?: RankingData[] | null;
  kcStats?: KcStats | null;
};

export type PlayerType = {
  position: string | null;
  name: string;
  stats?: any | null;
};

const LEC_URL: string =
  "https://lolesports.com/fr-FR/leagues/emea_masters,first_stand,lec,lfl,msi,worlds";

export async function scrapeLeagueOfLegendsMatches(): Promise<void> {
  await connectDB();

  const matchesToAdd: (MatchType | null)[] = await riotEsportScraper({
    game: "League of Legends",
    url: LEC_URL,
  });

  if (matchesToAdd.length === 0) {
    console.log("🟥 No matches to add", "League of Legends");
    return;
  }

  // Add roster to matches
  let rosterAlreadyAdded: { [key: string]: PlayerType[] } = {};
  for (const match of matchesToAdd) {
    if (!match) {
      continue;
    }
    for (const team of match.teams) {
      if (rosterAlreadyAdded[team.name]) {
        team.players = rosterAlreadyAdded[team.name].map((player) => ({
          ...player,
          stats: null,
        }));
      } else if (team.name === "TBD") {
        team.players = [];
      } else {
        const roster: PlayerType[] = await scrapeLolTeams(team.name);
        team.players = roster.map((player) => ({
          ...player,
          stats: null,
        }));
        rosterAlreadyAdded[team.name] = roster;
      }
    }

    const statsData: ScrapingResult = await scrapeLolStats(
      match.teams[0].name,
      match.teams[1].name,
      match.league,
      match.type
    );

    match.rankingData = statsData.rankingData;
    match.kcStats = statsData.kcStats;

    match.teams[0].stats = statsData.firstTeamStats?.championTableData;
    match.teams[1].stats = statsData.secondTeamStats?.championTableData;
    match.teams[0].numberOfChampionsPlayed =
      statsData.firstTeamStats?.numberOfChampionsPlayed;
    match.teams[1].numberOfChampionsPlayed =
      statsData.secondTeamStats?.numberOfChampionsPlayed;

    match.teams[0].players.forEach((player) => {
      // find player by name and add his stats
      const playerStats = statsData.firstTeamStats?.playerTableData?.find(
        (p) => p.name === player.name
      );
      player.stats = playerStats;
    });
    match.teams[1].players.forEach((player) => {
      const playerStats = statsData.secondTeamStats?.playerTableData?.find(
        (p) => p.name === player.name
      );
      player.stats = playerStats;
    });
  }

  // Add match to database
  for (const match of matchesToAdd) {
    if (!match) {
      continue;
    }

    await Match.create(match);
    console.log(`🟩 Match ${match.date} added to database`);
  }
}
