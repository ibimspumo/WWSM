// Generiert das App-Icon via OpenRouter (openai/gpt-5-image, unterstützt Transparenz).
//
// Voraussetzung:
//   - OPENROUTER_API_KEY in lokaler .env ODER in der Umgebung
//   - Fallback: liest aus ../RunMMO/.env, falls vorhanden (Dev-Komfort)
//
// Aufruf:
//   node scripts/generate-app-icon.mjs              → schreibt src-tauri/icons/source.png
//   node scripts/generate-app-icon.mjs --prompt "…" → eigener Prompt
//
// Anschließend Icon-Pipeline füttern:
//   npm run tauri icon src-tauri/icons/source.png

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src-tauri", "icons", "source.png");

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(path.join(ROOT, ".env"));
loadEnvFile(path.resolve(ROOT, "..", "RunMMO", ".env")); // Dev-Komfort

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("ERROR: OPENROUTER_API_KEY nicht gesetzt (.env oder env-Var).");
  process.exit(1);
}

const args = process.argv.slice(2);
const promptIdx = args.indexOf("--prompt");
const PROMPT = promptIdx >= 0
  ? args[promptIdx + 1]
  : `App icon for a quiz/game-show streamer overlay called "Wer Wird Stream Millionär".
1024×1024 px, fully transparent background (alpha channel), centered subject, no padding text.
Subject: a single bold elongated hexagonal medallion in the iconic German "Wer wird Millionär"
style — deep midnight-blue gradient interior (#0a2363 → #050f33), bright cyan/light-blue outer
rim glowing softly, a thin gold inner border. Centered inside the medallion: a large golden
question mark "?" in gleaming polished gold (#ffcf48 → #b07815), with subtle outer glow.
Photoreal game-show aesthetic, soft volumetric blue glow around the whole shape.
No background, no shadows on the canvas, no extra decoration, no text labels, no letters
besides the question mark, no logos. Pure icon, crisp edges, suitable for use as a Windows/macOS
app icon at small sizes (16×16 still readable).`;

const body = {
  model: process.env.IMAGE_MODEL || "openai/gpt-5-image",
  messages: [{ role: "user", content: PROMPT }],
  modalities: ["image", "text"],
};

console.log("→ OpenRouter gpt-5-image …");
const t0 = Date.now();
const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/local/wwsm",
    "X-Title": "WWSM App Icon",
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
  process.exit(2);
}

const data = await res.json();
const images = data?.choices?.[0]?.message?.images;
if (!images?.length) {
  console.error("Keine Bilder zurückgekommen:", JSON.stringify(data).slice(0, 500));
  process.exit(3);
}
const imageUrl = images[0]?.image_url?.url || images[0]?.url;
if (!imageUrl) {
  console.error("Bild-URL nicht im erwarteten Format");
  process.exit(4);
}

let buf;
const m = imageUrl.match(/^data:(image\/[\w+-]+);base64,(.+)$/);
if (m) {
  buf = Buffer.from(m[2], "base64");
} else {
  const r = await fetch(imageUrl);
  if (!r.ok) {
    console.error(`Image fetch ${r.status}`);
    process.exit(5);
  }
  buf = Buffer.from(await r.arrayBuffer());
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);
const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`✓ ${OUT} (${(buf.length / 1024).toFixed(1)} KB, ${dt}s)`);
console.log();
console.log("Nächster Schritt:");
console.log("  npm run tauri icon src-tauri/icons/source.png");
