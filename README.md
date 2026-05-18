# Wer Wird Stream Millionär (WWSM)

Streamer-Overlay-Quiz im Stil von „Wer wird Millionär", als Tauri 2 + Svelte 5 Desktop-App. Spawnt **vier separate Fenster**: ein opakes Steuerfenster und drei transparente Overlays, die in OBS einzeln als Fensterquellen aufnehmbar sind.

## Fenster (OBS Window Capture)

| Label                  | Titel (so erscheint es in OBS)        | Inhalt                                                |
| ---------------------- | ------------------------------------- | ----------------------------------------------------- |
| `control`              | `WWSM — Steuerung`                    | Opak. Spiel starten/steuern, Joker, Updater.          |
| `overlay-question`     | `WWSM Overlay — Frage`                | Transparent. Frage + 4 WWM-Hexagon-Antwortbuttons.    |
| `overlay-jokers`       | `WWSM Overlay — Joker`                | Transparent. 4 Joker-Orbs (Statusleiste).             |
| `overlay-ladder`       | `WWSM Overlay — Geldleiter`           | Transparent. 15-Stufen-Leiter, skaliert mit Höhe.     |
| `overlay-joker-effect` | `WWSM Overlay — Joker-Effekt`         | Transparent. Publikums-Balken / Telefon-Tipp-Bubble.  |

**In OBS:** _Quelle hinzufügen → Fensteraufnahme_ → den jeweiligen Titel auswählen. **Capture-Modus auf „Windows Graphics Capture (WGC)"** (nicht BitBlt!) — sonst gibt's bei WebView2 ein schwarzes Bild. „Allow Transparency" anhaken. Vollständige Setup-Notiz inkl. Stolperfallen: [docs/obs-window-capture.md](docs/obs-window-capture.md).

## Voraussetzungen

- Node 20+ und npm 10+
- Rust (stable) + Cargo — z.B. via `rustup`
- macOS für Mac-Dev / Windows für NSIS-Build

```bash
npm install
```

## Entwicklung

```bash
npm run tauri dev
```

Öffnet das Steuerfenster + die vier Overlay-Fenster.

**Fensterzustände werden persistiert:** Position, Größe und Maximized-Status jedes der 5 Fenster werden automatisch gespeichert (via `tauri-plugin-window-state`) und beim nächsten Start wiederhergestellt. Speicherort: `~/Library/Application Support/de.agent-z.wwsm/window-state.json` (macOS) bzw. `%APPDATA%\de.agent-z.wwsm\window-state.json` (Windows). Beim ersten Start gelten die Defaults aus `src-tauri/tauri.conf.json`; danach gewinnen die persistierten Werte.

## Fragen aktualisieren

Die handverlesene Master-Liste liegt in `data/seed.json` (75 Fragen mit Umlauten, 5 pro Preisstufe). Weitere Quellen kannst du als JSON-Dateien nach `data/external/` legen — gleiche Struktur. Beim Build wird alles zusammengeführt, dedupliziert und in 15 Dateien (`static/questions/level-01.json` … `level-15.json`) gesplittet.

```bash
node scripts/seed-questions.mjs
```

Format pro Eintrag:

```json
{
  "level": 5,
  "q": "In welchem Jahr fiel die Berliner Mauer?",
  "a": ["1987", "1989", "1990", "1991"],
  "correct": 1,
  "category": "Geschichte"
}
```

`correct` ist der Index (0–3) der richtigen Antwort in `a`.

> Für die Seed-Liste hilft `python3 scripts/generate-seed.py` — Python umgeht JSON-Quote-Probleme bei deutschen Anführungszeichen.

### Externe Datensätze einspielen

Adapter-Skripte unter `scripts/adapters/` konvertieren bekannte Open-Source-Quizfragen-Datensätze ins Schema und legen sie in `data/external/` ab. Beispiel: **Dekuel/daily-quiz** (~4.500 deutsche Fragen mit Umlauten, difficulty 1–10).

