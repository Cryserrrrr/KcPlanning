import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { scrapeLolTeams } from "./lolTeamScraper";
import puppeteer from "puppeteer";

vi.mock("puppeteer", () => {
  return {
    default: {
      launch: vi.fn(),
    },
  };
});

describe("scrapeLolTeams", () => {
  let mockBrowser: any;
  let mockPage: any;
  let mockTable: any;

  beforeEach(() => {
    // Reset all mocks
    mockTable = {
      evaluate: vi.fn(),
    };

    mockPage = {
      goto: vi.fn(),
      click: vi.fn(),
      waitForSelector: vi.fn().mockResolvedValue(mockTable),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    };

    (puppeteer.launch as any).mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("formate correctement le nom de l'équipe", async () => {
    await scrapeLolTeams("SK Gaming");
    expect(mockPage.goto).toHaveBeenCalledWith(
      "https://lol.fandom.com/wiki/SK_Gaming",
      { waitUntil: "networkidle2" }
    );
  });

  it("gère la bannière de cookies quand elle est présente", async () => {
    await scrapeLolTeams("T1 Esports Academy");
    expect(mockPage.click).toHaveBeenCalledWith("#onetrust-reject-all-handler");
  });

  it("gère l'absence de bannière de cookies", async () => {
    mockPage.click.mockRejectedValueOnce(new Error("Element not found"));
    await scrapeLolTeams("T1 Esports Academy");
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("retourne un tableau vide quand aucune table n'est trouvée", async () => {
    mockPage.waitForSelector
      .mockRejectedValueOnce(new Error("Timeout"))
      .mockRejectedValueOnce(new Error("Timeout"));

    const result = await scrapeLolTeams("T1 Esports Academy");
    expect(result).toEqual([]);
  });

  it("parse correctement les données du roster", async () => {
    const mockRosterData = [
      { position: "Top Laner", name: "Haetae" },
      { position: "Jungler", name: "Vincenzo" },
      { position: "Mid Laner", name: "Guti" },
      { position: "Bot Laner", name: "Smash" },
      { position: "Support", name: "Cloud" },
    ];

    mockTable.evaluate.mockResolvedValueOnce(mockRosterData);

    const result = await scrapeLolTeams("T1 Esports Academy");
    expect(result).toEqual(mockRosterData);
  });

  it("ferme le navigateur après le scraping", async () => {
    mockTable.evaluate.mockResolvedValueOnce([]);

    await scrapeLolTeams("T1 Esports Academy");
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("ferme le navigateur quand aucune table n'est trouvée (table est null)", async () => {
    mockPage.waitForSelector.mockResolvedValueOnce(null);

    await scrapeLolTeams("T1 Esports Academy");
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("ferme le navigateur quand le roster est vide", async () => {
    mockTable.evaluate.mockResolvedValueOnce([]);

    await scrapeLolTeams("T1 Esports Academy");
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
