// Zentraler Store für Fragen: lädt Build-Defaults aus static/questions/level-XX.json,
// merged sie mit User-Overrides + Additions + Tombstones aus appDataDir (via Rust-Commands),
// und führt eine persistente History gestellter Fragen.
//
// Stabile ID-Strategie:
//   - Build-Default-Fragen: "b:" + normKey(q-text)   (matched dedup-Logik in seed-questions.mjs)
//   - User-Additions:       "u:" + uuid              (vom Frontend generiert)
//
// Damit überlebt eine Override-Zuordnung sogar Build-Rebuilds, solange der Frage-Text
// gleich bleibt. Ändert sich der Frage-Text im Seed, wird die alte ID zur Waise (das ist
// akzeptabel — sehr seltener Fall).

import { invoke } from "@tauri-apps/api/core";
import { base } from "$app/paths";
import type { AnswerIndex, Question } from "./types";
import { PRIZE_LADDER } from "./prizeLadder";

export interface StoredQuestion extends Question {
  id: string;
  /** Stufe 1..15 */
  level: number;
  /** "default" = aus Build kommt | "user" = vom User angelegt */
  origin: "default" | "user";
  /** true, wenn vom User editiert (nur bei origin=default möglich) */
  edited: boolean;
}

export interface HistoryEntry {
  id: string;
  q: string;
  level: number;
  askedAt: number;
}

interface UserQuestionsFile {
  overrides: Record<string, StoredQuestionPayload>;
  additions: StoredQuestionPayload[];
  tombstones: string[];
}

interface StoredQuestionPayload {
  id: string;
  level: number;
  q: string;
  a: [string, string, string, string];
  correct: AnswerIndex;
  source?: string;
  category?: string;
}

interface HistoryFile {
  entries: HistoryEntry[];
}

function normKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildDefaultId(qText: string): string {
  return `b:${normKey(qText)}`;
}

function newUserId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `u:${Date.now().toString(36)}-${rand}`;
}

async function fetchLevel(level: number): Promise<Question[]> {
  const padded = String(level).padStart(2, "0");
  const res = await fetch(`${base}/questions/level-${padded}.json`);
  if (!res.ok) return [];
  return (await res.json()) as Question[];
}

function inTauri(): boolean {
  return typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
}

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
  if (!inTauri()) return fallback as T;
  try {
    return (await invoke(cmd, args)) as T;
  } catch (e) {
    console.warn(`invoke(${cmd}) fehlgeschlagen:`, e);
    return fallback as T;
  }
}

class QuestionStore {
  defaultsByLevel = $state<Question[][]>([]);
  overrides = $state<Record<string, StoredQuestionPayload>>({});
  additions = $state<StoredQuestionPayload[]>([]);
  tombstones = $state<Set<string>>(new Set());
  history = $state<HistoryEntry[]>([]);
  loaded = $state(false);

  async load() {
    // Build-Defaults für alle 15 Stufen parallel
    const fetches = PRIZE_LADDER.map((step) => fetchLevel(step.level));
    const userFile = await safeInvoke<UserQuestionsFile>(
      "user_questions_load",
      undefined,
      { overrides: {}, additions: [], tombstones: [] },
    );
    const historyFile = await safeInvoke<HistoryFile>(
      "history_load",
      undefined,
      { entries: [] },
    );
    const defaults = await Promise.all(fetches);

    this.defaultsByLevel = defaults;
    this.overrides = userFile.overrides ?? {};
    this.additions = userFile.additions ?? [];
    this.tombstones = new Set(userFile.tombstones ?? []);
    this.history = historyFile.entries ?? [];
    this.loaded = true;
  }

  /** Alle Fragen einer Stufe (Defaults mit Overrides + User-Additions, ohne Tombstones). */
  questionsForLevel(level: number): StoredQuestion[] {
    const idx = level - 1;
    if (idx < 0 || idx >= this.defaultsByLevel.length) return [];
    const out: StoredQuestion[] = [];

    for (const q of this.defaultsByLevel[idx] ?? []) {
      const id = buildDefaultId(q.q);
      if (this.tombstones.has(id)) continue;
      const override = this.overrides[id];
      if (override) {
        out.push({
          id,
          level,
          q: override.q,
          a: override.a,
          correct: override.correct,
          source: override.source,
          category: override.category,
          origin: "default",
          edited: true,
        });
      } else {
        out.push({
          id,
          level,
          q: q.q,
          a: q.a,
          correct: q.correct,
          source: q.source,
          category: q.category,
          origin: "default",
          edited: false,
        });
      }
    }

    for (const a of this.additions) {
      if (a.level === level) {
        out.push({
          id: a.id,
          level,
          q: a.q,
          a: a.a,
          correct: a.correct,
          source: a.source,
          category: a.category,
          origin: "user",
          edited: false,
        });
      }
    }

    return out;
  }

