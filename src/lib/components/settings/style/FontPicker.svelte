<script lang="ts">
  // Custom Combobox:
  //   - Trigger-Button zeigt aktuell gewählten Stack in seiner eigenen Schrift
  //   - Popover öffnet ein Suchfeld + virtualisierte Liste (~1700 Familien)
  //   - Sichtbare Zeilen laden ihren Font on-the-fly für Live-Preview
  //   - Oben: kuratierte Schnellauswahl (System-Stacks + ~20 Google Fonts)
  //   - Darunter: kompletter Google-Fonts-Katalog (alphabetisch, gefiltert)

  import { onMount, tick } from "svelte";
  import { FONT_CHOICES } from "$lib/styleSchema";
  import { fontRegistry, type GoogleFont } from "$lib/fontRegistry.svelte";
  import { ensureFontFamily, ensureFontLoaded, primaryFamily, buildFontStack } from "$lib/fontLoader";

  let { value, onChange }: { value: string; onChange: (v: string) => void } = $props();

  let open = $state(false);
  let query = $state("");
  let listEl: HTMLDivElement | undefined = $state();
  let triggerEl: HTMLButtonElement | undefined = $state();
  let searchEl: HTMLInputElement | undefined = $state();
  let scrollTop = $state(0);
  const ROW_H = 36;
  const VIEWPORT_H = 360;
  const BUFFER = 4;

  // Registry beim ersten Open lazy laden
  $effect(() => {
    if (open && !fontRegistry.loaded && !fontRegistry.loading) {
      fontRegistry.load();
    }
  });

  // Item-Typ: entweder kurierter Eintrag oder ein Google-Font aus der Registry.
  type Row =
    | { kind: "header"; label: string }
    | { kind: "curated"; label: string; value: string; family: string | null }
    | { kind: "google"; family: string; category: string; weights: number[] };

  // Suche normalisieren
  const q = $derived(query.trim().toLowerCase());

  const curatedRows = $derived<Row[]>([
    { kind: "header", label: "Schnellauswahl" },
    ...FONT_CHOICES.filter((c) => !q || c.label.toLowerCase().includes(q)).map(
      (c) => ({ kind: "curated", label: c.label, value: c.value, family: primaryFamily(c.value) }) satisfies Row,
    ),
  ]);

  const googleRows = $derived.by<Row[]>(() => {
    if (!fontRegistry.loaded) return [];
    const filtered = q
      ? fontRegistry.fonts.filter((f) => f.family.toLowerCase().includes(q))
      : fontRegistry.fonts;
    if (filtered.length === 0) return [];
    return [
      { kind: "header", label: `Alle Google Fonts (${filtered.length})` },
      ...filtered.map((f) => ({ kind: "google", family: f.family, category: f.category, weights: f.weights }) satisfies Row),
    ];
  });

  // Wir trennen kuratierte und Google-Reihen nur durch Header-Items.
  const rows = $derived<Row[]>([
    ...(curatedRows.length > 1 ? curatedRows : []),
    ...googleRows,
  ]);

  // Virtual-Window
  const firstIndex = $derived(Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER));
  const lastIndex = $derived(Math.min(rows.length, firstIndex + Math.ceil(VIEWPORT_H / ROW_H) + BUFFER * 2));
  const visibleRows = $derived(rows.slice(firstIndex, lastIndex));
  const totalHeight = $derived(rows.length * ROW_H);

  // Preview-Fonts laden, sobald eine Zeile sichtbar ist.
  $effect(() => {
    for (const r of visibleRows) {
      if (r.kind === "curated" && r.family) {
        ensureFontLoaded(r.value);
      } else if (r.kind === "google") {
        // Preview: nur Weight 400 (sparsam — komplette Weights erst beim Auswählen)
        ensureFontFamily(r.family, [400]);
      }
    }
  });

  function onScroll(e: Event) {
    scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
  }

  async function openPicker() {
    open = true;
    await tick();
    scrollTop = 0;
    if (listEl) listEl.scrollTop = 0;
    searchEl?.focus();
  }

  function closePicker() {
    open = false;
    query = "";
  }

  function pickCurated(r: Extract<Row, { kind: "curated" }>) {
    onChange(r.value);
    ensureFontLoaded(r.value);
    closePicker();
  }

  function pickGoogle(r: Extract<Row, { kind: "google" }>) {
    const stack = buildFontStack(r.family, r.category);
    onChange(stack);
    // alle Weights für tatsächliche Nutzung nachladen
    ensureFontFamily(r.family, r.weights);
    closePicker();
  }

  function onDocClick(e: MouseEvent) {
    if (!open) return;
    const target = e.target as Node;
    if (triggerEl?.contains(target)) return;
    if (listEl?.parentElement?.contains(target)) return;
    closePicker();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      closePicker();
      triggerEl?.focus();
    }
  }

  onMount(() => {
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  });

  // Bezeichnung im Trigger: kuratierter Label, sonst Familie aus Stack.
  const currentLabel = $derived.by(() => {
    const c = FONT_CHOICES.find((x) => x.value === value);
    if (c) return c.label;
    return primaryFamily(value) ?? value;
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="font-picker">
  <button
    bind:this={triggerEl}
    type="button"
    class="trigger"
    style="font-family: {value};"
    onclick={() => (open ? closePicker() : openPicker())}
    aria-haspopup="listbox"
    aria-expanded={open}
  >
    <span class="label">{currentLabel}</span>
    <span class="caret">▾</span>
  </button>

  {#if open}
    <div class="popover" role="dialog">
      <div class="search-row">
        <input
          bind:this={searchEl}
          class="search"
          type="search"
          bind:value={query}
          placeholder="Schriftart suchen…"
          autocomplete="off"
        />
        {#if fontRegistry.loading}
          <span class="status">Lädt Liste…</span>
        {:else if fontRegistry.error}
          <button class="status err" onclick={() => fontRegistry.refresh()} title={fontRegistry.error}>
            Fehler – nochmal
          </button>
        {:else if fontRegistry.loaded}
          <span class="status muted">{fontRegistry.fonts.length} Fonts</span>
        {/if}
      </div>

      <div
        bind:this={listEl}
        class="list"
        style="height: {VIEWPORT_H}px;"
        onscroll={onScroll}
      >
        <div class="virt" style="height: {totalHeight}px;">
          {#if rows.length === 0}
            <div class="empty">
              {#if !fontRegistry.loaded && fontRegistry.loading}
                Lade Google-Fonts-Liste…
              {:else if !fontRegistry.loaded && fontRegistry.error}
                Liste nicht ladbar — nur kuratierte Schnellauswahl verfügbar.
              {:else}
                Nichts gefunden.
              {/if}
            </div>
          {:else}
            {#each visibleRows as row, i (firstIndex + i)}
              {@const idx = firstIndex + i}
              <div class="row-wrap" style="top: {idx * ROW_H}px; height: {ROW_H}px;">
                {#if row.kind === "header"}
                  <div class="row-header">{row.label}</div>
                {:else if row.kind === "curated"}
                  <button
                    type="button"
                    class="row row-pick"
                    class:active={value === row.value}
                    style="font-family: {row.value};"
                    onclick={() => pickCurated(row)}
                  >
                    <span class="row-label">{row.label}</span>
                    <span class="row-meta">System / Kuriert</span>
                  </button>
                {:else}
                  {@const stack = buildFontStack(row.family, row.category)}
                  <button
                    type="button"
                    class="row row-pick"
                    class:active={value === stack || primaryFamily(value) === row.family}
                    style="font-family: {stack};"
                    onclick={() => pickGoogle(row)}
                  >
                    <span class="row-label">{row.family}</span>
                    <span class="row-meta">
                      <span class="cat">{row.category.toLowerCase().replace("_", " ")}</span>
                      <span class="weights">{row.weights.length}w</span>
                    </span>
                  </button>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .font-picker {
    position: relative;
    width: 100%;
  }
  .trigger {
    width: 100%;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    color: #e6ecff;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
    text-align: left;
  }
  .trigger:hover { background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.18); }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .caret { color: #6c93e8; font-size: 11px; flex-shrink: 0; }

  .popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 50;
    background: #0d1530;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    overflow: hidden;
    display: flex; flex-direction: column;
    min-width: 260px;
  }

  .search-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .search {
    flex: 1;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.12);
    color: #e6ecff;
    padding: 5px 8px;
    border-radius: 5px;
    font-size: 12px;
  }
  .search:focus {
    outline: none;
    border-color: #6c93e8;
  }
  .status {
    font-size: 10px;
    color: #c5d0ee;
    background: rgba(255,255,255,0.06);
    padding: 3px 6px;
    border-radius: 4px;
    border: none;
  }
  .status.muted { color: #8aa0d0; }
  .status.err {
    background: rgba(230, 75, 75, 0.18);
    color: #ff9a9a;
    cursor: pointer;
  }

  .list {
    overflow-y: auto;
    overflow-x: hidden;
  }
  .virt {
    position: relative;
  }
  .empty {
    padding: 24px;
    text-align: center;
    color: #8aa0d0;
    font-size: 12px;
  }

  .row-wrap {
    position: absolute;
    left: 0;
    right: 0;
    padding: 0 4px;
    box-sizing: border-box;
  }
  .row-header {
    height: 100%;
    display: flex; align-items: center;
    padding: 0 12px;
    color: #8aa0d0;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
    border-top: 1px solid rgba(255,255,255,0.04);
  }
  .row {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
    padding: 0 12px;
    background: transparent;
    border: none;
    color: #e6ecff;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
  }
  .row:hover { background: rgba(255,255,255,0.06); }
  .row.active {
    background: linear-gradient(180deg, rgba(70,113,214,0.4), rgba(42,78,170,0.4));
    color: #fff;
  }
  .row-label {
    font-size: 17px;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-meta {
    font-size: 10px;
    color: #8aa0d0;
    font-family: "Segoe UI", system-ui, sans-serif;
    display: flex; gap: 6px;
    flex-shrink: 0;
  }
  .cat {
    text-transform: capitalize;
  }
  .weights {
    background: rgba(108, 147, 232, 0.18);
    color: #c5d0ee;
    padding: 1px 5px;
    border-radius: 3px;
  }
</style>
