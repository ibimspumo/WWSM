import type { Question } from "./types";
import { base } from "$app/paths";

export async function loadLevelQuestions(level: number): Promise<Question[]> {
  const padded = String(level).padStart(2, "0");
  const url = `${base}/questions/level-${padded}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Konnte Fragen für Stufe ${level} nicht laden:`, res.status);
    return [];
  }
  return (await res.json()) as Question[];
}

export function pickRandom<T>(arr: T[], excludeIds: Set<string> = new Set()): T | undefined {
  if (arr.length === 0) return undefined;
  const filtered = excludeIds.size > 0
    ? arr.filter((_, i) => !excludeIds.has(String(i)))
    : arr;
  if (filtered.length === 0) return undefined;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
