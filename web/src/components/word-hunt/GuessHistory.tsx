
import { Lightbulb } from "lucide-react";

export type GuessResult = {
  guess: string;
  rank: number;
  totalWords: number;
  isCorrect: boolean;
  isHint?: boolean;
};

type GuessHistoryProps = {
  guesses: GuessResult[];
};

function getRankColor(rank: number) {
  if (rank <= 500) return "bg-[#32964c]";
  if (rank <= 2000) return "bg-[#e4e156]";
  return "bg-[#f1651f]";
}

function getCloseness(rank: number, totalWords: number) {
  if (rank === 1) return 100;

  const progress =
    1 - Math.log(rank) / Math.log(totalWords);

  return Math.max(8, Math.min(100, progress * 100));
}

export default function GuessHistory({
  guesses,
}: GuessHistoryProps) {
  const sortedGuesses = [...guesses].sort(
    (a, b) => a.rank - b.rank
  );

  const hintCount = guesses.filter(
    (item) => item.isHint === true
  ).length;

  const guessCount = guesses.length - hintCount;

  return (
    <section className="mt-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-100">
          Your guesses
        </h2>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{guessCount} guesses</span>

          <span className="inline-flex items-center gap-1">
            <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
            {hintCount} hints
          </span>

        </div>
      </div>

      {guesses.length === 0 ? (
        <div className="rounded-xl border border-[#414141] bg-[#252525] p-10 text-center">
          <p className="text-sm text-zinc-400">
            Your guesses and hints will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedGuesses.map((item) => {
            const width = getCloseness(
              item.rank,
              item.totalWords
            );

            return (
              <div
                key={item.guess}
                className="relative h-12 overflow-hidden rounded-lg border border-[#363636] bg-[#1d1d1d]"
              >
                {/* Closeness fill */}
                <div
                  className={`absolute inset-y-0 left-0 rounded-r-md transition-all duration-500 ${getRankColor(item.rank)}`}
                  style={{ width: `${width}%` }}
                />

                {/* Word, hint label, and rank */}
                <div className="relative z-10 flex h-full items-center justify-between gap-3 px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate capitalize text-sm font-semibold text-white drop-shadow-sm">
                      {item.guess}
                    </span>

                    {item.isHint && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/20 bg-[#161616]/70 px-2 py-1 text-[10px] font-semibold text-white">
                        <Lightbulb className="h-3 w-3 text-emerald-300" />
                        Hint
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 rounded bg-[#161616]/60 px-2 py-1 text-sm font-semibold tabular-nums text-zinc-100">
                    {item.rank.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
