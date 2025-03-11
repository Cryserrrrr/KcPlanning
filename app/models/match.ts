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
});

const scoreSchema = new mongoose.Schema({
  teamOne: { type: Number, required: true },
  teamTwo: { type: Number, required: true },
});

const matchSchema = new mongoose.Schema(
  {
    teams: [teamSchema],
    date: { type: Date, required: true }, // Ex: "2025-02-23"
    league: { type: String, required: true }, // Ex: "LEC"
    matchId: { type: String, required: true, unique: true },
    game: { type: String, required: true }, // Ex: "League of Legends"
    type: { type: String, required: true }, // Ex: "Playoffs"
    status: { type: Number, required: true }, // Ex: 0, 1, 2
    score: { type: scoreSchema, required: false }, // Ex: { teamOne: 1, teamTwo: 0 }
    rounds: { type: Number, required: true }, // Ex: 3
    casters: [{ type: Object, required: true }],
    rankingData: { type: Array, required: false },
    kcStats: { type: Object, required: false },
  },
  { timestamps: true }
);

export const Match = mongoose.model("Match", matchSchema);

export type MatchType = InferSchemaType<typeof matchSchema>;
