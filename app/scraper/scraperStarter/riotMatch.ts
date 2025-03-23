import { MatchType } from "~/types/match";
import { Caster, Caster as CasterType } from "../../models/caster";
import { Match } from "../../models/match";
import {
  correctLolName,
  correctValorantName,
} from "../../utils/utilsFunctions";
import { Status } from "~/types/match";
import { riotEsportRequestScraper } from "../riotEsportRequestScraper";

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
  const eventsData = await riotEsportRequestScraper({
    game,
    url,
    status: Status.Unstarted,
  });

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
    const hasKC: boolean = event.match?.matchTeams?.some((team: any) =>
      team.code.includes("KC")
    );
    const isNewMatch: boolean = !existingMatches.some(
      (match) => match.matchId === event.id
    );
    const isNotDuplicate: boolean = !existingMatches.some((match) =>
      match.teams.some(
        (team: any) => team.name === event.match?.matchTeams?.[0].name
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
        name: team.name,
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
