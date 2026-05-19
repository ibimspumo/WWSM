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

export type JokerKind = "fifty" | "audience" | "phone" | "chat";

export interface AudienceVotes {
  0: number;
  1: number;
  2: number;
  3: number;
}

// Live-Stimmen aus dem Webhook-Server (Chat-Joker).
// `counts` ist die absolute Anzahl Stimmen pro Antwortposition A/B/C/D.
// `total` ist die Anzahl eindeutiger User (= Summe der counts).
export interface ChatVotes {
  counts: [number, number, number, number];
  total: number;
}
