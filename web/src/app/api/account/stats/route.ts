
import { NextResponse } from "next/server";
import { eq, asc, sql } from "drizzle-orm";

import { db } from "@/db";
import { gameSessions, gameGuesses } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getUTCDate } from "@/lib/daily-puzzle";

//export const dynamic = "force-dynamic";

function previousUTCDate(date: string): string {
  const timestamp = Date.parse(`${date}T00:00:00Z`);

  return new Date(timestamp - 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function calculateStreaks(
  dates: string[],
  today: string
) {
  const uniqueDates = [...new Set(dates)].sort();

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: string | null = null;

  for (const date of uniqueDates) {
    if (
      previousDate !== null &&
      previousUTCDate(date) === previousDate
    ) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }

    longestStreak = Math.max(
      longestStreak,
      runningStreak
    );

    previousDate = date;
  }

  // A streak remains active if the player won
  // today or yesterday.
  const yesterday = previousUTCDate(today);

  const lastWin = uniqueDates[uniqueDates.length - 1];

  if (lastWin !== today && lastWin !== yesterday) {
    return { currentStreak: 0, longestStreak };
  }

  let currentStreak = 0;
  let expectedDate = lastWin;

  const wonDates = new Set(uniqueDates);

  while (wonDates.has(expectedDate)) {
    currentStreak++;
    expectedDate = previousUTCDate(expectedDate);
  }

  return { currentStreak, longestStreak };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const sessions = await db
      .select({
        id: gameSessions.id,
        puzzleDate: gameSessions.puzzleDate,
        status: gameSessions.status,
      })
      .from(gameSessions)
      .where(eq(gameSessions.userId, user.id))
      .orderBy(asc(gameSessions.puzzleDate));

    const gamesPlayed = sessions.length;

    const wonSessions = sessions.filter(
      (session) => session.status === "won"
    );

    const gamesWon = wonSessions.length;

    const winRate =
      gamesPlayed === 0
        ? 0
        : Math.round((gamesWon / gamesPlayed) * 100);

    // Count guesses only for sessions belonging
    // to this authenticated user.
    const guessCounts = await db
      .select({
        sessionId: gameGuesses.sessionId,
        count: sql<number>`count(*)::int`,
      })
      .from(gameGuesses)
      .innerJoin(
        gameSessions,
        eq(gameGuesses.sessionId, gameSessions.id)
      )
      .where(eq(gameSessions.userId, user.id))
      .groupBy(gameGuesses.sessionId);

    const countsBySession = new Map(
      guessCounts.map((item) => [
        item.sessionId,
        item.count,
      ])
    );

    const totalWinningGuesses = wonSessions.reduce(
      (sum, session) =>
        sum + (countsBySession.get(session.id) ?? 0),
      0
    );

    const averageGuesses =
      gamesWon === 0
        ? 0
        : Math.round(
            (totalWinningGuesses / gamesWon) * 10
          ) / 10;

    const streaks = calculateStreaks(
      wonSessions.map((session) => session.puzzleDate),
      getUTCDate()
    );

    return NextResponse.json(
      {
        gamesPlayed,
        gamesWon,
        winRate,
        averageGuesses,
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Unable to load player statistics:", error);

    return NextResponse.json(
      { error: "Unable to load player statistics." },
      { status: 500 }
    );
  }
}
