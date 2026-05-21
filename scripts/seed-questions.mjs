#!/usr/bin/env node
// Generiert static/questions/level-XX.json aus einer Master-Liste (siehe data/seed.json)
// und optionalen externen Quellen (data/external/*.json).
//
// Quellen-Format pro Eintrag: { level: 1..15, q, a: [A,B,C,D], correct: 0..3, source?, category? }
//
// Aufruf:  node scripts/seed-questions.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const seedPath = join(root, "data", "seed.json");
const externalDir = join(root, "data", "external");
const outDir = join(root, "static", "questions");

function hasUmlaut(text) {
  return /[äöüÄÖÜß]/.test(text);
}

function normKey(q) {
  return q.q.trim().toLowerCase().replace(/\s+/g, " ");
}

// Tokenisierung für Ähnlichkeitsvergleich (Umlaute bleiben erhalten)
function tokens(text) {
  return text.toLowerCase().replace(/[^a-z0-9äöüß ]/g, " ").split(/\s+/).filter(Boolean);
}

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

// Bucket-Key für Fast-Dubletten: gleiches Antwort-Set + gleiche Korrekt-Antwort (stufen-unabhängig).
// Innerhalb eines Buckets gelten Fragen mit hoher Text-Überlappung als dieselbe (nur umformulierte) Frage.
function answerKey(q) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
  return [
    q.a.map(norm).slice().sort().join("|"),
    norm(q.a[q.correct] ?? ""),
  ].join("##");
}

const NEAR_DUP_THRESHOLD = 0.5;

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function loadAll() {
  const all = [];

  if (existsSync(seedPath)) {
    const seed = loadJson(seedPath);
    for (const q of seed) all.push({ ...q, source: q.source ?? "seed" });
    console.log(`  · Seed:     ${seed.length} Fragen`);
  } else {
    console.warn(`  ! Seed nicht gefunden: ${seedPath}`);
  }

  if (existsSync(externalDir)) {
    for (const file of readdirSync(externalDir).filter((f) => f.endsWith(".json"))) {
      const ext = loadJson(join(externalDir, file));
      const items = Array.isArray(ext) ? ext : [];
      for (const q of items) all.push({ ...q, source: q.source ?? file });
      console.log(`  · ${file}: ${items.length} Fragen`);
    }
  }

  return all;
}

function validate(q, idx) {
  const errs = [];
  if (typeof q.level !== "number" || q.level < 1 || q.level > 15) errs.push(`level=${q.level}`);
  if (typeof q.q !== "string" || !q.q) errs.push("q leer");
  if (!Array.isArray(q.a) || q.a.length !== 4 || q.a.some((x) => typeof x !== "string" || !x)) errs.push("a ungültig");
  if (typeof q.correct !== "number" || q.correct < 0 || q.correct > 3) errs.push(`correct=${q.correct}`);
  if (errs.length) console.warn(`  ! [${idx}] Fragefehler: ${errs.join(", ")} — wird übersprungen`);
  return errs.length === 0;
}

function main() {
  console.log("Build questions:");
  const all = loadAll();
  const valid = all.filter(validate);

  // Dedupliziere nach Frage-Text (case-insensitive)
  const seen = new Set();
  const unique = [];
  for (const q of valid) {
    const k = normKey(q);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(q);
  }
  console.log(`  · gültig: ${valid.length}, einzigartig: ${unique.length}`);

  // Fast-Dubletten entfernen: umformulierte Fragen mit identischem Antwort-Set
  // und identischer Korrekt-Antwort. Auch stufenübergreifend — es bleibt jeweils
  // die Variante der niedrigsten (leichtesten) Preisstufe erhalten.
  const byLevelAsc = [...unique].sort((a, b) => a.level - b.level);
  const buckets = new Map();
  const deduped = [];
  let nearDropped = 0;
  for (const q of byLevelAsc) {
    const bk = answerKey(q);
    const bucket = buckets.get(bk) ?? [];
    const qt = tokens(q.q);
    if (bucket.some((prev) => jaccard(qt, prev) >= NEAR_DUP_THRESHOLD)) {
      nearDropped++;
      continue;
    }
    bucket.push(qt);
    buckets.set(bk, bucket);
    deduped.push(q);
  }
  console.log(`  · Fast-Dubletten entfernt: ${nearDropped}, verbleibend: ${deduped.length}`);

  // Umlaut-Statistik
  const withUmlaut = deduped.filter((q) => hasUmlaut(q.q) || q.a.some(hasUmlaut)).length;
  console.log(`  · mit Umlauten in Frage/Antwort: ${withUmlaut} / ${deduped.length}`);

  // Gruppieren nach level
  const byLevel = new Map();
  for (let i = 1; i <= 15; i++) byLevel.set(i, []);
  for (const q of deduped) byLevel.get(q.level).push({
    q: q.q,
    a: q.a,
    correct: q.correct,
    source: q.source,
    category: q.category,
  });

  mkdirSync(outDir, { recursive: true });
  for (const [level, items] of byLevel) {
    const padded = String(level).padStart(2, "0");
    const out = join(outDir, `level-${padded}.json`);
    writeFileSync(out, JSON.stringify(items, null, 2) + "\n", "utf-8");
    console.log(`  → level-${padded}.json: ${items.length} Fragen`);
  }
  console.log("Fertig.");
}

main();
