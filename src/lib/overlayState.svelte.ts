import type { GameSnapshot } from "./game.svelte";
import { onState, requestState } from "./bus";
import type { AnswerIndex, AudienceVotes, JokerKind, Phase, Question } from "./types";

class OverlayState {
  phase = $state<Phase>("menu");
  currentLevelIndex = $state(0);
  question = $state<Question | null>(null);
  selectedAnswer = $state<AnswerIndex | null>(null);
  lockedAnswer = $state<AnswerIndex | null>(null);
  removedAnswers = $state<AnswerIndex[]>([]);
  audienceVotes = $state<AudienceVotes | null>(null);
  phoneHint = $state<string | null>(null);
  jokersUsed = $state<JokerKind[]>([]);
  finalAmount = $state(0);
  showQuestionOverlay = $state(true);
  showJokersOverlay = $state(true);
  showLadderOverlay = $state(true);
  showJokerEffectOverlay = $state(true);
  editMode = $state(true);

  apply(s: GameSnapshot) {
    this.phase = s.phase;
    this.currentLevelIndex = s.currentLevelIndex;
    this.question = s.question;
    this.selectedAnswer = s.selectedAnswer;
    this.lockedAnswer = s.lockedAnswer;
    this.removedAnswers = s.removedAnswers;
    this.audienceVotes = s.audienceVotes;
    this.phoneHint = s.phoneHint;
    this.jokersUsed = s.jokersUsed;
    this.finalAmount = s.finalAmount;
    this.showQuestionOverlay = s.showQuestionOverlay;
    this.showJokersOverlay = s.showJokersOverlay;
    this.showLadderOverlay = s.showLadderOverlay;
    this.showJokerEffectOverlay = s.showJokerEffectOverlay;
    this.editMode = s.editMode;
  }
}

export const overlayState = new OverlayState();

let initialized = false;
export async function initOverlayListener() {
  if (initialized) return;
  initialized = true;
  await onState((s) => overlayState.apply(s));
  await requestState();
}
