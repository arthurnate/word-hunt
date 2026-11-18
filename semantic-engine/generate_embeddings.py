from pathlib import Path
from time import perf_counter

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
DATA_DIR = Path(__file__).resolve().parent / "data"

VOCAB_PATH = DATA_DIR / "vocabulary.txt"
EMBEDDINGS_PATH = DATA_DIR / "embeddings.npy"

words = VOCAB_PATH.read_text(encoding="utf-8").splitlines()

print(f"Loaded {len(words):,} words")

model = SentenceTransformer(MODEL_NAME)

start = perf_counter()

embeddings = model.encode(
    words,
    batch_size=128,
    show_progress_bar=True,
    convert_to_numpy=True,
    normalize_embeddings=True
)

elapsed = perf_counter() - start

np.save(EMBEDDINGS_PATH, embeddings)

print(f"\nEmbedding shape: {embeddings.shape}")
print(f"Generation time: {elapsed:.2f} seconds")
print(f"File size: {EMBEDDINGS_PATH.stat().st_size / (1024 ** 2):.2f} MB")
print(f"Saved to: {EMBEDDINGS_PATH}")