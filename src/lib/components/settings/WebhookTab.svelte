<script lang="ts">
  import { onMount } from "svelte";
  import { settings } from "$lib/settings.svelte";
  import { invoke } from "@tauri-apps/api/core";

  let localIp = $state<string>("");
  let copied = $state<string | null>(null);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    invoke<string>("webhook_get_local_ip")
      .then((ip) => { localIp = ip; })
      .catch(() => {});
  });

  // Host für die anzeigten URLs — wenn „LAN-Modus" aktiv, lokale IP, sonst localhost
  const host = $derived(
    settings.webhookBindAll && localIp ? localIp : "localhost",
  );

  const choices = [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
    { key: "c", label: "C" },
    { key: "d", label: "D" },
  ] as const;

  function urlFor(choice: string) {
    return `http://${host}:${settings.webhookPort}/vote?choice=${choice}&username={USER}`;
  }

  async function copyUrl(choice: string) {
    const url = urlFor(choice);
    try {
      await navigator.clipboard.writeText(url);
      copied = choice;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copied = null; }, 1400);
    } catch {
      // ignorieren
    }
  }
</script>

<div class="webhook">
  <header>
    <h3>Webhook / Chat-Joker</h3>
    <p class="lead">
      Lokaler HTTP-Server, der Stimmen aus dem Chat entgegennimmt. Streamer.bot, TikFinity,
      Nightbot &amp; Co. können die unten stehenden URLs als Aktion auf Chat-Befehle binden
      (z. B. <code>!a</code> → URL für Antwort A).
    </p>
  </header>

  <section class="group">
    <div class="group-head">
      <h4>Server</h4>
      <p class="hint">
        Stimmen werden je Frage gezählt — pro Username (case-insensitive) zählt die zuletzt
        abgegebene Antwort. Zwischen zwei Fragen liegt ein 3-Sekunden-Puffer, damit Nachzügler
        nicht in die neue Runde rutschen.
      </p>
    </div>

    <div class="rows">
      <label class="row toggle">
        <input type="checkbox" bind:checked={settings.webhookEnabled} />
        <span>
          <strong>Webhook-Server aktiv</strong>
          <small>Wenn ausgeschaltet, nimmt der Server keine Stimmen mehr an.</small>
        </span>
      </label>

      <label class="row">
        <span class="label">Port</span>
        <input
          type="number"
          min="1024"
          max="65535"
          step="1"
          bind:value={settings.webhookPort}
          class="num"
          disabled={!settings.webhookEnabled}
        />
      </label>

      <label class="row toggle">
        <input type="checkbox" bind:checked={settings.webhookBindAll} disabled={!settings.webhookEnabled} />
        <span>
          <strong>Im lokalen Netz erreichbar</strong>
          <small>
            Standardmäßig hört der Server nur auf <code>127.0.0.1</code>. Mit dieser Option binden wir
            auf <code>0.0.0.0</code> — dann können Geräte im selben WLAN/LAN (z. B. ein Streaming-PC
            oder Handy) ebenfalls Stimmen schicken. Firewall ggf. entsprechend freigeben.
          </small>
        </span>
      </label>
    </div>
  </section>

  <section class="group">
    <div class="group-head">
      <h4>URLs zum Einbinden</h4>
      <p class="hint">
        Vier URLs — eine pro Antwort. Der Platzhalter <code>{`{USER}`}</code> muss vom Chat-Tool
        durch den Username des Voters ersetzt werden (sonst werden alle Stimmen als ein einziger
        User gezählt).
      </p>
    </div>

    <div class="urls">
      {#each choices as c (c.key)}
        <div class="url-row">
          <span class="url-letter">{c.label}</span>
          <code class="url-text">{urlFor(c.key)}</code>
          <button class="copy-btn" onclick={() => copyUrl(c.key)} disabled={!settings.webhookEnabled}>
            {copied === c.key ? "✓ Kopiert" : "Kopieren"}
          </button>
        </div>
      {/each}
    </div>

    <div class="example">
      <strong>Beispiel Streamer.bot:</strong>
      <ul>
        <li>Trigger: Twitch-Chat-Befehl <code>!a</code></li>
        <li>Aktion: HTTP-Request → <code>http://{host}:{settings.webhookPort}/vote?choice=a&amp;username=%user%</code></li>
      </ul>
    </div>
  </section>
</div>

<style>
  .webhook { display: flex; flex-direction: column; gap: 22px; color: #e6ecff; }
  header h3 { margin: 0 0 6px; font-size: 18px; }
  .lead { color: #93a8d6; font-size: 13px; line-height: 1.5; margin: 0; }
  .lead code, .hint code, .example code, .url-text {
    background: rgba(255,255,255,0.08);
    padding: 1px 6px;
    border-radius: 4px;
    font-family: "JetBrains Mono", "Menlo", monospace;
    font-size: 11.5px;
  }

  .group {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 16px 18px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .group-head h4 { margin: 0 0 4px; font-size: 14px; color: #b9c8ec; text-transform: uppercase; letter-spacing: 1px; }
  .hint { font-size: 12px; color: #8aa0d0; margin: 0; line-height: 1.5; }

  .rows { display: flex; flex-direction: column; gap: 10px; }
  .row {
    display: flex; align-items: center; gap: 12px;
  }
  .row.toggle {
    align-items: flex-start;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(110, 161, 240, 0.06);
    border: 1px solid rgba(110, 161, 240, 0.18);
    cursor: pointer;
  }
  .row.toggle input { margin-top: 4px; }
  .row.toggle strong { display: block; font-size: 13px; color: #c9d6ff; }
  .row.toggle small { display: block; font-size: 11.5px; color: #93a8d6; margin-top: 2px; line-height: 1.5; }
  .row .label { width: 140px; font-size: 13px; color: #b9c8ec; }
  .num {
    width: 110px;
    padding: 6px 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .num:disabled { opacity: 0.4; cursor: not-allowed; }

  .urls { display: flex; flex-direction: column; gap: 8px; }
  .url-row {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 6px 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
  }
  .url-letter {
    font-weight: 800;
    color: #ffd97a;
    text-align: center;
  }
  .url-text {
    background: transparent;
    padding: 0;
    color: #c9d6ff;
    overflow-x: auto;
    white-space: nowrap;
  }
  .copy-btn {
    cursor: pointer;
    background: rgba(70, 113, 214, 0.25);
    border: 1px solid rgba(108, 147, 232, 0.4);
    border-radius: 6px;
    color: #e6ecff;
    padding: 5px 10px;
    font-size: 12px;
    transition: background 0.15s;
    min-width: 84px;
  }
  .copy-btn:hover:not(:disabled) { background: rgba(70, 113, 214, 0.45); }
  .copy-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .example {
    font-size: 12px;
    color: #93a8d6;
    background: rgba(243,192,80,0.06);
    border: 1px solid rgba(243,192,80,0.18);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .example strong { color: #ffd97a; display: block; margin-bottom: 4px; }
  .example ul { margin: 0; padding-left: 18px; line-height: 1.6; }
</style>
