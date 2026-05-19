// Zentrale, persistierte Styling-Konfiguration. Hält:
// - das aktive Wert-Dictionary (gekeyed nach CSS-Variable, inkl. `--`-Prefix)
// - die benannten Presets
// - eine `formatted`-Ableitung als fertige CSS-`style`-String pro Window
//
// Auf dem Steuerfenster wird `styling.values` reaktiv via Tauri-Event
// `wwsm:style` an alle Overlays broadcastet. Overlays übernehmen den Snapshot
// und applyen die Variablen auf ihren Root-Container.
//
// Snapshots werden vollständig getauscht (kein Patch-Mechanismus), damit Spät-
// Mounts via `wwsm:request-style` einen aktuellen Stand bekommen.

import { allFields, defaultValues, formatCssValue, STYLE_SCHEMA, type Field, type WindowSchema } from "./styleSchema";

const STORAGE_KEY = "wwsm:styling:v1";

export interface PersistedStyling {
  active: Record<string, unknown>;
  presets: Record<string, Record<string, unknown>>;
  activePreset: string | null;
}

class Styling {
  /** Wert-Dictionary. Key: CSS-Variable inkl. `--`. */
  values = $state<Record<string, unknown>>(defaultValues());

  /** Benannte Presets (Name → Werte-Dictionary). */
  presets = $state<Record<string, Record<string, unknown>>>({});

  /** Welches Preset zuletzt geladen/gespeichert wurde. `null` = unbenannt/„geändert“. */
  activePreset = $state<string | null>(null);

  /** Hilfs-Lookup von cssVar → Field für schnelle Format-Lookups. */
  private fieldByVar = new Map<string, Field>(allFields().map((f) => [f.cssVar, f]));

  /** Liefert eine fertige `style`-Attribut-Zeichenkette für ein bestimmtes Window. */
  styleStringFor(windowId: WindowSchema["id"]): string {
    const win = STYLE_SCHEMA.find((w) => w.id === windowId);
    if (!win) return "";
    const parts: string[] = [];
    for (const g of win.groups) {
      for (const f of g.fields) {
        const v = this.values[f.cssVar];
        if (v === undefined || v === null) continue;
        parts.push(`${f.cssVar}: ${formatCssValue(f, v)}`);
      }
    }
    return parts.join("; ");
  }

  /** Komplettes Wert-Dict für alle Windows als CSS-Variable-String (für Settings-Vorschau). */
  styleStringAll(): string {
    const parts: string[] = [];
    for (const f of this.fieldByVar.values()) {
      const v = this.values[f.cssVar];
      if (v === undefined || v === null) continue;
      parts.push(`${f.cssVar}: ${formatCssValue(f, v)}`);
    }
    return parts.join("; ");
  }

  setValue(cssVar: string, value: unknown) {
    this.values = { ...this.values, [cssVar]: value };
    // Sobald der User manuell ändert, ist das aktive Preset entkoppelt.
    if (this.activePreset !== null) this.activePreset = null;
  }

  resetField(cssVar: string) {
    const f = this.fieldByVar.get(cssVar);
    if (!f) return;
    this.setValue(cssVar, (f as { default: unknown }).default);
  }

  resetGroup(windowId: WindowSchema["id"], groupId: string) {
    const win = STYLE_SCHEMA.find((w) => w.id === windowId);
    const grp = win?.groups.find((g) => g.id === groupId);
    if (!grp) return;
    const patch: Record<string, unknown> = {};
    for (const f of grp.fields) patch[f.cssVar] = (f as { default: unknown }).default;
    this.values = { ...this.values, ...patch };
    this.activePreset = null;
  }

  resetWindow(windowId: WindowSchema["id"]) {
    const win = STYLE_SCHEMA.find((w) => w.id === windowId);
    if (!win) return;
    const patch: Record<string, unknown> = {};
    for (const g of win.groups) for (const f of g.fields) patch[f.cssVar] = (f as { default: unknown }).default;
    this.values = { ...this.values, ...patch };
    this.activePreset = null;
  }

  resetAll() {
    this.values = defaultValues();
    this.activePreset = "Default";
  }

  applySnapshot(snap: Record<string, unknown>) {
    // Nur bekannte Felder übernehmen; alles andere ignorieren, damit Schema-
    // Erweiterungen rückwärtskompatibel bleiben.
    const next: Record<string, unknown> = { ...defaultValues() };
    for (const [k, v] of Object.entries(snap)) {
      if (this.fieldByVar.has(k)) next[k] = v;
    }
    this.values = next;
  }

  // ============== Presets ==============

  savePreset(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.presets = { ...this.presets, [trimmed]: { ...this.values } };
    this.activePreset = trimmed;
  }

  loadPreset(name: string) {
    const p = this.presets[name];
    if (!p) return;
    this.values = { ...defaultValues(), ...p };
    this.activePreset = name;
  }

  deletePreset(name: string) {
    if (!(name in this.presets)) return;
    const { [name]: _, ...rest } = this.presets;
    this.presets = rest;
    if (this.activePreset === name) this.activePreset = null;
  }

  renamePreset(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || !(oldName in this.presets) || trimmed === oldName) return;
    const next = { ...this.presets, [trimmed]: this.presets[oldName] };
    delete next[oldName];
    this.presets = next;
    if (this.activePreset === oldName) this.activePreset = trimmed;
  }

  exportJson(): string {
    return JSON.stringify(
      { active: this.values, presets: this.presets, activePreset: this.activePreset },
      null,
      2,
    );
  }

  importJson(json: string) {
    try {
      const parsed = JSON.parse(json) as Partial<PersistedStyling>;
      if (parsed.presets && typeof parsed.presets === "object") {
        this.presets = parsed.presets as Record<string, Record<string, unknown>>;
      }
      if (parsed.active && typeof parsed.active === "object") {
        this.applySnapshot(parsed.active as Record<string, unknown>);
      }
      if (typeof parsed.activePreset === "string" || parsed.activePreset === null) {
        this.activePreset = parsed.activePreset ?? null;
      }
    } catch (e) {
      console.warn("Styling-Import fehlgeschlagen:", e);
    }
  }

  // ============== Persistenz ==============

  load() {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedStyling>;
      if (parsed.presets && typeof parsed.presets === "object") {
        this.presets = parsed.presets as Record<string, Record<string, unknown>>;
      }
      if (parsed.active && typeof parsed.active === "object") {
        this.applySnapshot(parsed.active as Record<string, unknown>);
      }
      if (typeof parsed.activePreset === "string" || parsed.activePreset === null) {
        this.activePreset = parsed.activePreset ?? null;
      }
    } catch {
      // ignorieren — fehlerhafte Daten → Defaults
    }
  }

  save() {
    if (typeof localStorage === "undefined") return;
    try {
      const data: PersistedStyling = {
        active: this.values,
        presets: this.presets,
        activePreset: this.activePreset,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota o.ä. ignorieren
    }
  }
}

export const styling = new Styling();
