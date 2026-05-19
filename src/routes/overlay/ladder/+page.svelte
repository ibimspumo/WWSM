<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import { styling } from "$lib/styling.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";
  import { PRIZE_LADDER } from "$lib/prizeLadder";

  onMount(() => { initOverlayListener(); });

  // Anzeige von oben (höchste Stufe) nach unten
  const rows = $derived([...PRIZE_LADDER].reverse());
  const styleVars = $derived(styling.styleStringFor("ladder"));
</script>

<OverlayTitleBar title="WWSM Overlay — Geldleiter" />

<div class="ladder" class:edit={overlayState.editMode} style={styleVars}>
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
    font-family: var(--l-row-font, "Trebuchet MS", "Segoe UI", system-ui, sans-serif);
    overflow: hidden;
  }
  .ladder.edit { padding-top: clamp(32px, 4.5vh, 40px); }

  .row {
    flex: 1 1 0;
    min-height: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 clamp(8px, 2vw, 18px);
    border-radius: var(--l-row-radius, 9999px);
    background:
      radial-gradient(ellipse at center,
        var(--l-row-fill-center, rgba(60, 110, 200, 0.45)) 0%,
        var(--l-row-fill-outer, rgba(8, 20, 60, 0.9)) 75%),
      linear-gradient(180deg,
        var(--l-row-bg-top, #0d2354),
        var(--l-row-bg-bottom, #04102f));
    border: var(--l-row-border-width, 2px) solid var(--l-row-border, #6ea1f0);
    box-shadow:
      0 0 0 1px var(--l-row-inset, #1a3a82) inset,
      var(--l-row-box-shadow, 0 3px 10px rgba(0,0,0,0.45));
    color: #fff;
    font-weight: var(--l-row-weight, 600);
    font-size: var(--l-row-size, 17px);
    text-shadow: var(--l-row-text-shadow, 0 1px 4px rgba(0,0,0,0.6));
  }
  .level {
    color: var(--l-level-color, #9bb6f0);
    font-variant-numeric: tabular-nums;
    min-width: 22px;
  }
  .amount { color: var(--l-amount-color, #ffd97a); }
  .row.safe {
    box-shadow: 0 0 0 2px var(--l-safe-inset, #b07815) inset, var(--l-row-box-shadow, 0 3px 10px rgba(0,0,0,0.45));
    border-color: var(--l-safe-border, #ffcf48);
  }
  .row.current {
    background:
      radial-gradient(ellipse at center,
        var(--l-cur-fill-center, rgba(255, 200, 90, 0.9)) 0%,
        var(--l-cur-fill-outer, rgba(180, 110, 10, 1)) 75%),
      linear-gradient(180deg,
        var(--l-cur-bg-top, #f4be4c),
        var(--l-cur-bg-bottom, #a86610));
    border-color: var(--l-cur-border, #ffd97a);
    box-shadow:
      0 0 0 2px var(--l-cur-inset, #b07815) inset,
      0 0 var(--l-cur-glow-blur, 22px) var(--l-cur-glow, rgba(255, 200, 90, 0.7)),
      var(--l-row-box-shadow, 0 5px 16px rgba(0,0,0,0.5));
    color: var(--l-cur-text, #2a1500);
    text-shadow: none;
  }
  .row.current .level, .row.current .amount { color: var(--l-cur-text, #2a1500); }
</style>