  /** Alle Fragen aller Stufen (für globale Suche/Sortierung). */
  allQuestions(): StoredQuestion[] {
    const out: StoredQuestion[] = [];
    for (const step of PRIZE_LADDER) {
      out.push(...this.questionsForLevel(step.level));
    }
    return out;
  }

  /** Zählung pro Stufe für Übersicht. */
  countByLevel(): number[] {
    return PRIZE_LADDER.map((s) => this.questionsForLevel(s.level).length);
  }

  /** Bei origin=default → Override anlegen/aktualisieren. Bei origin=user → Addition mutieren. */
  async updateQuestion(updated: StoredQuestion): Promise<void> {
    const payload: StoredQuestionPayload = {
      id: updated.id,
      level: updated.level,
      q: updated.q,
      a: updated.a,
      correct: updated.correct,
      source: updated.source,
      category: updated.category,
    };

    if (updated.origin === "default") {
      this.overrides = { ...this.overrides, [updated.id]: payload };
    } else {
      this.additions = this.additions.map((a) => (a.id === updated.id ? payload : a));
    }
    await this.persistUserFile();
  }

  async addQuestion(level: number, q: string, a: [string, string, string, string], correct: AnswerIndex, category?: string): Promise<StoredQuestion> {
    const id = newUserId();
    const payload: StoredQuestionPayload = {
      id,
      level,
      q,
      a,
      correct,
      source: "user",
      category,
    };
    this.additions = [...this.additions, payload];
    await this.persistUserFile();
    return {
      id,
      level,
      q,
      a,
      correct,
      source: "user",
      category,
      origin: "user",
      edited: false,
    };
  }

  async deleteQuestion(q: StoredQuestion): Promise<void> {
    if (q.origin === "default") {
      const next = new Set(this.tombstones);
      next.add(q.id);
      this.tombstones = next;
      // Falls vorher ein Override existierte → mit-entfernen, wird sonst zur Karteileiche
      if (this.overrides[q.id]) {
        const { [q.id]: _drop, ...rest } = this.overrides;
        this.overrides = rest;
      }
    } else {
      this.additions = this.additions.filter((a) => a.id !== q.id);
    }
    await this.persistUserFile();
  }

  /** Editierte Default-Frage wieder zurück auf Build-Wert setzen. */
  async revertOverride(id: string): Promise<void> {
    if (!this.overrides[id]) return;
    const { [id]: _drop, ...rest } = this.overrides;
    this.overrides = rest;
    await this.persistUserFile();
  }

  /** Tombstone für eine Default-Frage zurücknehmen (wieder einblenden). */
  async restoreTombstone(id: string): Promise<void> {
    if (!this.tombstones.has(id)) return;
    const next = new Set(this.tombstones);
    next.delete(id);
    this.tombstones = next;
    await this.persistUserFile();
  }

  async recordAsked(id: string, q: string, level: number): Promise<void> {
    const entry: HistoryEntry = { id, q, level, askedAt: Date.now() };
    // Optimistisch lokal anhängen, Server schneidet auf Limit zu
    const result = await safeInvoke<HistoryFile>("history_append", { entry }, { entries: [...this.history, entry] });
    this.history = result.entries ?? [];
  }

  async clearHistory(): Promise<void> {
    await safeInvoke("history_clear");
    this.history = [];
  }

  /** Letzte askedAt-Zeit für eine ID, oder null. */
  lastAskedAt(id: string): number | null {
    let latest: number | null = null;
    for (const e of this.history) {
      if (e.id === id && (latest === null || e.askedAt > latest)) latest = e.askedAt;
    }
    return latest;
  }

  /** Beim Spielstart aufgerufen: liefert eine zufällige nicht-getombstonete Frage und persistiert nichts. */
  pickRandomForLevel(level: number, exclude: Set<string>): StoredQuestion | undefined {
    const pool = this.questionsForLevel(level);
    const fresh = pool.filter((q) => !exclude.has(q.id));
    const source = fresh.length > 0 ? fresh : pool;
    if (source.length === 0) return undefined;
    return source[Math.floor(Math.random() * source.length)];
  }

  private async persistUserFile(): Promise<void> {
    const data: UserQuestionsFile = {
      overrides: this.overrides,
      additions: this.additions,
      tombstones: [...this.tombstones],
    };
    await safeInvoke("user_questions_save", { data });
  }
}

export const questionStore = new QuestionStore();
