import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scrapeLolStats } from "./lolStatScraper";
import puppeteer from "puppeteer";

// Mock puppeteer
vi.mock("puppeteer", () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue({
      evaluate: vi.fn().mockResolvedValue([
        {
          querySelectorAll: () => [
            { textContent: "2025-02-24" },
            {},
            {},
            {},
            { textContent: "Win" },
            { textContent: "Blue" },
          ],
        },
        {
          querySelectorAll: () => [
            { textContent: "2025-02-24" },
            {},
            {},
            {},
            { textContent: "Loss" },
            { textContent: "Red" },
          ],
        },
      ]),
    }),
    evaluate: vi.fn(),
  };

  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  };
});

describe("lolStatScraper", () => {
  let mockBrowser: any;
  let mockPage: any;
  let mockPage2: any;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue({
        evaluate: vi.fn().mockResolvedValue([
          {
            querySelectorAll: () => [
              { textContent: "2025-02-24" },
              {},
              {},
              {},
              { textContent: "Win" },
              {
                textContent: "Blue",
                querySelector: () => ({ getAttribute: () => "Team A" }),
              },
            ],
          },
          {
            querySelectorAll: () => [
              { textContent: "2025-02-24" },
              {},
              {},
              {},
              { textContent: "Loss" },
              {
                textContent: "Red",
                querySelector: () => ({ getAttribute: () => "Team B" }),
              },
            ],
          },
        ]),
      }),
    };

    mockPage2 = {
      goto: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
    };

    mockBrowser = {
      newPage: vi
        .fn()
        .mockResolvedValueOnce(mockPage)
        .mockResolvedValueOnce(mockPage2),
      close: vi.fn().mockResolvedValue(undefined),
    };

    (puppeteer.launch as any).mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should launch browser and create pages", async () => {
    await scrapeLolStats("Karmine Corp", "Team B", "LCS", "Regular Season");

    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
  });

  it("should format team names correctly", async () => {
    await scrapeLolStats("Karmine Corp", "Team B", "LCS", "Regular Season");

    // Check that URLs are constructed with properly formatted team names
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining("Karmine+Corp"),
      expect.anything()
    );

    expect(mockPage2.goto).toHaveBeenCalledWith(
      expect.stringContaining("Karmine_Corp"),
      expect.anything()
    );
  });

  it("should handle cookie banner", async () => {
    await scrapeLolStats("Karmine Corp", "Team B", "LCS", "Regular Season");

    expect(mockPage.click).toHaveBeenCalledWith("#onetrust-reject-all-handler");
    expect(mockPage2.click).toHaveBeenCalledWith(
      "#onetrust-reject-all-handler"
    );
  });

  it("should handle cookie banner rejection errors", async () => {
    mockPage.click.mockRejectedValueOnce(new Error("Banner not found"));

    const consoleSpy = vi.spyOn(console, "log");
    await scrapeLolStats("Karmine Corp", "Team B", "LCS", "Regular Season");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Cookie banner not found")
    );
  });

  it("should use the current year in URL construction", async () => {
    const currentYear = new Date().getFullYear();
    await scrapeLolStats("Karmine Corp", "Team B", "LCS", "Regular Season");

    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining(`${currentYear}-01-01`),
      expect.anything()
    );

    expect(mockPage2.goto).toHaveBeenCalledWith(
      expect.stringContaining(`/${currentYear}`),
      expect.anything()
    );
  });

  it("should wait for table selector", async () => {
    await scrapeLolStats("Karmine Corp", "Team B", "LCS", "Regular Season");

    expect(mockPage.waitForSelector).toHaveBeenCalledWith(
      "#mw-content-text > div.mw-parser-output > div.wide-content-scroll > table"
    );
  });
});
