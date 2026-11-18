
const instructions = [
  "Type any English word and submit your guess.",
  "Each word receives a semantic closeness rank.",
  "Lower ranks mean closer matches. Rank #1 wins!",
];

export default function HowToPlay() {
  return (
    <section className="mb-8 rounded-2xl border border-[#414141] bg-[#252525] p-6">
      <h2 className="mb-6 text-center text-xl font-semibold text-zinc-100">
        How to play
      </h2>

      <div className="space-y-5">
        {instructions.map((instruction, index) => (
          <div key={index} className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-900">
              {index + 1}
            </span>

            <p className="pt-1 text-sm leading-6 text-zinc-300">
              {instruction}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
