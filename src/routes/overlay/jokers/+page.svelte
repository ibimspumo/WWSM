<script lang="ts">
  import { onMount } from "svelte";
  import { initOverlayListener, overlayState } from "$lib/overlayState.svelte";
  import { styling } from "$lib/styling.svelte";
  import OverlayTitleBar from "$lib/components/OverlayTitleBar.svelte";

  onMount(() => { initOverlayListener(); });

  const jokers = ["fifty", "phone", "audience", "chat"] as const;

  const styleVars = $derived(styling.styleStringFor("jokers"));
</script>

<OverlayTitleBar title="WWSM Overlay — Joker" />

<div class="bar" class:edit={overlayState.editMode} style={styleVars}>
  {#each jokers as kind (kind)}
    {@const used = overlayState.jokersUsed.includes(kind)}
    <div class="joker" class:used>
      <div class="joker-orb">
        {#if kind === "fifty"}
          <span class="joker-text">50:50</span>
        {:else if kind === "phone"}
          <!-- Lucide: phone -->
          <svg class="joker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--j-icon-stroke, 2.2)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        {:else if kind === "audience"}
          <!-- Lucide: users -->
          <svg class="joker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--j-icon-stroke, 2.2)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        {:else}
          <!-- Lucide: message-circle (Chat-Joker) -->
          <svg class="joker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="var(--j-icon-stroke, 2.2)" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        {/if}
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
  }
  .bar.edit { padding-top: 36px; }
  .joker {
    position: relative;
    width: var(--j-orb-size, 110px);
    height: var(--j-orb-size, 110px);
    display: flex; align-items: center; justify-content: center;
  }
  .joker-orb {
    width: 100%; height: 100%;
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%,
        var(--j-orb-highlight, rgba(180,210,255,0.7)) 0%,
        var(--j-orb-mid, rgba(40, 80, 170, 0.95)) 55%,
        var(--j-orb-deep, rgba(8, 20, 60, 1)) 100%);
    border: var(--j-orb-border-width, 3px) solid var(--j-orb-border, #6ea1f0);
    box-shadow:
      0 0 0 2px var(--j-orb-inset-color, #1a3a82) inset,
      0 0 var(--j-orb-glow-blur, 24px) var(--j-orb-glow, rgba(110, 161, 240, 0.6)),
      var(--j-orb-box-shadow, 0 6px 18px rgba(0,0,0,0.5));
    display: flex; align-items: center; justify-content: center;
    color: var(--j-text-color, #ffcf48);
    font-family: var(--j-text-font, "Segoe UI", "Helvetica Neue", system-ui, sans-serif);
    font-size: var(--j-text-size, 28px);
    font-weight: var(--j-text-weight, 800);
    text-shadow: var(--j-text-text-shadow, 0 2px 6px rgba(0,0,0,0.6));
    transition: filter 0.2s, opacity 0.2s;
  }
  .joker.used .joker-orb {
    filter: grayscale(1) brightness(0.6);
    opacity: var(--j-used-opacity, 0.5);
  }
  .joker.used::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(
      45deg,
      transparent calc(50% - 3px),
      var(--j-cross-color, #e64b4b) calc(50% - 1px),
      var(--j-cross-highlight, #ff8a8a) calc(50% + 1px),
      transparent calc(50% + 3px)
    );
    border-radius: 50%;
    pointer-events: none;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
  }
  .joker-text { line-height: 1; letter-spacing: -0.02em; }
  .joker-icon {
    width: var(--j-icon-size, 52px);
    height: var(--j-icon-size, 52px);
    color: var(--j-icon-color, #ffcf48);
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.55));
  }
</style>
