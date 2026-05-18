<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";

  onMount(() => { initOverlayListener(); });

  const jokers = [
    { kind: "fifty", label: "50:50" },
    { kind: "phone", label: "📞" },
    { kind: "audience", label: "👥" },
    { kind: "swap", label: "🔁" },
  ] as const;
</script>

<OverlayTitleBar title="WWSM Overlay — Joker" />

<div class="bar" class:edit={overlayState.editMode}>
  {#each jokers as j (j.kind)}
    {@const used = overlayState.jokersUsed.includes(j.kind)}
    <div class="joker" class:used>
      <div class="joker-orb">
        <span class="joker-label">{j.label}</span>
      </div>
      {#if used}<span class="cross"></span>{/if}
    </div>
  {/each}
</div>

<style>
  :global(html), :global(body) { background: transparent !important; }
  .bar {
    width: 100vw; height: 100vh;
    display: flex; align-items: center; justify-content: center; gap: 22px;
    padding: 12px;
    box-sizing: border-box;
    font-family: "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  }
  .bar.edit { padding-top: 36px; }
  .joker {
    position: relative;
    width: 110px; height: 110px;
    display: flex; align-items: center; justify-content: center;
  }
  .joker-orb {
    width: 100%; height: 100%;
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, rgba(180,210,255,0.7) 0%, rgba(40, 80, 170, 0.95) 55%, rgba(8, 20, 60, 1) 100%);
    border: 3px solid #6ea1f0;
    box-shadow:
      0 0 0 2px #1a3a82 inset,
      0 0 24px rgba(110, 161, 240, 0.6),
      0 6px 18px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    color: #ffcf48;
    font-size: 28px;
    font-weight: 800;
    text-shadow: 0 2px 6px rgba(0,0,0,0.6);
    transition: filter 0.2s, opacity 0.2s;
  }
  .joker.used .joker-orb { filter: grayscale(1) brightness(0.6); opacity: 0.5; }
  .joker.used::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(45deg, transparent calc(50% - 3px), #e64b4b calc(50% - 1px), #ff8a8a calc(50% + 1px), transparent calc(50% + 3px));
    border-radius: 50%;
    pointer-events: none;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
  }
  .joker-label { line-height: 1; }
</style>
