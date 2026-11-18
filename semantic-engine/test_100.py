
from pathlib import Path

data_dir = Path("data")

vocabulary = set(
    (data_dir / "vocabulary.txt")
    .read_text(encoding="utf-8")
    .splitlines()
)

answers = [
    word.strip().lower()
    for word in (data_dir / "answer_candidates.txt")
    .read_text(encoding="utf-8")
    .splitlines()
    if word.strip()
]

missing = [
    word for word in answers
    if word not in vocabulary
]

print("Vocabulary:", len(vocabulary))
print("Answers:", len(answers))
print("Missing answers:", missing)
