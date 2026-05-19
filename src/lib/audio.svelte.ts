// WWM-Sound-Engine — läuft nur im Steuerfenster.
// Spielt Original-Sounds aus `static/sounds/` (siehe scripts/download-sounds.mjs).
// Volume = settings.audioMaster * settings.audio<Category>Volume.
// Falls Sounds nicht heruntergeladen wurden: stillschweigend nichts abspielen
// (keine Konsolenflut, keine UI-Crashes).

import { settings } from "./settings.svelte";

export type SoundCategory =
  | "intro"
  | "outro"
  | "bed"
  | "lockIn"
  | "correct"
  | "wrong"
  | "safety"
  | "win"
  | "joker";

export type SoundKey =
  | "intro"
  | "outro"
  | "bed-50" | "bed-1k" | "bed-32k" | "bed-1m"
  | "wrong-50" | "wrong-1k" | "wrong-32k" | "wrong-1m"
  | "correct-50" | "correct-1k" | "correct-32k" | "correct-1m"
  | "lock-in"
  | "safety-1" | "safety-2"
  | "after-correct" | "after-selection" | "after-safety"
  | "win-1" | "win-2"
  | "joker-fifty" | "joker-phone" | "joker-audience";

// Mapping Sound → Kategorie (für Lautstärke-Routing).
const KEY_CATEGORY: Record<SoundKey, SoundCategory> = {
  "intro": "intro",
  "outro": "outro",
  "bed-50": "bed", "bed-1k": "bed", "bed-32k": "bed", "bed-1m": "bed",
  "wrong-50": "wrong", "wrong-1k": "wrong", "wrong-32k": "wrong", "wrong-1m": "wrong",
  "correct-50": "correct", "correct-1k": "correct", "correct-32k": "correct", "correct-1m": "correct",
  "lock-in": "lockIn",
  "safety-1": "safety", "safety-2": "safety",
  "after-correct": "correct", "after-selection": "lockIn", "after-safety": "safety",
  "win-1": "win", "win-2": "win",
  "joker-fifty": "joker", "joker-phone": "joker", "joker-audience": "joker",
};

/** Welchen Bed/Correct/Wrong-Variant zur aktuellen Stufe? */
export function variantForLevel(level1to15: number): "50" | "1k" | "32k" | "1m" {
  if (level1to15 >= 15) return "1m";
  if (level1to15 >= 11) return "32k";
  if (level1to15 >= 6) return "1k";
  return "50";
}

function categoryVolume(cat: SoundCategory): number {
  switch (cat) {
    case "intro": return settings.audioIntroMuted ? 0 : settings.audioIntroVolume;
    case "outro": return settings.audioOutroMuted ? 0 : settings.audioOutroVolume;
    case "bed": return settings.audioBedMuted ? 0 : settings.audioBedVolume;
    case "lockIn": return settings.audioLockInMuted ? 0 : settings.audioLockInVolume;
    case "correct": return settings.audioCorrectMuted ? 0 : settings.audioCorrectVolume;
    case "wrong": return settings.audioWrongMuted ? 0 : settings.audioWrongVolume;
    case "safety": return settings.audioSafetyMuted ? 0 : settings.audioSafetyVolume;
    case "win": return settings.audioWinMuted ? 0 : settings.audioWinVolume;
    case "joker": return settings.audioJokerMuted ? 0 : settings.audioJokerVolume;
  }
}

function effectiveVolume(key: SoundKey): number {
  if (settings.audioMuted) return 0;
  return Math.max(0, Math.min(1, settings.audioMaster * categoryVolume(KEY_CATEGORY[key])));
}

class AudioEngine {
  private cache = new Map<SoundKey, HTMLAudioElement>();
  /** laufende One-shots → ihr Key (für Live-Lautstärke-Update). */
  private playing = new Map<HTMLAudioElement, SoundKey>();
  private bedAudio: HTMLAudioElement | null = null;
  private bedKey: SoundKey | null = null;

  private getOrCreate(key: SoundKey): HTMLAudioElement | null {
    if (typeof Audio === "undefined") return null;
    let a = this.cache.get(key);
    if (!a) {
      a = new Audio(`/sounds/${key}.mp3`);
      a.preload = "auto";
      // Stillschweigend ignorieren wenn Datei fehlt — User hat ggf. download-sounds noch nicht laufen lassen.
      a.addEventListener("error", () => {}, { once: true });
      this.cache.set(key, a);
    }
    return a;
  }

  /** Spielt einen einmaligen Sound. Mehrere parallel sind erlaubt (clone-Trick). */
  play(key: SoundKey) {
    const base = this.getOrCreate(key);
    if (!base) return;
    const vol = effectiveVolume(key);
    if (vol <= 0) return;
    // Klone — erlaubt überlappendes Abspielen desselben Sounds.
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = vol;
    this.playing.set(node, key);
    node.addEventListener("ended", () => this.playing.delete(node), { once: true });
    node.play().catch(() => {
      // Autoplay-Policies o.ä. — leise ignorieren, kein User-Crash.
      this.playing.delete(node);
    });
  }

  /** Startet einen Loop. Wenn bereits derselbe Loop läuft: Volume aktualisieren. */
  startBed(key: SoundKey) {
    const audio = this.getOrCreate(key);
    if (!audio) return;
    if (this.bedAudio && this.bedKey === key) {
      this.bedAudio.volume = effectiveVolume(key);
      return;
    }
    this.stopBed();
    audio.loop = true;
    audio.volume = effectiveVolume(key);
    audio.currentTime = 0;
    this.bedAudio = audio;
    this.bedKey = key;
    audio.play().catch(() => {});
  }

  stopBed() {
    if (this.bedAudio) {
      this.bedAudio.pause();
      this.bedAudio.currentTime = 0;
      this.bedAudio = null;
      this.bedKey = null;
    }
  }

  /** Aktualisiert die Lautstärke aller gerade laufenden Sounds (für Live-Slider). */
  refreshVolumes() {
    if (this.bedAudio && this.bedKey) {
      this.bedAudio.volume = effectiveVolume(this.bedKey);
    }
    for (const [node, key] of this.playing) {
      node.volume = effectiveVolume(key);
    }
  }

  /** Stoppt alles (Loop + laufende One-shots). */
  stopAll() {
    this.stopBed();
    for (const node of this.playing.keys()) {
      try { node.pause(); } catch {}
    }
    this.playing.clear();
  }
}

export const audio = new AudioEngine();
