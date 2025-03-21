import { Match } from "../models/match";

/**
 * Updates the status of today's matches from 0 to 1 when their scheduled time has passed.
 *
 * Finds all matches scheduled for the current day with status 0 and updates them
 * to status 1 if their scheduled time has already passed.
 *
 * @returns Promise<void> - Resolves when all matches have been processed
 * @throws Propagates any errors encountered during database operations
 */
export async function updateTodayMatchesStatus(): Promise<void> {
  try {
    const now: Date = new Date();

    const startOfDay: Date = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay: Date = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayMatches = await Match.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 0,
    });

    for (const match of todayMatches) {
      const matchDate: Date = new Date(match.date);

      if (now >= matchDate) {
        await Match.updateOne({ _id: match._id }, { $set: { status: 1 } });
        console.log(`✅ Finished: ${match.matchId} matches updated`);
      }
    }
  } catch (error) {
    console.error("❌ Error when updating matches status:", error);
    throw error;
  }
}
