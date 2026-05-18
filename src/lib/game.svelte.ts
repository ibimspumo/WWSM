import type { AnswerIndex, AudienceVotes, JokerKind, Phase, Question } from "./types";
import { PRIZE_LADDER, safeFallback } from "./prizeLadder";
import { loadLevelQuestions } from "./questions";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GameSnapshot {
  phase: Phase;
  currentLevelIndex: number;
  question: Question | null;
  selectedAnswer: AnswerIndex | null;
  lockedAnswer: AnswerIndex | null;
  removedAnswers: AnswerIndex[];
  audienceVotes: AudienceVotes | null;
  phoneHint: string | null;
  jokersUsed: JokerKind[];
  finalAmount: number;
  showQuestionOverlay: boolean;
  showJokersOverlay: boolean;
  showLadderOverlay: boolean;
  showJokerEffectOverlay: boolean;
  editMode: boolean;
}

class GameState {
  phase = $state<Phase>("menu");
  currentLevelIndex = $state(0);
  question = $state<Question | null>(null);
  selectedAnswer = $state<AnswerIndex | null>(null);
  lockedAnswer = $state<AnswerIndex | null>(null);
  removedAnswers = $state<Set<AnswerIndex>>(new Set());
  audienceVotes = $state<AudienceVotes | null>(null);
  phoneHint = $state<string | null>(null);

  jokersUsed = $state<Set<JokerKind>>(new Set());
  seenQuestions = $state<Set<string>>(new Set());

  finalAmount = $state(0);

  showQuestionOverlay = $state(true);
  showJokersOverlay = $state(true);
  showLadderOverlay = $state(true);
  showJokerEffectOverlay = $state(true);
  editMode = $state(true);

  get currentStep() {
    return PRIZE_LADDER[this.currentLevelIndex];
  }

  get canUseJoker() {
    return this.phase === "question" && this.lockedAnswer === null;
  }

  serialize(): GameSnapshot {
    return {
      phase: this.phase,
      currentLevelIndex: this.currentLevelIndex,
      question: this.question,
      selectedAnswer: this.selectedAnswer,
      lockedAnswer: this.lockedAnswer,
      removedAnswers: [...this.removedAnswers],
      audienceVotes: this.audienceVotes,
      phoneHint: this.phoneHint,
      jokersUsed: [...this.jokersUsed],
      finalAmount: this.finalAmount,
      showQuestionOverlay: this.showQuestionOverlay,
      showJokersOverlay: this.showJokersOverlay,
      showLadderOverlay: this.showLadderOverlay,
      showJokerEffectOverlay: this.showJokerEffectOverlay,
      editMode: this.editMode,
    };
  }

  async startGame() {
    this.phase = "loading";
    this.currentLevelIndex = 0;
    this.jokersUsed = new Set();
    this.seenQuestions = new Set();
    this.finalAmount = 0;
    await this.loadNextQuestion();
  }

  async loadNextQuestion() {
    this.phase = "loading";
    this.selectedAnswer = null;
    this.lockedAnswer = null;
    this.removedAnswers = new Set();
    this.audienceVotes = null;
    this.phoneHint = null;

    const level = this.currentLevelIndex + 1;
    const pool = await loadLevelQuestions(level);

    const fresh = pool.filter((q) => !this.seenQuestions.has(q.q));
    const source = fresh.length > 0 ? fresh : pool;

    if (source.length === 0) {
      console.warn(`Keine Fragen verfügbar für Stufe ${level}`);
      this.phase = "menu";
      return;
    }

    const picked = source[Math.floor(Math.random() * source.length)];
    this.seenQuestions.add(picked.q);

    const tagged = picked.a.map((text, i) => ({ text, isCorrect: i === picked.correct }));
    const shuffled = shuffle(tagged);
    const newCorrect = shuffled.findIndex((t) => t.isCorrect) as AnswerIndex;

    this.question = {
      q: picked.q,
      a: shuffled.map((t) => t.text) as [string, string, string, string],
      correct: newCorrect,
      source: picked.source,
      category: picked.category,
    };

    this.phase = "question";
  }

  selectAnswer(idx: AnswerIndex) {
    if (this.phase !== "question") return;
    if (this.removedAnswers.has(idx)) return;
    this.selectedAnswer = idx;
  }

  lockIn() {
    if (this.phase !== "question" || this.selectedAnswer === null) return;
    this.lockedAnswer = this.selectedAnswer;
    this.phase = "locked";
  }

  reveal() {
    if (this.phase !== "locked" || this.lockedAnswer === null || !this.question) return;
    this.phase = "reveal";
    const correct = this.lockedAnswer === this.question.correct;
    setTimeout(() => {
      if (correct) {
        if (this.currentLevelIndex >= PRIZE_LADDER.length - 1) {
          this.finalAmount = this.currentStep.amount;
          this.phase = "won-game";
        } else {
          this.phase = "won-level";
        }
      } else {
        this.finalAmount = safeFallback(this.currentLevelIndex);
        this.phase = "lost";
      }
    }, 1800);
  }

