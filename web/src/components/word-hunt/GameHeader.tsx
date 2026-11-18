
"use client";

import { useState } from "react";
import { BarChart3, CalendarDays, Hash } from "lucide-react";

import AuthButton from "@/components/auth/AuthButton";
import StatsModal from "@/components/word-hunt/StatsModal";

type GameHeaderProps = {
  puzzleId?: number;
  date?: string;
};

export default function GameHeader({
  puzzleId,
  date,
}: GameHeaderProps) {
  const [statsOpen, setStatsOpen] = useState(false);

  const formattedDate = date
    ? new Date(`${date}T12:00:00Z`).toLocaleDateString(
        "en-US",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }
      )
    : null;

  return (
    <>
      <header className="mb-10">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <span className="text-lg font-bold">d.</span>
            </div>

            <span className="text-xl font-bold tracking-tight">
              daily<span className="text-emerald-400">Dot</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              aria-label="View statistics"
              title="Your statistics"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <BarChart3 className="h-4 w-4" />
            </button>

            <AuthButton />
          </div>
        </div>

        <div className="pt-14 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            The semantic word game
          </p>

          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Find the hidden word.
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-zinc-400">
            The closer you get to #1, the closer you are
            to discovering the secret word.
          </p>

          {puzzleId !== undefined && formattedDate && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                <Hash className="h-3.5 w-3.5 text-emerald-400" />
                 {puzzleId}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                {formattedDate}
              </span>
            </div>
          )}
        </div>
      </header>

      {statsOpen && (
        <StatsModal onClose={() => setStatsOpen(false)} />
      )}
    </>
  );
}
