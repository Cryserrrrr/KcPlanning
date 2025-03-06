import puppeteer from "puppeteer";

export async function scrapeLolTeams(teamName: string) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  let formattedTeamName = teamName;
  if (teamName === "Ici Japon Corp") {
    formattedTeamName = "Ici_Japon_Corp._Esport";
  } else {
    formattedTeamName = teamName.replace(/\s+/g, "_");
  }

  await page.goto(`https://lol.fandom.com/wiki/${formattedTeamName}`, {
    waitUntil: "networkidle2",
  });

  try {
    await page.click("#onetrust-reject-all-handler");
  } catch (error) {
    console.log("🟥 Cookie banner not found or already handled");
  }

  // Try multiple possible table selectors
  let table;
  try {
    table = await page.waitForSelector(
      "#mw-content-text > div > div.mw-parser-output > table:nth-child(2) > tbody > tr > td > table",
      { timeout: 5000 }
    );
  } catch (error) {
    try {
      table = await page.waitForSelector("table", { timeout: 5000 });
    } catch (error) {
      await browser.close();
      console.log("🟥 Table not found", formattedTeamName);
      return [];
    }
  }

  if (!table) {
    await browser.close();
    return [];
  }

  let roster = await table.evaluate((roster) => {
    const playerGroups = roster.querySelectorAll(
      "tr:nth-child(3) span[title], tr:nth-child(3) a"
    );
    const players = [];

    for (let i = 0; i < playerGroups.length; i += 2) {
      const positionElement = playerGroups[i];
      const nameElement = playerGroups[i + 1];

      if (
        positionElement &&
        nameElement &&
        positionElement.getAttribute("title")
      ) {
        players.push({
          position: positionElement.getAttribute("title") || "",
          name: nameElement.textContent || "",
        });
      }
    }

    return players;
  });

  if (!roster || roster.length === 0) {
    await browser.close();
    return [];
  }

  roster = roster
    .filter((player, index, self) => {
      return self.findIndex((t) => t.position === player.position) === index;
    })
    .slice(0, 5);

  await browser.close();

  return roster;
}
