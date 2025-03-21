import { Types } from "mongoose";
import { Caster as CasterType } from "~/models/caster";

// Global types

type teamsType = {
  acronym: string;
  name: string;
  logoUrl: string;
  players: { position: string | null; name: string; stats?: any | null }[];
  stats?: any | null;
  numberOfChampionsPlayed?: number | null;
  score?: number | null;
};

export type MatchType = {
  matchId: Types.ObjectId | null;
  date: Date;
  teams: teamsType[];
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

// Match stats

export interface SideWin {
  winOrLoss: string;
  side: string;
}

export interface SidePercentages {
  winByRedSidePercentage: number;
  winByBlueSidePercentage: number;
}

export interface KcStats extends SidePercentages {
  winrateVsOtherTeamPercentage?: number;
  topThreeChampions?: [string, number][];
}

export interface WinrateData {
  date: string;
  winOrLoss: number;
}

export interface MatchResult {
  date: string;
  winOrLoss: number;
}

export interface TeamStats {
  playerTableData?: {
    name: string;
    kda: string;
    csm: string;
    gm: string;
    dmgm: string;
    kpar: string;
    mostPlayedChampion: string[];
  }[];
  championTableData?: {
    champion: string;
    gamesPlayed: string;
    winRate: string;
    kda: string;
    csm: string;
    gm: string;
    dmgm: string;
    kpar: string;
  }[];
  numberOfChampionsPlayed: number;
}

export interface RankingData {
  position: string;
  teamName: string;
  regionName: string;
  series: { win: string; lose: string; percentage: string };
}

export interface ScrapingResult {
  kcStats: KcStats;
  firstTeamStats: TeamStats | undefined;
  secondTeamStats: TeamStats | undefined;
  rankingData: RankingData[] | null;
}

// Enum

export enum Status {
  InProgress = "inProgress",
  Completed = "completed",
  Unstarted = "unstarted",
}

// Riot esport request scraper

export interface RiotEvent {
  __typename: string;
  blockName: string;
  id: string;
  league: {
    __typename: string;
    displayPriority: {
      __typename: string;
      position: number;
      status: string;
    };
    id: string;
    image: string;
    name: string;
    slug: string;
  };
  match: {
    __typename: string;
    flags: any[];
    games: {
      __typename: string;
      id: string;
      number: number;
      state: string;
      vods: any[];
      recaps: any[];
    }[];
    id: string;
    matchTeams: {
      __typename: string;
      code: string;
      id: string;
      image: string;
      lightImage: string | null;
      name: string;
      result: {
        __typename: string;
        gameWins: number;
        outcome: string;
      };
    }[];
    state: string;
    strategy: {
      __typename: string;
      count: number;
      type: string;
    };
    type: string;
  };
  startTime: string;
  state: string;
  streams: any[];
  tournament: {
    __typename: string;
    id: string;
    name: string;
  };
  type: string;
}
