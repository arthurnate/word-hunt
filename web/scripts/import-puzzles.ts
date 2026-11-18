
import "dotenv/config";

import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

config({ path: ".env.local", override: true });

type Puzzle = {
  puzzleId: number;
  date: string;
  answer: string;
  totalWords: number;
  rankings: Record<string, number>;
};

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  prepare: false,
});

const puzzleDirectory = path.join(
  process.cwd(),
  "data",
  "puzzles"
);

function validatePuzzle(
  value: unknown,
  filename: string
): Puzzle {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid puzzle: ${filename}`);
  }

  const puzzle = value as Puzzle;

  if (
    !Number.isInteger(puzzle.puzzleId) ||
    puzzle.puzzleId < 1
  ) {
    throw new Error(`Invalid puzzle ID: ${filename}`);
  }

  if (
    typeof puzzle.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(puzzle.date) ||
    `${puzzle.date}.json` !== filename ||
    !Number.isFinite(Date.parse(`${puzzle.date}T00:00:00Z`))
  ) {
    throw new Error(`Invalid puzzle date: ${filename}`);
  }

  if (
    typeof puzzle.answer !== "string" ||
    !/^[a-z]+$/.test(puzzle.answer)
  ) {
    throw new Error(`Invalid answer: ${filename}`);
  }

  if (
    !Number.isInteger(puzzle.totalWords) ||
    puzzle.totalWords < 1
  ) {
    throw new Error(`Invalid word count: ${filename}`);
  }

  if (
    !puzzle.rankings ||
    typeof puzzle.rankings !== "object" ||
    Array.isArray(puzzle.rankings)
  ) {
    throw new Error(`Invalid rankings: ${filename}`);
  }

  const entries = Object.entries(puzzle.rankings);

  if (entries.length !== puzzle.totalWords) {
    throw new Error(
      `Ranking count mismatch: ${filename}`
    );
  }

  if (puzzle.rankings[puzzle.answer] !== 1) {
    throw new Error(
      `Answer must have rank 1: ${filename}`
    );
  }

  const seenRanks = new Set<number>();

  for (const [word, rank] of entries) {
    if (
      !/^[a-z]+$/.test(word) ||
      !Number.isInteger(rank) ||
      rank < 1 ||
      rank > puzzle.totalWords ||
      seenRanks.has(rank)
    ) {
      throw new Error(
        `Invalid or duplicate ranking: ${filename}`
      );
    }

    seenRanks.add(rank);
  }

  return puzzle;
}

async function main() {
  const filenames = (await readdir(puzzleDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();

  if (filenames.length === 0) {
    throw new Error("No puzzle JSON files found.");
  }

  console.log(`Found ${filenames.length} puzzle files.`);

  // Validate every file before writing to the database.
  const puzzles: Puzzle[] = [];

  for (const filename of filenames) {
    const contents = await readFile(
      path.join(puzzleDirectory, filename),
      "utf-8"
    );

    const puzzle = validatePuzzle(
      JSON.parse(contents),
      filename
    );

    puzzles.push(puzzle);
  }

  const ids = new Set(puzzles.map((p) => p.puzzleId));
  const dates = new Set(puzzles.map((p) => p.date));

  if (
    ids.size !== puzzles.length ||
    dates.size !== puzzles.length
  ) {
    throw new Error("Duplicate puzzle IDs or dates found.");
  }

  console.log("All puzzle files validated.");

  let imported = 0;
  let skipped = 0;

  for (const puzzle of puzzles) {
    const existing = await sql`
      SELECT
        id,
        puzzle_date::text AS puzzle_date,
        answer,
        total_words,
        rankings
      FROM public.daily_puzzles
      WHERE id = ${puzzle.puzzleId}
         OR puzzle_date = ${puzzle.date}::date
    `;

    if (existing.length > 0) {
      if (existing.length !== 1) {
        throw new Error(
          `Conflicting database records for puzzle ${puzzle.puzzleId}`
        );
      }

      const row = existing[0];

      const same =
        row.id === puzzle.puzzleId &&
        row.puzzle_date === puzzle.date &&
        row.answer === puzzle.answer &&
        row.total_words === puzzle.totalWords &&
        Object.keys(row.rankings).length === puzzle.totalWords &&
        Object.entries(puzzle.rankings).every(
        ([word, rank]) => row.rankings[word] === rank
        );

      if (!same) {
        throw new Error(
          `Puzzle ${puzzle.puzzleId} differs from the database. Aborting.`
        );
      }

      skipped++;
      continue;
    }

    await sql`
      INSERT INTO public.daily_puzzles (
        id,
        puzzle_date,
        answer,
        total_words,
        rankings
      )
      VALUES (
        ${puzzle.puzzleId},
        ${puzzle.date}::date,
        ${puzzle.answer},
        ${puzzle.totalWords},
        ${sql.json(puzzle.rankings)}
      )
    `;

    imported++;

    console.log(
      `Imported puzzle #${puzzle.puzzleId} (${puzzle.date})`
    );
  }

  console.log("\nImport complete!");
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${puzzles.length}`);
}

main()
  .catch((error) => {
    console.error("Puzzle import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
