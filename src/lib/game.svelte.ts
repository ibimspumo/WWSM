import type { AnswerIndex, AudienceVotes, ChatVotes, JokerKind, Phase, Question } from "./types";
import { PRIZE_LADDER, safeFallback } from "./prizeLadder";
import { questionStore } from "./questionStore.svelte";
import { settings } from "./settings.svelte";
import { audio, variantForLevel } from "./audio.svelte";
import { invoke } from "@tauri-apps/api/core";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tauri-Commands stillschweigend kapseln — im Vite-Dev (kein Tauri-Kontext)
// werfen invoke()-Calls; das soll die App-Logik nicht crashen lassen.
async function tauri(cmd: string, args?: Record<string, unknown>) {
  try {
    await invoke(cmd, args);
  } catch (e) {
    // außerhalb von Tauri (oder vor Setup) ignorieren
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      console.warn(`invoke(${cmd}) fehlgeschlagen:`, e);
    }
  }
}

export interface GameSnapshot {
  phase: Phase;
  currentLevelIndex: number;
  question: Question | null;
  selectedAnswer: AnswerIndex | null;
  lockedAnswer: AnswerIndex | null;
  removedAnswers: AnswerIndex[];
  audienceVotes: AudienceVotes | null;
  audienceRevealAt: number | null;
  phoneHint: string | null;
  jokersUsed: JokerKind[];
  chatVotes: ChatVotes;
  chatRevealAt: number | null;
  finalAmount: number;
  showQuestionOverlay: boolean;
  showJokersOverlay: boolean;
  showLadderOverlay: boolean;
  showJokerEffectOverlay: boolean;
  editMode: boolean;
}

const ZERO_CHAT: ChatVotes = { counts: [0, 0, 0, 0], total: 0 };

class GameState {
  phase = $state<Phase>("menu");
  currentLevelIndex = $state(0);
  question = $state<Question | null>(null);
  selectedAnswer = $state<AnswerIndex | null>(null);
  lockedAnswer = $state<AnswerIndex | null>(null);
  removedAnswers = $state<Set<AnswerIndex>>(new Set());
  audienceVotes = $state<AudienceVotes | null>(null);
  audienceRevealAt = $state<number | null>(null);
  phoneHint = $state<string | null>(null);

  jokersUsed = $state<Set<JokerKind>>(new Set());
  /** Snapshot des Joker-Stands beim Laden der aktuellen Frage — für Skip-Refund. */
  private jokersUsedBeforeQuestion: JokerKind[] = [];
  /** IDs (siehe questionStore) der bereits in dieser Session gestellten Fragen. */
  seenQuestions = $state<Set<string>>(new Set());
  /** ID der aktuellen Frage — für die History und damit nicht-shuffled erkennbar. */
  currentQuestionId = $state<string | null>(null);

