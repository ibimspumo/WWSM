<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";
  import type { AnswerIndex } from "$lib/types";

  onMount(() => { initOverlayListener(); });

  const votes = $derived(overlayState.audienceVotes);
  const phoneHint = $derived(overlayState.phoneHint);
  const letters: ReadonlyArray<["A" | "B" | "C" | "D", AnswerIndex]> = [
    ["A", 0], ["B", 1], ["C", 2], ["D", 3],
  ];
  // höchster Anteil — für Hervorhebung des Mehrheits-Balkens
  const maxVote = $derived(votes ? Math.max(votes[0], votes[1], votes[2], votes[3]) : 0);
</script>

<OverlayTitleBar title="WWSM Overlay — Joker-Effekt" />

<div class="stage" class:edit={overlayState.editMode}>
  {#if votes}
    <!-- Publikumsjoker-Diagramm -->
    <div class="audience-card">
      <h2 class="card-title">Publikum</h2>
      <div class="bars">
        {#each letters as [label, i] (label)}
          {@const pct = votes[i]}
          {@const isMax = pct === maxVote && maxVote > 0}
          <div class="bar-col">
            <div class="bar-track">
              <div class="bar-fill" class:max={isMax} style="height: {Math.max(2, pct)}%"></div>
            </div>
            <div class="bar-label">
              <span class="bar-letter">{label}</span>
              <span class="bar-pct">{pct}%</span>
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
    font-family: "Trebuchet MS", "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  }
  .stage.edit { padding-top: 40px; }

  /* ============= AUDIENCE CARD ============= */
  .audience-card {
    width: 100%;
    height: 100%;
    background:
      radial-gradient(ellipse at center, rgba(40, 90, 200, 0.55) 0%, rgba(6, 16, 50, 0.95) 80%),
      linear-gradient(180deg, #0d2354 0%, #04102f 100%);
    border: 2px solid #6ea1f0;
    box-shadow:
      0 0 0 2px #1a3a82 inset,
      0 0 32px rgba(110, 161, 240, 0.55),
      0 10px 28px rgba(0,0,0,0.55);
    border-radius: 18px;
    padding: 22px 28px 18px;
    box-sizing: border-box;
    display: flex; flex-direction: column;
  }
  .card-title {
    margin: 0 0 14px;
    font-size: clamp(20px, 3vh, 30px);
    font-weight: 700;
    text-align: center;
    color: #ffcf48;
    text-shadow: 0 0 12px rgba(255, 207, 72, 0.6), 0 2px 4px rgba(0,0,0,0.7);
    letter-spacing: 1px;
    text-transform: uppercase;
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
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(110, 161, 240, 0.4);
    border-radius: 6px;
    display: flex; flex-direction: column; justify-content: flex-end;
    overflow: hidden;
    min-height: 0;
  }
  .bar-fill {
    background: linear-gradient(180deg, #6ea1f0 0%, #2a4eaa 100%);
    box-shadow: inset 0 0 12px rgba(110, 161, 240, 0.6);
    transition: height 0.5s ease;
  }
  .bar-fill.max {
    background: linear-gradient(180deg, #ffe399 0%, #f4b441 50%, #8a4d05 100%);
    box-shadow: inset 0 0 14px rgba(255, 207, 72, 0.7), 0 0 18px rgba(255, 200, 80, 0.5);
  }
  .bar-label {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.7);
  }
  .bar-letter {
    color: #ffcf48;
    font-weight: 800;
    font-size: clamp(20px, 3vh, 32px);
    text-shadow: 0 0 8px rgba(255, 207, 72, 0.7);
  }
  .bar-pct {
    font-weight: 700;
    font-size: clamp(16px, 2.4vh, 24px);
    font-variant-numeric: tabular-nums;
  }

  /* ============= PHONE CARD ============= */
  .phone-card {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: clamp(14px, 3vh, 28px);
    background:
      radial-gradient(ellipse at center, rgba(40, 90, 200, 0.55) 0%, rgba(6, 16, 50, 0.95) 80%),
      linear-gradient(180deg, #0d2354 0%, #04102f 100%);
    border: 2px solid #6ea1f0;
    box-shadow:
      0 0 0 2px #1a3a82 inset,
      0 0 32px rgba(110, 161, 240, 0.55),
      0 10px 28px rgba(0,0,0,0.55);
    border-radius: 18px;
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
    background: rgba(255, 207, 72, 0.1);
    border: 2px solid #ffcf48;
    border-radius: 14px;
    box-shadow: 0 0 22px rgba(255, 207, 72, 0.35);
  }
  .phone-quote {
    color: #fff;
    font-size: clamp(20px, 3vh, 30px);
    font-weight: 600;
    text-align: center;
    line-height: 1.3;
    text-shadow: 0 2px 4px rgba(0,0,0,0.7);
    display: block;
  }
</style>
