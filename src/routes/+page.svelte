<script lang="ts">
  import { onMount } from "svelte";
  import { game } from "$lib/game.svelte";
  import { settings } from "$lib/settings.svelte";
  import { questionStore } from "$lib/questionStore.svelte";
  import { PRIZE_LADDER } from "$lib/prizeLadder";
  import { broadcastState, onRequestState } from "$lib/bus";
  import { styling } from "$lib/styling.svelte";
  import { broadcastStyle, onRequestStyle } from "$lib/styleBus";
  import { ensureFontsForValues } from "$lib/fontLoader";
  import { check } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";
  import { getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";
  import { listen } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import type { AnswerIndex, ChatVotes } from "$lib/types";
  import SettingsModal from "$lib/components/SettingsModal.svelte";

  let updaterStatus = $state<string>("");
  let settingsOpen = $state(false);
  let settingsLoaded = $state(false);
  let stylingLoaded = $state(false);

  // Reaktiv: jede Änderung am Game-State broadcasten
  $effect(() => {
    const snap = game.serialize();
    broadcastState(snap);
  });

  // Reaktiv: jede Änderung am Styling-State broadcasten + persistieren
  $effect(() => {
    if (!stylingLoaded) return;
    const snap = { ...styling.values };
    broadcastStyle(snap);
    styling.save();
  });

  onMount(() => {
    settings.load();
    settingsLoaded = true;
    styling.load();
    ensureFontsForValues(styling.values);
    stylingLoaded = true;
    // Fragen-Store einmalig laden (Defaults aus static/ + User-Overrides aus appDataDir).
    questionStore.load().catch((e) => console.warn("questionStore.load fehlgeschlagen:", e));
    const unlistenPromise = onRequestState(() => {
      broadcastState(game.serialize());
    });
    const unlistenStylePromise = onRequestStyle(() => {
      broadcastStyle({ ...styling.values });
    });
    // Chat-Voting-Events vom Rust-Server in den Game-State spiegeln
    const unlistenChat = listen<ChatVotes>("wwsm:chat-vote", (e) => {
      game.applyChatVotes(e.payload);
    });
    return () => {
      unlistenPromise.then((u) => u());
      unlistenStylePromise.then((u) => u());
      unlistenChat.then((u) => u());
    };
  });

  // Persistiere bei jeder Änderung an Settings — Reaktivität greift durch serialize()
  $effect(() => {
    if (!settingsLoaded) return;
    settings.serialize();
    settings.save();
  });

  // Webhook-Settings → Backend syncen (Server neu starten, wenn nötig)
  $effect(() => {
    if (!settingsLoaded) return;
    const port = settings.webhookPort;
    const enabled = settings.webhookEnabled;
    const bindAll = settings.webhookBindAll;
    invoke("webhook_apply_settings", { port, enabled, bindAll }).catch(() => {
      // außerhalb von Tauri ignorieren
    });
  });

  async function checkForUpdates() {
    try {
      updaterStatus = "Prüfe auf Updates …";
      const update = await check();
      if (update) {
        updaterStatus = `Update verfügbar: v${update.version}. Wird installiert …`;
        await update.downloadAndInstall();
        updaterStatus = "Update installiert, App startet neu …";
        await relaunch();
      } else {
        updaterStatus = "Du hast die aktuelle Version.";
      }
    } catch (e) {
      updaterStatus = `Updater-Fehler: ${e}`;
    }
  }

  async function toggleOverlay(label: string, visible: boolean) {
    const wins = await getAllWebviewWindows();
    const w = wins.find((x) => x.label === label);
    if (!w) return;
    if (visible) await w.show(); else await w.hide();
  }

  $effect(() => { toggleOverlay("overlay-question", game.showQuestionOverlay); });
  $effect(() => { toggleOverlay("overlay-jokers", game.showJokersOverlay); });
  $effect(() => { toggleOverlay("overlay-ladder", game.showLadderOverlay); });
  $effect(() => { toggleOverlay("overlay-joker-effect", game.showJokerEffectOverlay); });

  function pickAnswer(i: AnswerIndex) {
    game.selectAnswer(i);
  }
</script>

<div class="control">
  <header>
    <div class="brand">
      <h1>Wer Wird Stream Millionär</h1>
      <span class="sub">Steuerung · v0.3.0</span>
    </div>
    <div class="update">
      <button class="btn ghost" onclick={() => (settingsOpen = true)}>⚙ Einstellungen</button>
      <button class="btn ghost" onclick={checkForUpdates}>Auf Updates prüfen</button>
      {#if updaterStatus}<span class="updater-msg">{updaterStatus}</span>{/if}
    </div>
  </header>

  <SettingsModal open={settingsOpen} onClose={() => (settingsOpen = false)} />

  <section class="status">
    <div class="badge">
      <span class="badge-label">Stufe</span>
      <span class="badge-value">{game.currentLevelIndex + 1} / {PRIZE_LADDER.length}</span>
    </div>
    <div class="badge">
      <span class="badge-label">Aktueller Preis</span>
      <span class="badge-value">{game.currentStep.label}</span>
    </div>
    <div class="badge">
      <span class="badge-label">Phase</span>
      <span class="badge-value">{game.phase}</span>
    </div>
    {#if game.finalAmount > 0 && (game.phase === "lost" || game.phase === "won-game")}
      <div class="badge gold">
        <span class="badge-label">Gewinn</span>
        <span class="badge-value">{game.finalAmount.toLocaleString("de-DE")} €</span>
      </div>
    {/if}
  </section>

  <section class="row">
    <div class="card flex">
      <h2>Spielsteuerung</h2>
      <div class="btn-grid">
        <button class="btn primary" onclick={() => game.startGame()} disabled={game.phase === "loading"}>
          {game.phase === "menu" || game.phase === "lost" || game.phase === "won-game" ? "Spiel starten" : "Neues Spiel"}
        </button>
        <button class="btn" disabled={game.selectedAnswer === null || game.phase !== "question"} onclick={() => game.lockIn()}>
          Antwort sperren
        </button>
        <button class="btn" disabled={game.phase !== "question"} onclick={() => game.skipQuestion()} title="Aktuelle Frage verwerfen und eine neue aus derselben Preisstufe ziehen. Eingesetzte Joker werden zurückerstattet.">
          Frage überspringen
        </button>
        <button class="btn warn" disabled={game.phase !== "locked"} onclick={() => game.reveal()}>
          Auflösen
        </button>
        <button class="btn" disabled={game.phase !== "won-level"} onclick={() => game.nextLevel()}>
          Nächste Frage
        </button>
        <button class="btn" disabled={game.phase !== "question" && game.phase !== "won-level"} onclick={() => game.takeMoney()}>
          Aussteigen (Geld nehmen)
        </button>
        <button class="btn ghost" onclick={() => game.backToMenu()}>Zurück ins Menü</button>
      </div>
    </div>

    <div class="card flex">
      <div class="card-head">
        <h2>Aktuelle Frage</h2>
        <label class="spoiler-toggle" title="Markiert die korrekte Antwort nur hier im Steuerfenster — Overlays bleiben unverändert.">
          <input type="checkbox" bind:checked={settings.revealCorrectInControl} />
          <span>👁 Lösung anzeigen</span>
        </label>
      </div>
      {#if game.question}
        <p class="question-text">{game.question.q}</p>
        <div class="answers-grid">
          {#each game.question.a as text, i (i)}
            {@const idx = i as AnswerIndex}
            {@const removed = game.removedAnswers.has(idx)}
            {@const selected = game.selectedAnswer === idx}
            {@const locked = game.lockedAnswer === idx}
            {@const revealed = game.phase === "reveal" || game.phase === "won-level" || game.phase === "won-game" || game.phase === "lost"}
            {@const isCorrect = revealed && idx === game.question.correct}
            {@const isWrongLocked = revealed && locked && idx !== game.question.correct}
            {@const isSpoiler = !revealed && settings.revealCorrectInControl && idx === game.question.correct}
            <button
              class="answer"
              class:selected
              class:locked
              class:removed
              class:correct={isCorrect}
              class:wrong={isWrongLocked}
              class:spoiler={isSpoiler}
              disabled={removed || game.phase !== "question"}
              onclick={() => pickAnswer(idx)}>
              <span class="letter">{["A", "B", "C", "D"][i]}</span>
              <span class="text">{removed ? "" : text}</span>
              {#if isSpoiler}<span class="spoiler-badge" aria-label="korrekte Antwort">✓</span>{/if}
            </button>
          {/each}
        </div>
        {#if game.phoneHint}
          <div class="hint">📞 {game.phoneHint}</div>
        {/if}
      {:else}
        <p class="muted">Noch keine Frage geladen. Klicke „Spiel starten“.</p>
      {/if}
    </div>
  </section>

  <section class="row">
    <div class="card flex">
      <h2>Joker</h2>
      <div class="jokers-row">
        <button class="joker" disabled={!game.canUseJoker || game.jokersUsed.has("fifty")} onclick={() => game.useFiftyFifty()}>
          <span class="joker-icon">50:50</span>
          <span>2 falsche Antworten weg</span>
        </button>
        <button class="joker" disabled={!game.canUseJoker || game.jokersUsed.has("audience")} onclick={() => game.useAudience()}>
          <span class="joker-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span>Publikumsjoker</span>
        </button>
        <button class="joker" disabled={!game.canUseJoker || game.jokersUsed.has("phone")} onclick={() => game.usePhone()}>
          <span class="joker-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </span>
          <span>Telefonjoker</span>
        </button>
        <button class="joker" disabled={!game.canUseJoker || game.jokersUsed.has("chat")} onclick={() => game.useChat()}>
          <span class="joker-icon">
            <!-- Lucide: message-circle (Chat) -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </span>
          <span>Chat-Joker</span>
        </button>
      </div>

      <!-- Live-Anzeige der Chat-Stimmen (immer aktiv, sobald Voting läuft) -->
      <div class="chat-live" class:dimmed={game.chatVotes.total === 0}>
        <div class="chat-live-head">
          <span class="chat-live-title">Chat-Voting</span>
          <span class="chat-live-total">{game.chatVotes.total} {game.chatVotes.total === 1 ? "Stimme" : "Stimmen"}</span>
        </div>
        <div class="chat-live-bars">
          {#each [0, 1, 2, 3] as i (i)}
            {@const count = game.chatVotes.counts[i]}
            {@const pct = game.chatVotes.total > 0 ? Math.round((count / game.chatVotes.total) * 100) : 0}
            <div class="chat-bar">
              <span class="chat-letter">{["A", "B", "C", "D"][i]}</span>
              <div class="chat-track">
                <div class="chat-fill" style="width: {pct}%"></div>
              </div>
              <span class="chat-count">{count}<span class="chat-pct"> · {pct}%</span></span>
            </div>
          {/each}
        </div>
      </div>

      {#if game.audienceVotes}
        <div class="audience">
          {#each [0, 1, 2, 3] as i (i)}
            <div class="audience-bar">
              <span class="audience-letter">{["A", "B", "C", "D"][i]}</span>
              <div class="audience-track">
                <div class="audience-fill" style="width: {game.audienceVotes[i as AnswerIndex]}%"></div>
              </div>
              <span class="audience-pct">{game.audienceVotes[i as AnswerIndex]}%</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card">
      <h2>Overlays für OBS</h2>
      <p class="muted small">In OBS unter <em>Quelle hinzufügen → Fensteraufnahme</em> auswählen (Modus: <em>Windows Graphics Capture</em>):</p>
      <ul class="obs-list">
        <li><code>WWSM Overlay — Frage</code>
          <label class="toggle"><input type="checkbox" bind:checked={game.showQuestionOverlay} /> sichtbar</label>
        </li>
        <li><code>WWSM Overlay — Joker</code>
          <label class="toggle"><input type="checkbox" bind:checked={game.showJokersOverlay} /> sichtbar</label>
        </li>
        <li><code>WWSM Overlay — Geldleiter</code>
          <label class="toggle"><input type="checkbox" bind:checked={game.showLadderOverlay} /> sichtbar</label>
        </li>
        <li><code>WWSM Overlay — Joker-Effekt</code>
          <label class="toggle"><input type="checkbox" bind:checked={game.showJokerEffectOverlay} /> sichtbar</label>
        </li>
      </ul>
      <hr class="divider" />
      <label class="big-toggle">
        <input type="checkbox" bind:checked={game.editMode} />
        <span>
          <strong>Bearbeiten-Modus</strong>
          <small>Zeigt eine Titelleiste auf jedem Overlay — zum Verschieben, Minimieren, Verstecken. Beim Streamen ausschalten, damit die Leiste nicht im OBS-Capture erscheint.</small>
        </span>
      </label>
    </div>
  </section>
</div>

<style>
  .control {
    padding: 24px 28px 40px;
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  header {
    display: flex; justify-content: space-between; align-items: center;
  }
  .brand h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
  .brand .sub { color: #8aa0d0; font-size: 12px; }
  .updater-msg { margin-left: 10px; font-size: 12px; color: #ffd58a; }

  .status {
    display: flex; gap: 12px; flex-wrap: wrap;
  }
  .badge {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 8px 14px;
    display: flex; flex-direction: column;
  }
  .badge.gold { border-color: #f3c050; background: rgba(243,192,80,0.12); }
  .badge-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #93a8d6; }
  .badge-value { font-size: 16px; font-weight: 600; }

  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .row .card.flex { display: flex; flex-direction: column; }
  .card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 16px 18px;
  }
  .card h2 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #b9c8ec; text-transform: uppercase; letter-spacing: 1px; }
  .card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .card-head h2 { margin: 0 0 12px; }
  .spoiler-toggle {
    display: inline-flex; align-items: center; gap: 6px;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(62, 208, 121, 0.08);
    border: 1px solid rgba(62, 208, 121, 0.3);
    color: #a8e6c2;
    font-size: 11px;
    margin-bottom: 12px;
    user-select: none;
  }
  .spoiler-toggle:hover { background: rgba(62, 208, 121, 0.16); }
  .spoiler-toggle input { accent-color: #3ed079; }

  .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn {
    cursor: pointer; border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06); color: #e6ecff;
    padding: 10px 14px; border-radius: 8px; font-weight: 500;
    transition: background 0.15s, border-color 0.15s, transform 0.05s;
  }
  .btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); }
  .btn:active:not(:disabled) { transform: translateY(1px); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.primary { background: linear-gradient(180deg, #4671d6, #2a4eaa); border-color: #6c93e8; }
  .btn.primary:hover:not(:disabled) { background: linear-gradient(180deg, #5680e6, #305bbf); }
  .btn.warn { background: linear-gradient(180deg, #d68d23, #a86610); border-color: #f3c050; }
  .btn.ghost { background: transparent; }

  .question-text {
    font-size: 16px;
    line-height: 1.4;
    margin: 0 0 12px;
    color: #e6ecff;
  }
  .answers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .answer {
    text-align: left; padding: 10px 14px; border-radius: 8px;
    background: rgba(70, 113, 214, 0.18);
    border: 1px solid rgba(108, 147, 232, 0.4);
    color: #e6ecff; cursor: pointer; display: flex; gap: 10px; align-items: center;
    transition: all 0.15s;
  }
  .answer:hover:not(:disabled) { background: rgba(70, 113, 214, 0.32); }
  .answer:disabled { cursor: not-allowed; }
  .answer.selected { background: linear-gradient(180deg, #f7c451, #c98a18); color: #1a1100; border-color: #ffd97a; }
  .answer.locked { box-shadow: 0 0 0 2px #ffd97a inset; }
  .answer.correct { background: linear-gradient(180deg, #3ed079, #1d8a48); color: #052; border-color: #82e6a8; }
  .answer.wrong { background: linear-gradient(180deg, #e64b4b, #8e1d1d); color: #fff; border-color: #f29f9f; }
  .answer.removed { background: rgba(255,255,255,0.04); border-style: dashed; color: transparent; }
  .answer.spoiler {
    border-color: #3ed079;
    box-shadow: inset 0 0 0 1px rgba(62, 208, 121, 0.5);
  }
  .answer.spoiler.selected { box-shadow: inset 0 0 0 1px rgba(62, 208, 121, 0.5); }
  .spoiler-badge {
    margin-left: auto;
    color: #3ed079;
    font-weight: 700;
    font-size: 14px;
    line-height: 1;
  }
  .answer .letter { font-weight: 700; color: #ffd97a; min-width: 18px; }
  .answer.selected .letter, .answer.correct .letter, .answer.wrong .letter { color: inherit; }

  .jokers-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .joker {
    cursor: pointer; padding: 10px; border-radius: 10px;
    background: rgba(70, 113, 214, 0.18);
    border: 1px solid rgba(108, 147, 232, 0.4);
    color: #e6ecff;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    font-size: 12px;
  }
  .joker:hover:not(:disabled) { background: rgba(70, 113, 214, 0.32); }
  .joker:disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
  .joker-icon { font-size: 18px; font-weight: 700; color: #f3c050; display: inline-flex; align-items: center; justify-content: center; height: 22px; }
  .joker-icon svg { width: 22px; height: 22px; }

  .audience { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .audience-bar { display: grid; grid-template-columns: 20px 1fr 40px; gap: 8px; align-items: center; }
  .audience-letter { font-weight: 700; color: #ffd97a; }
  .audience-track { background: rgba(255,255,255,0.08); height: 14px; border-radius: 4px; overflow: hidden; }
  .audience-fill { height: 100%; background: linear-gradient(90deg, #4671d6, #f3c050); }
  .audience-pct { font-variant-numeric: tabular-nums; font-size: 12px; }

  /* Live-Chat-Voting im Steuerfenster — immer sichtbar während des Spiels */
  .chat-live {
    margin-top: 12px;
    padding: 10px 12px;
    background: rgba(110, 161, 240, 0.08);
    border: 1px solid rgba(110, 161, 240, 0.25);
    border-radius: 8px;
    transition: opacity 0.25s;
  }
  .chat-live.dimmed { opacity: 0.55; }
  .chat-live-head {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .chat-live-title { color: #6ea1f0; font-weight: 600; }
  .chat-live-total { color: #8aa0d0; font-variant-numeric: tabular-nums; }
  .chat-live-bars { display: flex; flex-direction: column; gap: 5px; }
  .chat-bar { display: grid; grid-template-columns: 18px 1fr 80px; gap: 8px; align-items: center; }
  .chat-letter { font-weight: 700; color: #6ea1f0; font-size: 12px; }
  .chat-track { background: rgba(255,255,255,0.06); height: 10px; border-radius: 3px; overflow: hidden; }
  .chat-fill {
    height: 100%;
    background: linear-gradient(90deg, #6ea1f0, #a37bff);
    transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .chat-count {
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: #e6ecff;
    text-align: right;
    font-weight: 600;
  }
  .chat-pct { color: #8aa0d0; font-weight: 400; }

  .hint { margin-top: 10px; padding: 8px 12px; background: rgba(243,192,80,0.1); border: 1px solid rgba(243,192,80,0.3); border-radius: 8px; font-size: 13px; }

  .obs-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .obs-list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .obs-list code { background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 6px; font-size: 12px; }
  .toggle { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; color: #93a8d6; }
  .small { font-size: 12px; color: #8aa0d0; }
  .muted { color: #8aa0d0; }
  .divider { border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 14px 0 12px; }
  .big-toggle {
    display: flex; gap: 10px; align-items: flex-start; cursor: pointer;
    padding: 8px 10px; border-radius: 8px;
    background: rgba(243,192,80,0.06); border: 1px solid rgba(243,192,80,0.2);
  }
  .big-toggle input { margin-top: 3px; }
  .big-toggle strong { display: block; font-size: 13px; color: #ffd58a; }
  .big-toggle small { display: block; font-size: 11px; color: #93a8d6; margin-top: 2px; line-height: 1.4; }
</style>
