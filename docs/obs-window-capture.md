# OBS Window Capture für Tauri 2 (WebView2) – Multi-Window Overlays

Recherchestand: Mai 2026. Ziel: 3 transparente Overlay-Fenster + 1 Hauptfenster, jedes einzeln in OBS auf Windows aufnehmbar.

## 1. OBS Window Capture Modi (Windows)

- **Automatic**: OBS wählt selbst; bei WebView2/Chromium-Fenstern meist WGC. Für reproduzierbare Captures explizit setzen, nicht „Automatic".
- **BitBlt (Windows 7)**: Arbeitet auf Window-DC-Ebene. Liefert **schwarzes Bild bei Hardware-Acceleration** (Chrome/WebView2). Bekanntes Problem. Quellen: [OBS Forum – Black Screen Chrome](https://obsproject.com/forum/threads/black-screen-when-capturing-chrome-window.46617/), [OBS Forum – HW Accel](https://obsproject.com/forum/threads/screen-recording-woes-black-screen-issue-with-browser-hardware-acceleration.172210/).
- **Windows Graphics Capture (WGC)**: Arbeitet auf Compositor-Ebene, captured hardware-accelerated Apps korrekt, behandelt nicht-rechteckige/transparente Fenster richtig. **Empfohlen für WebView2/Tauri.** Quelle: [OBS Forum – BitBlt vs WGC](https://obsproject.com/forum/threads/for-capture-method-whats-the-difference-between-bitblt-and-windows-graphics-capture.127687/).
- **Transparenz**: OBS hat einen "Allow Transparency"-Toggle (PR [#4964](https://github.com/obsproject/obs-studio/pull/4964)). Mit WGC + "Allow Transparency" werden transparente Bereiche im Alpha-Kanal erhalten.

## 2. WGC Anforderungen

- **Windows 10 1903+** zwingend (neue WinRT-API). Empfehlung 2026: Win10 20H2 oder Win11 für stabilen WGC-Pfad. Quelle: [OBS Display Capture 27.0](https://obsproject.com/forum/threads/display-capture-method-source-in-version-27-0.144476/).
- **Capture Cursor**: für reine Overlay-Aufnahme deaktivieren (sonst flackernder Software-Cursor im Frame).
- **Client Area**: aktiviert = nur Inhalt ohne Titlebar/Rand. Bei Tauri-Overlays mit `decorations: false` egal, sicherheitshalber an. Bekannter alter Bug [#4614](https://github.com/obsproject/obs-studio/issues/4614).
- **Force SDR**: aktivieren wenn HDR-Display vorhanden, sonst washed-out. Quelle: [PR #7974](https://github.com/obsproject/obs-studio/pull/7974).
- **Yellow Border**: ab Win11 22H2 entfernt; ältere Builds zeigen ihn.

## 3. Tauri 2 + WebView2 Spezifika

- **`transparent: true` Inkonsistenz v1 vs v2** – in v2 funktioniert Transparenz unter Windows nicht in allen Konstellationen: [Issue #8308](https://github.com/tauri-apps/tauri/issues/8308). macOS-Build verliert Transparenz nach DMG-Bundling: [#13415](https://github.com/tauri-apps/tauri/issues/13415).
- **HW-Acceleration deaktivieren** (nur Notlösung, falls WGC nicht verfügbar): `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu` als Env-Var, oder via `tauri.conf.json` `windows.additionalBrowserArgs`. **Microsoft warnt**: WebView2-Flags sind nicht supported/long-term-stabil ([Edge Docs](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/webview-features-flags)). Issue [#4438](https://github.com/tauri-apps/tauri/issues/4438) Feature-Request, noch kein nativer Config-Switch. **Empfehlung: nicht deaktivieren** – stattdessen OBS auf WGC stellen.
- **`additionalBrowserArgs` Falle**: kann zu Blank-Screen bei zusätzlichen Webview-Windows führen ([#13092](https://github.com/tauri-apps/tauri/issues/13092)) – also vorsichtig dosieren.
- **Content-Protection** (`set_content_protected(true)`) führt zu schwarzem Bild beim Screen-Sharing/Capture ([#14189](https://github.com/tauri-apps/tauri/issues/14189)) – darf für Overlays NICHT gesetzt sein.

## 4. Tauri 2 Permissions (verifiziert gegen [Core Permissions Docs](https://v2.tauri.app/reference/acl/core-permissions/))

- `core:webview:allow-create-webview-window` (neues Overlay-Window erstellen)
- `core:window:allow-show`, `core:window:allow-hide`
- `core:window:allow-set-size`, `core:window:allow-set-position`
- `core:window:allow-set-always-on-top`
- `core:window:allow-set-skip-taskbar`
- Optional: `core:webview:allow-set-webview-size`, `core:webview:allow-set-webview-position` (wenn Webview innerhalb Window unabhängig bewegt wird).
- Default-Sets reichen NICHT – Permissions sind „deny by default" ([Discussion #11706](https://github.com/tauri-apps/tauri/discussions/11706)).

## 5. Best Practices für stabile OBS-Captures

- **Eindeutige Window-Titel UND Labels**: OBS matched primär per HWND+Title+Class. Bei Neustart bleibt HWND nicht stabil, Title schon → ohne eindeutigen Title verliert OBS die Source. Label (Tauri-intern) braucht man für eigene `get_webview_window()`-Calls.
- **Mindestgröße**: WGC liefert bei sehr kleinen Fenstern (<100px) gelegentlich Frame-Drops; >= 100×100 empfehlen.
- **`skipTaskbar: true`**: WGC sieht das Fenster weiterhin (Capture läuft über HWND, nicht Shell). BitBlt ebenfalls. Kein Capture-Impact, aber OBS-„Window"-Dropdown listet skipTaskbar-Fenster manchmal nicht – Workaround: einmal Taskbar an lassen, Source anlegen, dann ausblenden.
- **`alwaysOnTop`**: kein Impact auf Capture (Compositor-basiert). Nur visuell relevant.
- **`decorations: false` + `transparent: true`** ist der übliche Overlay-Mix; mit WGC + "Allow Transparency" sauber capturebar.

## 6. macOS / Linux (kurz)

- **macOS**: OBS 30+ nutzt **ScreenCaptureKit** ([Guide](https://obsproject.com/kb/macos-permissions-guide)). Ab macOS 15 Sequoia **monatliche Re-Authorization** der Screen-Recording-Permission. Tauri-Multi-Window läuft auf macOS für Dev/Test, aber `transparent` ist nach Bundling buggy ([#13415](https://github.com/tauri-apps/tauri/issues/13415)).
- **Linux**: Wayland → PipeWire-Portal (OBS PipeWire-Source); X11 BitBlt-Äquivalent via XComposite. Transparenz nur unter Compositor.

## Checkliste „OBS captured jedes Fenster einzeln"

**`tauri.conf.json`** (pro Overlay-Window):
- eindeutiger `label` UND eindeutiger, statischer `title`
- `transparent: true`, `decorations: false`
- `width`/`height` >= 100
- `skipTaskbar: true` (erst nach erstem OBS-Source-Anlegen empfohlen)
- KEIN `set_content_protected(true)`
- `additionalBrowserArgs` nur wenn nötig, NICHT `--disable-gpu` setzen

**`src-tauri/capabilities/default.json`** `permissions`:
- `core:webview:allow-create-webview-window`
- `core:window:allow-show`
- `core:window:allow-hide`
- `core:window:allow-set-size`
- `core:window:allow-set-position`
- `core:window:allow-set-always-on-top`
- `core:window:allow-set-skip-taskbar`

**OBS-Setup je Source**:
- Method: **Windows Graphics Capture**
- Window: per eindeutigem Title wählen
- Capture Cursor: aus
- Client Area: an
- Allow Transparency: an
- Force SDR: bei HDR-Monitor an
