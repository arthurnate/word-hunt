
import { NextResponse } from "next/server";
import {
  getDailyPuzzle,
  PuzzleUnavailableError,
} from "@/lib/daily-puzzle";

export async function GET() {
  try {
    const puzzle = await getDailyPuzzle();

    return NextResponse.json(
      {
        puzzleId: puzzle.puzzleId,
        date: puzzle.date,
        totalWords: puzzle.totalWords,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof PuzzleUnavailableError) {
      return NextResponse.json(
        {
          error: "No puzzle is scheduled for today.",
          code: "PUZZLE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    console.error("Unable to load today's puzzle:", error);

    return NextResponse.json(
      {
        error: "Unable to load today's puzzle.",
      },
      { status: 500 }
    );
  }
}
