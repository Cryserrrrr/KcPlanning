import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { updateLolStats } from "~/scraper/scraperStarter/updateLolStats";

export const action: ActionFunction = async ({ request }) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (authHeader !== process.env.SCRAPER_SECRET) {
    return json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    console.log("🔄 Updating lol stats...");
    await updateLolStats();
    return json({ success: true }, { status: 200 });
  } catch (error) {
    return json(
      { success: false, error: "Error scraping matches" },
      { status: 500 }
    );
  }
};
