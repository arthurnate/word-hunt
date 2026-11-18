
from pathlib import Path
from wordfreq import top_n_list

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

TARGET_SIZE = 30000

# Fetch more candidates than we need because
# some entries will be filtered out.
raw_words = top_n_list("en", 60000)

vocabulary = []
seen = set()

for word in raw_words:
    word = word.lower().strip()

    if (
        len(word) >= 3
        and word.isascii()
        and word.isalpha()
        and word not in seen
    ):
        vocabulary.append(word)
        seen.add(word)

    if len(vocabulary) == TARGET_SIZE:
        break

if len(vocabulary) < TARGET_SIZE:
    raise ValueError(
        f"Only found {len(vocabulary)} valid words."
    )

output_path = DATA_DIR / "vocabulary.txt"

output_path.write_text(
    "\n".join(vocabulary),
    encoding="utf-8"
)

print(f"Generated {len(vocabulary)} vocabulary words")
print(f"Saved to: {output_path}")
