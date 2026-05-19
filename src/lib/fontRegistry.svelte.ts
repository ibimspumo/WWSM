// Lädt die komplette Google-Fonts-Liste vom inoffiziellen Endpoint
// `https://fonts.google.com/metadata/fonts`. Der Response ist JSON mit
// `)]}'`-Prefix (Anti-JSON-Hijacking-Schutz) — wir trimmen das vorm Parsen.
//
// Caching: Ergebnis wird in localStorage gehalten. Refresh nach 7 Tagen
// (oder bei manuellem Reload). Bei Fehlern bleibt die App funktionsfähig
// — der FontPicker fällt dann auf System + kuratierte Liste zurück.

const CACHE_KEY = "wwsm:googlefonts:v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage
const ENDPOINT = "https://fonts.google.com/metadata/fonts";

export type FontCategory = "SANS_SERIF" | "SERIF" | "DISPLAY" | "HANDWRITING" | "MONOSPACE" | "OTHER";

export interface GoogleFont {
  family: string;
  category: FontCategory;
  /** Sortierte Liste aller verfügbaren Standard-Weights (300, 400, 700, …). */
  weights: number[];
}

interface CachedShape {
  ts: number;
  fonts: GoogleFont[];
}

function normalizeCategory(cat: unknown): FontCategory {
  if (typeof cat !== "string") return "OTHER";
  const c = cat.toUpperCase().replace(/-/g, "_").replace(/ /g, "_");
  if (c === "SANS_SERIF" || c === "SERIF" || c === "DISPLAY" || c === "HANDWRITING" || c === "MONOSPACE") return c;
  return "OTHER";
}

/** Liest die Weights aus dem `fonts`-Objekt (Keys wie "100", "400", "700i") und extrahiert die ganzen Zahlen. */
function extractWeights(fontsObj: unknown): number[] {
  if (!fontsObj || typeof fontsObj !== "object") return [400];
  const ws = new Set<number>();
  for (const key of Object.keys(fontsObj as Record<string, unknown>)) {
    const m = key.match(/^(\d+)/);
    if (m) {
      const w = Number(m[1]);
      if (w >= 100 && w <= 900) ws.add(w);
    }
  }
  if (ws.size === 0) ws.add(400);
  return [...ws].sort((a, b) => a - b);
}

interface RawFamily {
  family?: string;
  category?: string;
  fonts?: unknown;
  axes?: unknown;
}

interface RawResponse {
  familyMetadataList?: RawFamily[];
}

function parseResponse(raw: string): GoogleFont[] {
  let text = raw.trimStart();
  if (text.startsWith(")]}'")) {
    text = text.slice(4).trimStart();
  }
  const json = JSON.parse(text) as RawResponse;
  const list = Array.isArray(json.familyMetadataList) ? json.familyMetadataList : [];
  const out: GoogleFont[] = [];
  for (const f of list) {
    if (!f || typeof f.family !== "string") continue;
    out.push({
      family: f.family,
      category: normalizeCategory(f.category),
      weights: extractWeights(f.fonts),
    });
  }
  // alphabetisch sortieren — Picker zeigt dann von oben nach unten A→Z
  out.sort((a, b) => a.family.localeCompare(b.family));
  return out;
}

class FontRegistry {
  fonts = $state<GoogleFont[]>([]);
  loaded = $state(false);
  loading = $state(false);
  error = $state<string | null>(null);
  lastFetchAt = $state<number | null>(null);

  private byFamily = new Map<string, GoogleFont>();

  get(family: string): GoogleFont | undefined {
    return this.byFamily.get(family);
  }

  has(family: string): boolean {
    return this.byFamily.has(family);
  }

  private setFonts(fonts: GoogleFont[], ts: number | null) {
    this.fonts = fonts;
    this.byFamily = new Map(fonts.map((f) => [f.family, f]));
    this.lastFetchAt = ts;
  }

  private readCache(): CachedShape | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CachedShape>;
      if (typeof parsed.ts !== "number" || !Array.isArray(parsed.fonts)) return null;
      return parsed as CachedShape;
    } catch {
      return null;
    }
  }

  private writeCache(fonts: GoogleFont[]) {
    if (typeof localStorage === "undefined") return;
    try {
      const data: CachedShape = { ts: Date.now(), fonts };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Quota o.ä. ignorieren
    }
  }

  /** Lädt aus Cache (sofort sichtbar) und stößt im Hintergrund ggf. Refresh an. */
  async load(force = false): Promise<void> {
    if (this.loading) return;
    // Cache nutzen, falls vorhanden
    const cached = this.readCache();
    if (cached && !force) {
      this.setFonts(cached.fonts, cached.ts);
      this.loaded = true;
      // Refresh nur wenn älter als TTL
      if (Date.now() - cached.ts < CACHE_TTL_MS) return;
    }
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = null;
    try {
      const res = await fetch(ENDPOINT, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const fonts = parseResponse(text);
      if (fonts.length === 0) throw new Error("Leere Antwort");
      this.setFonts(fonts, Date.now());
      this.writeCache(fonts);
      this.loaded = true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      // Wenn wir aus dem Cache vorgeladen haben, bleibt `loaded=true`; sonst false.
    } finally {
      this.loading = false;
    }
  }
}

export const fontRegistry = new FontRegistry();
