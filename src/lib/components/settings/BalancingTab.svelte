<script lang="ts">
  import { settings } from "$lib/settings.svelte";
  import { PRIZE_LADDER } from "$lib/prizeLadder";

  // Vorschau: berechne Trefferchance / Bias pro Stufe live
  const phonePreview = $derived(
    PRIZE_LADDER.map((_, idx) =>
      Math.max(settings.phoneFloor, settings.phoneBaseConfidence - idx * settings.phoneLevelDecay),
    ),
  );
  const audiencePreview = $derived(
    PRIZE_LADDER.map((_, idx) =>
      Math.max(settings.audienceFloor, settings.audienceBaseBias - idx * settings.audienceLevelDecay),
    ),
  );

  function pct(x: number) {
    return `${Math.round(x * 100)}%`;
  }
</script>

<div class="balancing">
  <header>
    <h3>Balancing</h3>
    <p class="lead">
      Wahrscheinlichkeiten und Verhalten der Joker. Änderungen werden sofort gespeichert und beim
      nächsten Joker-Einsatz wirksam.
    </p>
  </header>

  <!-- ====================== Telefonjoker ====================== -->
  <section class="group">
    <div class="group-head">
      <h4>Telefonjoker</h4>
      <p class="hint">
        Der Anrufer trifft die richtige Antwort mit dieser Wahrscheinlichkeit. Bei niedriger
        Confidence kippt der Tonfall von „ziemlich sicher" auf „nicht ganz sicher".
      </p>
    </div>

    <div class="slider-row">
      <label for="phone-base">Trefferchance auf Stufe 1</label>
      <input id="phone-base" type="range" min="0.3" max="1" step="0.01" bind:value={settings.phoneBaseConfidence} />
      <span class="value">{pct(settings.phoneBaseConfidence)}</span>
    </div>
    <div class="slider-row">
      <label for="phone-decay">Abnahme pro Stufe</label>
      <input id="phone-decay" type="range" min="0" max="0.1" step="0.005" bind:value={settings.phoneLevelDecay} />
      <span class="value">−{(settings.phoneLevelDecay * 100).toFixed(1)} pp</span>
    </div>
    <div class="slider-row">
      <label for="phone-floor">Mindest-Trefferchance</label>
      <input id="phone-floor" type="range" min="0.1" max="0.8" step="0.01" bind:value={settings.phoneFloor} />
      <span class="value">{pct(settings.phoneFloor)}</span>
    </div>
    <div class="slider-row">
      <label for="phone-cert">Schwelle für „ziemlich sicher"</label>
      <input id="phone-cert" type="range" min="0.4" max="1" step="0.01" bind:value={settings.phoneCertainThreshold} />
      <span class="value">{pct(settings.phoneCertainThreshold)}</span>
    </div>

    <details>
      <summary>Vorschau pro Stufe</summary>
      <div class="preview-grid">
        {#each phonePreview as conf, i (i)}
          <div class="preview-cell" class:certain={conf > settings.phoneCertainThreshold}>
            <span class="lvl">{i + 1}</span>
            <span class="num">{pct(conf)}</span>
            <span class="tone">{conf > settings.phoneCertainThreshold ? "sicher" : "unsicher"}</span>
          </div>
        {/each}
      </div>
    </details>
  </section>

  <!-- ====================== Publikumsjoker ====================== -->
  <section class="group">
    <div class="group-head">
      <h4>Publikumsjoker</h4>
      <p class="hint">
        Wie wahrscheinlich die richtige Antwort die Mehrheit erhält. Zusätzlich kann mit einer
        Wahrscheinlichkeit eine falsche Antwort als „Zweit-Favorit" gebündelt werden — das erzeugt
        das klassische WWM-Muster „62 / 28 / 7 / 3" statt gleichverteiltem Rauschen.
      </p>
    </div>

    <div class="slider-row">
      <label for="aud-base">Bias auf Stufe 1</label>
      <input id="aud-base" type="range" min="0.3" max="1" step="0.01" bind:value={settings.audienceBaseBias} />
      <span class="value">{pct(settings.audienceBaseBias)}</span>
    </div>
    <div class="slider-row">
      <label for="aud-decay">Abnahme pro Stufe</label>
      <input id="aud-decay" type="range" min="0" max="0.08" step="0.005" bind:value={settings.audienceLevelDecay} />
      <span class="value">−{(settings.audienceLevelDecay * 100).toFixed(1)} pp</span>
    </div>
    <div class="slider-row">
      <label for="aud-floor">Mindest-Bias</label>
      <input id="aud-floor" type="range" min="0.1" max="0.8" step="0.01" bind:value={settings.audienceFloor} />
      <span class="value">{pct(settings.audienceFloor)}</span>
    </div>
    <div class="slider-row">
      <label for="aud-var">Streuung (±)</label>
      <input id="aud-var" type="range" min="0" max="0.3" step="0.01" bind:value={settings.audienceVariance} />
      <span class="value">±{pct(settings.audienceVariance / 2)}</span>
    </div>

    <div class="slider-row">
      <label for="aud-min">Untere Anzeigegrenze</label>
      <input id="aud-min" type="range" min="10" max="50" step="1" bind:value={settings.audienceMinCap} />
      <span class="value">{settings.audienceMinCap}%</span>
    </div>
    <div class="slider-row">
      <label for="aud-max">Obere Anzeigegrenze</label>
      <input id="aud-max" type="range" min="60" max="100" step="1" bind:value={settings.audienceMaxCap} />
      <span class="value">{settings.audienceMaxCap}%</span>
    </div>

    <hr class="thin" />

    <div class="slider-row">
      <label for="sf-chance">Chance auf Zweit-Favorit</label>
      <input id="sf-chance" type="range" min="0" max="1" step="0.05" bind:value={settings.audienceSecondFavoriteChance} />
      <span class="value">{pct(settings.audienceSecondFavoriteChance)}</span>
    </div>
    <div class="slider-row">
      <label for="sf-min">Anteil Zweit-Favorit (min)</label>
      <input id="sf-min" type="range" min="0.1" max="0.9" step="0.05" bind:value={settings.audienceSecondFavoriteShareMin} />
      <span class="value">{pct(settings.audienceSecondFavoriteShareMin)}</span>
    </div>
    <div class="slider-row">
      <label for="sf-max">Anteil Zweit-Favorit (max)</label>
      <input id="sf-max" type="range" min="0.1" max="0.95" step="0.05" bind:value={settings.audienceSecondFavoriteShareMax} />
      <span class="value">{pct(settings.audienceSecondFavoriteShareMax)}</span>
    </div>

    <details>
      <summary>Vorschau pro Stufe</summary>
      <div class="preview-grid">
        {#each audiencePreview as bias, i (i)}
          <div class="preview-cell">
            <span class="lvl">{i + 1}</span>
            <span class="num">{pct(bias)}</span>
            <span class="tone">bias</span>
          </div>
        {/each}
      </div>
    </details>
  </section>

  <section class="actions">
    <button class="reset-btn" onclick={() => settings.reset()}>
      Auf Standardwerte zurücksetzen
    </button>
  </section>
</div>

<style>
  .balancing { color: #e6ecff; }
  header h3 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
  }
  header .lead {
    margin: 0 0 24px;
    font-size: 13px;
    color: #93a8d6;
    line-height: 1.5;
  }

  .group {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 18px;
  }
  .group-head { margin-bottom: 14px; }
  .group h4 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
    color: #ffd58a;
    letter-spacing: 0.3px;
  }
  .group .hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #93a8d6;
  }

  .slider-row {
    display: grid;
    grid-template-columns: 220px 1fr 70px;
    align-items: center;
    gap: 14px;
    padding: 7px 0;
  }
  .slider-row label {
    font-size: 13px;
    color: #c5d0ee;
  }
  .slider-row input[type="range"] {
    width: 100%;
    accent-color: #f3c050;
    cursor: pointer;
  }
  .slider-row .value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #ffd58a;
    font-size: 13px;
  }

  .thin {
    border: 0;
    border-top: 1px dashed rgba(255,255,255,0.1);
    margin: 12px 0;
  }

  details {
    margin-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
    padding-top: 10px;
  }
  details summary {
    cursor: pointer;
    font-size: 12px;
    color: #8aa0d0;
    user-select: none;
    padding: 4px 0;
  }
  details summary:hover { color: #c5d0ee; }
  .preview-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-top: 10px;
  }
  .preview-cell {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 6px;
    padding: 6px 8px;
    display: flex; flex-direction: column; align-items: center; gap: 1px;
    font-size: 11px;
  }
  .preview-cell.certain {
    border-color: rgba(243,192,80,0.4);
    background: rgba(243,192,80,0.08);
  }
  .preview-cell .lvl {
    color: #8aa0d0;
    font-size: 10px;
  }
  .preview-cell .num {
    font-weight: 700;
    font-size: 13px;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .preview-cell .tone {
    color: #8aa0d0;
    font-size: 10px;
    text-transform: lowercase;
  }
  .preview-cell.certain .tone { color: #ffd58a; }

  .actions {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex; justify-content: flex-end;
  }
  .reset-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.15);
    color: #c5d0ee;
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
  }
  .reset-btn:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.3);
    color: #fff;
  }
</style>
