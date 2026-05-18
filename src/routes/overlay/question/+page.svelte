<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";
  import type { AnswerIndex } from "$lib/types";

  onMount(() => { initOverlayListener(); });

  const phase = $derived(overlayState.phase);
  const q = $derived(overlayState.question);
  const removed = $derived(new Set(overlayState.removedAnswers));
  const revealed = $derived(
    phase === "reveal" || phase === "won-level" || phase === "won-game" || phase === "lost",
  );
</script>

<OverlayTitleBar title="WWSM Overlay — Frage" />

{#if q && (phase === "question" || phase === "locked" || phase === "reveal" || phase === "won-level" || phase === "won-game" || phase === "lost")}
  <div class="stage" class:edit={overlayState.editMode}>
    <!-- Frage-Panel -->
    <div class="panel question-panel">
      <div class="panel-inner question-inner">
        <span class="question-text">{q.q}</span>
      </div>
    </div>

    <!-- Antworten 2×2 -->
    <div class="answers">
      {#each q.a as text, i (i)}
        {@const idx = i as AnswerIndex}
        {@const isRemoved = removed.has(idx)}
        {@const isSelected = overlayState.selectedAnswer === idx && phase === "question"}
        {@const isLocked = overlayState.lockedAnswer === idx}
        {@const isCorrect = revealed && idx === q.correct}
        {@const isWrongLocked = revealed && isLocked && idx !== q.correct}
        {@const lockedYellow = phase === "locked" && isLocked}
        {@const variant = isCorrect ? "correct"
          : isWrongLocked ? "wrong"
          : (isSelected || lockedYellow) ? "selected"
          : "default"}
        <div class="answer-slot" class:hidden={isRemoved}>
          <div class="panel answer-panel" data-variant={variant}>
            <div class="panel-inner answer-inner">
              <span class="marker" aria-hidden="true">◆</span>
              <span class="letter">{["A", "B", "C", "D"][i]}:</span>
              <span class="answer-text">{text}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  :global(html), :global(body) { background: transparent !important; }

  .stage {
    width: 100vw; height: 100vh;
    display: flex; flex-direction: column;
    gap: 10px;
    padding: 8px 22px 12px;
    box-sizing: border-box;
    font-family: "Trebuchet MS", "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  }
  .stage.edit { padding-top: 32px; }

  /* ============= GEMEINSAME WWM-FORM ============= */
  /* Outer = leuchtende Border (cyan/hellblau), Inner = dunkles Innenfeld.
     clip-path erzeugt die schrägen Spitzen links/rechts (Hexagon-Stil). */

  .panel {
    position: relative;
    padding: 2px;                                      /* Border-Stärke */
    background: linear-gradient(180deg, #9ed0ff 0%, #5d8fd6 35%, #1a3a82 100%);
    clip-path: polygon(
      var(--notch, 22px) 0,
      calc(100% - var(--notch, 22px)) 0,
      100% 50%,
      calc(100% - var(--notch, 22px)) 100%,
      var(--notch, 22px) 100%,
      0 50%
    );
    filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55));
  }
  .panel-inner {
    position: relative;
    height: 100%;
    background:
      radial-gradient(ellipse at center, #1a52b5 0%, #0a2363 55%, #050f33 100%);
    clip-path: polygon(
      var(--notch, 22px) 0,
      calc(100% - var(--notch, 22px)) 0,
      100% 50%,
      calc(100% - var(--notch, 22px)) 100%,
      var(--notch, 22px) 100%,
      0 50%
    );
    color: #fff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: flex-start;
  }

  /* ============= FRAGE-PANEL ============= */
  .question-panel {
    --notch: 30px;
    flex: 1 1 0;
    min-height: 0;
    max-height: 30%;
  }
  .question-inner {
    padding: 4px 56px;
    justify-content: center;
  }
  .question-text {
    font-size: clamp(18px, 3vh, 26px);
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    letter-spacing: 0.2px;
  }

  /* ============= ANTWORT-GRID ============= */
  .answers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 10px 22px;
    flex: 2 1 0;
    min-height: 0;
  }
  .answer-slot { display: flex; min-height: 0; }
  .answer-slot.hidden { visibility: hidden; }

  .answer-panel {
    --notch: 22px;
    flex: 1;
    min-height: 0;
    transition: filter 0.2s;
  }
  .answer-inner {
    padding: 0 30px 0 22px;
    gap: 10px;
  }
  .marker {
    color: #ffcf48;
    font-size: clamp(10px, 1.8vh, 14px);
    text-shadow: 0 0 6px rgba(255, 207, 72, 0.7);
  }
  .letter {
    color: #ffcf48;
    font-weight: 800;
    font-size: clamp(16px, 2.6vh, 22px);
    text-shadow: 0 0 6px rgba(255, 207, 72, 0.6), 0 2px 4px rgba(0,0,0,0.75);
    letter-spacing: 0.5px;
  }
  .answer-text {
    color: #fff;
    font-weight: 600;
    font-size: clamp(16px, 2.6vh, 22px);
    letter-spacing: 0.3px;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ============= ZUSTAND: SELECTED / LOCKED (orange-gold) ============= */
  .answer-panel[data-variant="selected"] {
    background: linear-gradient(180deg, #ffe399 0%, #f4b441 40%, #8a4d05 100%);
    animation: pulse-selected 1.8s ease-in-out infinite alternate;
  }
  .answer-panel[data-variant="selected"] .panel-inner {
    background: radial-gradient(ellipse at center, #f8b840 0%, #c97a1a 60%, #6e3b07 100%);
  }
  .answer-panel[data-variant="selected"] .marker,
  .answer-panel[data-variant="selected"] .letter { color: #fff; text-shadow: 0 0 6px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.55); }
  .answer-panel[data-variant="selected"] .answer-text { color: #fff; }

  @keyframes pulse-selected {
    from { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 6px rgba(255, 180, 60, 0.4)); }
    to   { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 22px rgba(255, 200, 80, 0.95)); }
  }

  /* ============= ZUSTAND: CORRECT (grün) ============= */
  .answer-panel[data-variant="correct"] {
    background: linear-gradient(180deg, #aef0c2 0%, #4ec97a 40%, #0b5d2b 100%);
    animation: pulse-correct 0.85s ease-in-out infinite alternate;
  }
  .answer-panel[data-variant="correct"] .panel-inner {
    background: radial-gradient(ellipse at center, #43d172 0%, #1a8a44 60%, #073d1c 100%);
  }
  .answer-panel[data-variant="correct"] .marker,
  .answer-panel[data-variant="correct"] .letter { color: #fff; text-shadow: 0 0 6px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.55); }
  .answer-panel[data-variant="correct"] .answer-text { color: #fff; }

  @keyframes pulse-correct {
    from { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 8px rgba(80, 220, 140, 0.45)); }
    to   { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(120, 240, 170, 1)); }
  }

  /* ============= ZUSTAND: WRONG (rot) ============= */
  .answer-panel[data-variant="wrong"] {
    background: linear-gradient(180deg, #ffb1b1 0%, #e64b4b 40%, #5a1313 100%);
  }
  .answer-panel[data-variant="wrong"] .panel-inner {
    background: radial-gradient(ellipse at center, #e23939 0%, #921818 60%, #350707 100%);
  }
  .answer-panel[data-variant="wrong"] .marker,
  .answer-panel[data-variant="wrong"] .letter { color: #fff; }
  .answer-panel[data-variant="wrong"] .answer-text { color: #fff; }
</style>
