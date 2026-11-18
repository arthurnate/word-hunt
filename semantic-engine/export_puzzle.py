
from pathlib import Path
import json
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

VOCAB_PATH = DATA_DIR / "vocabulary.txt"
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npy"

# Temporary fixed answer for integration testing
ANSWER = "garden"

words = VOCAB_PATH.read_text(
    encoding="utf-8"
).splitlines()

embeddings = np.load(EMBEDDINGS_PATH)

if len(words) != len(embeddings):
    raise ValueError("Vocabulary and embeddings do not match.")

word_to_index = {
    word: index for index, word in enumerate(words)
}

if ANSWER not in word_to_index:
    raise ValueError("Answer not found in vocabulary.")

# Calculate semantic similarity
answer_index = word_to_index[ANSWER]
similarities = embeddings @ embeddings[answer_index]

# Convert similarity scores into ranks
sorted_indices = np.argsort(-similarities)

ranks = np.empty(len(words), dtype=np.int32)
ranks[sorted_indices] = np.arange(1, len(words) + 1)

# Store word-to-rank mapping
rankings = {
    word: int(ranks[index])
    for index, word in enumerate(words)
}

# Export directly into the Next.js server directory
OUTPUT_PATH = BASE_DIR.parent / "web" / "data" / "puzzle.json"
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

puzzle = {
    "answer": ANSWER,
    "totalWords": len(words),
    "rankings": rankings
}

OUTPUT_PATH.write_text(
    json.dumps(puzzle, separators=(",", ":")),
    encoding="utf-8"
)

print(f"Exported puzzle for: {ANSWER}")
print(f"Total words: {len(words):,}")
print(f"Saved to: {OUTPUT_PATH}")
