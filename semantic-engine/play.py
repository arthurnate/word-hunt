
from pathlib import Path
from datetime import datetime, timezone
from difflib import get_close_matches
import json
import random

import numpy as np
from colorama import Fore, Style, init

init(autoreset=True)

DATA_DIR = Path(__file__).resolve().parent / "data"

words = (DATA_DIR / "vocabulary.txt").read_text(
    encoding="utf-8"
).splitlines()

embeddings = np.load(DATA_DIR / "embeddings.npy")

assert len(words) == len(embeddings)

word_to_index = {
    word: index for index, word in enumerate(words)
}


# Load the 100 curated answers
candidate_path = DATA_DIR / "answer_candidates.txt"
used_path = DATA_DIR / "used_answers.txt"

candidates = [
    word.strip().lower()
    for word in candidate_path.read_text(
        encoding="utf-8"
    ).splitlines()
    if word.strip()
]

# Load previously used answers
used_answers = set()

if used_path.exists():
    used_answers = set(
        used_path.read_text(encoding="utf-8").splitlines()
    )

# Find unused valid answers
available_answers = [
    word for word in dict.fromkeys(candidates)
    if word in word_to_index
    and word not in used_answers
]

if not available_answers:
    raise RuntimeError(
        "Answer pool exhausted. Add a new batch."
    )

# Select one random unused answer
answer = random.choice(available_answers)

# Record it immediately
with used_path.open("a", encoding="utf-8") as file:
    file.write(answer + "\n")

print(
    f"Remaining answers: {len(available_answers) - 1}"
)


answer_index = word_to_index[answer]

# Generate ranks
similarities = embeddings @ embeddings[answer_index]
sorted_indices = np.argsort(-similarities)

ranks = np.empty(len(words), dtype=np.int32)
ranks[sorted_indices] = np.arange(1, len(words) + 1)

print("\nWelcome to Word Hunt!")
print("Lower rank = closer to the answer.")
print("Type 'quit' to exit.\n")

guess_history = []
previous_guesses = set()
best_rank = len(words) + 1


def get_color(rank):
    if rank <= 100:
        return Fore.GREEN
    elif rank <= 1000:
        return Fore.YELLOW
    return Fore.WHITE


def display_history():
    print("\n--- Your closest guesses ---")

    sorted_history = sorted(
        guess_history,
        key=lambda item: item["rank"]
    )

    for item in sorted_history[:10]:
        color = get_color(item["rank"])
        print(
            f"{color}{item['word']:<18} "
            f"Rank {item['rank']:,}"
        )

    print("----------------------------\n")


def save_game(completed):
    DATA_DIR.mkdir(exist_ok=True)

    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "answer": answer,
        "completed": completed,
        "guesses": len(guess_history),
        "best_rank": min(
            (item["rank"] for item in guess_history),
            default=None
        ),
        "history": guess_history
    }

    with (DATA_DIR / "game_results.jsonl").open(
        "a", encoding="utf-8"
    ) as file:
        file.write(json.dumps(result) + "\n")


while True:
    guess = input("Your guess: ").strip().lower()

    if guess == "quit":
        save_game(completed=False)
        print(f"The secret word was: {answer}")
        break

    if guess not in word_to_index:
        suggestions = get_close_matches(
            guess,
            words,
            n=1,
            cutoff=0.8
        )

        if suggestions:
            print(f"Did you mean '{suggestions[0]}'?\n")
        else:
            print("I don't know this word.\n")
        continue

    if guess in previous_guesses:
        print("You've already guessed that word.\n")
        continue

    previous_guesses.add(guess)

    rank = int(ranks[word_to_index[guess]])
    guess_history.append({"word": guess, "rank": rank})

    color = get_color(rank)
    print(f"{color}Rank: {rank:,} / {len(words):,}")

    if rank < best_rank:
        best_rank = rank
        print(f"{Fore.CYAN}New personal best!")

    if guess == answer:
        save_game(completed=True)
        print(
            f"\n{Fore.GREEN}You found it in "
            f"{len(guess_history)} guesses!"
        )
        break

    display_history()
