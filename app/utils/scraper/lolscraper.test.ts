import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import puppeteer from "puppeteer";
import { connectDB } from "~/db";
import { scrapeLolTeams } from "./lolTeamScraper";
import { Caster } from "~/models/caster";
import { Match } from "~/models/match";
import { Types } from "mongoose";
import { scrapeKCMatches } from "./lolscraper";

// Mock des dépendances
vi.mock("puppeteer");
vi.mock("~/db");
vi.mock("./lolTeamScraper");
vi.mock("~/models/caster");
vi.mock("~/models/match");
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    Types: {
      ObjectId: vi.fn().mockImplementation(() => "mocked-object-id"),
    },
  };
});

describe("scrapeKCMatches", () => {
  // Configuration commune pour les tests
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    // Reset des mocks
    vi.clearAllMocks();

    // Mock du navigateur et de la page
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue({
        evaluate: vi.fn().mockResolvedValue([
          {
            matchId: null,
            date: "2024-06-18T16:00:00Z",
            teams: [
              {
                acronym: "KC",
                name: "Karmine Corp",
                logoUrl: "kc-logo.png",
                players: [],
              },
              {
                acronym: "G2",
                name: "G2 Esports",
                logoUrl: "g2-logo.png",
                players: [],
              },
            ],
            seriesType: "3",
            score: null,
            league: "LEC",
            type: "Regular",
            game: "League of Legends",
            status: 0,
            rounds: 3,
          },
          {
            matchId: null,
            date: "2024-06-18T15:00:00Z",
            teams: [
              {
                acronym: "KC",
                name: "Karmine Corp",
                logoUrl: "kc-logo.png",
                players: [],
              },
              {
                acronym: "TBD",
                name: "TBD",
                logoUrl: "tbd-logo.png",
                players: [],
              },
            ],
            seriesType: "3",
            score: null,
            league: "LEC",
            type: "Regular",
            game: "League of Legends",
            status: 0,
            rounds: 3,
          },
        ]),
      }),
      waitForFunction: vi.fn().mockResolvedValue(true),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Mock de puppeteer.launch
    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

    // Mock de connectDB
    vi.mocked(connectDB).mockResolvedValue(undefined);

    // Mock de scrapeLolTeams
    vi.mocked(scrapeLolTeams).mockImplementation(async (teamName) => {
      if (teamName === "Karmine Corp") {
        return [
          { position: "Top", name: "Canna" },
          { position: "Jungle", name: "Yike" },
          { position: "Mid", name: "Vladi" },
          { position: "ADC", name: "Caliste" },
          { position: "Support", name: "Targamas" },
        ];
      } else {
        return [
          { position: "Top", name: "BrokenBlade" },
          { position: "Jungle", name: "Skewmound" },
          { position: "Mid", name: "Caps" },
          { position: "ADC", name: "Hans Sama" },
          { position: "Support", name: "Labrov" },
        ];
      }
    });

    // Mock des fonctions Mongoose
    vi.mocked(Caster.find).mockResolvedValue([
      { _id: "caster1" },
      { _id: "caster2" },
    ] as any);

    vi.mocked(Match.find).mockResolvedValue([]);
    vi.mocked(Match.create).mockResolvedValue({} as any);

    // Mock de console.log pour éviter le bruit dans les tests
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devrait se connecter à la base de données et lancer puppeteer", async () => {
    await scrapeKCMatches();

    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
  });

  it("devrait scraper les matchs de Karmine Corp", async () => {
    await scrapeKCMatches();

    expect(mockPage.goto).toHaveBeenCalledWith(
      "https://lolesports.com/fr-FR/leagues/emea_masters,first_stand,lec,lfl,msi,worlds",
      { waitUntil: "networkidle2" }
    );
    expect(mockPage.waitForSelector).toHaveBeenCalled();
    expect(mockPage.waitForFunction).toHaveBeenCalled();
  });

  it("devrait récupérer les casters pour chaque match", async () => {
    await scrapeKCMatches();

    expect(Caster.find).toHaveBeenCalledWith({ leagues: { $in: "LEC" } });
  });

  it("devrait vérifier les matchs existants en base de données", async () => {
    await scrapeKCMatches();

    expect(Match.find).toHaveBeenCalledWith({
      date: { $gte: expect.any(String) },
    });
  });

  it("devrait récupérer les rosters pour chaque équipe", async () => {
    await scrapeKCMatches();

    expect(scrapeLolTeams).toHaveBeenCalledWith("Karmine Corp");
    expect(scrapeLolTeams).toHaveBeenCalledWith("G2 Esports");
  });

  it("devrait récupérer les rosters pour chaque équipe une seule fois si elle apparait plusieurs fois dans les matchs", async () => {
    await scrapeKCMatches();

    expect(scrapeLolTeams).toHaveBeenCalledTimes(2);
  });

  it("devrait ajouter les nouveaux matchs à la base de données", async () => {
    await scrapeKCMatches();

    expect(Match.create).toHaveBeenCalledTimes(2);
    expect(Match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teams: expect.arrayContaining([
          expect.objectContaining({
            name: "Karmine Corp",
            players: expect.any(Array),
          }),
          expect.objectContaining({
            name: "G2 Esports",
            players: expect.any(Array),
          }),
        ]),
        casters: expect.any(Array),
        date: expect.any(String),
        rounds: 3,
        seriesType: "3",
        status: 0,
        type: "Regular",
      })
    );
    expect(Match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teams: expect.arrayContaining([
          expect.objectContaining({ name: "TBD" }),
        ]),
      })
    );
  });

  it("Ne devrait pas ajouter de matchs si le match existe déjà", async () => {
    vi.mocked(Match.find).mockResolvedValue([
      {
        date: "2024-06-18T16:00:00Z",
        teams: [{ name: "Karmine Corp" }, { name: "G2 Esports" }],
      },
      {
        date: "2024-06-18T15:00:00Z",
        teams: [{ name: "Karmine Corp" }, { name: "TBD" }],
      },
    ] as any);

    await scrapeKCMatches();

    expect(Match.create).not.toHaveBeenCalled();
  });

  it("devrait gérer le cas où aucun match n'est trouvé", async () => {
    mockPage.waitForSelector = vi.fn().mockResolvedValue({
      evaluate: vi.fn().mockResolvedValue([]),
    });

    await scrapeKCMatches();

    expect(Match.create).not.toHaveBeenCalled();
  });

  it("devrait fermer le navigateur à la fin du scraping", async () => {
    await scrapeKCMatches();

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });
});
