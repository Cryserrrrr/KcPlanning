import { connectDB } from "~/db";
import { scrapeValorantTeams } from "../valorantTeamScraper";
import { Match } from "~/models/match";
import { MatchType, PlayerType } from "~/types/match";
import { riotMatchScraper } from "./riotMatch";
import { Links } from "~/utils/links";

/**
 * Scrapes Valorant matches from the specified URL.
 *
 * This function:
 * 1. Connects to the database
 * 2. Fetches match data using the Riot API scraper
 * 3. Adds player rosters to each team in the matches
 * 4. Retrieves and adds statistics for teams and players
 * 5. Stores complete match data in the database
 *
 * @returns {Promise<void>} A promise that resolves when scraping is complete
 */
export async function scrapeValorantMatches(): Promise<void> {
  await connectDB();

  const matchesToAdd: (MatchType | null)[] = await riotMatchScraper({
    game: "Valorant",
    url: Links.valorantEsports,
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
