
"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  X,
} from "lucide-react";

const instructions = [
  {
    title: "Guess the hidden word",
    description:
      "There's one secret English word every day. Start with any common word like water, farmer or lemons.",
  },
  {
    title: "Follow the rankings",
    description:
      "Each guess gets a rank based on its meaning. The lower the number, the closer you are!",
  },
  {
    title: "Find #1 to win!",
    description:
      "Use your closest guesses to find related words. Stuck? Reveal a closer word with a hint. Hints are unlimited!",
  },
];

const exampleGuesses = [
  { word: "farmer", rank: 18420 },
  { word: "water", rank: 1240 },
  { word: "river", rank: 180 },
  { word: "sea", rank: 8 },
  { word: "ocean", rank: 1 },
];

export default function HowToPlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [showExample, setShowExample] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Compact landing-page trigger */}
      <div className="mb-5 flex justify-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-2 rounded-xl border border-[#414141] bg-[#252525] px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
        >
          <BookOpen className="h-4 w-4 text-emerald-400" />

          How to play

          <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
            New? Start here
          </span>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-zinc-800 bg-[#202020] p-5 text-white shadow-2xl sm:p-7"
          >
            {/* Modal heading */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-emerald-400" />

                <h2
                  id="how-to-play-title"
                  className="text-xl font-semibold"
                >
                  How to play
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close how to play"
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Three rules */}
            <div className="space-y-5">
              {instructions.map((instruction, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold leading-none text-zinc-900">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-semibold leading-8 text-zinc-100">
                      {instruction.title}
                    </h3>

                    <p className="text-sm leading-6 text-zinc-300">
                      {instruction.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Collapsible example */}
            <div className="mt-6 border-t border-[#414141] pt-4">
              <button
                type="button"
                onClick={() =>
                  setShowExample((previous) => !previous)
                }
                aria-expanded={showExample}
                aria-controls="how-to-play-example"
                className="flex w-full items-center justify-center gap-2 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
              >
                {showExample
                  ? "Hide example"
                  : "See an example"}

                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    showExample ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showExample && (
                <div
                  id="how-to-play-example"
                  className="mt-4 rounded-xl border border-[#414141] bg-[#1b1b1b] p-4"
                >
                  <p className="mb-3 text-sm leading-6 text-zinc-300">
                    Imagine the secret word is ocean.
                    Watch how guesses get closer in meaning.
                  </p>

                  <div className="space-y-2">
                    {exampleGuesses.map(({ word, rank }) => (
                      <div
                        key={word}
                        className="flex items-center justify-between rounded-lg bg-[#252525] px-3 py-2"
                      >
                        <span className="text-sm text-zinc-200">
                          {word}
                        </span>

                        <span
                          className={`text-sm font-semibold ${
                            rank === 1
                              ? "text-emerald-400"
                              : "text-zinc-300"
                          }`}
                        >
                          #{rank.toLocaleString("en-US")}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-zinc-400">
                    Example only. These rankings are illustrative,
                    not from today&apos;s puzzle.
                  </p>
                </div>
              )}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-zinc-400">
              Words are ranked by meaning, not spelling.
              A new puzzle arrives every day!
            </p>
          </div>
        </div>
      )}
    </>
  );
}
