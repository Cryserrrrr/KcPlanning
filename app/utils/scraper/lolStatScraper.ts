import puppeteer, { Browser, Page, ElementHandle } from "puppeteer";

// Define interfaces for the data structures
interface SideWin {
  winOrLoss: string;
  side: string;
}

interface SidePercentages {
  winByRedSidePercentage: number;
  winByBlueSidePercentage: number;
}

export interface KcStats extends SidePercentages {
  winrateVsOtherTeamPercentage?: number;
  topThreeChampions?: [string, number][];
}

interface WinrateData {
  date: string;
  winOrLoss: number;
}

interface MatchResult {
  date: string;
  winOrLoss: number;
}

interface TeamStats {
  playerTableData?: {
    name: string;
    kda: string;
    csm: string;
    gm: string;
    dmgm: string;
    kpar: string;
    mostPlayedChampion: string[];
  }[];
  championTableData?: {
    champion: string;
    gamesPlayed: string;
    winRate: string;
    kda: string;
    csm: string;
    gm: string;
    dmgm: string;
    kpar: string;
  }[];
  numberOfChampionsPlayed: number;
}

export interface RankingData {
  position: string;
  teamName: string;
  regionName: string;
  series: { win: string; lose: string; percentage: string };
}

export interface ScrapingResult {
  kcStats: KcStats;
  firstTeamStats: TeamStats | undefined;
  secondTeamStats: TeamStats | undefined;
  rankingData: RankingData[] | null;
}

export async function scrapeLolStats(
  teamOneName: string,
  teamTwoName: string,
  league: string,
  type: string
): Promise<ScrapingResult> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  console.log("🔄 Scraping LOL stats...", teamOneName, teamTwoName);

  const formattedTeamOneNameWithUnderscore = teamOneName.replace(/\s+/g, "_");
  const formattedTeamTwoNameWithUnderscore = teamTwoName.replace(/\s+/g, "_");
  let formattedLeagueNameWithUnderscore = "";

  formattedLeagueNameWithUnderscore = league.replace(/\s+/g, "_");

  const getKarmineCorp = teamOneName.includes("Karmine")
    ? teamOneName
    : teamTwoName;

  const getOtherTeam = teamOneName.includes("Karmine")
    ? teamTwoName
    : teamOneName;

  const formattedKarmineCorp = getKarmineCorp.replace(/\s+/g, "+");

  const currentYear = new Date().getFullYear();

  const firstUrl = `https://lol.fandom.com/Special:RunQuery/MatchHistoryGame?MHG%5Bpreload%5D=Team&MHG%5Bspl%5D=yes&MHG%5Bstartdate%5D=${currentYear}-01-01&MHG%5Bteam%5D=${formattedKarmineCorp}&_run=true`;

  // Don't add it to the Promise.all cause getKcStats cookies handler is not working (idk why)
  const firstTeamStats = await getTeamsStats(
    formattedTeamOneNameWithUnderscore,
    currentYear,
    browser
  );
  const secondTeamStats = await getTeamsStats(
    formattedTeamTwoNameWithUnderscore,
    currentYear,
    browser
  );
  try {
    const [kcStats, rankingData] = await Promise.all([
      getKcStats(firstUrl, getOtherTeam, browser),
      getRanking(formattedLeagueNameWithUnderscore, type, browser, currentYear),
    ]);
    await browser.close();

    return { kcStats, firstTeamStats, secondTeamStats, rankingData };
  } catch (error) {
    console.error("❌ Error while scraping:", error);
    await browser.close();
    throw error;
  }
}

