<script lang="ts">
  import { styling } from "$lib/styling.svelte";
  import { STYLE_SCHEMA, type WindowSchema } from "$lib/styleSchema";
  import StyleField from "./style/StyleField.svelte";
  import PresetBar from "./style/PresetBar.svelte";

  type WinId = WindowSchema["id"];
  let activeWindow = $state<WinId>("question");

  // Aufgeklappte Gruppen pro Window — Erweiterungs-Status persistiert nicht.
  let openGroups = $state<Record<string, boolean>>({});
  function toggle(key: string) {
    openGroups = { ...openGroups, [key]: !openGroups[key] };
  }

  const current = $derived(STYLE_SCHEMA.find((w) => w.id === activeWindow)!);
</script>

<div class="styling">
  <header>
    <h3>Styling</h3>
    <p class="lead">
      Jede Änderung wird sofort live in alle Overlay-Fenster gespiegelt.
      Per Fenster auswählbar, in logische Gruppen sortiert. Preset speichern,
      um zwischen Looks zu wechseln.
    </p>
  </header>

  <PresetBar />

  <nav class="window-tabs">
    {#each STYLE_SCHEMA as w (w.id)}
      <button
        class="wtab"
        class:active={activeWindow === w.id}
        onclick={() => (activeWindow = w.id)}
      >{w.label}</button>
    {/each}
    <button
      class="reset-window"
      onclick={() => styling.resetWindow(activeWindow)}
      title="Alle Styles dieses Fensters zurücksetzen"
    >↺ „{current.label}" zurücksetzen</button>
  </nav>

  <div class="groups">
    {#each current.groups as group (group.id)}
      {@const key = `${current.id}.${group.id}`}
      {@const open = openGroups[key] ?? false}
      <section class="group" class:open>
        <div class="group-head-row">
          <button
            class="group-head"
            onclick={() => toggle(key)}
            aria-expanded={open}
          >
            <span class="chevron">{open ? "▾" : "▸"}</span>
            <span class="group-label">{group.label}</span>
            {#if group.hint}<span class="group-hint">— {group.hint}</span>{/if}
          </button>
          <button
            class="group-reset"
            onclick={() => styling.resetGroup(current.id, group.id)}
            title="Diese Gruppe zurücksetzen"
            aria-label="Gruppe zurücksetzen"
          >↺</button>
        </div>
        {#if open}
          <div class="group-body">
            {#each group.fields as field (field.cssVar)}
              <StyleField {field} />
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>

<style>
  .styling {
    display: flex; flex-direction: column;
    gap: 14px;
  }
  header h3 {
    margin: 0 0 4px;
    font-size: 18px;
    color: #fff;
  }
  .lead {
    margin: 0;
    font-size: 12px;
    color: #93a8d6;
    line-height: 1.4;
  }

  .window-tabs {
    display: flex; gap: 6px; flex-wrap: wrap;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding-bottom: 8px;
  }
  .wtab {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #c5d0ee;
    padding: 7px 14px;
    border-radius: 7px 7px 0 0;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.12s, border-color 0.12s;
  }
  .wtab:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .wtab.active {
    background: linear-gradient(180deg, rgba(70,113,214,0.45), rgba(42,78,170,0.45));
    color: #fff;
    border-color: rgba(108,147,232,0.5);
  }
  .reset-window {
    margin-left: auto;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: #93a8d6;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
  }
  .reset-window:hover { background: rgba(255,255,255,0.06); color: #fff; }

  .groups {
    display: flex; flex-direction: column;
    gap: 6px;
  }
  .group {
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    overflow: hidden;
  }
  .group.open { background: rgba(0,0,0,0.28); }
  .group-head-row {
    display: flex; align-items: center;
  }
  .group-head {
    flex: 1;
    background: transparent;
    border: none;
    color: #c5d0ee;
    text-align: left;
    padding: 10px 12px;
    display: flex; align-items: center; gap: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  .group-head:hover { background: rgba(255,255,255,0.04); }
  .chevron {
    color: #6c93e8;
    font-size: 11px;
    width: 12px;
    text-align: center;
  }
  .group-label { font-weight: 600; }
  .group-hint { color: #8aa0d0; font-size: 11px; font-weight: 400; }
  .group-reset {
    margin-right: 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #93a8d6;
    width: 22px; height: 22px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0;
    flex-shrink: 0;
  }
  .group-reset:hover { background: rgba(255,255,255,0.1); color: #fff; }

  .group-body {
    padding: 6px 12px 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
</style>
