import { connectDB } from "~/db";
import { scrapeValorantTeams } from "./valorantTeamScraper";
import { Caster as CasterType } from "~/models/caster";
import { Types } from "mongoose";
import { Match } from "~/models/match";
import { KcStats, RankingData } from "./lolStatScraper";
import { riotEsportScraper } from "./riotMatchScraper";
import { PlayerType } from "./lolscraper";

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

const VAL_URL: string =
  "https://valorantesports.com/en-GB/leagues/challengers_emea,game_changers_championship,game_changers_emea,vct_emea,vct_masters,vrl_france";

export async function scrapeValorantMatches(): Promise<void> {
  await connectDB();

  const matchesToAdd: (MatchType | null)[] = await riotEsportScraper({
    game: "Valorant",
    url: VAL_URL,
  });

  if (matchesToAdd.length === 0) {
    console.log("🟥 No matches to add", "Valorant");
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
        const roster: PlayerType[] = await scrapeValorantTeams(team.name);
        team.players = roster.map((player) => ({ ...player, stats: null }));
        rosterAlreadyAdded[team.name] = roster;
      }
    }
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