export const getKcStats = async (
  firstUrl: string,
  otherTeam: string,
  browser: Browser
): Promise<KcStats> => {
  const page = await browser.newPage();
  await page.goto(firstUrl, { waitUntil: "networkidle2" });

  try {
    await handleCookieBanner(page);
    const table = await getTableElement(page);
    const rows = await extractTableData(table);

    const sideWins = extractSideWinsData(rows);
    const sidePercentages = calculateSideWinPercentages(sideWins);

    const formattedOtherTeam = otherTeam.replace(/\s+/g, "_");

    const otherTeamCells = rows?.filter(
      (row: any) => row[5] === formattedOtherTeam
    );

    if (!otherTeamCells || otherTeamCells.length === 0) {
      return sidePercentages;
    }

    const topThreeChampions = extractTopBannedChampions(otherTeamCells);
    const winrateVsOtherTeamPercentage = calculateWinrateVsTeam(otherTeamCells);

    return {
      ...sidePercentages,
      winrateVsOtherTeamPercentage,
      topThreeChampions,
    };
  } catch (error) {
    console.error("Error in getKcStats:", error);
    await page.close();
    throw error;
  }
};

// Helper functions for getKcStats
async function handleCookieBanner(page: Page): Promise<void> {
  try {
    await page.click("#onetrust-reject-all-handler");
  } catch (error) {}
}

async function getTableElement(page: Page): Promise<ElementHandle<Element>> {
  const table = await page.waitForSelector("table.wikitable");
  if (!table) {
    throw new Error("🟥 Table not found");
  }
  return table;
}

async function extractTableData(
  table: ElementHandle<Element>
): Promise<string[][]> {
  return await table.evaluate((table: any) => {
    const rowElements = Array.from(table.querySelectorAll("tbody tr"));
    return rowElements.map((row: any) => {
      const cells = Array.from(row.querySelectorAll("td")).slice(0, 10);
      return cells.map((cell: any, index: number) => {
        if (index === 5) {
          const link = cell.querySelector("a");
          return link ? link.getAttribute("title") : cell.textContent?.trim();
        } else if (index >= 6) {
          const spans = Array.from(cell.querySelectorAll("span"));
          if (spans.length > 0) {
            return spans
              .map((span: any) => span.getAttribute("title"))
              .join(", ");
          }
        }
        return cell.textContent?.trim();
      });
    });
  });
}

function extractSideWinsData(rows: string[][]): SideWin[] {
  return rows?.map((row: any) => ({
    winOrLoss: row[3],
    side: row[4],
  }));
}

function calculateSideWinPercentages(sideWins: SideWin[]): SidePercentages {
  let winByRedSidePercentage = 0;
  let winByBlueSidePercentage = 0;

  if (sideWins && sideWins.length > 0) {
    const winByRedSide = sideWins.filter((side: any) => side.side === "Red");
    const winByBlueSide = sideWins.filter((side: any) => side.side === "Blue");
    const lossByRedSide = sideWins.filter(
      (side: any) => side.winOrLoss === "Loss" && side.side === "Red"
    );
    const lossByBlueSide = sideWins.filter(
      (side: any) => side.winOrLoss === "Loss" && side.side === "Blue"
    );

    if (winByRedSide && winByBlueSide && lossByRedSide && lossByBlueSide) {
      winByRedSidePercentage = winByRedSide.length / sideWins.length;
      winByBlueSidePercentage = winByBlueSide.length / sideWins.length;
    }
  }

  return { winByRedSidePercentage, winByBlueSidePercentage };
}

function extractTopBannedChampions(
  otherTeamCells: string[][]
): [string, number][] {
  let allChampionArray: string[] = [];

  otherTeamCells.forEach((cell: any) => {
    const championsCell = [cell[6], cell[7]];
    championsCell.forEach((champions: any) => {
      if (champions) {
        champions.split(", ").forEach((champion: string) => {
          allChampionArray.push(champion.trim());
        });
      }
    });
  });

  const championsCount = allChampionArray.reduce(
    (acc: Record<string, number>, champion: any) => {
      acc[champion] = (acc[champion] || 0) + 1;
      return acc;
    },
    {}
  );

  return Object.entries(championsCount)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 3) as [string, number][];
}

