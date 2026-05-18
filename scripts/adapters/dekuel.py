#!/usr/bin/env python3
"""Konvertiert Dekuel/daily-quiz-Datensätze nach data/external/dekuel.json.

Quelle: https://github.com/Dekuel/daily-quiz
Input:  research-v2/Dekuel_daily_quiz/{leicht,schwer}/*.json
Schema: { category, questions: [{ question, choices: ['A: ...', 'B: ...', 'C: ...', 'D: ...'],
          correct_answer: 'A'|'B'|'C'|'D', explanation, difficulty: 1..10, topic, category }] }

Output: data/external/dekuel.json (List)
Schema pro Eintrag: { level: 1..15, q, a: [A,B,C,D], correct: 0..3, category, source }
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SRC_DIR = ROOT / "research-v2" / "Dekuel_daily_quiz"
OUT = ROOT / "data" / "external" / "dekuel.json"

# Difficulty 1..10 → WWM-Level 1..15. Wir verteilen breit (lineare Mappe + Hash-Jitter).
BASE_MAPPING = [1, 2, 4, 5, 7, 8, 10, 11, 13, 15]  # idx = difficulty-1

CHOICE_PREFIX_RE = re.compile(r"^[A-D]\s*[:\.\)\-]\s*", re.UNICODE)


def strip_prefix(choice: str) -> str:
    return CHOICE_PREFIX_RE.sub("", choice).strip()


def stable_jitter(question: str) -> int:
    """Pro Frage stabile -1/0/+1 Verschiebung, basierend auf Hash."""
    h = int(hashlib.md5(question.encode("utf-8")).hexdigest()[:8], 16)
    return (h % 3) - 1  # -1, 0, +1


def difficulty_to_level(difficulty: int, question: str) -> int:
    if not (1 <= difficulty <= 10):
        return 5  # Default für ungültige
    base = BASE_MAPPING[difficulty - 1]
    level = base + stable_jitter(question)
    return max(1, min(15, level))


def convert_question(entry: dict) -> dict | None:
    question = (entry.get("question") or "").strip()
    choices_raw = entry.get("choices") or []
    correct_letter = (entry.get("correct_answer") or "").strip().upper()
    difficulty = entry.get("difficulty")

    if not question or len(choices_raw) != 4 or correct_letter not in "ABCD":
        return None

    choices = [strip_prefix(c) for c in choices_raw]
    if any(not c for c in choices):
        return None

    if not isinstance(difficulty, int):
        return None

    return {
        "level": difficulty_to_level(difficulty, question),
        "q": question,
        "a": choices,
        "correct": "ABCD".index(correct_letter),
        "category": entry.get("category") or entry.get("topic") or "Allgemein",
        "source": "Dekuel/daily-quiz",
    }


def main() -> None:
    if not SRC_DIR.exists():
        raise SystemExit(f"Quelle nicht gefunden: {SRC_DIR}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    items: list[dict] = []
    seen: set[str] = set()

    files = sorted(SRC_DIR.rglob("*.json"))
    for file in files:
        try:
            data = json.loads(file.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  ! Skip {file}: {e}")
            continue

        questions = data.get("questions") if isinstance(data, dict) else None
        if not questions:
            continue

        kept_in_file = 0
        for q in questions:
            conv = convert_question(q)
            if not conv:
                continue
            key = conv["q"].strip().lower()
            if key in seen:
                continue
            seen.add(key)
            items.append(conv)
            kept_in_file += 1
        print(f"  · {file.relative_to(ROOT)}: {kept_in_file}/{len(questions)}")

    # Level-Statistik
    by_level: dict[int, int] = {}
    for it in items:
        by_level[it["level"]] = by_level.get(it["level"], 0) + 1
    print()
    print(f"Summe: {len(items)} Fragen aus {len(files)} Files")
    for lvl in range(1, 16):
        print(f"  Level {lvl:>2}: {by_level.get(lvl, 0)}")

    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nGeschrieben: {OUT}")


if __name__ == "__main__":
    main()
