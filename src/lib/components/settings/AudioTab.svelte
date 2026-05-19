<script lang="ts">
  import { settings } from "$lib/settings.svelte";
  import { audio } from "$lib/audio.svelte";
  import type { SoundKey } from "$lib/audio.svelte";

  // Live-Vorschau pro Kategorie: einen typischen Sound aus der Gruppe abspielen.
  const PREVIEW: Record<string, SoundKey> = {
    intro: "intro",
    outro: "outro",
    bed: "bed-1k",
    lockIn: "lock-in",
    correct: "correct-1k",
    wrong: "wrong-1k",
    safety: "safety-1",
    win: "win-1",
    joker: "joker-fifty",
  };

  type Cat = {
    key: keyof typeof PREVIEW;
    label: string;
    description: string;
    volumeProp: "audioIntroVolume" | "audioOutroVolume" | "audioBedVolume" | "audioLockInVolume" | "audioCorrectVolume" | "audioWrongVolume" | "audioSafetyVolume" | "audioWinVolume" | "audioJokerVolume";
    muteProp: "audioIntroMuted" | "audioOutroMuted" | "audioBedMuted" | "audioLockInMuted" | "audioCorrectMuted" | "audioWrongMuted" | "audioSafetyMuted" | "audioWinMuted" | "audioJokerMuted";
  };

  const CATEGORIES: Cat[] = [
    { key: "intro", label: "Intro", description: "Spielstart-Jingle.", volumeProp: "audioIntroVolume", muteProp: "audioIntroMuted" },
    { key: "bed", label: "Hintergrund-Loop", description: "Durchgehender Frage-Loop. Wechselt mit der Stufe (50€ / 1.000€ / 32.000€ / 1Mio€).", volumeProp: "audioBedVolume", muteProp: "audioBedMuted" },
    { key: "lockIn", label: "Antwort einloggen", description: "Wenn die Antwort gesperrt wird.", volumeProp: "audioLockInVolume", muteProp: "audioLockInMuted" },
    { key: "correct", label: "Richtige Antwort", description: "Auflöse-Sting + Nach-Antwort-Sound.", volumeProp: "audioCorrectVolume", muteProp: "audioCorrectMuted" },
    { key: "wrong", label: "Falsche Antwort", description: "Wenn die Antwort falsch war.", volumeProp: "audioWrongVolume", muteProp: "audioWrongMuted" },
    { key: "safety", label: "Sicherheitsstufe", description: "500€ und 16.000€ erreicht.", volumeProp: "audioSafetyVolume", muteProp: "audioSafetyMuted" },
    { key: "win", label: "Gewonnen", description: "Spielende mit Gewinn / Aussteigen.", volumeProp: "audioWinVolume", muteProp: "audioWinMuted" },
    { key: "joker", label: "Joker", description: "50:50, Telefon, Publikum.", volumeProp: "audioJokerVolume", muteProp: "audioJokerMuted" },
    { key: "outro", label: "Outro", description: "Nach Spielende (z.B. falsche Antwort).", volumeProp: "audioOutroVolume", muteProp: "audioOutroMuted" },
  ];

  function preview(cat: Cat) {
    audio.play(PREVIEW[cat.key]);
  }

  // Live-Update aller laufenden Sounds bei Slider-Bewegung.
  // Alle audio*-Felder werden „getouched", damit das Effekt auf jede Änderung reagiert.
  $effect(() => {
    void settings.audioMaster;
    void settings.audioMuted;
    void settings.audioIntroVolume; void settings.audioIntroMuted;
    void settings.audioOutroVolume; void settings.audioOutroMuted;
    void settings.audioBedVolume; void settings.audioBedMuted;
    void settings.audioLockInVolume; void settings.audioLockInMuted;
    void settings.audioCorrectVolume; void settings.audioCorrectMuted;
    void settings.audioWrongVolume; void settings.audioWrongMuted;
    void settings.audioSafetyVolume; void settings.audioSafetyMuted;
    void settings.audioWinVolume; void settings.audioWinMuted;
    void settings.audioJokerVolume; void settings.audioJokerMuted;
    audio.refreshVolumes();
  });

  function pct(x: number) {
    return `${Math.round(x * 100)}%`;
  }
</script>

