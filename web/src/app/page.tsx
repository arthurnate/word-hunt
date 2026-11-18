
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";

import GameHeader from "@/components/word-hunt/GameHeader";
import GuessInput from "@/components/word-hunt/GuessInput";
import GuessHistory, {
  type GuessResult,
} from "@/components/word-hunt/GuessHistory";
import HowToPlay from "@/components/word-hunt/HowToPlay";
import { createClient } from "@/lib/supabase/client";
import ShareResult from "@/components/word-hunt/ShareResult";
import { CircleHelp, Lightbulb } from "lucide-react";
import FAQModal from "@/components/word-hunt/FAQModal";

type PuzzleMetadata = {
  puzzleId: number;
  date: string;
  totalWords: number;
};

type GameMode = "guest" | "account";

type CloudProgress = {
  puzzleId: number;
  date: string;
  guesses: GuessResult[];
  status: string;
};

const supabase = createClient();

function guestStorageKey(puzzle: PuzzleMetadata) {
  return `project-daily-wordhunt-${puzzle.date}-${puzzle.puzzleId}`;
}

function loadGuestGuesses(puzzle: PuzzleMetadata): GuessResult[] {
  try {
    const saved = localStorage.getItem(guestStorageKey(puzzle));
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          typeof item.guess === "string" &&
          typeof item.rank === "number" &&
          Number.isInteger(item.rank) &&
          item.rank >= 1 &&
          item.rank <= puzzle.totalWords &&
          item.totalWords === puzzle.totalWords &&
          typeof item.isCorrect === "boolean"
      )
    ) {
      return parsed as GuessResult[];
    }
  } catch (error) {
    console.warn("Unable to restore guest progress:", error);
  }

  return [];
}

function isCloudProgress(
  value: unknown,
  puzzle: PuzzleMetadata
): value is CloudProgress {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<CloudProgress>;

  return (
    data.puzzleId === puzzle.puzzleId &&
    data.date === puzzle.date &&
    Array.isArray(data.guesses) &&
    data.guesses.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        typeof item.guess === "string" &&
        typeof item.rank === "number" &&
        Number.isInteger(item.rank) &&
        item.rank >= 1 &&
        item.rank <= puzzle.totalWords &&
        item.totalWords === puzzle.totalWords &&
        typeof item.isCorrect === "boolean"
    )
  );
}

