import puppeteer from "puppeteer";
import { PlayerType } from "~/types/match";

export async function scrapeValorantTeams(
  teamName: string
): Promise<PlayerType[]> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const formattedTeamName = teamName.replace(/\s+/g, "_");
  const url = `https://liquipedia.net/valorant/${formattedTeamName}`;

  try {
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
  } catch (error) {
    console.log(`🟥 Navigation timeout for ${formattedTeamName}:`);
    await browser.close();
    return [];
  }

  // Try multiple possible table selectors
  let table;
  try {
    table = await page.waitForSelector(
      "table.wikitable.wikitable-striped.roster-card",
      { timeout: 5000 }
    );
  } catch (error) {
    await browser.close();
    console.log("🟥 Table not found", formattedTeamName);
    return [];
  }

  if (!table) {
    await browser.close();
    return [];
  }

  let roster = await table.evaluate((roster) => {
    const players = Array.from(roster.querySelectorAll("td.ID"))
      .map((td) => td.textContent?.trim())
      .filter((text) => text !== "");

    return players;
  });

  if (!roster || roster.length === 0) {
    await browser.close();
    return [];
  }

  await browser.close();

  return roster
    .filter((player): player is string => player !== undefined)
    .map((player) => ({
      position: null,
      name: player,
      stats: null,
    }));
}
