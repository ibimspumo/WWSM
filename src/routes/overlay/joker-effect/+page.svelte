<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import { styling } from "$lib/styling.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";
  import type { AnswerIndex } from "$lib/types";

  const styleVars = $derived(styling.styleStringFor("jokerEffect"));

  onMount(() => { initOverlayListener(); });

  const finalVotes = $derived(overlayState.audienceVotes);
  const phoneHint = $derived(overlayState.phoneHint);
  const revealAt = $derived(overlayState.audienceRevealAt);

  // Chat-Joker: nur sichtbar, wenn der Joker gezogen wurde. Animation läuft
  // einmalig beim Aufdecken (chatRevealAt > now); danach updaten die Balken
  // sanft mit jeder neuen Stimme via CSS-Transition.
  const chatActive = $derived(overlayState.jokersUsed.includes("chat"));
  const chatVotes = $derived(overlayState.chatVotes);
  const chatRevealAt = $derived(overlayState.chatRevealAt);
  let chatBouncing = $state(false);

  $effect(() => {
    if (!chatActive) {
      chatBouncing = false;
      return;
    }
    const now = Date.now();
    const revealMs = chatRevealAt ?? 0;
    if (revealMs <= now) {
      chatBouncing = false;
      return;
    }
    chatBouncing = true;
    const settle = setTimeout(() => { chatBouncing = false; }, revealMs - now);
    return () => clearTimeout(settle);
  });

  const chatTotal = $derived(chatVotes.total);
  // Prozentwerte für die Balken (0 wenn niemand abgestimmt hat)
  const chatPct = $derived<[number, number, number, number]>(
    chatTotal > 0
      ? [
          Math.round((chatVotes.counts[0] / chatTotal) * 100),
          Math.round((chatVotes.counts[1] / chatTotal) * 100),
          Math.round((chatVotes.counts[2] / chatTotal) * 100),
          Math.round((chatVotes.counts[3] / chatTotal) * 100),
        ]
      : [0, 0, 0, 0]
  );
  const chatMax = $derived(Math.max(chatPct[0], chatPct[1], chatPct[2], chatPct[3]));

  // Während der Bounce-Phase enthält displayVotes zufällige Säulenhöhen (kein Bezug zu 100 %).
  // Nach dem Reveal sind es die echten Anteile.
  let displayVotes = $state<[number, number, number, number] | null>(null);
  let isAnimating = $state(false);

  $effect(() => {
    if (!finalVotes) {
      displayVotes = null;
      isAnimating = false;
      return;
    }

    const now = Date.now();
    const revealMs = revealAt ?? 0;

    if (revealMs <= now) {
      // Spätstart oder Snapshot-Replay: Animation überspringen
      displayVotes = [finalVotes[0], finalVotes[1], finalVotes[2], finalVotes[3]];
      isAnimating = false;
      return;
    }

    isAnimating = true;
    const tick = () => {
      displayVotes = [
        Math.round(8 + Math.random() * 82),
        Math.round(8 + Math.random() * 82),
        Math.round(8 + Math.random() * 82),
        Math.round(8 + Math.random() * 82),
      ];
    };
    tick();
    const interval = setInterval(tick, 210);
    const settle = setTimeout(() => {
      clearInterval(interval);
      displayVotes = [finalVotes[0], finalVotes[1], finalVotes[2], finalVotes[3]];
      isAnimating = false;
    }, revealMs - now);

    return () => {
      clearInterval(interval);
      clearTimeout(settle);
    };
  });

  const letters: ReadonlyArray<["A" | "B" | "C" | "D", AnswerIndex]> = [
    ["A", 0], ["B", 1], ["C", 2], ["D", 3],
  ];
  // höchster Anteil — für Hervorhebung des Mehrheits-Balkens (nur nach Reveal)
  const maxVote = $derived(
    displayVotes && !isAnimating
      ? Math.max(displayVotes[0], displayVotes[1], displayVotes[2], displayVotes[3])
      : 0
  );
</script>

<OverlayTitleBar title="WWSM Overlay — Joker-Effekt" />

