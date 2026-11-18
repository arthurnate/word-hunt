
import { ArrowRight, Target, Lightbulb, CircleHelp } from "lucide-react";

type GuessInputProps = {
  guess: string;
  guessCount: number;
  loading: boolean;
  hasWon: boolean;
  hintDisabled: boolean;
  onGuessChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onHint: () => void;
  onFaq: () => void;
};

export default function GuessInput({
  guess,
  guessCount,
  loading,
  hasWon,
  hintDisabled,
  onGuessChange,
  onSubmit,
  onHint,
  onFaq,
}: GuessInputProps) {
  const heading = hasWon
    ? "You found it!"
    : guessCount === 0
      ? "Your first guess?"
      : "Keep hunting!";

  const subtitle = hasWon
    ? "Come back tomorrow for another puzzle."
    : guessCount === 0
      ? "Try water, farmer or a Stegosaurus."
      : "Every word is another clue.";

  return (
    <div className="w-full rounded-2xl border border-[#414141] bg-[#252525] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
          <Target className="h-5 w-5 text-emerald-400" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-100">
            {heading}
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            {subtitle}
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex w-full items-center gap-2"
      >
        <input
          type="text"
          value={guess}
          onChange={(event) => onGuessChange(event.target.value)}
          placeholder={
            hasWon ? "Puzzle completed!" : "Type a word..."
          }
          disabled={hasWon || loading}
          autoComplete="off"
          spellCheck={false}
          maxLength={50}
          aria-label="Your word guess"
          className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-[#171717] px-4 py-3.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-500/60 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={loading || hasWon || !guess.trim()}
          aria-label={loading ? "Checking guess" : "Submit guess"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#414141] pt-3">

        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-zinc-300 transition hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Lightbulb className="h-4 w-4 shrink-0 -translate-y-0.5" />
          Get a hint
        </button>

        <div className="flex h-10 items-center gap-3">
          <span className="text-xs font-medium leading-none text-emerald-400">
            Unlimited
          </span>

          <button
            type="button"
            onClick={onFaq}
            aria-label="Open FAQ"
            title="Frequently asked questions"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
