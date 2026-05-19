import type { GameSnapshot } from "./game.svelte";
import { onState, requestState } from "./bus";
import { onStyle, requestStyle } from "./styleBus";
import { styling } from "./styling.svelte";
import { ensureFontsForValues } from "./fontLoader";
import type { AnswerIndex, AudienceVotes, ChatVotes, JokerKind, Phase, Question } from "./types";

class OverlayState {
  phase = $state<Phase>("menu");
  currentLevelIndex = $state(0);
  question = $state<Question | null>(null);
  selectedAnswer = $state<AnswerIndex | null>(null);
  lockedAnswer = $state<AnswerIndex | null>(null);
  removedAnswers = $state<AnswerIndex[]>([]);
  audienceVotes = $state<AudienceVotes | null>(null);
  audienceRevealAt = $state<number | null>(null);
  phoneHint = $state<string | null>(null);
  jokersUsed = $state<JokerKind[]>([]);
  chatVotes = $state<ChatVotes>({ counts: [0, 0, 0, 0], total: 0 });
  chatRevealAt = $state<number | null>(null);
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
    this.audienceRevealAt = s.audienceRevealAt;
    this.phoneHint = s.phoneHint;
    this.jokersUsed = s.jokersUsed;
    this.chatVotes = s.chatVotes;
    this.chatRevealAt = s.chatRevealAt;
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
  await onStyle((snap) => {
    styling.applySnapshot(snap);
    ensureFontsForValues(snap);
  });
  await requestState();
  await requestStyle();
}
