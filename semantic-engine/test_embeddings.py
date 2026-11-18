from sentence_transformers import SentenceTransformer, util
import time

start = time.perf_counter()

model = SentenceTransformer("all-mpnet-base-v2")

print(f"Model loading: {time.perf_counter() - start:.3f}s")

words = [
    "ocean", "sea", "water", "wave", "beach",
    "fish", "ship", "swimming", "river", "lake",
    "sand", "sunshine", "computer", "keyboard",
    "software", "technology", "mountain", "forest",
    "happiness", "architecture"
]

target = "ocean"

start = time.perf_counter()

target_embedding = model.encode(target, convert_to_tensor=True)
word_embeddings = model.encode(words, convert_to_tensor=True)

print(f"Embedding generation: {time.perf_counter() - start:.3f}s")

similarities = util.cos_sim(target_embedding, word_embeddings)[0]

ranked_words = sorted(
    zip(words, similarities.tolist()),
    key=lambda x: x[1],
    reverse=True
)

print(f"\nSemantic rankings for: {target}\n")

for rank, (word, score) in enumerate(ranked_words, start=1):
    print(f"{rank:2}. {word:<15} Similarity: {score:.4f}")