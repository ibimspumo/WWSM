export interface Question {
  q: string;
  a: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  source?: string;
  category?: string;
}

export interface PrizeStep {
  level: number;
  amount: number;
  label: string;
  safe: boolean;
}

export type AnswerIndex = 0 | 1 | 2 | 3;

export type Phase =
  | "menu"
  | "loading"
  | "question"
  | "locked"
  | "reveal"
  | "won-level"
  | "won-game"
  | "lost";

export type JokerKind = "fifty" | "audience" | "phone" | "swap";

export interface AudienceVotes {
  0: number;
  1: number;
  2: number;
  3: number;
}