export default function Home() {
  const [guess, setGuess] = useState("");
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleMetadata | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<GameMode>("guest");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // undefined = authentication not initialized yet.
  const activeUserId = useRef<string | null | undefined>(undefined);

  // Invalidates outdated requests when account/puzzle changes.
  const loadVersion = useRef(0);

  // Prevents older cloud snapshots from overwriting new guesses.
  const guessRevision = useRef(0);

  // Tracks pending submissions so background sync won't race them.
  const submitting = useRef(false);

  const hasWon = guessHistory.some((item) => item.isCorrect);

  const [faqOpen, setFaqOpen] = useState(false);

  const loadProgress = useCallback(
    async (
      currentPuzzle: PuzzleMetadata,
      currentUser: User | null
    ) => {
      const version = ++loadVersion.current;

      setReady(false);
      setGuessHistory([]);
      setGuess("");
      setSuggestion(null);
      setError("");

      if (!currentUser) {
        const restored = loadGuestGuesses(currentPuzzle);

        if (version !== loadVersion.current) return;

        setMode("guest");
        setGuessHistory(restored);
        setReady(true);
        return;
      }

      setMode("account");

      try {
        const response = await fetch("/api/game", {
          cache: "no-store",
        });

        if (response.status === 401) {
          throw new Error(
            "Your session expired. Please sign in again."
          );
        }

        if (!response.ok) {
          throw new Error("Unable to load cloud progress.");
        }

        const data: unknown = await response.json();

        if (version !== loadVersion.current) return;

        if (!isCloudProgress(data, currentPuzzle)) {
          throw new Error(
            "Cloud progress doesn't match today's puzzle."
          );
        }

        setGuessHistory(data.guesses);
        setReady(true);
      } catch (err) {
        if (version !== loadVersion.current) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load cloud progress."
        );

        // Keep the game disabled instead of falling back to
        // guest storage for an authenticated player.
      }
    },
    []
  );

  // Initialize today's puzzle and authenticated user.
  useEffect(() => {
    let cancelled = false;
      const versionRef = loadVersion;

    async function initialize() {
      try {
        const [puzzleResponse, authResponse] = await Promise.all([
          fetch("/api/puzzle/today", { cache: "no-store" }),
          supabase.auth.getUser(),
        ]);

        if (!puzzleResponse.ok) {
          const data = await puzzleResponse.json().catch(() => null);

          throw new Error(
            data?.code === "PUZZLE_UNAVAILABLE"
              ? "Today's puzzle isn't available yet. Please check back later."
              : "Unable to load today's puzzle."
          );
        }

        const today: PuzzleMetadata = await puzzleResponse.json();
        const initialUser = authResponse.data.user;

        if (cancelled) return;

        activeUserId.current = initialUser?.id ?? null;

        setPuzzle(today);
        setUser(initialUser);

        await loadProgress(today, initialUser);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to initialize the game."
          );
        }
      }
    }

    void initialize();

    return () => {
  cancelled = true;
  versionRef.current++;
};
  }, [loadProgress]);

  // React only to actual account identity changes.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUserId = session?.user?.id ?? null;

        if (activeUserId.current === undefined) return;

        if (activeUserId.current === nextUserId) return;

        activeUserId.current = nextUserId;
        loadVersion.current++;

        // Reset all gameplay state when changing accounts.
        window.location.reload();
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Persist guest guesses locally.
  useEffect(() => {
    if (!ready || !puzzle || mode !== "guest") return;

    try {
      localStorage.setItem(
        guestStorageKey(puzzle),
        JSON.stringify(guessHistory)
      );
    } catch (err) {
      console.warn("Unable to save guest progress:", err);
    }
  }, [guessHistory, ready, puzzle, mode]);

  // Check for a new daily puzzle.
  useEffect(() => {
    if (!puzzle || !ready) return;

    let stopped = false;
    let checking = false;

    async function checkForNewPuzzle() {
      if (stopped || checking) return;

      checking = true;

      try {
        const response = await fetch("/api/puzzle/today", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const today: PuzzleMetadata = await response.json();

        if (
          today.date !== puzzle!.date ||
          today.puzzleId !== puzzle!.puzzleId
        ) {
          window.location.reload();
        }
      } catch (err) {
        console.warn("Daily puzzle check failed:", err);
      } finally {
        checking = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkForNewPuzzle();
      }
    }

    function handleFocus() {
      void checkForNewPuzzle();
    }

    const interval = window.setInterval(
      () => void checkForNewPuzzle(),
      30_000
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
    window.addEventListener("focus", handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.removeEventListener("focus", handleFocus);
    };
  }, [puzzle, ready]);

  // Refresh cloud progress without clearing the UI.
  const refreshCloudProgress = useCallback(async () => {
    if (
      !ready ||
      !puzzle ||
      mode !== "account" ||
      !user ||
      submitting.current
    ) {
      return;
    }

    const expectedUserId = user.id;
    const expectedVersion = loadVersion.current;
    const expectedRevision = guessRevision.current;

    try {
      const response = await fetch("/api/game", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data: unknown = await response.json();

      if (expectedVersion !== loadVersion.current) return;
      if (activeUserId.current !== expectedUserId) return;
      if (expectedRevision !== guessRevision.current) return;
      if (submitting.current) return;
      if (!isCloudProgress(data, puzzle)) return;

      setGuessHistory(data.guesses);
    } catch (err) {
      console.warn("Cloud synchronization failed:", err);
    }
  }, [ready, puzzle, mode, user]);

  // Synchronize when returning to the browser tab.
  useEffect(() => {
    if (!ready || !puzzle || mode !== "account" || !user) {
      return;
    }

    let stopped = false;
    let refreshing = false;

    async function syncOnReturn() {
      if (stopped || refreshing) return;

      refreshing = true;

      try {
        await refreshCloudProgress();
      } finally {
        refreshing = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void syncOnReturn();
      }
    }

    function handleFocus() {
      void syncOnReturn();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
    window.addEventListener("focus", handleFocus);

    return () => {
      stopped = true;
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.removeEventListener("focus", handleFocus);
    };
  }, [ready, puzzle, mode, user, refreshCloudProgress]);

  async function submitGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedGuess = guess.trim().toLowerCase();

    if (!ready || !puzzle || loading || submitting.current || hasWon) {
      return;
    }

    if (!normalizedGuess) return;

    if (
      guessHistory.some(
        (item) => item.guess === normalizedGuess
      )
    ) {
      setError("You've already guessed that word.");
      return;
    }

    const requestUserId = activeUserId.current;
    const requestVersion = loadVersion.current;
    const requestMode = mode;

    submitting.current = true;
    guessRevision.current++;

    setLoading(true);
    setError("");
    setSuggestion(null);

    try {
      const response = await fetch(
        requestMode === "account" ? "/api/game" : "/api/guess",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guess: normalizedGuess,
            puzzleId: puzzle.puzzleId,
            date: puzzle.date,
          }),
        }
      );

      const data = await response.json();

      // Discard results from a previous account or puzzle load.
      if (
        requestVersion !== loadVersion.current ||
        requestUserId !== activeUserId.current
      ) {
        return;
      }

      if (
        response.status === 409 &&
        data.code === "PUZZLE_CHANGED"
      ) {
        window.location.reload();
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        setSuggestion(data.suggestion ?? null);

        if (response.status === 409 && requestMode === "account") {
          // The other device may have submitted this guess.
          // Refresh after the submission lock is released.
          submitting.current = false;
          await refreshCloudProgress();
        }

        return;
      }

      if (
        data.puzzleId !== puzzle.puzzleId ||
        data.date !== puzzle.date
      ) {
        window.location.reload();
        return;
      }

      setGuessHistory((previous) => [...previous, data]);
      setGuess("");
    } catch {
      if (
        requestVersion === loadVersion.current &&
        requestUserId === activeUserId.current
      ) {
        setError("Could not connect to the server.");
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }


async function requestHint() {
  if (
    !ready ||
    !puzzle ||
    loading ||
    submitting.current ||
    hasWon
  ) {
    return;
  }

  const requestUserId = activeUserId.current;
  const requestVersion = loadVersion.current;
  const requestMode = mode;

  const bestGuess = guessHistory.reduce<GuessResult | null>(
    (best, item) =>
      !best || item.rank < best.rank ? item : best,
    null
  );

  submitting.current = true;
  guessRevision.current++;

  setLoading(true);
  setError("");
  setSuggestion(null);

  try {
    const response = await fetch(
      requestMode === "account" ? "/api/game" : "/api/guess",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "hint",
          puzzleId: puzzle.puzzleId,
          date: puzzle.date,
          ...(requestMode === "guest" && bestGuess
            ? { bestWord: bestGuess.guess }
            : {}),
        }),
      }
    );

    const data = await response.json();

    if (
      requestVersion !== loadVersion.current ||
      requestUserId !== activeUserId.current
    ) {
      return;
    }

    if (
      response.status === 409 &&
      data.code === "PUZZLE_CHANGED"
    ) {
      window.location.reload();
      return;
    }

    if (!response.ok) {
      setError(data.error ?? "Unable to get a hint.");

      if (response.status === 409 && requestMode === "account") {
        submitting.current = false;
        await refreshCloudProgress();
      }

      return;
    }

    if (
      data.puzzleId !== puzzle.puzzleId ||
      data.date !== puzzle.date
    ) {
      window.location.reload();
      return;
    }

    setGuessHistory((previous) => {
      if (previous.some((item) => item.guess === data.guess)) {
        return previous;
      }

      return [...previous, data as GuessResult];
    });

    setGuess("");
  } catch {
    if (
      requestVersion === loadVersion.current &&
      requestUserId === activeUserId.current
    ) {
      setError("Could not connect to the server.");
    }
  } finally {
    submitting.current = false;
    setLoading(false);
  }
}


  return (
    <main className="min-h-screen bg-[#171717] px-4 py-4 text-white sm:px-8 sm:py-6">
      <div className="mx-auto max-w-2xl">
        <GameHeader
          puzzleId={puzzle?.puzzleId}
          date={puzzle?.date}
        />

        <HowToPlay />

        <GuessInput
          guess={guess}
          guessCount={guessHistory.length}
          loading={loading || !ready || !puzzle}
          hasWon={hasWon}
          hintDisabled={loading || !ready || !puzzle || hasWon}
          onGuessChange={(value) => {
            setGuess(value);
            setError("");
            setSuggestion(null);
          }}
          onSubmit={submitGuess}
          onHint={requestHint}
          onFaq={() => setFaqOpen(true)}
        />

        {faqOpen && (
          <FAQModal onClose={() => setFaqOpen(false)} />
        )}



        {user && (
          <p className="mt-3 text-xs text-zinc-500">
            {ready
              ? "☁ Progress saved to your account"
              : "Connecting to cloud progress..."}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {suggestion && (
          <button
            type="button"
            onClick={() => {
              setGuess(suggestion);
              setSuggestion(null);
              setError("");
            }}
            className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
          >
            Did you mean <strong>{suggestion}</strong>?
          </button>
        )}

        {hasWon && puzzle && (
          <ShareResult
            puzzleId={puzzle.puzzleId}
            guessCount={
              guessHistory.filter((item) => !item.isHint).length
            }
            hintCount={
              guessHistory.filter((item) => item.isHint === true).length
            }
            isSignedIn={mode === "account" && user !== null}
          />
        )}

        <GuessHistory guesses={guessHistory} />

        <footer className="mt-14 border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
          Project Daily · Word Hunt
        </footer>
      </div>
    </main>
  );
}
