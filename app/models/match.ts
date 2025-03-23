import mongoose, { InferSchemaType } from "mongoose";

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, required: false },
  stats: { type: Object, required: false },
});

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  acronym: { type: String, required: true },
  logoUrl: { type: String, required: true },
  players: [playerSchema],
  stats: { type: Object, required: false },
  numberOfChampionsPlayed: { type: Number, required: false },
  score: { type: Number, required: false },
});

const matchSchema = new mongoose.Schema(
  {
    teams: [teamSchema],
    date: { type: Date, required: true }, // Ex: "2025-02-23"
    league: { type: String, required: true }, // Ex: "LEC"
    leagueLogoUrl: { type: String, required: false },
    matchId: { type: String, required: true, unique: true },
    game: { type: String, required: true }, // Ex: "League of Legends"
    type: { type: String, required: true }, // Ex: "Playoffs"
    status: { type: Number, required: true }, // Ex: 0, 1, 2
    rounds: { type: Number, required: false }, // Ex: 3
    casters: [{ type: Object, required: true }],
    rankingData: { type: Array, required: false },
    kcStats: { type: Object, required: false },
  },
  { timestamps: true }
);

export const Match = mongoose.model("Match", matchSchema);

export type MatchType = InferSchemaType<typeof matchSchema>;