```bash
# 1. Quelle einmal klonen (liegt unter research-v2/, ist gitignored)
git clone https://github.com/Dekuel/daily-quiz.git research-v2/Dekuel_daily_quiz

# 2. Adapter ausführen → data/external/dekuel.json
python3 scripts/adapters/dekuel.py

# 3. Level-Dateien neu bauen
node scripts/seed-questions.mjs
```

Weitere Quellen aus der Recherche (siehe `research-v2/REPORT.md`, falls vom Agent erzeugt): `baber/multilingual_mmlu` (14k Fragen, MIT), `FullByte/quiz` (~4.3k), `daydaylx/geburtstagsquiz`, `nicoruti/quizfragen`. Adapter dafür kannst du analog zu `dekuel.py` schreiben.

## Build (lokal)

```bash
# Windows — NSIS-Installer + Updater-Artefakte
npm run tauri build -- --bundles nsis,updater

# macOS — .app und .dmg (Dev)
npm run tauri build -- --bundles app,dmg
```

## Auto-Updater

Der Updater fragt die GitHub-Release-URL aus `src-tauri/tauri.conf.json` (`plugins.updater.endpoints`) ab.

**Einmalig einrichten:**

1. Signatur-Keypair erzeugen:
   ```bash
   npm run tauri signer generate -- -w ~/.tauri/wwsm.key
   ```
2. Öffentlichen Schlüssel in `tauri.conf.json` unter `plugins.updater.pubkey` eintragen (ersetzt `REPLACE_WITH_TAURI_UPDATER_PUBKEY`).
3. Privaten Schlüssel als GitHub-Secret `TAURI_SIGNING_PRIVATE_KEY` hinterlegen (Inhalt von `~/.tauri/wwsm.key`); Passwort als `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. In `tauri.conf.json` die GitHub-URL an deinen Repo-Pfad anpassen (Default: `agent-z-de/wwsm`).

**Release-Flow:**

```bash
git tag v0.1.0
git push origin v0.1.0
```

Der GitHub-Actions-Workflow (`.github/workflows/release.yml`) baut den NSIS-Installer + `latest.json` und veröffentlicht sie als Draft-Release. Mac-Build ist im Workflow bewusst nicht enthalten (Dev-only); lokal mit `npm run tauri build -- --bundles app,dmg`.

## Joker

| Joker            | Funktion                                                             |
| ---------------- | -------------------------------------------------------------------- |
| 50:50            | 2 falsche Antworten werden ausgeblendet                              |
| Telefonjoker     | Simulierter Tipp; Trefferquote sinkt mit Stufe                       |
| Publikumsjoker   | Simulierte %-Verteilung; Mehrheit häufiger richtig auf niedrigen Stufen |
| Publikums-Tausch | Tauscht die Frage gegen eine neue derselben Stufe                    |

(Twitch-Chat-Integration für echten Publikumsjoker ist für eine spätere Iteration vorgesehen.)

## Projektstruktur

```
.
├── data/
│   ├── seed.json                # Master-Liste handverlesener Fragen
│   └── external/                # zusätzliche Quellen (optional, *.json)
├── docs/                        # Recherche-Notizen (OBS-WGC-Setup u.a.)
├── research/                    # Rohdaten aus Recherche (vom Build ignoriert)
├── scripts/
│   ├── generate-seed.py         # Python-Skript für sauberes seed.json
│   └── seed-questions.mjs       # Splittet seed.json → static/questions/level-XX.json
├── src/
│   ├── lib/                     # Game-State (Svelte 5 Runes), Bus, Types
│   └── routes/
│       ├── +page.svelte         # Steuerfenster
│       └── overlay/
│           ├── question/+page.svelte
│           ├── jokers/+page.svelte
│           └── ladder/+page.svelte
├── src-tauri/
│   ├── tauri.conf.json          # Fenster-Konfiguration (4 Windows)
│   ├── capabilities/default.json
│   └── src/lib.rs               # Plugins (Updater, Process, Opener)
├── static/questions/            # Build-Output (15 Dateien) — vom Skript erzeugt
└── .github/workflows/release.yml
```
