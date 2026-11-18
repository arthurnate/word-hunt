"use client";

import { useEffect, useState } from "react";
import {
  X,
  BarChart3,
  Flame,
  Trophy,
  Target,
  LoaderCircle,
} from "lucide-react";

type PlayerStats = {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  averageGuesses: number;
  currentStreak: number;
  longestStreak: number;
};

type StatsModalProps = {
  onClose: () => void;
};

export default function StatsModal({ onClose }: StatsModalProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        const response = await fetch("/api/account/stats", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          throw new Error(
            "Sign in with Google to view your statistics."
          );
        }

        if (!response.ok) {
          throw new Error("Unable to load statistics.");
        }

        const data: PlayerStats = await response.json();
        setStats(data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#202020] p-6 text-white shadow-2xl sm:p-8"
      >
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-emerald-400" />

            <h2
              id="stats-title"
              className="text-xl font-semibold"
            >
              Your Statistics
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close statistics"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div
            role="status"
            className="flex flex-col items-center gap-3 py-14 text-zinc-400"
          >
            <LoaderCircle className="h-7 w-7 animate-spin text-emerald-400" />
            <p className="text-sm">Loading your statistics...</p>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="py-10 text-center">
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
        )}

        {!loading && stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Games Played"
                value={stats.gamesPlayed}
              />
              <StatCard
                label="Games Won"
                value={stats.gamesWon}
              />
              <StatCard
                label="Win Rate"
                value={`${stats.winRate}%`}
              />
              <StatCard
                label="Avg. Guesses"
                value={stats.averageGuesses}
              />
            </div>

            <div className="my-7 border-t border-zinc-800" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <Flame className="h-7 w-7 text-orange-400" />

                <span className="text-3xl font-bold">
                  {stats.currentStreak}
                </span>

                <span className="text-xs text-zinc-400">
                  Current Streak
                </span>
              </div>

              <div className="flex flex-col items-center gap-2 text-center">
                <Trophy className="h-7 w-7 text-amber-400" />

                <span className="text-3xl font-bold">
                  {stats.longestStreak}
                </span>

                <span className="text-xs text-zinc-400">
                  Longest Streak
                </span>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-center">
              <Target className="h-4 w-4 text-emerald-400" />

              <p className="text-xs text-emerald-300">
                Keep playing daily to grow your streak!
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#282828] p-4">
      <p className="text-2xl font-bold tracking-tight">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-400">
        {label}
      </p>
    </div>
  );
}
