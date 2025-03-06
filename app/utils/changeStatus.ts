import { Match } from "../models/match";

export async function updateTodayMatchesStatus(): Promise<void> {
  try {
    const now = new Date();

    // Définir le début et la fin de la journée actuelle
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer tous les matchs du jour avec statut 0 (à venir)
    const todayMatches = await Match.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 0,
    });

    console.log("🟥 todayMatches", todayMatches);

    // Pour chaque match, vérifier si l'heure de début est passée
    for (const match of todayMatches) {
      const matchDate = new Date(match.date);

      // Si l'heure actuelle est supérieure ou égale à l'heure du match
      if (now >= matchDate) {
        // Mettre à jour le statut à 1 (en cours)
        await Match.updateOne({ _id: match._id }, { $set: { status: 1 } });

        console.log(
          `Match ${match.matchId} mis à jour: statut changé à "en cours"`
        );
      }
    }

    console.log(
      `Vérification terminée: ${todayMatches.length} matchs du jour traités`
    );
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour des statuts des matchs:",
      error
    );
    throw error;
  }
}
