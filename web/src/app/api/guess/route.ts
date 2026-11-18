
import { NextRequest, NextResponse } from "next/server";

import {
  getDailyPuzzle,
  getUTCDate,
  PuzzleUnavailableError,
} from "@/lib/daily-puzzle";

const MAX_BODY_BYTES = 1024;

function levenshteinDistance(
  a: string,
  b: string
): number {
  const previous = Array.from(
    { length: b.length + 1 },
    (_, index) => index
  );

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j < previous.length; j++) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function findSuggestion(
  guess: string,
  vocabulary: string[]
): string | null {
  if (guess.length < 3 || guess.length > 25) {
    return null;
  }

  let bestMatch: string | null = null;
  let bestDistance = 3;

  for (const word of vocabulary) {
    if (Math.abs(word.length - guess.length) > 2) {
      continue;
    }

    const distance = levenshteinDistance(guess, word);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = word;
    }
  }

  return bestMatch;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    const contentLength = request.headers.get(
      "content-length"
    );

    if (
      contentLength !== null &&
      Number(contentLength) > MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      );
    }

    const rawBody = await request.text();

    if (
      new TextEncoder().encode(rawBody).length >
      MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      );
    }

    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  if (
  !body ||
  typeof body !== "object" ||
  Array.isArray(body)
) {
  return NextResponse.json(
    { error: "Invalid request." },
    { status: 400 }
  );
}

const input = body as Record<string, unknown>;
const isHint = input.action === "hint";

if (
  !isHint &&
  typeof input.guess !== "string"
) {
    return NextResponse.json(
      { error: "Please enter a valid word." },
      { status: 400 }
    );
  }

    const guess =
      typeof input.guess === "string"
        ? input.guess.trim().toLowerCase()
        : "";

    if (!isHint && !/^[a-z]{3,50}$/.test(guess)) {
    return NextResponse.json(
      { error: "Enter a word containing 3–50 letters." },
      { status: 400 }
    );
  }

  try {
    const puzzle = await getDailyPuzzle();

    const submitted = input;

    if (
      submitted.puzzleId !== puzzle.puzzleId ||
      submitted.date !== puzzle.date
    ) {
      return NextResponse.json(
        {
          error: "A new daily puzzle is available.",
          code: "PUZZLE_CHANGED",
          puzzleId: puzzle.puzzleId,
          date: puzzle.date,
        },
        { status: 409 }
      );
    }


    if (isHint) {
      const bestWord =
        typeof input.bestWord === "string"
          ? input.bestWord.trim().toLowerCase()
          : "";

      if (bestWord && !/^[a-z]{3,50}$/.test(bestWord)) {
        return NextResponse.json(
          { error: "Invalid hint progress." },
          { status: 400 }
        );
      }

      const bestRank = bestWord
        ? puzzle.rankings[bestWord]
        : puzzle.totalWords;

      if (bestRank === undefined) {
        return NextResponse.json(
          { error: "Invalid hint progress." },
          { status: 400 }
        );
      }

      if (bestRank === 1) {
        return NextResponse.json(
          { error: "You've already found the secret word." },
          { status: 409 }
        );
      }

      const targetRank = Math.max(
        1,
        Math.floor(bestRank / 2)
      );

      const hintEntry = Object.entries(puzzle.rankings).find(
        ([, wordRank]) => wordRank === targetRank
      );

      if (!hintEntry) {
        return NextResponse.json(
          { error: "Unable to generate a hint." },
          { status: 500 }
        );
      }

      if (getUTCDate() !== puzzle.date) {
        return NextResponse.json(
          {
            error: "A new daily puzzle is available.",
            code: "PUZZLE_CHANGED",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        puzzleId: puzzle.puzzleId,
        date: puzzle.date,
        guess: hintEntry[0],
        rank: hintEntry[1],
        totalWords: puzzle.totalWords,
        isCorrect: hintEntry[1] === 1,
        isHint: true,
      });
    }


    const rank = Object.hasOwn(puzzle.rankings, guess)
      ? puzzle.rankings[guess]
      : undefined;

    if (rank === undefined) {
      const suggestion = findSuggestion(
        guess,
        Object.keys(puzzle.rankings)
      );

      return NextResponse.json(
        {
          error: "Word not found in vocabulary.",
          suggestion,
        },
        { status: 404 }
      );
    }

    // Reject an old puzzle if UTC midnight passed
    // during request processing.
    if (getUTCDate() !== puzzle.date) {
      return NextResponse.json(
        {
          error: "A new daily puzzle is available.",
          code: "PUZZLE_CHANGED",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      puzzleId: puzzle.puzzleId,
      date: puzzle.date,
      guess,
      rank,
      totalWords: puzzle.totalWords,
      isCorrect: rank === 1,
      isHint: false,
    });
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

    console.error("Guest guess request failed:", error);

    return NextResponse.json(
      { error: "Unable to process your guess." },
      { status: 500 }
    );
  }
}