<div class="stage" class:edit={overlayState.editMode} style={styleVars}>
  {#if overlayState.phase !== "question"}
    <!-- Sobald die Antwort gesperrt ist (oder eine andere Phase aktiv ist), Effekte ausblenden -->
  {:else if chatActive}
    <!-- Chat-Joker: Live-Voting des Streams -->
    <div class="audience-card chat-card" class:animating={chatBouncing}>
      <h2 class="card-title">Chat-Voting</h2>
      <div class="chat-total">{chatTotal} {chatTotal === 1 ? "Stimme" : "Stimmen"} aus dem Chat</div>
      <div class="bars">
        {#each letters as [label, i] (label)}
          {@const pct = chatPct[i]}
          {@const count = chatVotes.counts[i]}
          {@const isMax = pct === chatMax && chatMax > 0}
          <div class="bar-col">
            <div class="bar-track">
              <div class="bar-fill chat" class:max={isMax} class:bounce={chatBouncing} style="height: {Math.max(2, pct)}%"></div>
            </div>
            <div class="bar-label">
              <span class="bar-letter">{label}</span>
              <span class="bar-pct">{count} · {pct}%</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if displayVotes}
    <!-- Publikumsjoker-Diagramm -->
    <div class="audience-card" class:animating={isAnimating}>
      <h2 class="card-title">Publikum</h2>
      <div class="bars">
        {#each letters as [label, i] (label)}
          {@const pct = displayVotes[i]}
          {@const isMax = !isAnimating && pct === maxVote && maxVote > 0}
          <div class="bar-col">
            <div class="bar-track">
              <div class="bar-fill" class:max={isMax} class:bounce={isAnimating} style="height: {Math.max(2, pct)}%"></div>
            </div>
            <div class="bar-label">
              <span class="bar-letter">{label}</span>
              <span class="bar-pct">{isAnimating ? "…" : `${pct}%`}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if phoneHint}
    <!-- Telefonjoker -->
    <div class="phone-card">
      <div class="phone-icon">📞</div>
      <div class="phone-bubble">
        <span class="phone-quote">„{phoneHint}"</span>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(html), :global(body) { background: transparent !important; }

  .stage {
    width: 100vw; height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    font-family: var(--e-title-font, "Trebuchet MS", "Segoe UI", "Helvetica Neue", system-ui, sans-serif);
  }
  .stage.edit { padding-top: 40px; }

  /* ============= AUDIENCE CARD ============= */
  .audience-card {
    width: 100%;
    height: 100%;
    background:
      radial-gradient(ellipse at center,
        var(--e-card-fill-center, rgba(40, 90, 200, 0.55)) 0%,
        var(--e-card-fill-outer, rgba(6, 16, 50, 0.95)) 80%),
      linear-gradient(180deg,
        var(--e-card-bg-top, #0d2354) 0%,
        var(--e-card-bg-bottom, #04102f) 100%);
    border: var(--e-card-border-width, 2px) solid var(--e-card-border, #6ea1f0);
    box-shadow:
      0 0 0 2px var(--e-card-inset, #1a3a82) inset,
      0 0 var(--e-card-glow-blur, 32px) var(--e-card-glow, rgba(110, 161, 240, 0.55)),
      var(--e-card-box-shadow, 0 10px 28px rgba(0,0,0,0.55));
    border-radius: var(--e-card-radius, 18px);
    padding: 22px 28px 18px;
    box-sizing: border-box;
    display: flex; flex-direction: column;
  }
  .card-title {
    margin: 0 0 14px;
    font-family: var(--e-title-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    font-size: var(--e-title-size, 30px);
    font-weight: var(--e-title-weight, 700);
    text-align: center;
    color: var(--e-title-color, #ffcf48);
    text-shadow: var(--e-title-text-shadow, 0 0 12px rgba(255, 207, 72, 0.6)), 0 2px 4px rgba(0,0,0,0.7);
    letter-spacing: var(--e-title-letter-spacing, 1px);
    text-transform: var(--e-title-transform, uppercase);
  }
  .bars {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: clamp(12px, 3vw, 36px);
    align-items: end;
    min-height: 0;
  }
  .bar-col { display: flex; flex-direction: column; align-items: stretch; gap: 8px; height: 100%; min-height: 0; }
  .bar-track {
    flex: 1;
    background: var(--e-bar-track-bg, rgba(255,255,255,0.06));
    border: 1px solid var(--e-bar-track-border, rgba(110, 161, 240, 0.4));
    border-radius: var(--e-bar-radius, 6px);
    display: flex; flex-direction: column; justify-content: flex-end;
    overflow: hidden;
    min-height: 0;
  }
  .bar-fill {
    background: linear-gradient(180deg,
      var(--e-bar-fill-top, #6ea1f0) 0%,
      var(--e-bar-fill-bottom, #2a4eaa) 100%);
    box-shadow: inset 0 0 12px rgba(110, 161, 240, 0.6);
    transition: height 0.55s cubic-bezier(0.22, 1, 0.36, 1), background 0.4s ease, box-shadow 0.4s ease;
  }
  .bar-fill.bounce {
    transition: height 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .bar-fill.max {
    background: linear-gradient(180deg,
      var(--e-bar-max-top, #ffe399) 0%,
      var(--e-bar-max-mid, #f4b441) 50%,
      var(--e-bar-max-bottom, #8a4d05) 100%);
    box-shadow: inset 0 0 14px rgba(255, 207, 72, 0.7), 0 0 18px rgba(255, 200, 80, 0.5);
  }
  .bar-fill.chat {
    background: linear-gradient(180deg,
      var(--e-bar-chat-top, #a37bff) 0%,
      var(--e-bar-chat-bottom, #4f2ebf) 100%);
    box-shadow: inset 0 0 12px rgba(163, 123, 255, 0.6);
  }
  .bar-fill.chat.max {
    background: linear-gradient(180deg,
      var(--e-bar-max-top, #ffe399) 0%,
      var(--e-bar-max-mid, #f4b441) 50%,
      var(--e-bar-max-bottom, #8a4d05) 100%);
    box-shadow: inset 0 0 14px rgba(255, 207, 72, 0.7), 0 0 18px rgba(255, 200, 80, 0.5);
  }
  .chat-total {
    text-align: center;
    color: var(--e-chat-total-color, #c4b5ff);
    font-family: var(--e-chat-total-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    font-size: var(--e-chat-total-size, 16px);
    margin-bottom: 10px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.7);
    letter-spacing: 0.5px;
  }
  .chat-card .card-title {
    color: var(--e-title-color-chat, #d4c0ff);
    text-shadow: 0 0 12px rgba(163, 123, 255, 0.55), 0 2px 4px rgba(0,0,0,0.7);
  }
  .chat-card .bar-letter {
    color: var(--e-bar-letter-color-chat, #d4c0ff);
    text-shadow: 0 0 8px rgba(163, 123, 255, 0.7);
  }
  .audience-card.animating .bar-pct {
    color: #ffcf48;
    letter-spacing: 2px;
  }
  .bar-label {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-family: var(--e-bar-label-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    color: #fff;
    text-shadow: var(--e-bar-label-text-shadow, 0 2px 4px rgba(0,0,0,0.7));
  }
  .bar-letter {
    color: var(--e-bar-letter-color, #ffcf48);
    font-weight: var(--e-bar-letter-weight, 800);
    font-size: var(--e-bar-letter-size, 32px);
    text-shadow: 0 0 8px rgba(255, 207, 72, 0.7);
  }
  .bar-pct {
    color: var(--e-bar-pct-color, #fff);
    font-weight: var(--e-bar-pct-weight, 700);
    font-size: var(--e-bar-pct-size, 24px);
    font-variant-numeric: tabular-nums;
  }

  /* ============= PHONE CARD ============= */
  .phone-card {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: clamp(14px, 3vh, 28px);
    background:
      radial-gradient(ellipse at center,
        var(--e-card-fill-center, rgba(40, 90, 200, 0.55)) 0%,
        var(--e-card-fill-outer, rgba(6, 16, 50, 0.95)) 80%),
      linear-gradient(180deg,
        var(--e-card-bg-top, #0d2354) 0%,
        var(--e-card-bg-bottom, #04102f) 100%);
    border: var(--e-card-border-width, 2px) solid var(--e-card-border, #6ea1f0);
    box-shadow:
      0 0 0 2px var(--e-card-inset, #1a3a82) inset,
      0 0 var(--e-card-glow-blur, 32px) var(--e-card-glow, rgba(110, 161, 240, 0.55)),
      var(--e-card-box-shadow, 0 10px 28px rgba(0,0,0,0.55));
    border-radius: var(--e-card-radius, 18px);
    padding: 24px;
    box-sizing: border-box;
  }
  .phone-icon {
    font-size: clamp(48px, 8vh, 96px);
    filter: drop-shadow(0 0 18px rgba(255, 207, 72, 0.55));
    animation: phone-shake 0.6s ease-in-out infinite alternate;
  }
  @keyframes phone-shake {
    from { transform: rotate(-8deg); }
    to   { transform: rotate(8deg); }
  }
  .phone-bubble {
    max-width: 80%;
    padding: 18px 28px;
    background: var(--e-phone-bg, rgba(255, 207, 72, 0.1));
    border: var(--e-phone-border-width, 2px) solid var(--e-phone-border, #ffcf48);
    border-radius: var(--e-phone-radius, 14px);
    box-shadow: 0 0 var(--e-phone-glow-blur, 22px) var(--e-phone-glow, rgba(255, 207, 72, 0.35));
  }
  .phone-quote {
    font-family: var(--e-phone-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    color: var(--e-phone-color, #fff);
    font-size: var(--e-phone-size, 30px);
    font-weight: var(--e-phone-weight, 600);
    text-align: center;
    line-height: var(--e-phone-line-height, 1.3);
    text-shadow: var(--e-phone-text-shadow, 0 2px 4px rgba(0,0,0,0.7));
    display: block;
  }
</style>
