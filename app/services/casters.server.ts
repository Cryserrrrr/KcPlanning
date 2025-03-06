import { Caster } from "~/models/caster";
import { connectDB } from "~/db";

export async function addCasters() {
  await connectDB();

  const casters = [
    {
      name: "Kameto",
      twitchLink: "https://www.twitch.tv/kamet0",
      leagues: [
        "LEC",
        "La Ligue Française",
        "First Stand",
        "MSI",
        "Mondial",
        "EMEA Masters",
        "VCT",
        "RL",
      ],
    },
    {
      name: "Tiky",
      twitchLink: "https://www.twitch.tv/tikyjr",
      leagues: ["Div2"],
    },
    {
      name: "Fugu",
      twitchLink: "https://www.twitch.tv/fugu_fps",
      leagues: ["VCL"],
    },
    {
      name: "Helydia",
      twitchLink: "https://www.twitch.tv/helydia",
      leagues: ["GC"],
    },
    {
      name: "Kenny",
      twitchLink: "https://www.twitch.tv/kennystream",
      leagues: ["RL"],
    },
    {
      name: "Fatih",
      twitchLink: "https://www.twitch.tv/fatiiiih",
      leagues: ["TFT"],
    },
  ];

  for (const caster of casters) {
    await Caster.findOneAndUpdate({ name: caster.name }, caster, {
      upsert: true,
      new: true,
    });
  }
}
