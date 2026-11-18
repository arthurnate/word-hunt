
import { NextResponse } from "next/server";
import { eq, asc, and, sql } from "drizzle-orm";

import { db } from "@/db";
import { gameSessions, gameGuesses } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyPuzzle,
  getUTCDate,
} from "@/lib/daily-puzzle";
import { ensurePlayerProfile } from "@/lib/player-profile";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const puzzle = await getDailyPuzzle();

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.userId, user.id),
          eq(gameSessions.puzzleDate, puzzle.date)
        )
      )
      .limit(1);

    if (!session) {
      return NextResponse.json(
        {
          puzzleId: puzzle.puzzleId,
          date: puzzle.date,
          guesses: [],
          status: "not_started",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const guesses = await db
      .select({
        guess: gameGuesses.guess,
        rank: gameGuesses.rank,
        isHint: gameGuesses.isHint,
      })
      .from(gameGuesses)
      .where(eq(gameGuesses.sessionId, session.id))
      .orderBy(
        asc(gameGuesses.createdAt),
        asc(gameGuesses.id)
      );

    return NextResponse.json(
      {
        puzzleId: puzzle.puzzleId,
        date: puzzle.date,
        guesses: guesses.map((item) => ({
          ...item,
          totalWords: puzzle.totalWords,
          isCorrect: item.rank === 1,
        })),
        status: session.status,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unable to load game:", error);

    return NextResponse.json(
      { error: "Unable to load game progress." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const startedAt = performance.now();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const authMs = performance.now() - startedAt;

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const isHint = input.action === "hint";

  const guess =
    typeof input.guess === "string"
      ? input.guess.trim().toLowerCase()
      : "";

  if (!isHint && !/^[a-z]{3,50}$/.test(guess)) {
    return NextResponse.json(
      { error: "Please enter a valid English word." },
      { status: 400 }
    );
  }

  try {
    const puzzle = await getDailyPuzzle();

    if (
      input.puzzleId !== puzzle.puzzleId ||
      input.date !== puzzle.date
    ) {
      return NextResponse.json(
        {
          error: "A new daily puzzle is available.",
          code: "PUZZLE_CHANGED",
        },
        { status: 409 }
      );
    }

    if (!isHint && puzzle.rankings[guess] === undefined) {
      return NextResponse.json(
        { error: "Word not found in the vocabulary." },
        { status: 404 }
      );
    }

    // Measure profile creation/check.
    const profileStart = performance.now();

    await ensurePlayerProfile(user);

    const profileMs = performance.now() - profileStart;

    // Measure the entire transaction.
    const transactionStart = performance.now();

    const result = await db.transaction(async (tx) => {
      // Temporary database performance instrumentation.
      let checkpoint = performance.now();

      function logStep(name: string) {
        const now = performance.now();

        console.log(
          `[GAME DB] ${name}: ${Math.round(now - checkpoint)}ms`
        );

        checkpoint = now;
      }

      // Serialize gameplay writes for this user.
      await tx.execute(sql`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${user.id}, 0)
        )
      `);

      logStep("Advisory lock");

      // Recheck the UTC date after acquiring the lock.
      if (getUTCDate() !== puzzle.date) {
        return { type: "puzzle_changed" as const };
      }

      const [existingSession] = await tx
        .select()
        .from(gameSessions)
        .where(
          and(
            eq(gameSessions.userId, user.id),
            eq(gameSessions.puzzleDate, puzzle.date)
          )
        )
        .limit(1);

      logStep("Find session");

      let session = existingSession;

      if (!session) {
        const [created] = await tx
          .insert(gameSessions)
          .values({
            userId: user.id,
            puzzleId: puzzle.puzzleId,
            puzzleDate: puzzle.date,
          })
          .returning();

        logStep("Create session");

        session = created;
      }

      if (session.puzzleId !== puzzle.puzzleId) {
        return { type: "puzzle_changed" as const };
      }

      let finalGuess = guess;
      let rank = puzzle.rankings[guess];

      if (isHint) {
        const previousGuesses = await tx
          .select({
            rank: gameGuesses.rank,
          })
          .from(gameGuesses)
          .where(eq(gameGuesses.sessionId, session.id));

        logStep("Load previous guesses");

        const bestRank =
          previousGuesses.length > 0
            ? Math.min(
                ...previousGuesses.map((item) => item.rank)
              )
            : puzzle.totalWords;

        const targetRank = Math.max(
          1,
          Math.floor(bestRank / 2)
        );

        const hintEntry = Object.entries(
          puzzle.rankings
        ).find(([, wordRank]) => wordRank === targetRank);

        if (!hintEntry) {
          return { type: "hint_unavailable" as const };
        }

        finalGuess = hintEntry[0];
        rank = hintEntry[1];
      }

      const [existingGuess] = await tx
        .select()
        .from(gameGuesses)
        .where(
          and(
            eq(gameGuesses.sessionId, session.id),
            eq(gameGuesses.guess, finalGuess)
          )
        )
        .limit(1);

      logStep("Duplicate check");

      if (existingGuess) {
        return { type: "duplicate" as const };
      }

      if (session.status === "won") {
        return { type: "already_won" as const };
      }

      await tx.insert(gameGuesses).values({
        sessionId: session.id,
        guess: finalGuess,
        rank,
        isHint,
      });

      logStep("Insert guess");

      if (rank === 1) {
        await tx
          .update(gameSessions)
          .set({
            status: "won",
            completedAt: new Date(),
          })
          .where(eq(gameSessions.id, session.id));

        logStep("Mark won");
      }

      return {
        type: "saved" as const,
        guess: finalGuess,
        rank,
      };
    });

    const transactionMs =
      performance.now() - transactionStart;

    console.log("[GAME POST PERFORMANCE]", {
      authMs: Math.round(authMs),
      profileMs: Math.round(profileMs),
      transactionMs: Math.round(transactionMs),
      totalMs: Math.round(performance.now() - startedAt),
    });

    if (result.type === "puzzle_changed") {
      return NextResponse.json(
        {
          error: "A new daily puzzle is available.",
          code: "PUZZLE_CHANGED",
        },
        { status: 409 }
      );
    }

    if (result.type === "duplicate") {
      return NextResponse.json(
        { error: "You've already guessed that word." },
        { status: 409 }
      );
    }

    if (result.type === "already_won") {
      return NextResponse.json(
        {
          error: "You've already completed today's puzzle.",
        },
        { status: 409 }
      );
    }

    if (result.type === "hint_unavailable") {
      return NextResponse.json(
        { error: "Unable to generate a hint." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      puzzleId: puzzle.puzzleId,
      date: puzzle.date,
      guess: result.guess,
      rank: result.rank,
      totalWords: puzzle.totalWords,
      isCorrect: result.rank === 1,
      isHint,
    });
  } catch (error) {
    console.error("Unable to save game guess:", error);

    return NextResponse.json(
      { error: "Unable to save your guess." },
      { status: 500 }
    );
  }
}
