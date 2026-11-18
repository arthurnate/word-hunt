
"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Trophy } from "lucide-react";

type Props = {
  puzzleId: number;
  guessCount: number;
  hintCount: number;
  isSignedIn: boolean;
};

function celebration(count: number) {
  if (count <= 5) return "Legendary!";
  if (count <= 10) return "Insane!";
  if (count <= 20) return "Brilliant!";
  if (count <= 40) return "Nice work!";
  return "You got it! 🏆";
}

export default function ShareResult({
  puzzleId,
  guessCount,
  hintCount,
  isSignedIn,
}: Props) {
  const [streak, setStreak] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const attempts = guessCount + hintCount;

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    const controller = new AbortController();

    async function fetchStreak() {
      try {
        const response = await fetch("/api/account/stats", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data: { currentStreak: number } =
          await response.json();

        if (
          Number.isInteger(data.currentStreak) &&
          data.currentStreak >= 0
        ) {
          setStreak(data.currentStreak);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Unable to load streak:", error);
        }
      }
    }

    void fetchStreak();

    return () => controller.abort();
  }, [isSignedIn, puzzleId]);

  const resultText = [
    `daily. — Word Hunt #${puzzleId}`,
    "",
    celebration(attempts),
    `🎯 ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`,
    `💡 ${hintCount} ${hintCount === 1 ? "hint" : "hints"}`,
    ...(streak !== null && isSignedIn
      ? [`🔥 ${streak}-day streak!`]
      : []),
    "",
    "Can you beat me? Play Word Hunt on daily.",
    // Add the public URL after deployment.
  ].join("\n");

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setError("");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Unable to copy result.");
    }
  }

  function shareWhatsApp() {
    const url =
      "https://wa.me/?text=" +
      encodeURIComponent(resultText);

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-[#252525] p-5 text-center sm:p-8">
      
      <h2 className="text-xl font-bold text-white">
        {celebration(attempts)}
      </h2>

      <p className="mt-2 text-sm text-zinc-200">
        You found the hidden word!
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <div className="w-[100px] rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3">
          <p className="text-xl font-bold text-white">
            {guessCount}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {guessCount === 1 ? "Guess" : "Guesses"}
          </p>
        </div>

        <div className="w-[100px] rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3">
          <p className="text-xl font-bold text-white">
            {hintCount}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {hintCount === 1 ? "Hint" : "Hints"}
          </p>
        </div>
      </div>

      {streak !== null && isSignedIn && (
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-[#252525] p-4">
          <p className="text-xl font-bold text-orange-300">
            🔥 {streak} - day streak!
          </p>

          <p className="mt-1 text-xs text-zinc-400">
            Keep your winning streak alive!
          </p>
        </div>
      )}

      <p className="mt-5 text-xs text-zinc-400">
        Come back tomorrow for another challenge.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={copyResult}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}

          {copied ? "Copied!" : "Copy Result"}
        </button>

        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
