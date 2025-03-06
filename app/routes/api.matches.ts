import { json, type LoaderFunction } from "@remix-run/node";
import { Match } from "~/models/match";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!startDate || !endDate) {
    return json(
      { error: "Les dates de début et de fin sont requises" },
      { status: 400 }
    );
  }

  // Créer des dates avec des heures spécifiques pour couvrir toute la journée
  const startDateTime = new Date(startDate);
  startDateTime.setUTCHours(0, 0, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setUTCHours(23, 59, 59, 999);

  try {
    const matches = await Match.find({
      date: { $gte: startDateTime, $lte: endDateTime },
    })
      .sort({ date: 1 })
      .lean();

    console.log(`${matches.length} matchs trouvés`);

    return json(matches);
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs:", error);
    return json(
      { error: "Erreur lors de la récupération des matchs" },
      { status: 500 }
    );
  }
};
