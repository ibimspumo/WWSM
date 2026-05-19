// Zentrale, persistierte App-Einstellungen.
// Neue Settings-Slices: hier Feld ergänzen, in serialize() + reset() spiegeln,
// dann im jeweiligen Tab-Component verdrahten.

const STORAGE_KEY = "wwsm:settings:v1";

class Settings {
  // ============== Telefonjoker ==============
  /** Trefferchance auf Stufe 1 (0..1) */
  phoneBaseConfidence = $state(0.95);
  /** Abnahme pro Stufe (Prozentpunkte / 100) */
  phoneLevelDecay = $state(0.04);
  /** Mindest-Trefferchance (0..1) */
  phoneFloor = $state(0.4);
  /** Confidence-Schwelle, ab der „ziemlich sicher" gesagt wird */
  phoneCertainThreshold = $state(0.7);

  // ============== Publikumsjoker ==============
  /** Bias auf Stufe 1 (0..1) */
  audienceBaseBias = $state(0.82);
  /** Abnahme pro Stufe (Prozentpunkte / 100) */
  audienceLevelDecay = $state(0.03);
  /** Mindest-Bias (0..1) */
  audienceFloor = $state(0.4);
  /** Streuung um den Bias-Wert (±, 0..0.5) */
  audienceVariance = $state(0.12);
  /** Min. angezeigte Stimmen für die korrekte Antwort (%) */
  audienceMinCap = $state(28);
  /** Max. angezeigte Stimmen für die korrekte Antwort (%) */
  audienceMaxCap = $state(92);
  /** Wahrscheinlichkeit, dass eine falsche Antwort als Zweit-Favorit gebündelt wird (0..1) */
  audienceSecondFavoriteChance = $state(0.55);
  /** Untere Anteilsgrenze des Zweit-Favoriten an den Restprozenten (0..1) */
  audienceSecondFavoriteShareMin = $state(0.4);
  /** Obere Anteilsgrenze des Zweit-Favoriten an den Restprozenten (0..1) */
  audienceSecondFavoriteShareMax = $state(0.8);

  // ============== Webhook / Chat-Joker ==============
  /** Port des lokalen Webhook-Servers */
  webhookPort = $state(8080);
  /** Webhook-Server aktiv */
  webhookEnabled = $state(true);
  /** An alle Interfaces binden (LAN), nicht nur localhost */
  webhookBindAll = $state(false);

  // ============== Steuerfenster ==============
  /** Streamer-Spickzettel: korrekte Antwort im Steuerfenster markieren (Overlays unbeeinflusst) */
  revealCorrectInControl = $state(false);

  // ============== (Hier weitere Settings-Slices anhängen) ==============

  serialize() {
    return {
      phoneBaseConfidence: this.phoneBaseConfidence,
      phoneLevelDecay: this.phoneLevelDecay,
      phoneFloor: this.phoneFloor,
      phoneCertainThreshold: this.phoneCertainThreshold,
      audienceBaseBias: this.audienceBaseBias,
      audienceLevelDecay: this.audienceLevelDecay,
      audienceFloor: this.audienceFloor,
      audienceVariance: this.audienceVariance,
      audienceMinCap: this.audienceMinCap,
      audienceMaxCap: this.audienceMaxCap,
      audienceSecondFavoriteChance: this.audienceSecondFavoriteChance,
      audienceSecondFavoriteShareMin: this.audienceSecondFavoriteShareMin,
      audienceSecondFavoriteShareMax: this.audienceSecondFavoriteShareMax,
      webhookPort: this.webhookPort,
      webhookEnabled: this.webhookEnabled,
      webhookBindAll: this.webhookBindAll,
      revealCorrectInControl: this.revealCorrectInControl,
    };
  }

  load() {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, unknown>;
      const self = this as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(data)) {
        if (k in self && (typeof v === "number" || typeof v === "boolean")) {
          self[k] = v;
        }
      }
    } catch {
      // ignorieren — fehlerhafte Settings → Defaults
    }
  }

  save() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
    } catch {
      // ignorieren — Quota-Fehler etc.
    }
  }

  reset() {
    this.phoneBaseConfidence = 0.95;
    this.phoneLevelDecay = 0.04;
    this.phoneFloor = 0.4;
    this.phoneCertainThreshold = 0.7;
    this.audienceBaseBias = 0.82;
    this.audienceLevelDecay = 0.03;
    this.audienceFloor = 0.4;
    this.audienceVariance = 0.12;
    this.audienceMinCap = 28;
    this.audienceMaxCap = 92;
    this.audienceSecondFavoriteChance = 0.55;
    this.audienceSecondFavoriteShareMin = 0.4;
    this.audienceSecondFavoriteShareMax = 0.8;
    this.webhookPort = 8080;
    this.webhookEnabled = true;
    this.webhookBindAll = false;
    this.revealCorrectInControl = false;
  }
}

export const settings = new Settings();
