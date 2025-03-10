import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import puppeteer from "puppeteer";
import { connectDB } from "~/db";
import { scrapeRiotResults } from "./riotResultScraper";
import { Match } from "~/models/match";

// Mock dependencies
vi.mock("puppeteer");
vi.mock("~/db");
vi.mock("~/models/match");

describe("scrapeRiotResults", () => {
  let mockBrowser: any;
  let mockPage: any;
  let mockContainerDiv: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock objects
    mockContainerDiv = {
      evaluate: vi.fn().mockResolvedValue(null),
    };

    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(mockContainerDiv),
      waitForFunction: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Setup puppeteer mock
    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);

    // Setup database mock
    vi.mocked(connectDB).mockResolvedValue(undefined);

    // Spy on console.log
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should connect to the database", async () => {
    await scrapeRiotResults();
    expect(connectDB).toHaveBeenCalled();
  });

  it("should launch puppeteer browser", async () => {
    await scrapeRiotResults();
    expect(puppeteer.launch).toHaveBeenCalled();
  });

  it("should navigate to the LEC URL", async () => {
    await scrapeRiotResults();
    expect(mockPage.goto).toHaveBeenCalledWith(
      "https://lolesports.com/fr-FR/leagues/emea_masters,first_stand,lec,lfl,msi,worlds",
      { waitUntil: "networkidle2" }
    );
  });

  it("should return early if container div is not found", async () => {
    mockPage.waitForSelector.mockResolvedValue(null);

    await scrapeRiotResults();

    expect(Match.updateOne).not.toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should return early if no Karmine Corp match is found", async () => {
    await scrapeRiotResults();

    expect(Match.updateOne).not.toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should update match when Karmine Corp match is found", async () => {
    const mockMatch = {
      teams: [{ name: "Karmine Corp" }, { name: "G2 Esports" }],
      score: { team1: 3, team2: 1 },
    };

    mockContainerDiv.evaluate.mockResolvedValue(mockMatch);

    await scrapeRiotResults();

    expect(Match.updateOne).toHaveBeenCalledWith(
      {
        $or: [
          { teams: { $in: ["Karmine Corp"] } },
          { teams: { $in: ["G2 Esports"] } },
        ],
        status: 1,
      },
      { status: 2, score: { team1: 3, team2: 1 } }
    );

    expect(console.log).toHaveBeenCalledWith("🟩 Match updated");
  });

  it("should handle the case when score is null", async () => {
    const mockMatch = {
      teams: [{ name: "Karmine Corp" }, { name: "Fnatic" }],
      score: null,
    };

    mockContainerDiv.evaluate.mockResolvedValue(mockMatch);

    await scrapeRiotResults();

    expect(Match.updateOne).toHaveBeenCalledWith(
      {
        $or: [
          { teams: { $in: ["Karmine Corp"] } },
          { teams: { $in: ["Fnatic"] } },
        ],
        status: 1,
      },
      { status: 2, score: null }
    );
  });

  it("should close the browser after processing", async () => {
    await scrapeRiotResults();

    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should handle errors during scraping", async () => {
    // Mock an error during page navigation
    mockPage.goto.mockRejectedValue(new Error("Navigation failed"));

    // Spy on console.error
    vi.spyOn(console, "error").mockImplementation(() => {});

    await scrapeRiotResults();

    // Verify browser is closed even when error occurs
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should handle timeout during waitForFunction", async () => {
    // Mock a timeout error
    mockPage.waitForFunction.mockRejectedValue(new Error("Timeout exceeded"));

    await scrapeRiotResults();

    expect(mockBrowser.close).toHaveBeenCalled();
    expect(Match.updateOne).not.toHaveBeenCalled();
  });

  it("should handle case when teams array is incomplete", async () => {
    const mockMatch = {
      teams: [{ name: "Karmine Corp" }], // Only one team
      score: { team1: 2, team2: 0 },
    };

    mockContainerDiv.evaluate.mockResolvedValue(mockMatch);

    await scrapeRiotResults();

    expect(Match.updateOne).toHaveBeenCalledWith(
      {
        $or: [{ teams: { $in: ["Karmine Corp"] } }],
        status: 1,
      },
      { status: 2, score: { team1: 2, team2: 0 } }
    );
  });

  it("should handle invalid score values", async () => {
    const mockMatch = {
      teams: [{ name: "Karmine Corp" }, { name: "MAD Lions" }],
      score: { team1: NaN, team2: NaN },
    };

    mockContainerDiv.evaluate.mockResolvedValue(mockMatch);

    await scrapeRiotResults();

    expect(Match.updateOne).toHaveBeenCalledWith(
      {
        $or: [
          { teams: { $$elemMatch: ["Karmine Corp"] } },
          { teams: { $$elemMatch: ["MAD Lions"] } },
        ],
        status: 1,
      },
      { status: 2, score: { team1: NaN, team2: NaN } }
    );
  });
});
