import puppeteer from "puppeteer";
import { Status, RiotEvent } from "~/types/match";

/**
 * Scrapes esports event data from Riot Games websites (LoL or Valorant)
 *
 * @param {Object} params - The parameters for the scraper
 * @param {string} params.game - The game to scrape events for ("League of Legends" or "Valorant")
 * @param {string} params.url - The base URL to navigate to
 * @param {Status} params.status - The status of events to retrieve
 * @returns {Promise<Array<RiotEvent>>} Array of esports events data
 */
export const riotEsportRequestScraper = async ({
  game,
  url,
  status,
}: {
  game: string;
  url: string;
  status: Status;
}): Promise<RiotEvent[]> => {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();
  let eventsData: RiotEvent[] = [];

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    eventsData = await page.evaluate(
      (gameSport: string, eventStatus: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let startDateStr: string;
        let endDateStr: string;

        if (eventStatus === "unstarted") {
          startDateStr = today.toISOString();

          const endDate = new Date(startDateStr);
          endDate.setMonth(endDate.getMonth() + 2);
          endDate.setHours(endDate.getHours() + 1);
          endDateStr = endDate.toISOString();
        } else {
          startDateStr = today.toISOString();

          const endDate = new Date(startDateStr);
          endDate.setDate(endDate.getDate() + 1);
          endDate.setHours(endDate.getHours() + 1);
          endDateStr = endDate.toISOString();
        }

        const valorantLeagues: string[] = [
          "106109559530232966",
          "107019646737643925",
          "107566807613828723",
          "109222784797127274",
          "109940824119741550",
          "113991317635212236",
        ];

        const lolLeagues: string[] = [
          "100695891328981122",
          "105266103462388553",
          "113464388705111224",
          "98767975604431411",
          "98767991302996019",
          "98767991325878492",
        ];

        interface ApiVariables {
          hl: string;
          sport: string;
          leagues: string[];
          eventDateStart: string;
          eventDateEnd: string;
          eventState: string[];
          eventType: string;
          pageSize: number;
        }

        const variables: ApiVariables = {
          hl: "fr-FR",
          sport: gameSport === "League of Legends" ? "lol" : "val",
          leagues:
            gameSport === "League of Legends" ? lolLeagues : valorantLeagues,
          eventDateStart: startDateStr,
          eventDateEnd: endDateStr,
          eventState: [eventStatus],
          eventType: "match",
          pageSize: 40,
        };

        const domain: string =
          gameSport === "League of Legends"
            ? "https://lolesports.com"
            : "https://valorantesports.com";

        const apiUrl: string = `${domain}/api/gql?operationName=homeEvents&variables=${encodeURIComponent(
          JSON.stringify(variables)
        )}&extensions=${encodeURIComponent(
          '{"persistedQuery":{"version":1,"sha256Hash":"089916a64423fe9796f6e81b30e9bda7e329366a5b06029748c610a8e486d23f"}}'
        )}`;

        interface ApiHeaders {
          "Content-Type": string;
          "apollographql-client-name": string;
          "apollographql-client-version": string;
          accept: string;
          pragma: string;
          "cache-control": string;
          "x-apollo-operation-name": string;
        }

        const headers: ApiHeaders = {
          "Content-Type": "application/json",
          "apollographql-client-name": "Esports Web",
          "apollographql-client-version": "bc60ebf",
          accept: "*/*",
          pragma: "no-cache",
          "cache-control": "no-cache",
          "x-apollo-operation-name": "homeEvents",
        };

        return fetch(apiUrl, {
          headers: headers as unknown as HeadersInit,
        })
          .then((response) => {
            return response.json();
          })
          .then((data) => {
            if (data?.data?.esports?.events) {
              return data.data.esports.events;
            }
            return [];
          })
          .catch((error) => {
            console.error("Fetch error:", error);
            return [];
          });
      },
      game,
      status
    );

    console.log(
      `✅ API request completed, retrieved ${
        eventsData?.length || 0
      } events for ${game}`
    );
  } catch (error) {
    console.error("❌ Erreur critique dans le scraper:", error);
    eventsData = [];
  } finally {
    await browser.close();
  }

  return eventsData;
};
