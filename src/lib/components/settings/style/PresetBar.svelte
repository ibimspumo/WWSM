<script lang="ts">
  import { styling } from "$lib/styling.svelte";
  import { ensureFontsForValues } from "$lib/fontLoader";

  let newName = $state("");
  let importJson = $state("");
  let showImport = $state(false);

  const presetNames = $derived(Object.keys(styling.presets).sort());

  function savePreset() {
    const name = newName.trim();
    if (!name) return;
    styling.savePreset(name);
    newName = "";
  }

  function loadPreset(name: string) {
    styling.loadPreset(name);
    ensureFontsForValues(styling.values);
  }

  function deletePreset(name: string) {
    if (!confirm(`Preset „${name}" wirklich löschen?`)) return;
    styling.deletePreset(name);
  }

  function exportToClipboard() {
    const data = styling.exportJson();
    navigator.clipboard.writeText(data).then(
      () => alert("In die Zwischenablage kopiert."),
      () => alert("Konnte nicht kopieren."),
    );
  }

  function importNow() {
    if (!importJson.trim()) return;
    styling.importJson(importJson);
    ensureFontsForValues(styling.values);
    importJson = "";
    showImport = false;
  }

  function resetAll() {
    if (!confirm("Alle Styles auf Standard zurücksetzen?")) return;
    styling.resetAll();
  }
</script>

<div class="preset-bar">
  <div class="row">
    <div class="active-info">
      <span class="label">Aktiv:</span>
      <strong>{styling.activePreset ?? "(unbenannt)"}</strong>
    </div>
    <div class="actions">
      <button class="btn ghost" onclick={resetAll} title="Alle Styles aller Fenster auf Standard">↺ Alles zurücksetzen</button>
      <button class="btn ghost" onclick={exportToClipboard} title="Aktuelle Styles + Presets als JSON kopieren">📋 Exportieren</button>
      <button class="btn ghost" onclick={() => (showImport = !showImport)}>📥 Importieren</button>
    </div>
  </div>

  <div class="row presets-row">
    <div class="preset-chips">
      {#if presetNames.length === 0}
        <span class="muted">Noch keine Presets gespeichert.</span>
      {:else}
        {#each presetNames as name (name)}
          <div class="chip" class:active={styling.activePreset === name}>
            <button class="chip-label" onclick={() => loadPreset(name)} title="Preset laden">{name}</button>
            <button class="chip-del" onclick={() => deletePreset(name)} title="Preset löschen" aria-label="Löschen">×</button>
          </div>
        {/each}
      {/if}
    </div>
    <form class="save-form" onsubmit={(e) => { e.preventDefault(); savePreset(); }}>
      <input
        class="text-input"
        type="text"
        placeholder="Preset-Name…"
        bind:value={newName}
      />
      <button class="btn primary" type="submit" disabled={!newName.trim()}>Speichern</button>
    </form>
  </div>

  {#if showImport}
    <div class="import">
      <label for="import-json">JSON einfügen</label>
      <textarea id="import-json" rows="4" bind:value={importJson} placeholder={'{ "active": { ... }, "presets": { ... } }'}></textarea>
      <div class="import-actions">
        <button class="btn" onclick={importNow} disabled={!importJson.trim()}>Übernehmen</button>
        <button class="btn ghost" onclick={() => { showImport = false; importJson = ""; }}>Abbrechen</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .preset-bar {
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 14px;
    display: flex; flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex; gap: 10px; align-items: center;
    flex-wrap: wrap;
  }
  .active-info {
    font-size: 12px;
    color: #c5d0ee;
  }
  .active-info .label { color: #8aa0d0; margin-right: 4px; }
  .actions {
    margin-left: auto;
    display: flex; gap: 6px;
  }
  .preset-chips {
    display: flex; gap: 6px; flex-wrap: wrap;
    flex: 1;
    min-height: 28px;
    align-items: center;
  }
  .chip {
    display: inline-flex; align-items: center;
    background: rgba(70, 113, 214, 0.18);
    border: 1px solid rgba(108, 147, 232, 0.4);
    border-radius: 6px;
    overflow: hidden;
  }
  .chip.active {
    background: linear-gradient(180deg, rgba(70,113,214,0.5), rgba(42,78,170,0.5));
    border-color: #6c93e8;
  }
  .chip-label, .chip-del {
    background: transparent;
    border: none;
    color: #e6ecff;
    cursor: pointer;
    font-size: 12px;
    padding: 4px 8px;
  }
  .chip-label { font-weight: 500; }
  .chip-del {
    padding: 4px 6px;
    color: #ff9a9a;
    font-weight: 700;
  }
  .chip-label:hover { background: rgba(255,255,255,0.06); }
  .chip-del:hover { background: rgba(230, 75, 75, 0.2); }
  .muted { color: #8aa0d0; font-size: 12px; }

  .save-form { display: flex; gap: 6px; }
  .text-input {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    color: #e6ecff;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 12px;
    width: 160px;
  }
  .btn {
    cursor: pointer;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    color: #e6ecff;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
  }
  .btn:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.primary {
    background: linear-gradient(180deg, #4671d6, #2a4eaa);
    border-color: #6c93e8;
  }
  .btn.ghost { background: transparent; }

  .import {
    display: flex; flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: rgba(0,0,0,0.3);
    border-radius: 6px;
  }
  .import label { font-size: 11px; color: #8aa0d0; }
  .import textarea {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    color: #e6ecff;
    padding: 6px 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 11px;
    resize: vertical;
  }
  .import-actions { display: flex; gap: 6px; }
</style>