  chatVotes = $state<ChatVotes>({ counts: [0, 0, 0, 0], total: 0 });
  chatRevealAt = $state<number | null>(null);

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
      audienceRevealAt: this.audienceRevealAt,
      phoneHint: this.phoneHint,
      jokersUsed: [...this.jokersUsed],
      chatVotes: this.chatVotes,
      chatRevealAt: this.chatRevealAt,
      finalAmount: this.finalAmount,
      showQuestionOverlay: this.showQuestionOverlay,
      showJokersOverlay: this.showJokersOverlay,
      showLadderOverlay: this.showLadderOverlay,
      showJokerEffectOverlay: this.showJokerEffectOverlay,
      editMode: this.editMode,
    };
  }

  /** Vom Webhook-Server gepushte Stimmen übernehmen. */
  applyChatVotes(v: ChatVotes) {
    this.chatVotes = v;
  }

  async startGame() {
    this.phase = "loading";
    this.currentLevelIndex = 0;
    this.jokersUsed = new Set();
    this.seenQuestions = new Set();
    this.finalAmount = 0;
    this.chatVotes = ZERO_CHAT;
    this.chatRevealAt = null;
    audio.stopAll();
    audio.play("intro");
    await this.loadNextQuestion();
  }

  async loadNextQuestion() {
    this.phase = "loading";
    this.selectedAnswer = null;
    this.lockedAnswer = null;
    this.removedAnswers = new Set();
    this.audienceVotes = null;
    this.audienceRevealAt = null;
    this.phoneHint = null;
    this.chatRevealAt = null;
    this.chatVotes = ZERO_CHAT;

    const level = this.currentLevelIndex + 1;
    if (!questionStore.loaded) await questionStore.load();
    const picked = questionStore.pickRandomForLevel(level, this.seenQuestions);

    if (!picked) {
      console.warn(`Keine Fragen verfügbar für Stufe ${level}`);
      this.phase = "menu";
      return;
    }

    this.seenQuestions.add(picked.id);
    this.currentQuestionId = picked.id;
    this.jokersUsedBeforeQuestion = [...this.jokersUsed];

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

    // History persistieren (fire-and-forget — kein Block der UI)
    questionStore.recordAsked(picked.id, picked.q, level).catch((e) => {
      console.warn("History-Persist fehlgeschlagen:", e);
    });

    this.phase = "question";
    // Hintergrund-Loop für aktuellen Stufenbereich.
    audio.startBed(`bed-${variantForLevel(level)}`);
    // 3s-Puffer: Stimmen, die noch zur alten Frage gehören, werden verworfen.
    tauri("webhook_arm_question", { bufferSeconds: 3.0 });
  }

  /**
   * Aktuelle Frage überspringen — neue Frage aus derselben Preisstufe ziehen.
   * Joker, die nur für die geskipte Frage eingesetzt wurden, werden zurückerstattet.
   * Die geskipte Frage bleibt in `seenQuestions`, damit sie nicht direkt wiederkommt.
   */
  async skipQuestion() {
    if (this.phase !== "question") return;
    this.jokersUsed = new Set(this.jokersUsedBeforeQuestion);
    await this.loadNextQuestion();
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
    audio.play("lock-in");
    // Voting für diese Frage einfrieren
    tauri("webhook_disarm_question");
  }

  reveal() {
    if (this.phase !== "locked" || this.lockedAnswer === null || !this.question) return;
    this.phase = "reveal";
    const correct = this.lockedAnswer === this.question.correct;
    const variant = variantForLevel(this.currentLevelIndex + 1);
    // Bed stoppen, Sting drüberlegen (während der 1.8s-Dramatik-Pause).
    audio.stopBed();
    audio.play(correct ? `correct-${variant}` : `wrong-${variant}`);
    setTimeout(() => {
      if (correct) {
        if (this.currentLevelIndex >= PRIZE_LADDER.length - 1) {
          this.finalAmount = this.currentStep.amount;
          this.phase = "won-game";
          audio.play("win-1");
        } else {
          this.phase = "won-level";
          // Sicherheitsstufe erreicht? → extra Sting (500€ = safety-1, 16.000€ = safety-2).
          if (this.currentStep.safe) {
            const idx = PRIZE_LADDER.filter((s) => s.safe).indexOf(this.currentStep);
            audio.play(idx >= 1 ? "safety-2" : "safety-1");
          }
        }
      } else {
        this.finalAmount = safeFallback(this.currentLevelIndex);
        this.phase = "lost";
        audio.play("outro");
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
    audio.stopBed();
    audio.play("win-1");
    tauri("webhook_disarm_question");
  }

  // ===== Joker =====

  useFiftyFifty() {
    if (!this.canUseJoker || !this.question || this.jokersUsed.has("fifty")) return;
    this.jokersUsed.add("fifty");
    audio.play("joker-fifty");
    const wrong: AnswerIndex[] = [0, 1, 2, 3].filter(
      (i) => i !== this.question!.correct,
    ) as AnswerIndex[];
    const shuffled = shuffle(wrong);
    this.removedAnswers = new Set([shuffled[0], shuffled[1]]);
  }

  useAudience() {
    if (!this.canUseJoker || !this.question || this.jokersUsed.has("audience")) return;
    this.jokersUsed.add("audience");
    audio.play("joker-audience");
    const correct = this.question.correct;
    const available: AnswerIndex[] = [0, 1, 2, 3].filter(
      (i) => !this.removedAnswers.has(i as AnswerIndex),
    ) as AnswerIndex[];

    // Bias der richtigen Antwort — Werte stammen aus den Balancing-Settings
    const correctBias = Math.max(
      settings.audienceFloor,
      settings.audienceBaseBias - this.currentLevelIndex * settings.audienceLevelDecay,
    );
    const votes: AudienceVotes = { 0: 0, 1: 0, 2: 0, 3: 0 };

    let remaining = 100;
    if (available.includes(correct)) {
      const correctVotes = Math.round(
        100 * (correctBias + (Math.random() - 0.5) * settings.audienceVariance),
      );
      votes[correct] = Math.max(
        settings.audienceMinCap,
        Math.min(settings.audienceMaxCap, correctVotes),
      );
      remaining -= votes[correct];
    }

    const others = shuffle(available.filter((i) => i !== correct));

    // Optional: „Zweit-Favorit"-Muster (echte WWM-Optik)
    if (others.length >= 2 && Math.random() < settings.audienceSecondFavoriteChance) {
      const second = others[0];
      const shareMin = settings.audienceSecondFavoriteShareMin;
      const shareMax = Math.max(shareMin, settings.audienceSecondFavoriteShareMax);
      const secondShare = Math.round(remaining * (shareMin + Math.random() * (shareMax - shareMin)));
      votes[second] = secondShare;
      remaining -= secondShare;
      const rest = others.slice(1);
      rest.forEach((i, idx) => {
        if (idx === rest.length - 1) {
          votes[i] = Math.max(0, remaining);
        } else {
          const v = Math.floor(Math.random() * (remaining + 1));
          votes[i] = v;
          remaining -= v;
        }
      });
    } else {
      others.forEach((i, idx) => {
        if (idx === others.length - 1) {
          votes[i] = Math.max(0, remaining);
        } else {
          const v = Math.floor(Math.random() * (remaining + 1));
          votes[i] = v;
          remaining -= v;
        }
      });
    }

    this.audienceVotes = votes;
    this.audienceRevealAt = Date.now() + 4500;
  }

  usePhone() {
    if (!this.canUseJoker || !this.question || this.jokersUsed.has("phone")) return;
    this.jokersUsed.add("phone");
    audio.play("joker-phone");
    const confidence = Math.max(
      settings.phoneFloor,
      settings.phoneBaseConfidence - this.currentLevelIndex * settings.phoneLevelDecay,
    );
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
    const certain = confidence > settings.phoneCertainThreshold && tipsCorrect;
    const label = ["A", "B", "C", "D"][pick];
    this.phoneHint = certain
      ? `Ich bin mir ziemlich sicher: Antwort ${label}.`
      : `Ich tippe auf ${label}, aber ganz sicher bin ich nicht.`;
  }

  /**
   * Chat-Joker: enthüllt das laufende Chat-Voting im Joker-Effekt-Overlay.
   * Stimmen werden bereits seit Frage-Start gesammelt; der Joker schaltet nur
   * die Sichtbarkeit frei und löst die Einlauf-Animation aus.
   */
  useChat() {
    if (!this.canUseJoker || this.jokersUsed.has("chat")) return;
    this.jokersUsed.add("chat");
    this.chatRevealAt = Date.now() + 1200;
  }

  backToMenu() {
    this.phase = "menu";
    this.question = null;
    this.currentQuestionId = null;
    this.selectedAnswer = null;
    this.lockedAnswer = null;
    this.removedAnswers = new Set();
    this.audienceVotes = null;
    this.audienceRevealAt = null;
    this.phoneHint = null;
    this.chatVotes = ZERO_CHAT;
    this.chatRevealAt = null;
    audio.stopAll();
    tauri("webhook_reset_session");
  }
}

export const game = new GameState();
