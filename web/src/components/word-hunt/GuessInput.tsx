
type GuessInputProps = {
  guess: string;
  loading: boolean;
  hasWon: boolean;
  onGuessChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function GuessInput({
  guess,
  loading,
  hasWon,
  onGuessChange,
  onSubmit,
}: GuessInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full items-center gap-2 rounded-2xl border border-zinc-700/70 bg-zinc-900 p-2 transition-colors focus-within:border-emerald-500/60"
    >
      <input
        type="text"
        value={guess}
        onChange={(event) => onGuessChange(event.target.value)}
        placeholder={
          hasWon ? "Puzzle completed!" : "Enter any word..."
        }
        disabled={hasWon || loading}
        autoComplete="off"
        spellCheck={false}
        maxLength={50}
        aria-label="Your word guess"
        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={loading || hasWon || !guess.trim()}
        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Checking..." : "Guess"}
      </button>
    </form>
  );
}
