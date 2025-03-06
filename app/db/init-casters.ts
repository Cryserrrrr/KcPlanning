import { connectDB } from "~/db";
import { Caster } from "~/models/caster";
import { addCasters } from "~/services/casters.server";

export async function initializeCasters() {
  await connectDB();
  const existingCasters = await Caster.countDocuments();
  if (existingCasters === 0) {
    console.log("🚀 No caster found, adding them automatically...");
    await addCasters();
    console.log("✅ Casters added to the database!");
  } else {
    console.log("🔍 Casters already exist in the database, no action needed.");
  }
}
