CREATE TABLE "daily_puzzles" (
	"id" integer PRIMARY KEY NOT NULL,
	"puzzle_date" date NOT NULL,
	"answer" text NOT NULL,
	"total_words" integer NOT NULL,
	"rankings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_puzzles_puzzle_date_unique" UNIQUE("puzzle_date"),
	CONSTRAINT "daily_puzzles_positive_total_words" CHECK ("daily_puzzles"."total_words" > 0)
);