<div class="audio">
  <header>
    <h3>Audio</h3>
    <p class="lead">
      Original-WWM-Sounds (Internet-Archive). Spielt nur im Steuerfenster — in OBS via
      <em>Application Audio Capture</em> (alle Fenster der App) oder Desktop-Audio aufnehmen.
      Sounds müssen einmalig heruntergeladen werden: <code>node scripts/download-sounds.mjs</code>.
    </p>
  </header>

  <section class="group master">
    <div class="group-head">
      <h4>Master</h4>
      <label class="mute-toggle">
        <input type="checkbox" bind:checked={settings.audioMuted} />
        <span>{settings.audioMuted ? "🔇 Stumm" : "🔊 An"}</span>
      </label>
    </div>
    <div class="slider-row">
      <label for="audio-master">Gesamtlautstärke</label>
      <input
        id="audio-master"
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={settings.audioMaster}
        disabled={settings.audioMuted}
      />
      <span class="value">{pct(settings.audioMaster)}</span>
    </div>
  </section>

  <section class="group">
    <div class="group-head">
      <h4>Pro Kategorie</h4>
      <p class="hint">Effektive Lautstärke = Master × Kategorie. Vorschau spielt einen typischen Sound der Gruppe.</p>
    </div>

    {#each CATEGORIES as cat (cat.key)}
      <div class="cat" class:dimmed={settings[cat.muteProp] || settings.audioMuted}>
        <div class="cat-head">
          <div class="cat-title">
            <strong>{cat.label}</strong>
            <span class="cat-desc">{cat.description}</span>
          </div>
          <div class="cat-actions">
            <button class="btn small" onclick={() => preview(cat)}>▶ Vorschau</button>
            <label class="mute-toggle">
              <input type="checkbox" bind:checked={settings[cat.muteProp]} />
              <span>{settings[cat.muteProp] ? "🔇" : "🔊"}</span>
            </label>
          </div>
        </div>
        <div class="slider-row">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            bind:value={settings[cat.volumeProp]}
            disabled={settings[cat.muteProp] || settings.audioMuted}
          />
          <span class="value">{pct(settings[cat.volumeProp])}</span>
        </div>
      </div>
    {/each}
  </section>

  <section class="actions">
    <button class="btn ghost" onclick={() => audio.stopAll()}>⏹ Alle Sounds stoppen</button>
  </section>
</div>

<style>
  .audio { color: #e6ecff; }
  header h3 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
  header .lead { margin: 0 0 24px; font-size: 13px; color: #93a8d6; line-height: 1.55; }
  header code {
    background: rgba(255,255,255,0.08);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 12px;
  }

  .group {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 18px;
  }
  .group.master { background: rgba(243,192,80,0.06); border-color: rgba(243,192,80,0.25); }
  .group-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
  .group h4 { margin: 0; font-size: 15px; font-weight: 700; color: #ffd58a; letter-spacing: 0.3px; }
  .group .hint { margin: 0; font-size: 12px; color: #93a8d6; line-height: 1.5; }

  .slider-row {
    display: grid;
    grid-template-columns: 1fr 60px;
    align-items: center;
    gap: 14px;
    padding: 4px 0;
  }
  .master .slider-row { grid-template-columns: 200px 1fr 60px; }
  .master .slider-row label { font-size: 13px; color: #c5d0ee; }
  .slider-row input[type="range"] {
    width: 100%;
    accent-color: #f3c050;
    cursor: pointer;
  }
  .slider-row input[type="range"]:disabled { opacity: 0.35; cursor: not-allowed; }
  .slider-row .value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #ffd58a;
    font-size: 13px;
  }

  .cat {
    padding: 10px 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    transition: opacity 0.15s;
  }
  .cat:first-of-type { border-top: 0; padding-top: 0; }
  .cat.dimmed { opacity: 0.5; }
  .cat-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 6px; }
  .cat-title { display: flex; flex-direction: column; gap: 2px; }
  .cat-title strong { font-size: 13px; color: #e6ecff; }
  .cat-desc { font-size: 11px; color: #8aa0d0; line-height: 1.4; }
  .cat-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

  .mute-toggle {
    display: inline-flex; align-items: center; gap: 4px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 12px;
    color: #c5d0ee;
    user-select: none;
  }
  .mute-toggle:hover { background: rgba(255,255,255,0.08); }
  .mute-toggle input { display: none; }

  .btn {
    cursor: pointer; border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06); color: #e6ecff;
    padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 12px;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); }
  .btn.small { padding: 4px 10px; font-size: 11px; }
  .btn.ghost { background: transparent; }

  .actions { margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: flex-end; }
</style>
