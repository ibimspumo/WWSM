<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { overlayState } from "$lib/overlayState.svelte";

  let { title }: { title: string } = $props();

  async function startDrag(e: MouseEvent) {
    // Verhindere Drag-Start, wenn auf Button geklickt wurde
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.preventDefault();
    await getCurrentWindow().startDragging();
  }

  async function minimize() {
    await getCurrentWindow().minimize();
  }

  async function hide() {
    await getCurrentWindow().hide();
  }
</script>

{#if overlayState.editMode}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="titlebar" onmousedown={startDrag}>
    <span class="title">{title}</span>
    <div class="actions" data-no-drag>
      <button
        class="btn"
        title="Minimieren"
        onclick={minimize}
        aria-label="Minimieren">–</button>
      <button
        class="btn close"
        title="Verstecken (Steuerfenster zum Wiederanzeigen nutzen)"
        onclick={hide}
        aria-label="Verstecken">×</button>
    </div>
  </div>
{/if}

<style>
  .titlebar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 28px;
    background: rgba(8, 18, 48, 0.92);
    border-bottom: 1px solid rgba(110, 161, 240, 0.5);
    color: #c9d6f7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px 0 12px;
    font-family: "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
    z-index: 10000;
    user-select: none;
    cursor: grab;
  }
  .titlebar:active { cursor: grabbing; }
  .title {
    pointer-events: none;
    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
  }
  .actions { display: flex; gap: 4px; }
  .btn {
    width: 22px; height: 20px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.06);
    color: #c9d6f7;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 0;
  }
  .btn:hover { background: rgba(255,255,255,0.16); }
  .btn.close:hover { background: #e64b4b; color: #fff; border-color: #f29f9f; }
</style>
