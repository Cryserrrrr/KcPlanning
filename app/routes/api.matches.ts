import { json, type LoaderFunction } from "@remix-run/node";
import { Match } from "~/models/match";

export const loader: LoaderFunction = async ({ request }) => {
  // Vérification du referer pour limiter les appels à votre domaine
  const referer = request.headers.get("referer");
  if (
    !referer ||
    (!referer.includes("kcagenda.com") && process.env.NODE_ENV === "production")
  ) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  // Vérification de la méthode HTTP
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!startDate || !endDate) {
    return json({ error: "Start and end dates are required" }, { status: 400 });
  }

  // Validation du format des dates
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return json({ error: "Invalid date format" }, { status: 400 });
  }

  const startDateTime = new Date(startDate);
  startDateTime.setUTCHours(0, 0, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setUTCHours(23, 59, 59, 999);

  const maxRangeMs = 10 * 24 * 60 * 60 * 1000;
  if (endDateTime.getTime() - startDateTime.getTime() > maxRangeMs) {
    return json({ error: "Date range is too long" }, { status: 400 });
  }

  try {
    const matches = await Match.find({
      date: { $gte: startDateTime, $lte: endDateTime },
    })
      .sort({ date: 1 })
      .limit(50) // Limiter le nombre de résultats
      .lean();

    process.env.NODE_ENV === "development" &&
      console.log(`${matches.length} matches found`);

    return json(matches, {
      headers: {
        "Cache-Control": "public, max-age=300", // Cache de 5 minutes
        "Content-Security-Policy": "default-src 'self'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return json({ error: "Error fetching matches" }, { status: 500 });
  }
};

// Fonction pour valider le format de date (YYYY-MM-DD)
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