function calculateWinrateVsTeam(otherTeamCells: string[][]): number {
  const winrateVsOtherTeamData: WinrateData[] = otherTeamCells.map(
    (cell: string[]) => ({
      date: cell[0],
      winOrLoss: cell[3] === "Win" ? 0 : 1,
    })
  );

  // Group by date and calculate BO results
  const matchResults: MatchResult[] = Object.entries(
    winrateVsOtherTeamData.reduce((acc: Record<string, number[]>, curr) => {
      (acc[curr.date] = acc[curr.date] || []).push(curr.winOrLoss);
      return acc;
    }, {}) || {}
  ).map(([date, results]) => ({
    date,
    winOrLoss:
      results.filter((r) => r === 0).length >
      results.filter((r) => r === 1).length
        ? 0
        : 1,
  }));

  // Calculate win percentage
  return matchResults.length
    ? matchResults.reduce((sum, match) => sum + match.winOrLoss, 0) /
        matchResults.length
    : 0;
}

export const getTeamsStats = async (
  teamName: string,
  currentYear: number,
  browser: Browser
): Promise<TeamStats | undefined> => {
  if (teamName === "TBD") {
    return {
      playerTableData: [],
      championTableData: [],
      numberOfChampionsPlayed: 0,
    };
  }
  const page = await browser.newPage();
  await page.goto(
    `https://lol.fandom.com/wiki/${teamName}/Statistics/${currentYear}`,
    {
      waitUntil: "networkidle2",
    }
  );

  try {
    const cookieButton = await page.$("#onetrust-reject-all-handler");
    if (cookieButton) {
      await cookieButton.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {}

  // Add a check if the page exists or has the expected content
  const pageNotFound = await page.$("div.noarticletext");
  if (pageNotFound) {
    console.log(`🟨 No statistics page found for team: ${teamName}`);
    await page.close();
    return {
      playerTableData: [],
      championTableData: [],
      numberOfChampionsPlayed: 0,
    };
  }

  // Use a shorter timeout and handle the case when the table doesn't exist
  try {
    const playerTable = await page.waitForSelector("table.wikitable", {
      timeout: 5000,
    });

    if (!playerTable) {
      console.log("🟥 Player table not found");
      await page.close();
      return {
        playerTableData: [],
        championTableData: [],
        numberOfChampionsPlayed: 0,
      };
    }

    // Extract data from all rows, but only specific columns
    const playerTableData = await playerTable?.evaluate((table) => {
      const rows = Array.from(table.querySelectorAll("tbody tr"));

      return rows
        .map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          return {
            name: cells[1]?.textContent?.trim() || "",
            kda: cells[9]?.textContent?.trim() || "",
            csm: cells[11]?.textContent?.trim() || "",
            gm: cells[13]?.textContent?.trim() || "",
            dmgm: cells[15]?.textContent?.trim() || "",
            kpar: cells[16]?.textContent?.trim() || "",
            mostPlayedChampion:
              Array.from(cells[20]?.querySelectorAll("a") || []).map(
                (a) => a.querySelector("span")?.title?.trim() || ""
              ) || [],
          };
        })
        .filter((item) => item.name.length > 0);
    });

    // Find the second table that is in a div containing h3 with span id="By_Champion"
    const championTableData = await page.evaluate(() => {
      // Find the span with id="By_Champion"
      const targetSpan = document.querySelector("span#By_Champion");
      if (!targetSpan) return undefined;

      // Find the h3 containing this span
      const h3Element = targetSpan.closest("h3");
      if (!h3Element) return undefined;

      // Find the div containing this h3
      let currentElement: Element | null = h3Element;
      let containerDiv: HTMLDivElement | null = null;

      // Look for the closest div that contains both the h3 and a table
      while (currentElement && !containerDiv) {
        const parentElement = currentElement.parentElement as Element | null;
        if (!parentElement) break;

        currentElement = parentElement;
        if (
          currentElement instanceof HTMLDivElement &&
          currentElement.querySelector("table.wikitable")
        ) {
          containerDiv = currentElement;
        }
      }

      if (!containerDiv) return undefined;

      const table = containerDiv.querySelector("table.wikitable");
      if (!table) return undefined;

      const tableLength = Array.from(table.querySelectorAll("tbody tr")).length;

      const rows = Array.from(table.querySelectorAll("tbody tr")).slice(1, 6);
      const championStats = rows
        .map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          return {
            champion:
              cells[0]
                ?.querySelector("span.markup-object-name")
                ?.textContent?.trim() || "",
            gamesPlayed: cells[1]?.textContent?.trim() || "",
            winRate: cells[5]?.textContent?.trim() || "",
            kda: cells[9]?.textContent?.trim() || "",
            csm: cells[11]?.textContent?.trim() || "",
            gm: cells[13]?.textContent?.trim() || "",
            dmgm: cells[15]?.textContent?.trim() || "",
            kpar: cells[16]?.textContent?.trim() || "",
          };
        })
        .filter((item) => item.champion.length > 0);

      return { championStats, numberOfChampionsPlayed: tableLength };
    });

    if (!championTableData) {
      return {
        playerTableData,
        championTableData: [],
        numberOfChampionsPlayed: 0,
      };
    }

    return {
      playerTableData,
      championTableData: championTableData.championStats,
      numberOfChampionsPlayed: championTableData.numberOfChampionsPlayed,
    };
  } catch (error) {
    console.log(`🟨 Error finding tables for team ${teamName}`);
    await page.close();
    return {
      playerTableData: [],
      championTableData: [],
      numberOfChampionsPlayed: 0,
    };
  }
};

