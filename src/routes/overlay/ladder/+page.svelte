<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";
  import { PRIZE_LADDER } from "$lib/prizeLadder";

  onMount(() => { initOverlayListener(); });

  // Anzeige von oben (höchste Stufe) nach unten
  const rows = $derived([...PRIZE_LADDER].reverse());
</script>

<OverlayTitleBar title="WWSM Overlay — Geldleiter" />

<div class="ladder" class:edit={overlayState.editMode}>
  {#each rows as step (step.level)}
    {@const isCurrent = step.level === overlayState.currentLevelIndex + 1}
    <div class="row" class:current={isCurrent} class:safe={step.safe}>
      <span class="level">{step.level}</span>
      <span class="amount">{step.label}</span>
    </div>
  {/each}
</div>

<style>
  :global(html), :global(body) { background: transparent !important; }

  /* Wichtig: gesamte Höhe nutzen, jede Zeile shrinkt mit. */
  .ladder {
    width: 100vw;
    height: 100vh;
    display: flex; flex-direction: column;
    gap: clamp(2px, 0.5vh, 6px);
    padding: clamp(6px, 1.2vh, 12px);
    box-sizing: border-box;
    font-family: "Trebuchet MS", "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
    overflow: hidden;                /* nie scrollen */
  }
  .ladder.edit { padding-top: clamp(32px, 4.5vh, 40px); }

  .row {
    flex: 1 1 0;
    min-height: 0;                   /* erlaubt Shrinken */
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(8px, 2vw, 18px);
    border-radius: 9999px;
    background:
      radial-gradient(ellipse at center, rgba(60, 110, 200, 0.45) 0%, rgba(8, 20, 60, 0.9) 75%),
      linear-gradient(180deg, #0d2354, #04102f);
    border: 2px solid #6ea1f0;
    box-shadow:
      0 0 0 1px #1a3a82 inset,
      0 3px 10px rgba(0,0,0,0.45);
    color: #fff;
    font-weight: 600;
    font-size: clamp(11px, 1.8vh, 17px);
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  }
  .level { color: #9bb6f0; font-variant-numeric: tabular-nums; min-width: 22px; }
  .amount { color: #ffd97a; }
  .row.safe { box-shadow: 0 0 0 2px #b07815 inset, 0 3px 10px rgba(0,0,0,0.45); border-color: #ffcf48; }
  .row.current {
    background:
      radial-gradient(ellipse at center, rgba(255, 200, 90, 0.9) 0%, rgba(180, 110, 10, 1) 75%),
      linear-gradient(180deg, #f4be4c, #a86610);
    border-color: #ffd97a;
    box-shadow:
      0 0 0 2px #b07815 inset,
      0 0 22px rgba(255, 200, 90, 0.7),
      0 5px 16px rgba(0,0,0,0.5);
    color: #2a1500;
    text-shadow: none;
  }
  .row.current .level, .row.current .amount { color: #2a1500; }
</style>
