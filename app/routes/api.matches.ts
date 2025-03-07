import { json, type LoaderFunction } from "@remix-run/node";
import { Match } from "~/models/match";

export const loader: LoaderFunction = async ({ request }) => {
  // Vérification du referer pour limiter les appels à votre domaine
  const referer = request.headers.get("referer");
  if (
    !referer ||
    (!referer.includes("kcagenda.com") && process.env.NODE_ENV === "production")
  ) {
    return json({ error: "Accès non autorisé" }, { status: 403 });
  }

  // Vérification de la méthode HTTP
  if (request.method !== "GET") {
    return json({ error: "Méthode non autorisée" }, { status: 405 });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!startDate || !endDate) {
    return json(
      { error: "Les dates de début et de fin sont requises" },
      { status: 400 }
    );
  }

  // Validation du format des dates
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return json({ error: "Format de date invalide" }, { status: 400 });
  }

  // Limiter la plage de dates à une période raisonnable (ex: max 3 mois)
  const startDateTime = new Date(startDate);
  startDateTime.setUTCHours(0, 0, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setUTCHours(23, 59, 59, 999);

  const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 jours en millisecondes
  if (endDateTime.getTime() - startDateTime.getTime() > maxRangeMs) {
    return json(
      { error: "La plage de dates ne peut pas dépasser 90 jours" },
      { status: 400 }
    );
  }

  try {
    const matches = await Match.find({
      date: { $gte: startDateTime, $lte: endDateTime },
    })
      .sort({ date: 1 })
      .limit(50) // Limiter le nombre de résultats
      .lean();

    process.env.NODE_ENV === "development" &&
      console.log(`${matches.length} matchs trouvés`);

    return json(matches, {
      headers: {
        "Cache-Control": "public, max-age=300", // Cache de 5 minutes
        "Content-Security-Policy": "default-src 'self'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs:", error);
    return json(
      { error: "Erreur lors de la récupération des matchs" },
      { status: 500 }
    );
  }
};

// Fonction pour valider le format de date (YYYY-MM-DD)
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