const getRanking = async (
  league: string,
  type: string,
  browser: Browser,
  currentYear: number
) => {
  const page = await browser.newPage();

  const rankingFunction =
    rankingFunctions[league as keyof typeof rankingFunctions];
  if (!rankingFunction) {
    return [];
  }
  return await rankingFunction(type, page, currentYear, league);
};

const LFLRanking = async (type: string, page: Page, currentYear: number) => {
  if (type === "Play-offs" || type === "Finale") {
    return [];
  }
  const currentSplit = await getCurrentSplit("LFL");
  await page.goto(`https://lol.fandom.com/wiki/LFL/${currentYear}_Season`);

  const rankingData = await page.evaluate(
    async (currentSplit, type) => {
      const targetSpan = document.querySelector(`span#${currentSplit}`);
      if (!targetSpan) return null;

      if (type === "Système suisse") {
        // Select the table with more tr
        const tables = document.querySelectorAll("table.wikitable2");
        let maxRows = 0;
        let maxTable = null;
        for (const table of tables) {
          const rows = table.querySelectorAll("tbody tr");
          if (rows.length > maxRows) {
            maxRows = rows.length;
            maxTable = table;
          }
        }
        const rows = Array.from(
          maxTable?.querySelectorAll("tbody tr") || []
        ).filter((row) => row.getAttribute("data-teamhighlight"));
        return rows?.map((row) => {
          const cells = Array.from(row.querySelectorAll("td")).slice(0, -1);
          return {
            position: cells[0]?.textContent?.trim() || "",
            teamName: cells[1]?.textContent?.trim() || "",
            regionName: "LFL",
            series: {
              win: cells[2]?.textContent?.split("-")[0].trim() || "",
              lose: cells[2]?.textContent?.split("-")[1].trim() || "",
              percentage: cells[3]?.textContent?.trim().slice(0, -1) || "",
            },
          };
        });
      } else {
        const tables = document.querySelectorAll("table.wikitable2.standings");

        let targetTable = null;
        for (const table of tables) {
          const hasKarmine = table.querySelector(
            'tr[data-teamhighlight="Karmine Corp Blue"]'
          );
          if (hasKarmine) {
            targetTable = table;
            break;
          }
        }

        if (!targetTable) return null;

        const rows = Array.from(
          targetTable.querySelectorAll("tbody tr[data-teamhighlight]")
        );

        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td")).slice(0, -1);
          return {
            position: cells[0]?.textContent?.trim() || "",
            teamName: cells[1]?.textContent?.trim() || "",
            regionName: "LFL",
            series: {
              win: cells[2]?.textContent?.split("-")[0].trim() || "",
              lose: cells[2]?.textContent?.split("-")[1].trim() || "",
              percentage: cells[3]?.textContent?.trim().slice(0, -1) || "",
            },
          };
        });
      }
    },
    currentSplit,
    type
  );

  return rankingData || [];
};

