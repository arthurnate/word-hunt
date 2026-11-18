
"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Flame,
  Lightbulb,
  Share2,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

type Props = {
  puzzleId: number;
  guessCount: number;
  hintCount: number;
  isSignedIn: boolean;
};

const GAME_URL = "https://word-hunt-eta.vercel.app/";

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
  const [sharingImage, setSharingImage] = useState(false);
  const [error, setError] = useState("");

  const attempts = guessCount + hintCount;
  const message = celebration(attempts);

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
    `dailyDot — Word Hunt #${puzzleId}`,
    "",
    message,
    `🎯 ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`,
    `💡 ${hintCount} ${hintCount === 1 ? "hint" : "hints"}`,
    ...(streak !== null && isSignedIn
      ? [`🔥 ${streak}-day streak!`]
      : []),
    "",
    "Can you beat me? Play today's puzzle:",
    GAME_URL,
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

  async function shareInstagram() {
    setSharingImage(true);
    setError("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      // Background
      ctx.fillStyle = "#171717";
      ctx.fillRect(0, 0, 1080, 1920);

      const glow = ctx.createRadialGradient(
        540, 750, 50, 540, 750, 750
      );

      glow.addColorStop(0, "rgba(16,185,129,0.18)");
      glow.addColorStop(1, "rgba(16,185,129,0)");

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1920);

      ctx.textAlign = "center";

      // Branding
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 92px Arial";
      ctx.fillText("dailyDot", 540, 350);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "36px Arial";
      ctx.fillText(
        `WORD HUNT / PUZZLE #${puzzleId}`,
        540,
        435
      );

      // Celebration
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 94px Arial";
      ctx.fillText(message, 540, 720, 950);

      ctx.fillStyle = "#d4d4d8";
      ctx.font = "38px Arial";
      ctx.fillText("I found the hidden word!", 540, 795);

      // Stats card
      ctx.fillStyle = "#252525";
      ctx.beginPath();
      ctx.roundRect(115, 900, 850, 350, 36);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 112px Arial";
      ctx.fillText(String(guessCount), 330, 1065);
      ctx.fillText(String(hintCount), 750, 1065);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "36px Arial";
      ctx.fillText("GUESSES", 330, 1135);
      ctx.fillText("HINTS", 750, 1135);

      if (streak !== null && isSignedIn) {
        ctx.fillStyle = "#fdba74";
        ctx.font = "bold 42px Arial";
        ctx.fillText(`${streak}-day streak`, 540, 1380);
      }

      // Invitation
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px Arial";
      ctx.fillText(
        "Think you can beat me?",
        540,
        1570
      );

      ctx.fillStyle = "#34d399";
      ctx.font = "34px Arial";
      ctx.fillText(
        "word-hunt-eta.vercel.app",
        540,
        1650
      );

      const blob = await new Promise<Blob | null>(
        (resolve) => canvas.toBlob(resolve, "image/png")
      );

      if (!blob) throw new Error("Image generation failed");

      const file = new File(
        [blob],
        `dailydot-${puzzleId}.png`,
        { type: "image/png" }
      );

      // Native mobile share sheet
      if (
        navigator.canShare?.({ files: [file] }) &&
        navigator.share
      ) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (err) {
          if (
            err instanceof DOMException &&
            err.name === "AbortError"
          ) {
            return;
          }
        }
      }

      // Desktop download fallback
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `dailydot-${puzzleId}.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Unable to create your Story image.");
    } finally {
      setSharingImage(false);
    }
  }

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#252525] p-5 text-center sm:p-7">
      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-emerald-500/10 to-transparent"
      />

      <div className="relative z-10">
        {/* Trophy */}
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 animate-[victory-pop_650ms_cubic-bezier(0.2,0.8,0.2,1)_both] motion-reduce:animate-none">
          <Trophy className="h-8 w-8 text-emerald-400" />

          <Sparkles className="absolute -right-3 -top-2 h-5 w-5 animate-pulse text-emerald-300 motion-reduce:animate-none" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {message}
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          You cracked today&apos;s hidden word.
        </p>

        {/* Stats */}
        <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#414141] bg-[#1d1d1d] px-4 py-4">
            <Target className="mx-auto mb-2 h-5 w-5 text-emerald-400" />

            <p className="text-3xl font-bold tabular-nums text-white">
              {guessCount}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {guessCount === 1 ? "Guess" : "Guesses"}
            </p>
          </div>

          <div className="rounded-xl border border-[#414141] bg-[#1d1d1d] px-4 py-4">
            <Lightbulb className="mx-auto mb-2 h-5 w-5 text-yellow-400" />

            <p className="text-3xl font-bold tabular-nums text-white">
              {hintCount}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {hintCount === 1 ? "Hint" : "Hints"}
            </p>
          </div>
        </div>

        {/* Streak */}
        {streak !== null && isSignedIn && (
          <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-orange-400/20 bg-orange-400/5 px-4 py-3">
            <Flame className="h-5 w-5 text-orange-300" />

            <span className="text-sm font-semibold text-orange-200">
              {streak} - day streak!
            </span>
          </div>
        )}

        {/* Puzzle completion */}
        <div className="mx-auto mt-4 max-w-sm rounded-xl bg-[#1d1d1d] px-4 py-3">
          <p className="text-sm font-medium text-zinc-200">
            Puzzle #{puzzleId} completed!
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            A new hidden word arrives tomorrow.
          </p>
        </div>

        {/* Share section */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4 text-emerald-400" />

            <span className="text-sm font-semibold text-zinc-200">
              Share your victory
            </span>
          </div>

          <div className="mx-auto grid max-w-md grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={copyResult}
              className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl bg-emerald-500 px-2 py-3 text-xs font-semibold text-zinc-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 active:scale-95 motion-reduce:transform-none"
            >
              {copied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}

              {copied ? "Copied!" : "Copy"}
            </button>

            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-[#414141] bg-[#303030] px-2 py-3 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-[#383838] active:scale-95 motion-reduce:transform-none"
            >
              <FaWhatsapp className="h-5 w-5" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={shareInstagram}
              disabled={sharingImage}
              className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-[#414141] bg-[#303030] px-2 py-3 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-[#383838] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
            >
              {sharingImage ? (
                <Download className="h-5 w-5 animate-pulse" />
              ) : (
                <FaInstagram className="h-5 w-5" />
              )}

              {sharingImage ? "Preparing" : "Instagram"}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-xs text-red-400">
            {error}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes victory-pop {
          0% {
            opacity: 0;
            transform: scale(0.6) rotate(-12deg);
          }
          65% {
            opacity: 1;
            transform: scale(1.12) rotate(4deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