  async nextLevel() {
    if (this.phase !== "won-level") return;
    this.currentLevelIndex += 1;
    await this.loadNextQuestion();
  }

  takeMoney() {
    if (this.phase !== "question" && this.phase !== "won-level") return;
    if (this.phase === "won-level") {
      this.finalAmount = this.currentStep.amount;
    } else {
      this.finalAmount = this.currentLevelIndex > 0
        ? PRIZE_LADDER[this.currentLevelIndex - 1].amount
        : 0;
    }
    this.phase = "won-game";
  }

  // ===== Joker =====

  useFiftyFifty() {
    if (!this.canUseJoker || !this.question || this.jokersUsed.has("fifty")) return;
    this.jokersUsed.add("fifty");
    const wrong: AnswerIndex[] = [0, 1, 2, 3].filter(
      (i) => i !== this.question!.correct,
    ) as AnswerIndex[];
    const shuffled = shuffle(wrong);
    this.removedAnswers = new Set([shuffled[0], shuffled[1]]);
  }

  useAudience() {
    if (!this.canUseJoker || !this.question || this.jokersUsed.has("audience")) return;
    this.jokersUsed.add("audience");
    const correct = this.question.correct;
    const available: AnswerIndex[] = [0, 1, 2, 3].filter(
      (i) => !this.removedAnswers.has(i as AnswerIndex),
    ) as AnswerIndex[];

    const correctBias = Math.max(0.35, 0.85 - this.currentLevelIndex * 0.035);
    const votes: AudienceVotes = { 0: 0, 1: 0, 2: 0, 3: 0 };

    let total = 100;
    if (available.includes(correct)) {
      const correctVotes = Math.round(
        total * (correctBias + (Math.random() - 0.5) * 0.1),
      );
      votes[correct] = Math.max(20, Math.min(95, correctVotes));
      total -= votes[correct];
    }
    const others = available.filter((i) => i !== correct);
    others.forEach((i, idx) => {
      if (idx === others.length - 1) {
        votes[i] = Math.max(0, total);
      } else {
        const v = Math.floor(Math.random() * total);
        votes[i] = v;
        total -= v;
      }
    });
    this.audienceVotes = votes;
  }

  usePhone() {
    if (!this.canUseJoker || !this.question || this.jokersUsed.has("phone")) return;
    this.jokersUsed.add("phone");
    const confidence = Math.max(0.4, 0.95 - this.currentLevelIndex * 0.04);
    const tipsCorrect = Math.random() < confidence;
    const available: AnswerIndex[] = [0, 1, 2, 3].filter(
      (i) => !this.removedAnswers.has(i as AnswerIndex),
    ) as AnswerIndex[];
    let pick: AnswerIndex;
    if (tipsCorrect && available.includes(this.question.correct)) {
      pick = this.question.correct;
    } else {
      const wrong = available.filter((i) => i !== this.question!.correct);
      pick = (wrong[Math.floor(Math.random() * wrong.length)] ?? available[0]);
    }
    const certain = confidence > 0.7 && tipsCorrect;
    const label = ["A", "B", "C", "D"][pick];
    this.phoneHint = certain
      ? `Ich bin mir ziemlich sicher: Antwort ${label}.`
      : `Ich tippe auf ${label}, aber ganz sicher bin ich nicht.`;
  }

  async useSwap() {
    if (!this.canUseJoker || this.jokersUsed.has("swap")) return;
    this.jokersUsed.add("swap");
    const level = this.currentLevelIndex + 1;
    const pool = await loadLevelQuestions(level);
    const fresh = pool.filter((q) => !this.seenQuestions.has(q.q));
    const source = fresh.length > 0 ? fresh : pool;
    if (source.length === 0) return;
    const picked = source[Math.floor(Math.random() * source.length)];
    this.seenQuestions.add(picked.q);

    const tagged = picked.a.map((text, i) => ({ text, isCorrect: i === picked.correct }));
    const shuffled = shuffle(tagged);
    const newCorrect = shuffled.findIndex((t) => t.isCorrect) as AnswerIndex;

    this.question = {
      q: picked.q,
      a: shuffled.map((t) => t.text) as [string, string, string, string],
      correct: newCorrect,
      source: picked.source,
      category: picked.category,
    };
    this.selectedAnswer = null;
    this.removedAnswers = new Set();
    this.audienceVotes = null;
    this.phoneHint = null;
  }

  backToMenu() {
    this.phase = "menu";
    this.question = null;
    this.selectedAnswer = null;
    this.lockedAnswer = null;
    this.removedAnswers = new Set();
    this.audienceVotes = null;
    this.phoneHint = null;
  }
}

export const game = new GameState();
