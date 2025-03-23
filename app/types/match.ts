import { Types } from "mongoose";
import { Caster as CasterType } from "~/models/caster";

// Global types

export type TeamsType = {
  acronym: string;
  name: string;
  logoUrl: string;
  players: { position: string | null; name: string; stats?: any | null }[];
  stats?: any | null;
  numberOfChampionsPlayed?: number | null;
  score?: number | null;
};

export type MatchType = {
  matchId: string | null;
  date: Date;
  teams: TeamsType[];
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
  kcStats: KcStats | null;
  firstTeamStats: TeamStats | undefined;
  secondTeamStats: TeamStats | undefined;
  rankingDataAndCurrentSplit: {
    rankingData: RankingData[] | null;
    currentSplit: string | null;
  };
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

// Division 2 scraper

export interface Round {
  closed: boolean;
  group: {
    id: string;
    stage: {
      id: string;
    };
  };
  id: string;
  name: string;
  number: number;
  status: Status;
}

export interface Div2Match {
  id: string;
  publicNote: string | null;
  opponents: Div2Opponent[];
  tournament: Div2Tournament;
  stage: Div2Stage;
  group: Div2Group;
  round: Round;
  number: number;
  type: string;
  scoreType: string;
  status: string;
  scheduledDatetime: string;
  playedAt: string;
  reportStatus: string | null;
  reportClosed: boolean;
}

export interface Div2Opponent {
  participant: Div2Participant;
  number: number;
  position: number;
  rank: string | null;
  result: string;
  forfeit: boolean;
  score: number;
}

export interface Div2Participant {
  id: string;
  logo: {
    id: string;
  };
  type: string;
  customFieldValues: {
    logo: {
      icon_small: string;
      icon_medium: string;
      logo_small: string;
      logo_medium: string;
      logo_large: string;
    };
  };
  name: string;
  team: any | null;
  lineup: any[];
}

export interface Div2Tournament {
  id: string;
  discipline: string;
  name: string;
  status: string;
  participantType: string;
  scheduledDateStart: string;
  scheduledDateEnd: string;
  public: boolean;
  logo: string | null;
  settings: {
    discipline: string | null;
    tournament_code: string | null;
    paymentGateway: string | null;
  };
  disciplineFeatures: {
    type: string;
    name: string;
    options: {
      enabled: boolean;
    };
  }[];
}

export interface Div2Stage {
  id: string;
  number: number;
  name: string;
  type: string;
  status: string;
  closed: boolean;
  settings: {
    size: number;
    threshold: number;
    grand_final: string;
    skip_round1: boolean;
    round_naming: string;
  };
}

export interface Div2Group {
  id: string;
  number: number;
  name: string;
  status: string;
  closed: boolean;
  settings: {
    size: number;
  };
}

export interface FinalResult {
  opponent: string;
  kcorpScore: number;
  opponentScore: number;
}

export interface TeamScore {
  wins: number;
  losses: number;
}

export interface Div2MatchResult {
  date: string;
  result: string;
  opponent: string;
  isWin: boolean;
}
