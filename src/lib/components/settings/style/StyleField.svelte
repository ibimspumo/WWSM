<script lang="ts">
  // Generischer Field-Editor — rendert je nach `field.type` das passende Input.
  // Schreibt direkt in `styling.values` über `setValue()`.

  import { styling } from "$lib/styling.svelte";
  import { type Field } from "$lib/styleSchema";
  import { ensureFontLoaded } from "$lib/fontLoader";
  import FontPicker from "./FontPicker.svelte";

  let { field }: { field: Field } = $props();

  const value = $derived(styling.values[field.cssVar]);

  function setNumber(v: string) {
    const n = Number(v);
    if (Number.isFinite(n)) styling.setValue(field.cssVar, n);
  }

  function setColor(v: string) {
    styling.setValue(field.cssVar, v);
  }

  function setFont(v: string) {
    styling.setValue(field.cssVar, v);
    ensureFontLoaded(v);
  }

  // ===== Color-Helper: arbeitet auf hex (#rrggbb) für den nativen Picker,
  // erlaubt zusätzlich Freitext (rgba, hsl …) im Text-Input daneben.

  function toHexInput(v: unknown): string {
    if (typeof v !== "string") return "#000000";
    if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v.slice(0, 7);
    // einfache rgba-Konvertierung
    const m = v.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (m) {
      const [r, g, b] = [m[1], m[2], m[3]].map((s) => Number(s));
      return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
    }
    return "#000000";
  }

  // ===== Shadow-Helper

  type ShadowVal = { x: number; y: number; blur: number; spread?: number; color: string };

  function getShadow(): ShadowVal {
    const v = value as ShadowVal | undefined;
    if (v && typeof v === "object") return v;
    return { x: 0, y: 0, blur: 0, spread: 0, color: "rgba(0,0,0,0.5)" };
  }

  function setShadow(patch: Partial<ShadowVal>) {
    const cur = getShadow();
    styling.setValue(field.cssVar, { ...cur, ...patch });
  }
</script>

<div class="field">
  <div class="field-head">
    <label for={field.cssVar}>{field.label}</label>
    <button
      class="reset-btn"
      title="Auf Standard zurücksetzen"
      onclick={() => styling.resetField(field.cssVar)}
      aria-label="Zurücksetzen"
    >↺</button>
  </div>
  {#if field.hint}
    <p class="hint">{field.hint}</p>
  {/if}

  {#if field.type === "color"}
    <div class="row">
      <input
        type="color"
        id={field.cssVar}
        value={toHexInput(value)}
        oninput={(e) => setColor((e.currentTarget as HTMLInputElement).value)}
      />
      <input
        class="text-input mono"
        type="text"
        value={value as string}
        oninput={(e) => setColor((e.currentTarget as HTMLInputElement).value)}
        placeholder="#rrggbb oder rgba(...)"
      />
    </div>
  {:else if field.type === "number"}
    <div class="row">
      <input
        type="range"
        id={field.cssVar}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value as number}
        oninput={(e) => setNumber((e.currentTarget as HTMLInputElement).value)}
      />
      <input
        class="num-input"
        type="number"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value as number}
        oninput={(e) => setNumber((e.currentTarget as HTMLInputElement).value)}
      />
      {#if field.unit}
        <span class="unit">{field.unit}</span>
      {/if}
    </div>
  {:else if field.type === "weight"}
    <select
      id={field.cssVar}
      class="select"
      value={String(value ?? 400)}
      onchange={(e) => setNumber((e.currentTarget as HTMLSelectElement).value)}
    >
      {#each [300, 400, 500, 600, 700, 800, 900] as w (w)}
        <option value={String(w)}>{w}</option>
      {/each}
    </select>
  {:else if field.type === "font"}
    <FontPicker value={value as string} onChange={setFont} />
  {:else if field.type === "select"}
    <select
      id={field.cssVar}
      class="select"
      value={value as string}
      onchange={(e) => styling.setValue(field.cssVar, (e.currentTarget as HTMLSelectElement).value)}
    >
      {#each field.options as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  {:else if field.type === "shadow"}
    {@const s = getShadow()}
    <div class="shadow-grid">
      <label class="shadow-cell">
        <span>X</span>
        <input type="number" step="1" value={s.x} oninput={(e) => setShadow({ x: Number((e.currentTarget as HTMLInputElement).value) })} />
      </label>
      <label class="shadow-cell">
        <span>Y</span>
        <input type="number" step="1" value={s.y} oninput={(e) => setShadow({ y: Number((e.currentTarget as HTMLInputElement).value) })} />
      </label>
      <label class="shadow-cell">
        <span>Blur</span>
        <input type="number" step="1" min="0" value={s.blur} oninput={(e) => setShadow({ blur: Number((e.currentTarget as HTMLInputElement).value) })} />
      </label>
      {#if field.kind === "box"}
        <label class="shadow-cell">
          <span>Spread</span>
          <input type="number" step="1" value={s.spread ?? 0} oninput={(e) => setShadow({ spread: Number((e.currentTarget as HTMLInputElement).value) })} />
        </label>
      {/if}
      <label class="shadow-cell color">
        <span>Farbe</span>
        <div class="row tight">
          <input type="color" value={toHexInput(s.color)} oninput={(e) => setShadow({ color: (e.currentTarget as HTMLInputElement).value })} />
          <input class="text-input mono" type="text" value={s.color} oninput={(e) => setShadow({ color: (e.currentTarget as HTMLInputElement).value })} />
        </div>
      </label>
    </div>
  {/if}
</div>

<style>
  .field {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex; flex-direction: column;
    gap: 6px;
  }
  .field-head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 8px;
  }
  label {
    font-size: 12px;
    font-weight: 500;
    color: #c5d0ee;
  }
  .hint {
    font-size: 10px;
    color: #8aa0d0;
    margin: 0;
    line-height: 1.3;
  }
  .reset-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #93a8d6;
    width: 22px; height: 22px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0;
  }
  .reset-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

  .row {
    display: flex; gap: 6px; align-items: center;
  }
  .row.tight { gap: 4px; }
  input[type="color"] {
    width: 32px; height: 28px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 5px;
    background: transparent;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
  }
  input[type="range"] {
    flex: 1;
    accent-color: #6c93e8;
  }
  .num-input, .text-input {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    color: #e6ecff;
    padding: 4px 6px;
    border-radius: 5px;
    font-size: 12px;
  }
  .num-input { width: 64px; }
  .text-input { flex: 1; min-width: 0; }
  .mono { font-family: "Consolas", "JetBrains Mono", monospace; font-size: 11px; }
  .unit { font-size: 11px; color: #8aa0d0; min-width: 18px; }

  .select {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    color: #e6ecff;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 13px;
    width: 100%;
  }
  .select option {
    background: #0d1530;
    color: #fff;
  }

  .shadow-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .shadow-cell {
    display: flex; flex-direction: column;
    gap: 3px;
    font-size: 10px;
    color: #8aa0d0;
  }
  .shadow-cell input[type="number"] {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    color: #e6ecff;
    padding: 4px 6px;
    border-radius: 5px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
  }
  .shadow-cell.color {
    grid-column: 1 / -1;
  }
</style>
