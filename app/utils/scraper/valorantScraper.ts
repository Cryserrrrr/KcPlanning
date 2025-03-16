import { connectDB } from "~/db";
import { scrapeValorantTeams } from "./valorantTeamScraper";
import { Match } from "~/models/match";
import { MatchType, PlayerType } from "./lolscraper";
import { riotMatchScraper } from "./riotMatchScraper";

const VAL_URL: string =
  "https://valorantesports.com/en-GB/leagues/challengers_emea,game_changers_championship,game_changers_emea,vct_emea,vct_masters,vrl_france";

export async function scrapeValorantMatches(): Promise<void> {
  await connectDB();

  const matchesToAdd: (MatchType | null)[] = await riotMatchScraper({
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
