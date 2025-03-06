import { connectDB } from "~/db";
import { Caster } from "~/models/caster";
import { addCasters } from "~/services/casters.server";

export async function initializeCasters() {
  await connectDB();
  const existingCasters = await Caster.countDocuments();
  if (existingCasters === 0) {
    console.log("🚀 Aucun caster trouvé, ajout automatique...");
    await addCasters();
    console.log("✅ Casters ajoutés à la base de données !");
  } else {
    console.log(
      "🔍 Des casters existent déjà en base, aucune action nécessaire."
    );
  }
}
