
from pathlib import Path
import json
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR.parent / "web" / "data" / "puzzles"

schedule = json.loads(
    (DATA_DIR / "puzzle_schedule.json").read_text(
        encoding="utf-8"
    )
)

words = (DATA_DIR / "vocabulary.txt").read_text(
    encoding="utf-8"
).splitlines()

embeddings = np.load(DATA_DIR / "embeddings.npy")

if len(words) != len(embeddings):
    raise ValueError("Vocabulary and embeddings do not match.")

if len(set(words)) != len(words):
    raise ValueError("Duplicate vocabulary words detected.")

word_to_index = {
    word: index for index, word in enumerate(words)
}

# Validate all scheduled answers and dates before exporting.
if not schedule:
    raise ValueError("Puzzle schedule is empty.")

dates = [puzzle["date"] for puzzle in schedule]
answers = [puzzle["answer"] for puzzle in schedule]

if len(set(dates)) != len(dates):
    raise ValueError("Duplicate puzzle dates detected.")

if len(set(answers)) != len(answers):
    raise ValueError("Duplicate puzzle answers detected.")

missing = [
    answer for answer in answers
    if answer not in word_to_index
]

if missing:
    raise ValueError(f"Missing answers: {missing}")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for puzzle in schedule:
    answer = puzzle["answer"]
    answer_index = word_to_index[answer]

    similarities = embeddings @ embeddings[answer_index]

    # Stable sorting gives deterministic tie-breaking.
    sorted_indices = np.argsort(-similarities, kind="stable")

    ranks = np.empty(len(words), dtype=np.int32)
    ranks[sorted_indices] = np.arange(1, len(words) + 1)

    # The answer must always have rank 1.
    # Resolve any floating-point ties in its favor.
    if ranks[answer_index] != 1:
        first_index = sorted_indices[0]
        ranks[first_index] = ranks[answer_index]
        ranks[answer_index] = 1

    rankings = {
        word: int(ranks[index])
        for index, word in enumerate(words)
    }

    output = {
        "puzzleId": puzzle["puzzleId"],
        "date": puzzle["date"],
        "answer": answer,
        "totalWords": len(words),
        "rankings": rankings
    }

    output_path = OUTPUT_DIR / f"{puzzle['date']}.json"

    output_path.write_text(
        json.dumps(output, separators=(",", ":")),
        encoding="utf-8"
    )

print(f"Successfully exported {len(schedule)} puzzles.")
print(f"Vocabulary size: {len(words)}")
print(f"Output: {OUTPUT_DIR}")
