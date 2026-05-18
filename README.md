<div align="center">
  <img src="src-tauri/icons/icon.png" width="128" alt="WWSM App-Icon" />

  # Wer Wird Stream Millionär

  **Das „Wer wird Millionär?"-Quiz als OBS-Overlay für deinen Stream.**
</div>

---

WWSM ist eine kleine Windows-/Mac-App, mit der du auf deinem Stream eine vollwertige WWM-Show spielen kannst. Frage, Antworten, Geldleiter und Joker erscheinen in **einzelnen transparenten Fenstern**, die du in OBS frei platzieren und mischen kannst — wie eigene Quellen. Du selbst steuerst alles in einem zweiten, ganz normalen Programmfenster („Steuerung").

Über **4.500 deutsche Fragen** mit Umlauten sind direkt eingebaut, sauber auf die 15 Preisstufen verteilt.

## Wie es aussieht

- **Frage-Fenster** — die klassische blau-gold leuchtende WWM-Anzeige mit Frage oben und A/B/C/D unten, inklusive Diamant-Marker, Gold-Markierung für die gewählte Antwort, Grün/Rot beim Auflösen.
- **Geldleiter-Fenster** — alle 15 Stufen von 50 € bis 1 Mio €, aktuelle Stufe leuchtet golden, Sicherheitsstufen (500 € / 16.000 €) sind hervorgehoben.
- **Joker-Fenster** — vier Orbs für 50:50, Telefon, Publikum und Tausch. Verbrauchte Joker werden durchgestrichen.
- **Joker-Effekt-Fenster** — zeigt beim Publikumsjoker das Balkendiagramm bzw. beim Telefonjoker den Tipp.
- **Steuerungs-Fenster** — dein „Cockpit" abseits des Streams: Spiel starten, Antworten anklicken, Joker auslösen, sperren, auflösen.

## Installation

### Windows

1. Auf der [Release-Seite](https://github.com/agent-z-de/wwsm/releases/latest) den NSIS-Installer (`.exe`) herunterladen.
2. Doppelklicken und durchklicken — installiert pro Benutzer, kein Admin nötig.
3. App starten — der erste Start öffnet alle 5 Fenster auf einmal.

### macOS

Aktuell nur als Dev-Build verfügbar. Wenn du das brauchst, melde dich.

## OBS einrichten

Du brauchst pro Overlay eine **Fensteraufnahme** in OBS.

1. **Quelle hinzufügen → Fensteraufnahme**.
2. Bei „Fenster" eines dieser vier auswählen:

   | Anzeigename in OBS              | Zeigt              |
   | ------------------------------- | ------------------ |
   | `WWSM Overlay — Frage`          | Frage + 4 Antworten |
   | `WWSM Overlay — Geldleiter`     | Die 15 Preise      |
   | `WWSM Overlay — Joker`          | Die 4 Joker-Symbole |
   | `WWSM Overlay — Joker-Effekt`   | Publikum / Telefon |

3. **Wichtig**: Bei „Erfassungs-Methode" **„Windows 10 (1903 und neuer)"** bzw. **„Windows Graphics Capture (WGC)"** wählen. (Standard „BitBlt" liefert bei dieser Art App ein schwarzes Bild.)
4. **„Transparenz zulassen" aktivieren**, damit der Hintergrund durchscheint.
5. **„Kursor erfassen" deaktivieren**, sonst sieht man deinen Mauszeiger im Stream.

Wiederholen für jedes der vier Overlay-Fenster. Position und Größe jeder Overlay-Quelle in OBS einfach so anpassen, wie du willst.

## So spielst du

### Im „Bearbeiten-Modus" (Standard nach dem ersten Start)

Jedes Overlay hat oben eine **kleine schwarze Titelleiste** mit `–`- und `×`-Knopf:

- **Greifen**: Klick + Ziehen → Fenster verschieben
- **×**: Fenster verstecken (Steuerung holt es zurück)
- **–**: Minimieren

So baust du dein Layout zurecht. **Größe und Position aller Fenster bleiben beim nächsten Start erhalten.**

### Im „Stream-Modus"

Wenn alles passt: im Steuerfenster den Schalter **„Bearbeiten-Modus"** ausschalten. Die Titelleisten verschwinden — die Overlays sind dann clean und stream-tauglich.

### Während der Show

Alles passiert im **Steuerungs-Fenster**:

1. **„Spiel starten"** → erste Frage erscheint im Frage-Overlay.
2. Klicke auf die Antwort, die du tippst → sie wird gold markiert (für Zuschauer sichtbar).
3. **„Antwort sperren"** → die Antwort blinkt golden, das Frage-Fenster zeigt sie als endgültig.
4. **„Auflösen"** → richtige Antwort wird grün, falsche (wenn du falsch warst) rot.
5. **„Nächste Frage"** → eine Stufe weiter.
6. Wenn du raus willst: **„Aussteigen (Geld nehmen)"**.

### Joker

| Joker            | Was passiert                                                                          |
| ---------------- | ------------------------------------------------------------------------------------- |
| **50:50**        | Zwei falsche Antworten verschwinden aus dem Frage-Overlay.                            |
| **Telefon 📞**   | Ein Tipp erscheint im Joker-Effekt-Overlay (z. B. „Ich tippe auf B").                 |
| **Publikum 👥**  | Ein Balkendiagramm A/B/C/D erscheint im Joker-Effekt-Overlay, Mehrheit leuchtet gold. |
| **Tausch 🔁**    | Die aktuelle Frage wird durch eine neue derselben Stufe ersetzt.                      |

Telefon- und Publikumsjoker werden **simuliert** — die App rät plausibel, mit sinkender Trefferquote auf höheren Stufen.

## Tipps für saubere Streams

- **Bearbeiten-Modus aus**, bevor du auf Sendung gehst.
- **OBS-Mauszeiger deaktivieren** in jeder Fensteraufnahme.
- **Mauszeiger weg vom Overlay**: lege das Steuerfenster auf einem zweiten Monitor ab, dann bist du nie mit dem Cursor in der Aufnahme.
- **Aussteigen-Knopf bewusst nutzen** — das ist die ehrliche Endung, wenn du dir unsicher bist.

## Updates

Im Steuerfenster oben rechts: **„Auf Updates prüfen"**. Falls eine neue Version verfügbar ist, lädt und installiert sie sich selbst, dann startet die App neu.

## Probleme / Feedback

Issues bitte auf GitHub melden. Wenn das Frage-Overlay in OBS schwarz ist: Erfassungs-Methode auf **WGC** stellen (siehe oben). Wenn die Geldleiter abgeschnitten wirkt: einfach das Fenster ziehen, höhere Stufen passen sich automatisch an.

Wenn du das Fenster-Layout komplett zurücksetzen willst, lösch diese Datei (App muss zu sein):

```
Windows: %APPDATA%\de.agent-z.wwsm\window-state.json
macOS:   ~/Library/Application Support/de.agent-z.wwsm/window-state.json
```

---

<sub>Wer Wird Stream Millionär ist ein Fan-Projekt und steht in keinerlei Verbindung zur Sendung „Wer wird Millionär?" oder Endemol Shine / RTL.</sub>
