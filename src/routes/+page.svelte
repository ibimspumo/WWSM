<script lang="ts">
  import { onMount } from "svelte";
  import { game } from "$lib/game.svelte";
  import { PRIZE_LADDER } from "$lib/prizeLadder";
  import { broadcastState, onRequestState } from "$lib/bus";
  import { check } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";
  import { getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";
  import type { AnswerIndex } from "$lib/types";

  let updaterStatus = $state<string>("");

  // Reaktiv: jede Änderung am Game-State broadcasten
  $effect(() => {
    const snap = game.serialize();
    broadcastState(snap);
  });

  onMount(() => {
    const unlistenPromise = onRequestState(() => {
      broadcastState(game.serialize());
    });
    return () => {
      unlistenPromise.then((u) => u());
    };
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
      <span class="sub">Steuerung · v0.1.0</span>
    </div>
    <div class="update">
      <button class="btn ghost" onclick={checkForUpdates}>Auf Updates prüfen</button>
      {#if updaterStatus}<span class="updater-msg">{updaterStatus}</span>{/if}
    </div>
  </header>

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
      <h2>Aktuelle Frage</h2>
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
            <button
              class="answer"
              class:selected
              class:locked
              class:removed
              class:correct={isCorrect}
              class:wrong={isWrongLocked}
              disabled={removed || game.phase !== "question"}
              onclick={() => pickAnswer(idx)}>
              <span class="letter">{["A", "B", "C", "D"][i]}</span>
              <span class="text">{removed ? "" : text}</span>
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
          <span class="joker-icon">👥</span>
          <span>Publikumsjoker</span>
        </button>
        <button class="joker" disabled={!game.canUseJoker || game.jokersUsed.has("phone")} onclick={() => game.usePhone()}>
          <span class="joker-icon">📞</span>
          <span>Telefonjoker</span>
        </button>
        <button class="joker" disabled={!game.canUseJoker || game.jokersUsed.has("swap")} onclick={() => game.useSwap()}>
          <span class="joker-icon">🔁</span>
          <span>Publikums-Tausch</span>
        </button>
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
  .joker-icon { font-size: 18px; font-weight: 700; color: #f3c050; }

  .audience { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .audience-bar { display: grid; grid-template-columns: 20px 1fr 40px; gap: 8px; align-items: center; }
  .audience-letter { font-weight: 700; color: #ffd97a; }
  .audience-track { background: rgba(255,255,255,0.08); height: 14px; border-radius: 4px; overflow: hidden; }
  .audience-fill { height: 100%; background: linear-gradient(90deg, #4671d6, #f3c050); }
  .audience-pct { font-variant-numeric: tabular-nums; font-size: 12px; }

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
