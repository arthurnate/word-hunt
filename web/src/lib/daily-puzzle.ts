
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { dailyPuzzles } from "@/db/schema";

export type DailyPuzzle = {
  puzzleId: number;
  date: string;
  answer: string;
  totalWords: number;
  rankings: Record<string, number>;
};

export class PuzzleUnavailableError extends Error {
  constructor(date: string) {
    super(`No daily puzzle available for ${date}`);

    this.name = "PuzzleUnavailableError";
  }
}

export function getUTCDate(): string {
  return new Date().toISOString().slice(0, 10);
}

let cachedPuzzle: DailyPuzzle | null = null;
let pendingLoad: Promise<DailyPuzzle> | null = null;
let pendingDate: string | null = null;


export async function getDailyPuzzle(): Promise<DailyPuzzle> {
  const date = getUTCDate();

  // Return the cached puzzle for the current UTC day.
  if (cachedPuzzle?.date === date) {
    return cachedPuzzle;
  }

  // Reuse an ongoing database request for the same date.
  if (pendingLoad && pendingDate === date) {
    return pendingLoad;
  }

  const load = async (): Promise<DailyPuzzle> => {
    const [record] = await db
      .select({
        puzzleId: dailyPuzzles.id,
        date: dailyPuzzles.puzzleDate,
        answer: dailyPuzzles.answer,
        totalWords: dailyPuzzles.totalWords,
        rankings: dailyPuzzles.rankings,
      })
      .from(dailyPuzzles)
      .where(eq(dailyPuzzles.puzzleDate, date))
      .limit(1);

    if (!record) {
      throw new PuzzleUnavailableError(date);
    }

    if (
      record.puzzleId < 1 ||
      record.date !== date ||
      record.totalWords < 1 ||
      !record.rankings ||
      record.rankings[record.answer] !== 1
    ) {
      throw new Error(`Invalid puzzle data for ${date}`);
    }

    const puzzle: DailyPuzzle = record;

    cachedPuzzle = puzzle;

    console.log("Loading puzzle from PostgreSQL:", date)

    return puzzle;
  };

  const promise = load();

  pendingLoad = promise;
  pendingDate = date;

  try {
    return await promise;
  } finally {
    if (pendingLoad === promise) {
      pendingLoad = null;
      pendingDate = null;
    }
  }
}

