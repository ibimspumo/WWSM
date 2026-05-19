<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import { styling } from "$lib/styling.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";
  import type { AnswerIndex } from "$lib/types";

  onMount(() => { initOverlayListener(); });

  const phase = $derived(overlayState.phase);
  const q = $derived(overlayState.question);
  const removed = $derived(new Set(overlayState.removedAnswers));
  const revealed = $derived(
    phase === "reveal" || phase === "won-level" || phase === "won-game" || phase === "lost",
  );

  // Style-Variablen für dieses Fenster als kompakter String fürs `style`-Attribut.
  const styleVars = $derived(styling.styleStringFor("question"));
</script>

<OverlayTitleBar title="WWSM Overlay — Frage" />

{#if q && (phase === "question" || phase === "locked" || phase === "reveal" || phase === "won-level" || phase === "won-game" || phase === "lost")}
  <div class="stage" class:edit={overlayState.editMode} style={styleVars}>
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
  }
  .stage.edit { padding-top: 32px; }

  /* ============= GEMEINSAME WWM-FORM ============= */
  /* Outer = leuchtende Border (cyan/hellblau), Inner = dunkles Innenfeld.
     clip-path erzeugt die schrägen Spitzen links/rechts (Hexagon-Stil).
     Alle Farben/Werte über CSS-Variablen vom Styling-Tab steuerbar. */

  .panel {
    position: relative;
    padding: var(--q-border-width, 2px);
    clip-path: polygon(
      var(--notch, 22px) 0,
      calc(100% - var(--notch, 22px)) 0,
      100% 50%,
      calc(100% - var(--notch, 22px)) 100%,
      var(--notch, 22px) 100%,
      0 50%
    );
    filter: drop-shadow(var(--q-question-box-shadow, 0 6px 14px rgba(0,0,0,0.55)));
  }
  .panel-inner {
    position: relative;
    height: 100%;
    clip-path: polygon(
      var(--notch, 22px) 0,
      calc(100% - var(--notch, 22px)) 0,
      100% 50%,
      calc(100% - var(--notch, 22px)) 100%,
      var(--notch, 22px) 100%,
      0 50%
    );
    text-shadow: var(--q-question-text-shadow, 0 2px 4px rgba(0,0,0,0.75));
    display: flex; align-items: center; justify-content: flex-start;
  }

  /* ============= FRAGE-PANEL ============= */
  .question-panel {
    --notch: var(--q-question-notch, 30px);
    --q-border-width: var(--q-question-border-width, 2px);
    background: linear-gradient(
      180deg,
      var(--q-question-border-top, #9ed0ff) 0%,
      var(--q-question-border-mid, #5d8fd6) 35%,
      var(--q-question-border-bottom, #1a3a82) 100%
    );
    filter: drop-shadow(var(--q-question-box-shadow, 0 6px 14px rgba(0,0,0,0.55)));
    flex: 1 1 0;
    min-height: 0;
    max-height: 30%;
  }
  .question-panel .panel-inner {
    background: radial-gradient(
      ellipse at center,
      var(--q-question-fill-inner, #1a52b5) 0%,
      var(--q-question-fill-mid, #0a2363) 55%,
      var(--q-question-fill-outer, #050f33) 100%
    );
  }
  .question-inner {
    padding: 4px 56px;
    justify-content: center;
  }
  .question-text {
    font-family: var(--q-question-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    font-size: var(--q-question-size, 26px);
    font-weight: var(--q-question-weight, 600);
    color: var(--q-question-color, #fff);
    text-align: center;
    line-height: var(--q-question-line-height, 1.2);
    letter-spacing: var(--q-question-letter-spacing, 0.2px);
    text-shadow: var(--q-question-text-shadow, 0 2px 4px rgba(0,0,0,0.75));
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
    --notch: var(--q-answer-notch, 22px);
    --q-border-width: var(--q-answer-border-width, 2px);
    flex: 1;
    min-height: 0;
    transition: filter 0.2s;
    background: linear-gradient(
      180deg,
      var(--q-answer-border-top, #9ed0ff) 0%,
      var(--q-answer-border-mid, #5d8fd6) 35%,
      var(--q-answer-border-bottom, #1a3a82) 100%
    );
    filter: drop-shadow(var(--q-answer-box-shadow, 0 6px 14px rgba(0,0,0,0.55)));
  }
  .answer-panel .panel-inner {
    background: radial-gradient(
      ellipse at center,
      var(--q-answer-fill-inner, #1a52b5) 0%,
      var(--q-answer-fill-mid, #0a2363) 55%,
      var(--q-answer-fill-outer, #050f33) 100%
    );
    text-shadow: var(--q-answer-text-shadow, 0 2px 4px rgba(0,0,0,0.75));
  }
  .answer-inner {
    padding: 0 30px 0 22px;
    gap: 10px;
  }
  .marker {
    color: var(--q-marker-color, #ffcf48);
    font-size: var(--q-marker-size, 14px);
    text-shadow: var(--q-marker-text-shadow, 0 0 6px rgba(255, 207, 72, 0.7));
  }
  .letter {
    font-family: var(--q-letter-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    color: var(--q-letter-color, #ffcf48);
    font-weight: var(--q-letter-weight, 800);
    font-size: var(--q-letter-size, 22px);
    text-shadow: var(--q-letter-text-shadow, 0 0 6px rgba(255, 207, 72, 0.6), 0 2px 4px rgba(0,0,0,0.75));
    letter-spacing: var(--q-letter-letter-spacing, 0.5px);
  }
  .answer-text {
    font-family: var(--q-answer-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    color: var(--q-answer-color, #fff);
    font-weight: var(--q-answer-weight, 600);
    font-size: var(--q-answer-size, 22px);
    letter-spacing: var(--q-answer-letter-spacing, 0.3px);
    line-height: var(--q-answer-line-height, 1.15);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ============= ZUSTAND: SELECTED / LOCKED (orange-gold) ============= */
  .answer-panel[data-variant="selected"] {
    background: linear-gradient(
      180deg,
      var(--q-sel-border-top, #ffe399) 0%,
      var(--q-sel-border-mid, #f4b441) 40%,
      var(--q-sel-border-bottom, #8a4d05) 100%
    );
    animation: pulse-selected 1.8s ease-in-out infinite alternate;
  }
  .answer-panel[data-variant="selected"] .panel-inner {
    background: radial-gradient(
      ellipse at center,
      var(--q-sel-fill-inner, #f8b840) 0%,
      var(--q-sel-fill-mid, #c97a1a) 60%,
      var(--q-sel-fill-outer, #6e3b07) 100%
    );
  }
  .answer-panel[data-variant="selected"] .marker,
  .answer-panel[data-variant="selected"] .letter,
  .answer-panel[data-variant="selected"] .answer-text {
    color: var(--q-sel-text-color, #fff);
  }

  @keyframes pulse-selected {
    from { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 6px rgba(255, 180, 60, 0.4)); }
    to   { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 22px rgba(255, 200, 80, 0.95)); }
  }

  /* ============= ZUSTAND: CORRECT (grün) ============= */
  .answer-panel[data-variant="correct"] {
    background: linear-gradient(
      180deg,
      var(--q-cor-border-top, #aef0c2) 0%,
      var(--q-cor-border-mid, #4ec97a) 40%,
      var(--q-cor-border-bottom, #0b5d2b) 100%
    );
    animation: pulse-correct 0.85s ease-in-out infinite alternate;
  }
  .answer-panel[data-variant="correct"] .panel-inner {
    background: radial-gradient(
      ellipse at center,
      var(--q-cor-fill-inner, #43d172) 0%,
      var(--q-cor-fill-mid, #1a8a44) 60%,
      var(--q-cor-fill-outer, #073d1c) 100%
    );
  }
  .answer-panel[data-variant="correct"] .marker,
  .answer-panel[data-variant="correct"] .letter,
  .answer-panel[data-variant="correct"] .answer-text {
    color: var(--q-cor-text-color, #fff);
  }

  @keyframes pulse-correct {
    from { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 8px rgba(80, 220, 140, 0.45)); }
    to   { filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 28px rgba(120, 240, 170, 1)); }
  }

  /* ============= ZUSTAND: WRONG (rot) ============= */
  .answer-panel[data-variant="wrong"] {
    background: linear-gradient(
      180deg,
      var(--q-wrong-border-top, #ffb1b1) 0%,
      var(--q-wrong-border-mid, #e64b4b) 40%,
      var(--q-wrong-border-bottom, #5a1313) 100%
    );
  }
  .answer-panel[data-variant="wrong"] .panel-inner {
    background: radial-gradient(
      ellipse at center,
      var(--q-wrong-fill-inner, #e23939) 0%,
      var(--q-wrong-fill-mid, #921818) 60%,
      var(--q-wrong-fill-outer, #350707) 100%
    );
  }
  .answer-panel[data-variant="wrong"] .marker,
  .answer-panel[data-variant="wrong"] .letter,
  .answer-panel[data-variant="wrong"] .answer-text {
    color: var(--q-wrong-text-color, #fff);
  }
</style>
