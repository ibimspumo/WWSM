import type { PrizeStep } from "./types";

// Klassische deutsche WWM-Leiter (15 Stufen, Sicherheitsstufen bei 500 € und 16.000 €).
// Wenn die Recherche eine andere Stufung empfiehlt, hier anpassen — die Daten-Dateien
// `static/questions/level-XX.json` müssen entsprechend benannt sein.
export const PRIZE_LADDER: PrizeStep[] = [
  { level: 1, amount: 50, label: "50 €", safe: false },
  { level: 2, amount: 100, label: "100 €", safe: false },
  { level: 3, amount: 200, label: "200 €", safe: false },
  { level: 4, amount: 300, label: "300 €", safe: false },
  { level: 5, amount: 500, label: "500 €", safe: true },
  { level: 6, amount: 1_000, label: "1.000 €", safe: false },
  { level: 7, amount: 2_000, label: "2.000 €", safe: false },
  { level: 8, amount: 4_000, label: "4.000 €", safe: false },
  { level: 9, amount: 8_000, label: "8.000 €", safe: false },
  { level: 10, amount: 16_000, label: "16.000 €", safe: true },
  { level: 11, amount: 32_000, label: "32.000 €", safe: false },
  { level: 12, amount: 64_000, label: "64.000 €", safe: false },
  { level: 13, amount: 125_000, label: "125.000 €", safe: false },
  { level: 14, amount: 500_000, label: "500.000 €", safe: false },
  { level: 15, amount: 1_000_000, label: "1.000.000 €", safe: false },
];

export function safeFallback(currentLevelIndex: number): number {
  for (let i = currentLevelIndex - 1; i >= 0; i--) {
    if (PRIZE_LADDER[i].safe) return PRIZE_LADDER[i].amount;
  }
  return 0;
}
