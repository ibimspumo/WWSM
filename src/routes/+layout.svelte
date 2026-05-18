<script lang="ts">
  import { page } from "$app/state";
  let { children } = $props();

  const isOverlay = $derived(page.url.pathname.startsWith("/overlay"));
</script>

<svelte:head>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    body { font-family: "Segoe UI", "Helvetica Neue", system-ui, sans-serif; color: #fff; }
  </style>
</svelte:head>

{#if isOverlay}
  <div class="overlay-root">
    {@render children?.()}
  </div>
{:else}
  <div class="control-root">
    {@render children?.()}
  </div>
{/if}

<style>
  .overlay-root {
    min-height: 100vh;
    background: transparent;
  }
  .control-root {
    min-height: 100vh;
    background: linear-gradient(180deg, #0b1530 0%, #050a1a 100%);
    color: #e6ecff;
  }
</style>
