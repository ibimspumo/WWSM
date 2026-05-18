# CLAUDE.md

Instruktionen für Claude Code beim Arbeiten an diesem Repo.

## Was ist WWSM

Tauri 2 + Svelte 5 Desktop-App. Streamer-Overlay-Quiz im „Wer wird Millionär"-Stil, deutsch. Spawnt **fünf separate Fenster**: ein opakes Steuerungs-Fenster und vier transparente Overlays, die in OBS einzeln als „Fensteraufnahme"-Quellen aufnehmbar sind. App-Sprache **Deutsch only**. Plattformen: **Windows (primär, NSIS)** + macOS (Dev).

Verwandtes Projekt im Nachbarverzeichnis `../RunMMO` — gleicher Stack-Stil (Tauri 2 + Svelte + transparente Overlays), gleicher Maintainer. Wenn dort Patterns existieren (z. B. Icon-Gen via OpenRouter), übernimm sie.

## Stack

- **Tauri 2** (Rust + WebView2 auf Windows, WKWebView auf Mac)
- **Frontend**: **Svelte 5** (Runes — `$state`, `$derived`, `$effect`, `$props`) + SvelteKit + adapter-static + TypeScript + Vite
- **Plugins**: `tauri-plugin-updater`, `tauri-plugin-process`, `tauri-plugin-window-state`, `tauri-plugin-opener`
- **State-Sync zwischen Fenstern**: Tauri-Events (`@tauri-apps/api/event` `emit`/`listen`)
- **Persistenz von Fenster-Position/-Größe**: `tauri-plugin-window-state` (automatisch, keine API-Calls nötig)
- **Fragen-Datenbank**: JSON-Dateien pro Preisstufe in `static/questions/level-XX.json`, gebaut aus `data/seed.json` + `data/external/*.json` durch `scripts/seed-questions.mjs`

## Architektur

**Fünf Fenster**, alle in `src-tauri/tauri.conf.json` deklariert:

| Label                  | Titel (für OBS)               | Route                    | Transparent | Decorations | Inhalt              |
| ---------------------- | ----------------------------- | ------------------------ | ----------- | ----------- | ------------------- |
| `control`              | `WWSM — Steuerung`            | `/`                      | nein        | OS-native   | Game-Steuerung      |
| `overlay-question`     | `WWSM Overlay — Frage`        | `/overlay/question`      | ja          | none (custom titlebar) | Frage + Antworten   |
| `overlay-jokers`       | `WWSM Overlay — Joker`        | `/overlay/jokers`        | ja          | none (custom titlebar) | 4 Joker-Orbs        |
| `overlay-ladder`       | `WWSM Overlay — Geldleiter`   | `/overlay/ladder`        | ja          | none (custom titlebar) | 15-Stufen-Leiter    |
| `overlay-joker-effect` | `WWSM Overlay — Joker-Effekt` | `/overlay/joker-effect`  | ja          | none (custom titlebar) | Publikum / Telefon  |

State-Verantwortung:

- **`control`-Fenster** besitzt die einzige Instanz von `GameState` (`src/lib/game.svelte.ts`).
- Bei jeder Mutation (Antwort wählen, Sperren, Joker, …) wird via `$effect` ein `wwsm:state`-Event mit dem kompletten Snapshot emittiert.
- **Overlay-Fenster** lauschen auf `wwsm:state` und spiegeln den Snapshot in ihre eigene `OverlayState`-Instanz (`src/lib/overlayState.svelte.ts`).
- Beim Mount sendet jedes Overlay zusätzlich `wwsm:request-state`, damit es bei spätem Start nicht ohne Daten dasteht. Control antwortet mit aktuellem Snapshot.
- Overlay-Fenster mutieren **nie** State zurück; alle Eingaben gehen durch das Steuerfenster.

Datenfluss: `Click in control/+page.svelte → game.method() (Svelte 5 Rune mutation) → $effect emit("wwsm:state") → Overlay listen → overlayState.apply() → Re-render`.

## Verzeichnislayout

