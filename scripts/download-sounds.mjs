#!/usr/bin/env node
// Lädt alle WWM-Original-Sounds aus dem Internet-Archive nach static/sounds/.
// Quelle: https://archive.org/details/WerWirdMillionaerSoundtracks
//
// Mapping: Original-Dateinamen mit Umlauten + Sonderzeichen werden in
// dateisystem- und URL-freundliche Slugs umbenannt (siehe SOUND_FILES).
// Die App lädt die Slugs zur Laufzeit via `/sounds/<slug>.mp3`.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "static", "sounds");

const BASE = "https://archive.org/download/WerWirdMillionaerSoundtracks";

// [Internet-Archive-Filename, lokaler Slug ohne Extension]
const SOUND_FILES = [
  ["Wer wird Millionär Soundtracks [1] - Intro-Sound.mp3", "intro"],
  ["Wer wird Millionär Soundtracks [2] - 50-500 €.mp3", "bed-50"],
  ["Wer wird Millionär Soundtracks [3] - 50-500 € [Antwort Falsch].mp3", "wrong-50"],
  ["Wer wird Millionär Soundtracks [4] - 50-500 € [Antwort Richtig].mp3", "correct-50"],
  ["Wer wird Millionär Soundtracks [5] - 1.000-16.000 €.mp3", "bed-1k"],
  ["Wer wird Millionär Soundtracks [6] - 1.000-16.000 € [Antwort Falsch].mp3", "wrong-1k"],
  ["Wer wird Millionär Soundtracks [7] - 1.000-16.000 € [Antwort Richtig].mp3", "correct-1k"],
  ["Wer wird Millionär Soundtracks [8] - 32.000-500.000 €.mp3", "bed-32k"],
  ["Wer wird Millionär Soundtracks [9] - 32.000-500.000 € [Antwort Falsch].mp3", "wrong-32k"],
  ["Wer wird Millionär Soundtracks [10] - 32.000-500.000 € [Antwort Richtig].mp3", "correct-32k"],
  ["Wer wird Millionär Soundtracks [11] - 1.000.000 €.mp3", "bed-1m"],
  ["Wer wird Millionär Soundtracks [12] - 1.000.000 € [Antwort Falsch].mp3", "wrong-1m"],
  ["Wer wird Millionär Soundtracks [13] - 1.000.000 € [Antwort Richtig].mp3", "correct-1m"],
  ["Wer wird Millionär Soundtracks [14] - 50_50 Joker.mp3", "joker-fifty"],
  ["Wer wird Millionär Soundtracks [15] - Telefonjoker.mp3", "joker-phone"],
  ["Wer wird Millionär Soundtracks [16] - Publikumsjoker.mp3", "joker-audience"],
  ["Wer wird Millionär Soundtracks [17] - Antwort Einloggen.mp3", "lock-in"],
  ["Wer wird Millionär Soundtracks [18] - Sicherheitsstufe 1.mp3", "safety-1"],
  ["Wer wird Millionär Soundtracks [19] - Sicherheitsstufe 2.mp3", "safety-2"],
  ["Wer wird Millionär Soundtracks [20] - Sound nach richtiger Antwort.mp3", "after-correct"],
  ["Wer wird Millionär Soundtracks [21] - Sound nach Auswahlrunde.mp3", "after-selection"],
  ["Wer wird Millionär Soundtracks [22] - Sound nach Sicherheitsstufe.mp3", "after-safety"],
  ["Wer wird Millionär Soundtracks [23] - Sound nach Spiel (Gewinn).mp3", "win-1"],
  ["Wer wird Millionär Soundtracks [24] - Sound nach Spiel (Gewinn) 2.mp3", "win-2"],
  ["Wer wird Millionär Soundtracks [25] - Outro-Sound.mp3", "outro"],
];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadOne(remote, slug) {
  const dest = path.join(OUT_DIR, `${slug}.mp3`);
  if (await exists(dest)) {
    const stat = await fs.stat(dest);
    if (stat.size > 1024) {
      console.log(`  ✓ ${slug}.mp3 (cached, ${(stat.size / 1024).toFixed(0)} KB)`);
      return { ok: true, cached: true };
    }
  }

  const url = `${BASE}/${encodeURIComponent(remote)}`;
  process.stdout.write(`  ⤓ ${slug}.mp3 … `);
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`FAIL (HTTP ${res.status})`);
    return { ok: false };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  console.log(`OK (${(buf.length / 1024).toFixed(0)} KB)`);
  return { ok: true };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Lade WWM-Sounds nach ${path.relative(ROOT, OUT_DIR)}/ …\n`);

  let okCount = 0;
  let failCount = 0;
  for (const [remote, slug] of SOUND_FILES) {
    const r = await downloadOne(remote, slug);
    if (r.ok) okCount++;
    else failCount++;
  }

  console.log(`\nFertig: ${okCount} OK, ${failCount} fehlgeschlagen.`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Download-Fehler:", e);
  process.exit(1);
});