const LECRanking = async (type: string, page: Page, currentYear: number) => {
  if (type === "Play-offs" || type === "Finale") {
    return [];
  }
  const currentSplit = await getCurrentSplit("LEC");
  await page.goto(`https://lol.fandom.com/wiki/LEC/${currentYear}_Season`);

  // Select the div after the h2 with span id = currentsplit
  const rankingData = await page.evaluate((currentSplit) => {
    const targetSpan = document.querySelector(`span#${currentSplit}`);
    if (!targetSpan) return null;

    const h2Element = targetSpan.closest("h2");
    if (!h2Element) return null;

    // Find the next div after this h2
    let nextElement = h2Element.nextElementSibling;
    while (nextElement && nextElement.tagName !== "DIV") {
      nextElement = nextElement.nextElementSibling;
    }

    const table = nextElement?.querySelector("table.wikitable2");
    if (!table) return null;

    const rows = Array.from(table.querySelectorAll("tbody tr")).filter((row) =>
      row.getAttribute("data-teamhighlight")
    );
    return rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td")).slice(0, -1);
      return {
        position: cells[0]?.textContent?.trim() || "",
        teamName: cells[1]?.textContent?.trim() || "",
        regionName: "LEC",
        series: {
          win: cells[2]?.textContent?.split("-")[0].trim() || "",
          lose: cells[2]?.textContent?.split("-")[1].trim() || "",
          percentage: cells[3]?.textContent?.trim().slice(0, -1) || "",
        },
      };
    });
  }, currentSplit);

  return rankingData;
};

const InternationalEventRanking = async (
  type: string,
  page: Page,
  currentYear: number,
  league: string
) => {
  if (
    type === "Quarts de finale" ||
    type === "Demi-finales" ||
    type === "Finale" ||
    type === "Play-ins"
  ) {
    return [];
  }

  let formattedLeague = "";
  switch (league) {
    case "MSI":
      formattedLeague = "Mid-Season_Invitational";
      break;
    case "Mondial":
      formattedLeague = "Season_World_Championship";
      break;
    default:
      formattedLeague = league;
  }

  await page.goto(
    `https://lol.fandom.com/wiki/${currentYear}_${formattedLeague}`
  );

  const rankingData = await page.evaluate((type) => {
    // get table that contain Karmine Corp
    const tables = document.querySelectorAll("table.wikitable2");
    let targetTable = null;
    for (const table of tables) {
      const hasKarmine = table.querySelector(
        `tr[data-teamhighlight="Karmine Corp"]`
      );
      if (hasKarmine) {
        targetTable = table;
        break;
      }
    }

    if (!targetTable) return null;

    const rows = Array.from(targetTable.querySelectorAll("tbody tr")).filter(
      (row) => row.getAttribute("data-teamhighlight")
    );
    return rows.map((row) => {
      const teamName =
        row
          .querySelectorAll("td")[1]
          .querySelector("span")
          ?.textContent?.trim() || "";
      const regionName =
        row
          .querySelectorAll("td")[1]
          .querySelector("div")
          ?.textContent?.trim() || "";
      const position = row.querySelectorAll("td")[0]?.textContent?.trim() || "";
      const cells = Array.from(row.querySelectorAll("td")).slice(0, -1);
      const series = {
        win: cells[2]?.textContent?.split("-")[0].trim() || "",
        lose: cells[2]?.textContent?.split("-")[1].trim() || "",
        percentage: cells[3]?.textContent?.trim().slice(0, -1) || "",
      };
      return {
        position,
        teamName,
        regionName,
        series,
      };
    });
  }, type);

  return rankingData;
};

const getCurrentSplit = async (league: string) => {
  const currentMonth = new Date().getMonth();

  if (currentMonth >= 1 && currentMonth <= 2) {
    if (league === "LEC") {
      return "Winter";
    } else if (league === "LFL") {
      return "Flash_In";
    }
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    return "Spring";
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    return "Summer";
  }
};

const rankingFunctions = {
  LFL: LFLRanking,
  LEC: LECRanking,
  First_Stand: InternationalEventRanking,
  MSI: InternationalEventRanking,
  World_Championship: InternationalEventRanking,
};