```
.
├── data/
│   ├── seed.json              Master-Liste handverlesener Fragen (mit Umlauten)
│   └── external/              vom Build aggregiert (gitignored)
│       └── dekuel.json        ~4.500 Fragen aus Dekuel/daily-quiz
├── docs/
│   └── obs-window-capture.md  Recherche-Bericht (OBS WGC, WebView2, Tauri-Permissions)
├── research/, research-v2/    Roh-Klone der Recherche-Quellen (gitignored)
├── scripts/
│   ├── generate-seed.py       Erzeugt data/seed.json (Python umgeht JSON-Quote-Hölle)
│   ├── seed-questions.mjs     Mergt seed + external, splittet in 15 Level-Files
│   ├── adapters/
│   │   └── dekuel.py          Konverter für Dekuel/daily-quiz → data/external/dekuel.json
│   └── generate-app-icon.mjs  OpenRouter gpt-5-image (Transparenz)
├── src/
│   ├── app.html               Body mit `background: transparent`
│   ├── lib/
│   │   ├── types.ts           Question, AnswerIndex, Phase, JokerKind, …
│   │   ├── prizeLadder.ts     PRIZE_LADDER (15 Stufen + Sicherheitsstufen-Logik)
│   │   ├── questions.ts       loadLevelQuestions(level) via fetch
│   │   ├── game.svelte.ts     class GameState — DIE Quelle der Wahrheit (nur control)
│   │   ├── overlayState.svelte.ts  Spiegelt Snapshot via Event in Overlays
│   │   ├── bus.ts             Wrapper um @tauri-apps/api/event
│   │   └── components/
│   │       └── OverlayTitleBar.svelte  Custom-Titelleiste mit Drag + Hide
│   └── routes/
│       ├── +layout.ts         ssr=false, prerender=true
│       ├── +layout.svelte     Wählt control- vs. overlay-Background
│       ├── +page.svelte       Steuerungs-UI (Cockpit)
│       └── overlay/
│           ├── question/+page.svelte
│           ├── jokers/+page.svelte
│           ├── ladder/+page.svelte
│           └── joker-effect/+page.svelte
├── src-tauri/
│   ├── tauri.conf.json        5 Fenster, NSIS-Config, Updater-Endpoint
│   ├── capabilities/default.json  Permissions für alle 5 Windows
│   ├── icons/                 source.png (1024×1024 transparent) + alle gen-Größen
│   ├── src/lib.rs             Plugin-Initialisierung
│   └── Cargo.toml
├── static/
│   └── questions/             Build-Output (15 level-XX.json, gitignored)
├── .github/workflows/release.yml   NSIS-Build bei Tag-Push
└── .env                       OPENROUTER_API_KEY (gitignored, optional — fällt auf ../RunMMO/.env zurück)
```

## Wichtige Files

- **`src-tauri/tauri.conf.json`** — Fenster-Konfiguration. Wenn ein neues Overlay dazukommt: hier eintragen UND `capabilities/default.json` `windows`-Array UND `src/routes/+page.svelte` Toggle ergänzen UND `GameSnapshot`/`OverlayState` erweitern.
- **`src/lib/game.svelte.ts`** — Bei jeder neuen Spiel-Aktion: Methode hier, dann automatisch via `$effect` an Overlays gepusht. Neue State-Felder: zusätzlich in `GameSnapshot` UND `OverlayState.apply()`.
- **`src/lib/components/OverlayTitleBar.svelte`** — Wird in jedem Overlay-Page importiert. Sichtbarkeit kommt aus `overlayState.editMode`. Buttons rufen `getCurrentWindow().minimize()` / `.hide()`.

## Build/Dev-Workflow

```bash
npm install
npm run tauri dev          # öffnet alle 5 Fenster
npm run check              # svelte-check (MUSS sauber sein)
npm run build              # nur Frontend-Build
npm run tauri build -- --bundles nsis,updater   # Windows
npm run tauri build -- --bundles app,dmg        # macOS (Dev)
```

**Permissions-Tauri-v2-Falle**: identifier sind `core:window:allow-X`, `core:webview:allow-X` etc., **nicht** `window:X`. Verifizierte Liste in [`docs/obs-window-capture.md`](docs/obs-window-capture.md) §4.

## Fragen-Pipeline

Schema pro Eintrag:

```ts
{ level: 1..15, q: string, a: [A,B,C,D], correct: 0|1|2|3, source?: string, category?: string }
```

**Master**: `data/seed.json` (handverlesen, korrekte Umlaute). **Externe**: `data/external/*.json` (gleiche Struktur).

Beim Build (`node scripts/seed-questions.mjs`) wird gemergt, deduppt nach Frage-Text und in `static/questions/level-XX.json` gesplittet. Die App lädt zur Laufzeit nur die Datei der aktuellen Stufe via `fetch`.

