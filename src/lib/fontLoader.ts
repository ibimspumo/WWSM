// Lädt Google-Fonts on-demand. Wird sowohl im Steuerfenster (für die Live-Vorschau
// im Settings-Tab) als auch in jedem Overlay-Fenster aufgerufen — jedes Fenster
// hat seinen eigenen DOM und braucht das <link>-Tag separat.
//
// Unterstützt zwei Wege:
//   - Kuratierte Liste in FONT_CHOICES (mit explizitem googleFamily/weights)
//   - Beliebige Familie via Google-Fonts-Registry (alle Weights der Familie)

import { FONT_CHOICES, type FontChoice } from "./styleSchema";
import { fontRegistry } from "./fontRegistry.svelte";

const loaded = new Set<string>();

function findChoice(fontValue: string): FontChoice | undefined {
  return FONT_CHOICES.find((c) => c.value === fontValue);
}

/** Extrahiert den ersten, gequoteten Familiennamen aus einem CSS-font-family-Stack. */
export function primaryFamily(stack: string): string | null {
  if (typeof stack !== "string") return null;
  const m = stack.match(/^\s*"([^"]+)"/) || stack.match(/^\s*'([^']+)'/);
  return m?.[1] ?? null;
}

function ensurePreconnect() {
  if (typeof document === "undefined") return;
  if (document.getElementById("wwsm-fonts-preconnect-1")) return;
  const a = document.createElement("link");
  a.id = "wwsm-fonts-preconnect-1";
  a.rel = "preconnect";
  a.href = "https://fonts.googleapis.com";
  document.head.appendChild(a);
  const b = document.createElement("link");
  b.id = "wwsm-fonts-preconnect-2";
  b.rel = "preconnect";
  b.href = "https://fonts.gstatic.com";
  b.crossOrigin = "anonymous";
  document.head.appendChild(b);
}

function appendFontLink(href: string, key: string) {
  if (typeof document === "undefined") return;
  if (loaded.has(key)) return;
  loaded.add(key);
  ensurePreconnect();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.wwsmFont = key;
  document.head.appendChild(link);
}

/** Lädt eine Familie explizit per Name (z. B. aus dem FontPicker fürs Live-Preview). */
export function ensureFontFamily(family: string, weights?: number[]) {
  if (!family) return;
  const ws = (weights && weights.length > 0 ? weights : [400, 700]).slice().sort((a, b) => a - b);
  const key = `${family}|${ws.join(",")}`;
  if (loaded.has(key)) return;
  const fam = family.replace(/ /g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${fam}:wght@${ws.join(";")}&display=swap`;
  appendFontLink(href, key);
}

/** Wird mit dem CSS-font-family-Wert aus dem Schema aufgerufen — entscheidet, ob/was zu laden ist. */
export function ensureFontLoaded(fontValue: string) {
  if (typeof document === "undefined" || !fontValue) return;
  // 1) Kuratierter Eintrag mit expliziten Weights?
  const choice = findChoice(fontValue);
  if (choice?.googleFamily) {
    const key = `${choice.googleFamily}|${choice.googleWeights ?? ""}`;
    if (loaded.has(key)) return;
    const family = choice.googleFamily.replace(/ /g, "+");
    const weights = choice.googleWeights ? `:${choice.googleWeights}` : "";
    const href = `https://fonts.googleapis.com/css2?family=${family}${weights}&display=swap`;
    appendFontLink(href, key);
    return;
  }
  // 2) Beliebige Familie — via Registry-Lookup laden, oder Heuristik (alle gängigen Weights).
  const family = primaryFamily(fontValue);
  if (!family) return;
  const meta = fontRegistry.get(family);
  if (meta) {
    ensureFontFamily(family, meta.weights);
  } else {
    // Registry noch nicht geladen oder Familie unbekannt — System-Font; trotzdem versuchen
    // mit Standard-Weights, falls es doch ein Google-Font ist (Google ignoriert unbekannte
    // Familien dann via 404 ohne Schaden).
    ensureFontFamily(family, [400, 600, 700]);
  }
}

/** Alle Schriftarten in einem Wert-Dict laden (für initialen Snapshot). */
export function ensureFontsForValues(values: Record<string, unknown>) {
  for (const [, v] of Object.entries(values)) {
    if (typeof v === "string" && (v.includes('"') || v.includes("'"))) {
      ensureFontLoaded(v);
    }
  }
}

/** Baut den Standard-Stack-String für eine beliebige Google-Familie, der dann in
 *  `styling.values` landet. Fallback-Stack abhängig von Kategorie. */
export function buildFontStack(family: string, category: string): string {
  const fallback =
    category === "SERIF" ? "Georgia, serif"
    : category === "MONOSPACE" ? "Consolas, monospace"
    : category === "HANDWRITING" ? "cursive"
    : category === "DISPLAY" ? "Impact, sans-serif"
    : "system-ui, sans-serif";
  return `"${family}", ${fallback}`;
}
