import puppeteer from "puppeteer";
import { connectDB } from "~/db";
import { Match } from "~/models/match";
import { correctLolName } from "../utilsFunctions";

type KarmineCorpMatchResultType = {
  teams: {
    name: string;
  }[];
  score: { teamOne: number; teamTwo: number } | null;
};

const LEC_URL: string =
  "https://lolesports.com/fr-FR/leagues/emea_masters,first_stand,lec,lfl,msi,worlds";

export async function scrapeRiotResults(): Promise<void> {
  await connectDB();

  const liveMatches = await Match.find({
    status: 1,
    game: { $in: ["League of Legends", "Valorant"] },
  });

  if (liveMatches.length === 0) {
    return;
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.goto(LEC_URL, { waitUntil: "networkidle2" });

  const containerDiv = await page.waitForSelector(
    "div.d_flex.flex-d_column.flex_1_auto.w_100\\%"
  );

  if (!containerDiv) {
    await browser.close();
    return;
  }

  await page.waitForFunction(
    (): boolean => {
      const container: Element | null = document.querySelector(
        "div.d_flex.flex-d_column.flex_1_auto.w_100\\%"
      );
      const content: string = container?.innerHTML || "";
      return content.includes("div");
    },
    { timeout: 10000 }
  );

  const karmineCorpMatch: KarmineCorpMatchResultType | null =
    await containerDiv.evaluate(async () => {
      const container: Element | null = document.querySelector(
        "div.d_flex.flex-d_column.flex_1_auto.w_100\\%"
      );
      if (!container) return null;

      const temp: HTMLDivElement = document.createElement("div");
      temp.innerHTML = container.innerHTML;

      const targetClass: string =
        "bg-c_black.501 px_200 py_75 [&:has(+section)]:bdr-b_8px [&:has(+section)]:pb_200 [&:has(+section)]:smDown:bdr-b_0";
      const matchDivs: Element[] = Array.from(
        temp.getElementsByClassName(targetClass)
      );

      const karmineCorpLastMatch: Element | null = matchDivs
        .filter(
          (div: Element): boolean =>
            div.innerHTML.includes("Karmine") && !div.innerHTML.includes("time")
        )
        .slice(-1)[0];

      const teamElements: NodeListOf<Element> =
        karmineCorpLastMatch.querySelectorAll("p.tt_uppercase");
      const teams: {
        name: string;
      }[] = Array.from(teamElements).map((team: Element) => {
        const imageElement: HTMLImageElement | null = team.querySelector("img");
        const name: string = imageElement?.getAttribute("alt")?.trim() || "";
        return { name };
      });

      const scoreDiv = karmineCorpLastMatch.querySelector(
        "div.ai_center.d_grid.gap_200.grid-c_2_\\/_2.grid-tc_1fr_auto_1fr.jc_center.textStyle_title\\/md.smDown\\:gap_100.smDown\\:textStyle_title\\/sm.smDown\\:grid-c_1_\\/_1 > div"
      );

      const button = karmineCorpLastMatch.querySelector(
        'button[aria-label="Cliquer pour dévoiler"]'
      );

      if (button) {
        (button as HTMLElement).click();
      }

      const score1 = scoreDiv?.querySelector("span")?.textContent?.trim();
      const score2 = scoreDiv
        ?.querySelector("span:last-child")
        ?.textContent?.trim();

      const score = {
        teamOne: parseInt(score1 || "0"),
        teamTwo: parseInt(score2 || "0"),
      };

      return {
        teams,
        score,
      };
    });

  if (!karmineCorpMatch) {
    await browser.close();
    return;
  }

  karmineCorpMatch.teams.forEach((team) => {
    team.name = correctLolName(team.name);
  });

  const currentMatchId = liveMatches.find(
    (match) =>
      match.teams.some(
        (team) => team.name === karmineCorpMatch.teams[0].name
      ) &&
      match.teams.some((team) => team.name === karmineCorpMatch.teams[1].name)
  )?.matchId;

  console.log("c1", currentMatchId);

  if (!currentMatchId) {
    await browser.close();
    return;
  }

  console.log(currentMatchId);

  await Match.updateOne(
    {
      matchId: currentMatchId,
    },
    { status: 2, score: karmineCorpMatch.score }
  );

  console.log("🟩 Match updated");

  await browser.close();
}
