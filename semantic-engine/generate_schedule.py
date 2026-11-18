
from pathlib import Path
from datetime import date, timedelta
import json
import random

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

CANDIDATES_PATH = DATA_DIR / "answer_candidates.txt"
OUTPUT_PATH = DATA_DIR / "puzzle_schedule.json"

# Development schedule: begins today.
# We'll choose a fixed launch date before production.
START_DATE = date.today()

candidates = [
    word.strip().lower()
    for word in CANDIDATES_PATH.read_text(
        encoding="utf-8"
    ).splitlines()
    if word.strip()
]

# Remove duplicates while preserving the original list
candidates = list(dict.fromkeys(candidates))

if len(candidates) != 100:
    raise ValueError(
        f"Expected 100 unique answers, found {len(candidates)}"
    )

# Shuffle a copy of the curated answer pool
random.shuffle(candidates)

schedule = []

for index, answer in enumerate(candidates):
    puzzle_date = START_DATE + timedelta(days=index)

    schedule.append({
        "puzzleId": index + 1,
        "date": puzzle_date.isoformat(),
        "answer": answer
    })

OUTPUT_PATH.write_text(
    json.dumps(schedule, indent=2),
    encoding="utf-8"
)

print(f"Generated {len(schedule)} daily puzzles")
print(f"First puzzle: {schedule[0]['date']}")
print(f"Last puzzle: {schedule[-1]['date']}")
print(f"Saved to: {OUTPUT_PATH}")