**Neue externe Quellen einbauen**: Adapter unter `scripts/adapters/<quelle>.py` schreiben, der ins obige Schema konvertiert und nach `data/external/<quelle>.json` schreibt. Difficulty-Mapping siehe `dekuel.py` (`BASE_MAPPING = [1, 2, 4, 5, 7, 8, 10, 11, 13, 15]` + stabile Hash-Jitter ±1).

## OBS-Spezifikationen (Windows)

Vollständig in [`docs/obs-window-capture.md`](docs/obs-window-capture.md). Kurzfassung:

- OBS-Modus **Windows Graphics Capture (WGC)**, NICHT BitBlt (WebView2 → schwarzes Bild).
- „Allow Transparency" anhaken.
- `set_content_protected(true)` **NIE** setzen ([Issue 14189](https://github.com/tauri-apps/tauri/issues/14189)).
- Eindeutige `title` + `label` pro Fenster (OBS matched per HWND+Title).
- Mindest-Fenstergröße ≥ 100×100.
- `skipTaskbar: false` (Default jetzt) — sonst sieht OBS das Fenster manchmal nicht im Dropdown.

## Updater-Setup

1. Signatur-Keypair: `npm run tauri signer generate -- -w ~/.tauri/wwsm.key`
2. Public Key → `tauri.conf.json` → `plugins.updater.pubkey` (ersetzt `REPLACE_WITH_TAURI_UPDATER_PUBKEY`).
3. Private Key + Passwort als GitHub-Secrets `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. Endpoint in `tauri.conf.json` an echten Repo-Pfad anpassen (Default-Platzhalter: `github.com/agent-z-de/wwsm`).
5. Release-Trigger: `git tag v0.1.x && git push origin v0.1.x` → `.github/workflows/release.yml` baut NSIS + `latest.json`.

## Icon-Generierung

`scripts/generate-app-icon.mjs` ruft OpenRouter mit `openai/gpt-5-image` (Modell, das transparente PNGs liefert). Key aus lokaler `.env` oder Fallback `../RunMMO/.env`.

```bash
node scripts/generate-app-icon.mjs            # schreibt src-tauri/icons/source.png (1024×1024 RGBA)
npm run tauri icon src-tauri/icons/source.png # generiert alle Plattform-Größen
```

Pattern parallel zu `RunMMO/scripts/generate-icon-library.mjs`.

## Bekannte Stolperfallen

- **Tauri-v2-Permissions sind „deny by default"** — neue Window-API-Calls brauchen entsprechende Permission in `capabilities/default.json`. Liste der Bestätigten siehe `docs/obs-window-capture.md`.
- **`tauri-plugin-window-state` überschreibt `tauri.conf.json`-Defaults** beim 2.+ Start. Wenn du Default-Größen änderst und der User sieht's nicht: User muss `window-state.json` löschen (README erklärt wo).
- **JSON-Quote-Hölle bei deutschen Anführungszeichen**: schreib Seed-Fragen NIE direkt in JSON. Stattdessen `scripts/generate-seed.py` (Python kümmert sich ums Escaping).
- **adapter-static + SvelteKit-Routes**: `+layout.ts` hat `prerender = true`. Routen ohne `+page.ts` werden trotzdem gebaut (Fallback-Mechanismus). Build erzeugt `build/overlay/<name>.html` (nicht `/index.html`) — funktioniert mit Tauri's Asset-Loader.
- **Hexagon-Form**: in `overlay/question/+page.svelte` ist die WWM-Form via verschachtelten `clip-path: polygon(…)` realisiert (Outer = Border-Farbe, Inner = Inhalt). Bei Änderungen an der Form beide Polygons gleichmäßig anpassen, sonst „blutet" die Border aus.
- **Umlaute**: `ikiruneo/JoseSabater millionaire_bench` hatten 689 Fragen aber **transliterierte Umlaute** (Daene statt Däne). Wurde verworfen. Aktive Hauptquelle: **Dekuel/daily-quiz** (~4.500 Fragen, ~88 % Umlauten).

## App-Sprache

**Deutsch only**, auch in Code-Kommentaren und Variablen-Namen wo es um Domäne geht (`useFiftyFifty`, `useAudience`, etc. — bewusst englische Methoden-Namen, aber UI- und Frage-Texte alles deutsch).

## App-Version hochsetzen

Vor einem Release Tag:
- `package.json` → `version`
- `src-tauri/tauri.conf.json` → `version`
- `src-tauri/Cargo.toml` → `version`

Alle drei müssen synchron sein, sonst meckert `tauri build`.
