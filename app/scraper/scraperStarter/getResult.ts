import { connectDB } from "~/db";
import { Match, MatchType } from "~/models/match";
import { riotEsportRequestScraper } from "../riotEsportRequestScraper";
import { Links } from "~/utils/links";
import { Status, RiotEvent } from "~/types/match";

/**
 * Updates completed matches in the database with their final scores from Riot eSports API
 *
 * @param liveMatches - Array of matches that need to be checked for completion
 * @returns Promise that resolves when match updates are complete
 */
export async function getRiotResult(liveMatches: MatchType[]): Promise<void> {
  await connectDB();

  // Fetch completed events from both League of Legends and Valorant
  const [lolEvents, valorantEvents]: [RiotEvent[], RiotEvent[]] =
    await Promise.all([
      riotEsportRequestScraper({
        game: "League of Legends",
        url: Links.lolEsports,
        status: Status.Completed,
      }),
      riotEsportRequestScraper({
        game: "Valorant",
        url: Links.valorantEsports,
        status: Status.Completed,
      }),
    ]);

  const allRiotEvents: RiotEvent[] = [...lolEvents, ...valorantEvents];

  // Find the first matching event from our live matches
  const matchingEvent: RiotEvent | undefined = allRiotEvents.find((event) =>
    liveMatches.some((liveMatch) => liveMatch.matchId === event.id)
  );

  // Update the match in database with final scores
  await Match.updateOne(
    {
      matchId: matchingEvent?.id,
    },
    {
      status: 2,
      $set: {
        "teams.$[team1].score":
          matchingEvent?.match.matchTeams[0].result.gameWins,
        "teams.$[team2].score":
          matchingEvent?.match.matchTeams[1].result.gameWins,
      },
    },
    {
      arrayFilters: [
        { "team1.name": matchingEvent?.match.matchTeams[0].name },
        { "team2.name": matchingEvent?.match.matchTeams[1].name },
      ],
    }
  );

  return;
}
