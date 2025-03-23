import puppeteer from "puppeteer";
import { handleCookieConsent } from "../lolScraper/lolStatsScraper";
import { Match, MatchType } from "~/models/match";
import { connectDB } from "~/db";
import { correctLolName } from "~/utils/utilsFunctions";
import { Div2MatchResult, TeamScore, FinalResult } from "~/types/match";
/**
 * Scrapes Division 2 match results from Leaguepedia for Karmine Corp Blue Stars games
 * and updates the match database with final scores.
 *
 * @param liveMatches - Array of matches to update with results
 * @returns Promise<void>
 */
export const getDiv2Results = async (
  liveMatches: MatchType[]
): Promise<void> => {
  await connectDB();
  const browser = await puppeteer.launch();
  await handleCookieConsent(browser);
  const page = await browser.newPage();

  const currentYear = new Date().getFullYear();

  await page.goto(
    `https://lol.fandom.com/wiki/Special:RunQuery/MatchHistoryGame?MHG%5Bpreload%5D=Team&MHG%5Btournament%5D=&MHG%5Bteam%5D=Karmine+Corp+Blue+Stars&MHG%5Bteam1%5D=&MHG%5Bteam2%5D=&MHG%5Bban%5D=&MHG%5Brecord%5D=&MHG%5Bascending%5D%5Bis_checkbox%5D=true&MHG%5Blimit%5D=&MHG%5Boffset%5D=&MHG%5Bregion%5D=&MHG%5Byear%5D=${currentYear}&MHG%5Bstartdate%5D=&MHG%5Benddate%5D=&MHG%5Bwhere%5D=&MHG%5Btextonly%5D%5Bis_checkbox%5D=true&_run=&pfRunQueryFormName=MatchHistoryGame&wpRunQuery=&pf_free_text=`
  );

  // Wait for table to load
  await page.waitForSelector(".wikitable");

  // Extract dates from live matches
  const dateArray: Date[] = [];
  liveMatches.forEach((match) => {
    dateArray.push(match.date);
  });

  // Extract opponent names from live matches
  const opponentArray: string[] = [];
  liveMatches.forEach((match) => {
    match.teams.forEach((team) => {
      if (team.name !== "KCorp Blue Stars") {
        opponentArray.push(correctLolName(team.name));
      }
    });
  });

  // Convert dates to strings before passing to evaluate
  const dateStrings: string[] = dateArray.map((date) => date.toISOString());

  // Extract match results from the wikitable
  const matchResults: Div2MatchResult[] = await page.evaluate(
    (dateStrings: string[], opponentArrayEvaluate: string[]) => {
      const results = [];
      const tableRows = document.querySelectorAll(".wikitable tr");

      for (const row of tableRows) {
        if (!row.querySelector("td")) continue; // Skip header rows

        const dateCell = row.querySelector("td.mhgame-result:first-child");
        const resultCell = row.querySelector("td.mhgame-result:nth-child(4)");
        const opponentCell = row.querySelector("td:nth-child(6) a");

        if (dateCell && resultCell && opponentCell) {
          const date = dateCell.textContent?.trim() || "";
          const result = resultCell.textContent?.trim() || "";
          const opponent = opponentCell.getAttribute("title") || "";

          const dateObject = new Date(date);

          const isMatchDay = dateStrings.some((dateStr) => {
            const evalDate = new Date(dateStr);
            return (
              dateObject.getMonth() === evalDate.getMonth() &&
              dateObject.getDate() === evalDate.getDate()
            );
          });

          const isOpponent = opponentArrayEvaluate.some((opponentName) =>
            opponent.includes(opponentName)
          );

          if (isMatchDay && isOpponent) {
            results.push({
              date,
              result,
              opponent,
              isWin: result === "Win",
            });
          }
        }
      }
      return results;
    },
    dateStrings,
    opponentArray
  );

  await browser.close();

  // Process match results to calculate scores
  const scoresByOpponent = new Map<string, TeamScore>();

  // Group matches by opponent and calculate scores
  for (const match of matchResults) {
    if (!scoresByOpponent.has(match.opponent)) {
      scoresByOpponent.set(match.opponent, {
        wins: 0,
        losses: 0,
      });
    }

    const opponentScore = scoresByOpponent.get(match.opponent);
    if (opponentScore) {
      if (match.isWin) {
        opponentScore.wins += 1;
      } else {
        opponentScore.losses += 1;
      }
    }
  }

  // Convert to final result format with proper scoring
  const finalResults: FinalResult[] = [];
  for (const [opponent, scores] of scoresByOpponent.entries()) {
    finalResults.push({
      opponent,
      kcorpScore: scores.wins,
      opponentScore: scores.losses,
    });
  }

  // Update match scores in the liveMatches array
  liveMatches.map((match) => {
    const teams = match.teams;
    const opponent = teams.findIndex(
      (team) => team.name !== "KCorp Blue Stars"
    );
    const kcorp = teams.findIndex((team) => team.name === "KCorp Blue Stars");
    const finalResult = finalResults.find(
      (result) => result.opponent === correctLolName(teams[opponent].name)
    );

    if (finalResult) {
      match.teams[opponent].score = finalResult.opponentScore ?? 0;
      match.teams[kcorp].score = finalResult.kcorpScore ?? 0;
    }
    return match;
  });

  // Update matches in the database
  for (const match of liveMatches) {
    await Match.updateOne(
      { matchId: match.matchId },
      { $set: { status: 2, teams: match.teams } }
    );
  }

  console.log("✅ Div2 results updated");
};
