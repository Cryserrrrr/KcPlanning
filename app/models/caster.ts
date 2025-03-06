import mongoose, { Document } from "mongoose";

export interface Caster extends Document {
  name: string;
  channel: string;
  leagues: string[];
}

const casterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    twitchLink: { type: String, required: true },
    leagues: [{ type: String, required: true }],
  },
  { timestamps: true }
);

export const Caster = mongoose.model<Caster>("Caster", casterSchema);
