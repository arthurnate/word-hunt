
"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  CircleHelp,
  X,
} from "lucide-react";

type FAQModalProps = {
  onClose: () => void;
};

const faqs = [
  {
    question: "How do I play Word Hunt?",
    answer:
      "Find the hidden word by guessing related words. Every valid guess receives a similarity rank. Rank #1 is the secret word, and lower numbers mean you're getting closer!",
  },
  {
    question: "How do hints work?",
    answer:
      "Click Get a Hint to reveal a word approximately halfway between your current best rank and the answer. Hints are unlimited and count toward your total guesses.",
  },
  {
    question: "How do I check my statistics?",
    answer:
      "Click the statistics icon in the top-right corner. Sign in with Google to track your games played, wins, average guesses, and streaks.",
  },
  {
    question: "How do I sign in?",
    answer:
      "Click the Sign In button in the top-right corner and continue with your Google account.",
  },
  {
    question: "Can I play without signing in?",
    answer:
      "Absolutely! You can play as a guest. Your progress is saved in your browser, but it won't automatically sync across devices.",
  },
  {
    question: "When does the daily puzzle reset?",
    answer:
      "A new Word Hunt puzzle becomes available every day at 00:00 UTC (5:30 AM IST).",
  },
  {
    question: "Can I play previous puzzles?",
    answer:
      "Not yet! Word Hunt currently offers one puzzle per day.",
  },
  {
    question: "How do I share my result?",
    answer:
      "Once you discover the secret word, use the Copy Result or WhatsApp sharing options to share your achievement.",
  },
  {
    question: "What happens if I close the browser?",
    answer:
      "Your progress is saved automatically. Guest progress stays in your browser, while signed-in progress is saved to your account.",
  },
];

export default function FAQModal({
  onClose,
}: FAQModalProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#1c1c1c] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <CircleHelp className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="faq-title"
                className="text-lg font-semibold text-white"
              >
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-zinc-500">
                Everything you need to know
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close FAQ"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-2">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.question}
                className="border-b border-zinc-800/70 last:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenIndex(isOpen ? null : index)
                  }
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-sm font-medium text-zinc-200">
                    {faq.question}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                      isOpen
                        ? "rotate-180 text-emerald-400"
                        : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="pb-4 pr-6 text-sm leading-6 text-zinc-400">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-zinc-800 px-6 py-4 text-center">
          <p className="text-xs text-zinc-500">
            Project Daily · Word Hunt
          </p>
        </div>
      </section>
    </div>
  );
}
