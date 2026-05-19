// Deklaratives Style-Schema. Jede Window-Section listet Gruppen,
// jede Gruppe Felder mit zugehöriger CSS-Variable. Wert-Defaults stammen aus
// dem Original-CSS der Overlay-Pages — wer dort hardcoded Werte ändert, sollte
// auch hier den default mitziehen, sonst weicht das Reset vom Default ab.

export type FieldType = "color" | "number" | "font" | "weight" | "select" | "shadow";

export interface BaseField {
  /** CSS-Variable inkl. `--`-Prefix. Wird im Overlay-Root gesetzt und im CSS via `var(...)` konsumiert. */
  cssVar: string;
  /** Label im Settings-UI (deutsch). */
  label: string;
  /** Kurze Hilfe; optional. */
  hint?: string;
}

export interface ColorField extends BaseField {
  type: "color";
  /** CSS-Color, akzeptiert hex (#rrggbb / #rrggbbaa) und rgba(). */
  default: string;
}

export interface NumberField extends BaseField {
  type: "number";
  default: number;
  min: number;
  max: number;
  step?: number;
  unit?: string; // "px", "em", "%" — wird beim Anwenden angehängt; bei "" nichts
}

export interface FontField extends BaseField {
  type: "font";
  /** Wert ist Font-Family-String (inkl. Fallback-Stack). */
  default: string;
}

export interface WeightField extends BaseField {
  type: "weight";
  default: number;
}

export interface SelectField extends BaseField {
  type: "select";
  default: string;
  options: { label: string; value: string }[];
}

/** Compound-Feld: rendert vier Sub-Inputs (x, y, blur, color) und schreibt einen kombinierten text-shadow- bzw. box-shadow-String. */
export interface ShadowField extends BaseField {
  type: "shadow";
  kind: "text" | "box";
  default: { x: number; y: number; blur: number; color: string; spread?: number };
}

export type Field = ColorField | NumberField | FontField | WeightField | SelectField | ShadowField;

export interface Group {
  id: string;
  label: string;
  /** Vorschau-Hinweis fürs UI. */
  hint?: string;
  fields: Field[];
}

export interface WindowSchema {
  id: "question" | "jokers" | "ladder" | "jokerEffect";
  label: string;
  groups: Group[];
}

// Kuratierte Font-Liste: System-Stacks + populäre Google Fonts.
// Google-Fonts werden zur Laufzeit per <link>-Injection geladen, siehe fontLoader.ts.
export interface FontChoice {
  /** Anzeigename im Dropdown */
  label: string;
  /** CSS font-family Wert (inkl. Fallback). */
  value: string;
  /** Google-Font-Family wenn nachzuladen, sonst undefined. */
  googleFamily?: string;
  /** Gewünschte Weights für Google-Fonts (Komma-getrennte CSS2-API-Syntax wie "wght@400;700"). */
  googleWeights?: string;
}

export const FONT_CHOICES: FontChoice[] = [
  { label: "Trebuchet MS (System)", value: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
  { label: "Segoe UI (System)", value: '"Segoe UI", "Helvetica Neue", system-ui, sans-serif' },
  { label: "Helvetica Neue (System)", value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: "Arial (System)", value: 'Arial, sans-serif' },
  { label: "Verdana (System)", value: 'Verdana, Geneva, sans-serif' },
  { label: "Tahoma (System)", value: 'Tahoma, Geneva, sans-serif' },
  { label: "Georgia (System)", value: 'Georgia, "Times New Roman", serif' },
  { label: "Times New Roman (System)", value: '"Times New Roman", Times, serif' },
  { label: "Courier New (System)", value: '"Courier New", Courier, monospace' },
  { label: "Consolas (System)", value: 'Consolas, "Courier New", monospace' },
  { label: "Impact (System)", value: 'Impact, "Arial Black", sans-serif' },
  // Google Fonts
  { label: "Inter", value: '"Inter", system-ui, sans-serif', googleFamily: "Inter", googleWeights: "wght@400;500;600;700;800" },
  { label: "Roboto", value: '"Roboto", system-ui, sans-serif', googleFamily: "Roboto", googleWeights: "wght@400;500;700;900" },
  { label: "Roboto Condensed", value: '"Roboto Condensed", system-ui, sans-serif', googleFamily: "Roboto Condensed", googleWeights: "wght@400;700" },
  { label: "Open Sans", value: '"Open Sans", system-ui, sans-serif', googleFamily: "Open Sans", googleWeights: "wght@400;600;700;800" },
  { label: "Lato", value: '"Lato", system-ui, sans-serif', googleFamily: "Lato", googleWeights: "wght@400;700;900" },
  { label: "Montserrat", value: '"Montserrat", system-ui, sans-serif', googleFamily: "Montserrat", googleWeights: "wght@400;600;700;800;900" },
  { label: "Poppins", value: '"Poppins", system-ui, sans-serif', googleFamily: "Poppins", googleWeights: "wght@400;600;700;800" },
  { label: "Oswald", value: '"Oswald", system-ui, sans-serif', googleFamily: "Oswald", googleWeights: "wght@400;500;700" },
  { label: "Bebas Neue", value: '"Bebas Neue", system-ui, sans-serif', googleFamily: "Bebas Neue", googleWeights: "wght@400" },
  { label: "Anton", value: '"Anton", system-ui, sans-serif', googleFamily: "Anton", googleWeights: "wght@400" },
  { label: "Teko", value: '"Teko", system-ui, sans-serif', googleFamily: "Teko", googleWeights: "wght@400;500;600;700" },
  { label: "Russo One", value: '"Russo One", system-ui, sans-serif', googleFamily: "Russo One", googleWeights: "wght@400" },
  { label: "Bangers", value: '"Bangers", system-ui, sans-serif', googleFamily: "Bangers", googleWeights: "wght@400" },
  { label: "Press Start 2P", value: '"Press Start 2P", system-ui, monospace', googleFamily: "Press Start 2P", googleWeights: "wght@400" },
  { label: "Orbitron", value: '"Orbitron", system-ui, sans-serif', googleFamily: "Orbitron", googleWeights: "wght@400;600;700;900" },
  { label: "Audiowide", value: '"Audiowide", system-ui, sans-serif', googleFamily: "Audiowide", googleWeights: "wght@400" },
  { label: "Rajdhani", value: '"Rajdhani", system-ui, sans-serif', googleFamily: "Rajdhani", googleWeights: "wght@400;500;600;700" },
  { label: "Exo 2", value: '"Exo 2", system-ui, sans-serif', googleFamily: "Exo 2", googleWeights: "wght@400;600;700;800" },
  { label: "Playfair Display", value: '"Playfair Display", serif', googleFamily: "Playfair Display", googleWeights: "wght@400;600;700;900" },
  { label: "Merriweather", value: '"Merriweather", serif', googleFamily: "Merriweather", googleWeights: "wght@400;700;900" },
  { label: "Cinzel", value: '"Cinzel", serif', googleFamily: "Cinzel", googleWeights: "wght@400;600;700;900" },
  { label: "Bree Serif", value: '"Bree Serif", serif', googleFamily: "Bree Serif", googleWeights: "wght@400" },
  { label: "JetBrains Mono", value: '"JetBrains Mono", monospace', googleFamily: "JetBrains Mono", googleWeights: "wght@400;600;700" },
];

const WEIGHT_VALUES = [300, 400, 500, 600, 700, 800, 900];

function textShadowGroup(prefix: string, defaultColor = "rgba(0,0,0,0.75)"): ShadowField {
  return {
    type: "shadow",
    kind: "text",
    cssVar: `${prefix}-text-shadow`,
    label: "Text-Schatten",
    default: { x: 0, y: 2, blur: 4, color: defaultColor },
  };
}

function boxShadowField(prefix: string, defaultColor = "rgba(0,0,0,0.55)", y = 6, blur = 14): ShadowField {
  return {
    type: "shadow",
    kind: "box",
    cssVar: `${prefix}-box-shadow`,
    label: "Schatten",
    default: { x: 0, y, blur, spread: 0, color: defaultColor },
  };
}

// ============================================================================
// FRAGE-OVERLAY
// ============================================================================

const QUESTION: WindowSchema = {
  id: "question",
  label: "Frage",
  groups: [
    {
      id: "questionPanel",
      label: "Frage-Panel",
      hint: "Hexagonale Form mit Border-Gradient und Innen-Gradient.",
      fields: [
        { type: "color", cssVar: "--q-question-border-top", label: "Border – oben", default: "#9ed0ff" },
        { type: "color", cssVar: "--q-question-border-mid", label: "Border – mitte", default: "#5d8fd6" },
        { type: "color", cssVar: "--q-question-border-bottom", label: "Border – unten", default: "#1a3a82" },
        { type: "color", cssVar: "--q-question-fill-inner", label: "Innen – Zentrum", default: "#1a52b5" },
        { type: "color", cssVar: "--q-question-fill-mid", label: "Innen – Mitte", default: "#0a2363" },
        { type: "color", cssVar: "--q-question-fill-outer", label: "Innen – Rand", default: "#050f33" },
        { type: "number", cssVar: "--q-question-border-width", label: "Border-Stärke", default: 2, min: 0, max: 12, step: 1, unit: "px" },
        { type: "number", cssVar: "--q-question-notch", label: "Spitzen-Tiefe", default: 30, min: 0, max: 80, step: 1, unit: "px" },
        boxShadowField("--q-question"),
      ],
    },
    {
      id: "questionText",
      label: "Frage-Text",
      fields: [
        { type: "font", cssVar: "--q-question-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "weight", cssVar: "--q-question-weight", label: "Schriftstärke", default: 600 },
        { type: "number", cssVar: "--q-question-size", label: "Größe", default: 26, min: 10, max: 80, step: 1, unit: "px" },
        { type: "color", cssVar: "--q-question-color", label: "Farbe", default: "#ffffff" },
        { type: "number", cssVar: "--q-question-letter-spacing", label: "Buchstaben-Abstand", default: 0.2, min: -5, max: 20, step: 0.1, unit: "px" },
        { type: "number", cssVar: "--q-question-line-height", label: "Zeilenhöhe", default: 1.2, min: 0.8, max: 3, step: 0.05, unit: "" },
        textShadowGroup("--q-question"),
      ],
    },
    {
      id: "answerPanel",
      label: "Antwort-Panel (Standard)",
      fields: [
        { type: "color", cssVar: "--q-answer-border-top", label: "Border – oben", default: "#9ed0ff" },
        { type: "color", cssVar: "--q-answer-border-mid", label: "Border – mitte", default: "#5d8fd6" },
        { type: "color", cssVar: "--q-answer-border-bottom", label: "Border – unten", default: "#1a3a82" },
        { type: "color", cssVar: "--q-answer-fill-inner", label: "Innen – Zentrum", default: "#1a52b5" },
        { type: "color", cssVar: "--q-answer-fill-mid", label: "Innen – Mitte", default: "#0a2363" },
        { type: "color", cssVar: "--q-answer-fill-outer", label: "Innen – Rand", default: "#050f33" },
        { type: "number", cssVar: "--q-answer-border-width", label: "Border-Stärke", default: 2, min: 0, max: 12, step: 1, unit: "px" },
        { type: "number", cssVar: "--q-answer-notch", label: "Spitzen-Tiefe", default: 22, min: 0, max: 60, step: 1, unit: "px" },
        boxShadowField("--q-answer"),
      ],
    },
    {
      id: "answerLetter",
      label: "Antwort – Buchstabe (A/B/C/D)",
      fields: [
        { type: "font", cssVar: "--q-letter-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "weight", cssVar: "--q-letter-weight", label: "Schriftstärke", default: 800 },
        { type: "number", cssVar: "--q-letter-size", label: "Größe", default: 22, min: 8, max: 64, step: 1, unit: "px" },
        { type: "color", cssVar: "--q-letter-color", label: "Farbe", default: "#ffcf48" },
        { type: "number", cssVar: "--q-letter-letter-spacing", label: "Buchstaben-Abstand", default: 0.5, min: -5, max: 20, step: 0.1, unit: "px" },
        textShadowGroup("--q-letter", "rgba(255, 207, 72, 0.6)"),
      ],
    },
    {
      id: "answerText",
      label: "Antwort – Text",
      fields: [
        { type: "font", cssVar: "--q-answer-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "weight", cssVar: "--q-answer-weight", label: "Schriftstärke", default: 600 },
        { type: "number", cssVar: "--q-answer-size", label: "Größe", default: 22, min: 8, max: 64, step: 1, unit: "px" },
        { type: "color", cssVar: "--q-answer-color", label: "Farbe", default: "#ffffff" },
        { type: "number", cssVar: "--q-answer-letter-spacing", label: "Buchstaben-Abstand", default: 0.3, min: -5, max: 20, step: 0.1, unit: "px" },
        { type: "number", cssVar: "--q-answer-line-height", label: "Zeilenhöhe", default: 1.15, min: 0.8, max: 3, step: 0.05, unit: "" },
        textShadowGroup("--q-answer"),
      ],
    },
    {
      id: "answerMarker",
      label: "Antwort – Diamant-Marker (◆)",
      fields: [
        { type: "color", cssVar: "--q-marker-color", label: "Farbe", default: "#ffcf48" },
        { type: "number", cssVar: "--q-marker-size", label: "Größe", default: 14, min: 4, max: 40, step: 1, unit: "px" },
        textShadowGroup("--q-marker", "rgba(255, 207, 72, 0.7)"),
      ],
    },
    {
      id: "answerSelected",
      label: "Antwort – Ausgewählt (orange-gold)",
      hint: "Auch der „gesperrt“-Zustand verwendet diesen Look.",
      fields: [
        { type: "color", cssVar: "--q-sel-border-top", label: "Border – oben", default: "#ffe399" },
        { type: "color", cssVar: "--q-sel-border-mid", label: "Border – mitte", default: "#f4b441" },
        { type: "color", cssVar: "--q-sel-border-bottom", label: "Border – unten", default: "#8a4d05" },
        { type: "color", cssVar: "--q-sel-fill-inner", label: "Innen – Zentrum", default: "#f8b840" },
        { type: "color", cssVar: "--q-sel-fill-mid", label: "Innen – Mitte", default: "#c97a1a" },
        { type: "color", cssVar: "--q-sel-fill-outer", label: "Innen – Rand", default: "#6e3b07" },
        { type: "color", cssVar: "--q-sel-text-color", label: "Textfarbe", default: "#ffffff" },
      ],
    },
    {
      id: "answerCorrect",
      label: "Antwort – Richtig (grün)",
      fields: [
        { type: "color", cssVar: "--q-cor-border-top", label: "Border – oben", default: "#aef0c2" },
        { type: "color", cssVar: "--q-cor-border-mid", label: "Border – mitte", default: "#4ec97a" },
        { type: "color", cssVar: "--q-cor-border-bottom", label: "Border – unten", default: "#0b5d2b" },
        { type: "color", cssVar: "--q-cor-fill-inner", label: "Innen – Zentrum", default: "#43d172" },
        { type: "color", cssVar: "--q-cor-fill-mid", label: "Innen – Mitte", default: "#1a8a44" },
        { type: "color", cssVar: "--q-cor-fill-outer", label: "Innen – Rand", default: "#073d1c" },
        { type: "color", cssVar: "--q-cor-text-color", label: "Textfarbe", default: "#ffffff" },
      ],
    },
    {
      id: "answerWrong",
      label: "Antwort – Falsch (rot)",
      fields: [
        { type: "color", cssVar: "--q-wrong-border-top", label: "Border – oben", default: "#ffb1b1" },
        { type: "color", cssVar: "--q-wrong-border-mid", label: "Border – mitte", default: "#e64b4b" },
        { type: "color", cssVar: "--q-wrong-border-bottom", label: "Border – unten", default: "#5a1313" },
        { type: "color", cssVar: "--q-wrong-fill-inner", label: "Innen – Zentrum", default: "#e23939" },
        { type: "color", cssVar: "--q-wrong-fill-mid", label: "Innen – Mitte", default: "#921818" },
        { type: "color", cssVar: "--q-wrong-fill-outer", label: "Innen – Rand", default: "#350707" },
        { type: "color", cssVar: "--q-wrong-text-color", label: "Textfarbe", default: "#ffffff" },
      ],
    },
  ],
};

// ============================================================================
// JOKER-OVERLAY
// ============================================================================

const JOKERS: WindowSchema = {
  id: "jokers",
  label: "Joker",
  groups: [
    {
      id: "orb",
      label: "Joker-Orb",
      fields: [
        { type: "number", cssVar: "--j-orb-size", label: "Größe", default: 110, min: 40, max: 280, step: 2, unit: "px" },
        { type: "color", cssVar: "--j-orb-highlight", label: "Glanzpunkt", default: "rgba(180,210,255,0.7)" },
        { type: "color", cssVar: "--j-orb-mid", label: "Mitte", default: "rgba(40, 80, 170, 0.95)" },
        { type: "color", cssVar: "--j-orb-deep", label: "Tiefe", default: "rgba(8, 20, 60, 1)" },
        { type: "color", cssVar: "--j-orb-border", label: "Border-Farbe", default: "#6ea1f0" },
        { type: "number", cssVar: "--j-orb-border-width", label: "Border-Stärke", default: 3, min: 0, max: 12, step: 1, unit: "px" },
        { type: "color", cssVar: "--j-orb-inset-color", label: "Inset-Glow Farbe", default: "#1a3a82" },
        { type: "color", cssVar: "--j-orb-glow", label: "Außen-Glow Farbe", default: "rgba(110, 161, 240, 0.6)" },
        { type: "number", cssVar: "--j-orb-glow-blur", label: "Glow Unschärfe", default: 24, min: 0, max: 80, step: 1, unit: "px" },
        boxShadowField("--j-orb", "rgba(0,0,0,0.5)", 6, 18),
      ],
    },
    {
      id: "label",
      label: "50:50-Text",
      fields: [
        { type: "font", cssVar: "--j-text-font", label: "Schriftart", default: '"Segoe UI", "Helvetica Neue", system-ui, sans-serif' },
        { type: "weight", cssVar: "--j-text-weight", label: "Schriftstärke", default: 800 },
        { type: "number", cssVar: "--j-text-size", label: "Größe", default: 28, min: 8, max: 80, step: 1, unit: "px" },
        { type: "color", cssVar: "--j-text-color", label: "Farbe", default: "#ffcf48" },
        textShadowGroup("--j-text", "rgba(0,0,0,0.6)"),
      ],
    },
    {
      id: "icon",
      label: "Icons (Telefon/Publikum/Chat)",
      fields: [
        { type: "color", cssVar: "--j-icon-color", label: "Farbe", default: "#ffcf48" },
        { type: "number", cssVar: "--j-icon-size", label: "Größe", default: 52, min: 12, max: 120, step: 1, unit: "px" },
        { type: "number", cssVar: "--j-icon-stroke", label: "Strichstärke", default: 2.2, min: 0.5, max: 6, step: 0.1, unit: "" },
      ],
    },
    {
      id: "used",
      label: "Verbrauchter Joker (Kreuz)",
      fields: [
        { type: "color", cssVar: "--j-cross-color", label: "Kreuz-Farbe", default: "#e64b4b" },
        { type: "color", cssVar: "--j-cross-highlight", label: "Kreuz-Highlight", default: "#ff8a8a" },
        { type: "number", cssVar: "--j-used-opacity", label: "Verbraucht-Opacity", default: 0.5, min: 0, max: 1, step: 0.05, unit: "" },
      ],
    },
  ],
};

// ============================================================================
// LEITER-OVERLAY
// ============================================================================

const LADDER: WindowSchema = {
  id: "ladder",
  label: "Geldleiter",
  groups: [
    {
      id: "row",
      label: "Leiter-Zeile (Standard)",
      fields: [
        { type: "color", cssVar: "--l-row-fill-center", label: "Innen – Zentrum", default: "rgba(60, 110, 200, 0.45)" },
        { type: "color", cssVar: "--l-row-fill-outer", label: "Innen – Rand", default: "rgba(8, 20, 60, 0.9)" },
        { type: "color", cssVar: "--l-row-bg-top", label: "Hintergrund – oben", default: "#0d2354" },
        { type: "color", cssVar: "--l-row-bg-bottom", label: "Hintergrund – unten", default: "#04102f" },
        { type: "color", cssVar: "--l-row-border", label: "Border-Farbe", default: "#6ea1f0" },
        { type: "number", cssVar: "--l-row-border-width", label: "Border-Stärke", default: 2, min: 0, max: 8, step: 1, unit: "px" },
        { type: "color", cssVar: "--l-row-inset", label: "Inset-Border Farbe", default: "#1a3a82" },
        { type: "number", cssVar: "--l-row-radius", label: "Rundung", default: 9999, min: 0, max: 9999, step: 1, unit: "px" },
        boxShadowField("--l-row", "rgba(0,0,0,0.45)", 3, 10),
      ],
    },
    {
      id: "rowText",
      label: "Zeilen-Schrift",
      fields: [
        { type: "font", cssVar: "--l-row-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "weight", cssVar: "--l-row-weight", label: "Schriftstärke", default: 600 },
        { type: "number", cssVar: "--l-row-size", label: "Größe", default: 17, min: 6, max: 64, step: 1, unit: "px" },
        { type: "color", cssVar: "--l-level-color", label: "Stufen-Nummer Farbe", default: "#9bb6f0" },
        { type: "color", cssVar: "--l-amount-color", label: "Betrag-Farbe", default: "#ffd97a" },
        textShadowGroup("--l-row", "rgba(0,0,0,0.6)"),
      ],
    },
    {
      id: "current",
      label: "Aktuelle Stufe (gold)",
      fields: [
        { type: "color", cssVar: "--l-cur-fill-center", label: "Innen – Zentrum", default: "rgba(255, 200, 90, 0.9)" },
        { type: "color", cssVar: "--l-cur-fill-outer", label: "Innen – Rand", default: "rgba(180, 110, 10, 1)" },
        { type: "color", cssVar: "--l-cur-bg-top", label: "Hintergrund – oben", default: "#f4be4c" },
        { type: "color", cssVar: "--l-cur-bg-bottom", label: "Hintergrund – unten", default: "#a86610" },
        { type: "color", cssVar: "--l-cur-border", label: "Border-Farbe", default: "#ffd97a" },
        { type: "color", cssVar: "--l-cur-inset", label: "Inset-Border Farbe", default: "#b07815" },
        { type: "color", cssVar: "--l-cur-text", label: "Textfarbe", default: "#2a1500" },
        { type: "color", cssVar: "--l-cur-glow", label: "Glow-Farbe", default: "rgba(255, 200, 90, 0.7)" },
        { type: "number", cssVar: "--l-cur-glow-blur", label: "Glow Unschärfe", default: 22, min: 0, max: 80, step: 1, unit: "px" },
      ],
    },
    {
      id: "safe",
      label: "Sicherheitsstufe",
      fields: [
        { type: "color", cssVar: "--l-safe-border", label: "Border-Farbe", default: "#ffcf48" },
        { type: "color", cssVar: "--l-safe-inset", label: "Inset-Border Farbe", default: "#b07815" },
      ],
    },
  ],
};

// ============================================================================
// JOKER-EFFEKT-OVERLAY
// ============================================================================

const JOKER_EFFECT: WindowSchema = {
  id: "jokerEffect",
  label: "Joker-Effekt",
  groups: [
    {
      id: "card",
      label: "Karte (Publikum / Telefon)",
      fields: [
        { type: "color", cssVar: "--e-card-fill-center", label: "Innen – Zentrum", default: "rgba(40, 90, 200, 0.55)" },
        { type: "color", cssVar: "--e-card-fill-outer", label: "Innen – Rand", default: "rgba(6, 16, 50, 0.95)" },
        { type: "color", cssVar: "--e-card-bg-top", label: "Hintergrund – oben", default: "#0d2354" },
        { type: "color", cssVar: "--e-card-bg-bottom", label: "Hintergrund – unten", default: "#04102f" },
        { type: "color", cssVar: "--e-card-border", label: "Border-Farbe", default: "#6ea1f0" },
        { type: "number", cssVar: "--e-card-border-width", label: "Border-Stärke", default: 2, min: 0, max: 8, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-card-inset", label: "Inset-Border Farbe", default: "#1a3a82" },
        { type: "number", cssVar: "--e-card-radius", label: "Rundung", default: 18, min: 0, max: 80, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-card-glow", label: "Glow-Farbe", default: "rgba(110, 161, 240, 0.55)" },
        { type: "number", cssVar: "--e-card-glow-blur", label: "Glow Unschärfe", default: 32, min: 0, max: 100, step: 1, unit: "px" },
        boxShadowField("--e-card", "rgba(0,0,0,0.55)", 10, 28),
      ],
    },
    {
      id: "title",
      label: "Karten-Titel",
      fields: [
        { type: "font", cssVar: "--e-title-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "weight", cssVar: "--e-title-weight", label: "Schriftstärke", default: 700 },
        { type: "number", cssVar: "--e-title-size", label: "Größe", default: 30, min: 10, max: 80, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-title-color", label: "Farbe", default: "#ffcf48" },
        { type: "color", cssVar: "--e-title-color-chat", label: "Farbe – Chat-Voting", default: "#d4c0ff" },
        { type: "number", cssVar: "--e-title-letter-spacing", label: "Buchstaben-Abstand", default: 1, min: -5, max: 20, step: 0.1, unit: "px" },
        {
          type: "select",
          cssVar: "--e-title-transform",
          label: "Schreibweise",
          default: "uppercase",
          options: [
            { label: "Normal", value: "none" },
            { label: "GROSSBUCHSTABEN", value: "uppercase" },
            { label: "kleinbuchstaben", value: "lowercase" },
            { label: "Erste Großbuchstaben", value: "capitalize" },
          ],
        },
        textShadowGroup("--e-title", "rgba(255, 207, 72, 0.6)"),
      ],
    },
    {
      id: "bars",
      label: "Balken",
      fields: [
        { type: "color", cssVar: "--e-bar-track-bg", label: "Balken-Hintergrund", default: "rgba(255,255,255,0.06)" },
        { type: "color", cssVar: "--e-bar-track-border", label: "Balken-Border", default: "rgba(110, 161, 240, 0.4)" },
        { type: "number", cssVar: "--e-bar-radius", label: "Rundung", default: 6, min: 0, max: 40, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-bar-fill-top", label: "Füllung – oben", default: "#6ea1f0" },
        { type: "color", cssVar: "--e-bar-fill-bottom", label: "Füllung – unten", default: "#2a4eaa" },
        { type: "color", cssVar: "--e-bar-max-top", label: "Spitzenreiter – oben", default: "#ffe399" },
        { type: "color", cssVar: "--e-bar-max-mid", label: "Spitzenreiter – mitte", default: "#f4b441" },
        { type: "color", cssVar: "--e-bar-max-bottom", label: "Spitzenreiter – unten", default: "#8a4d05" },
        { type: "color", cssVar: "--e-bar-chat-top", label: "Chat – oben", default: "#a37bff" },
        { type: "color", cssVar: "--e-bar-chat-bottom", label: "Chat – unten", default: "#4f2ebf" },
      ],
    },
    {
      id: "barLabels",
      label: "Balken-Beschriftung (A/B/C/D + %)",
      fields: [
        { type: "font", cssVar: "--e-bar-label-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "color", cssVar: "--e-bar-letter-color", label: "Buchstaben-Farbe", default: "#ffcf48" },
        { type: "color", cssVar: "--e-bar-letter-color-chat", label: "Buchstaben-Farbe – Chat", default: "#d4c0ff" },
        { type: "weight", cssVar: "--e-bar-letter-weight", label: "Buchstaben-Stärke", default: 800 },
        { type: "number", cssVar: "--e-bar-letter-size", label: "Buchstaben-Größe", default: 32, min: 10, max: 80, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-bar-pct-color", label: "Prozent-Farbe", default: "#ffffff" },
        { type: "weight", cssVar: "--e-bar-pct-weight", label: "Prozent-Stärke", default: 700 },
        { type: "number", cssVar: "--e-bar-pct-size", label: "Prozent-Größe", default: 24, min: 8, max: 64, step: 1, unit: "px" },
        textShadowGroup("--e-bar-label", "rgba(0,0,0,0.7)"),
      ],
    },
    {
      id: "phoneBubble",
      label: "Telefon-Sprechblase",
      fields: [
        { type: "color", cssVar: "--e-phone-bg", label: "Hintergrund", default: "rgba(255, 207, 72, 0.1)" },
        { type: "color", cssVar: "--e-phone-border", label: "Border-Farbe", default: "#ffcf48" },
        { type: "number", cssVar: "--e-phone-border-width", label: "Border-Stärke", default: 2, min: 0, max: 8, step: 1, unit: "px" },
        { type: "number", cssVar: "--e-phone-radius", label: "Rundung", default: 14, min: 0, max: 60, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-phone-glow", label: "Glow-Farbe", default: "rgba(255, 207, 72, 0.35)" },
        { type: "number", cssVar: "--e-phone-glow-blur", label: "Glow Unschärfe", default: 22, min: 0, max: 80, step: 1, unit: "px" },
      ],
    },
    {
      id: "phoneQuote",
      label: "Telefon-Text",
      fields: [
        { type: "font", cssVar: "--e-phone-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "weight", cssVar: "--e-phone-weight", label: "Schriftstärke", default: 600 },
        { type: "number", cssVar: "--e-phone-size", label: "Größe", default: 30, min: 10, max: 80, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-phone-color", label: "Farbe", default: "#ffffff" },
        { type: "number", cssVar: "--e-phone-line-height", label: "Zeilenhöhe", default: 1.3, min: 0.8, max: 3, step: 0.05, unit: "" },
        textShadowGroup("--e-phone", "rgba(0,0,0,0.7)"),
      ],
    },
    {
      id: "chatTotal",
      label: "Chat-Voting – Stimmen-Zähler",
      fields: [
        { type: "font", cssVar: "--e-chat-total-font", label: "Schriftart", default: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
        { type: "number", cssVar: "--e-chat-total-size", label: "Größe", default: 16, min: 8, max: 40, step: 1, unit: "px" },
        { type: "color", cssVar: "--e-chat-total-color", label: "Farbe", default: "#c4b5ff" },
      ],
    },
  ],
};

export const STYLE_SCHEMA: WindowSchema[] = [QUESTION, JOKERS, LADDER, JOKER_EFFECT];

/** Liefert alle Felder über alle Windows (für Defaults-Aufbau, Serialisierung). */
export function allFields(): Field[] {
  return STYLE_SCHEMA.flatMap((w) => w.groups.flatMap((g) => g.fields));
}

/** Erzeugt das Default-Werte-Dictionary, gekeyed auf cssVar (mit `--`). */
export function defaultValues(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of allFields()) {
    out[f.cssVar] = (f as { default: unknown }).default;
  }
  return out;
}

/** Formatiert einen Wert für die CSS-Variable (Zahl + Einheit, Shadow-Compound, …). */
export function formatCssValue(field: Field, value: unknown): string {
  switch (field.type) {
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return `${n}${field.unit ?? "px"}`;
    }
    case "weight": {
      const n = typeof value === "number" ? value : Number(value);
      return `${n}`;
    }
    case "shadow": {
      const s = value as { x: number; y: number; blur: number; spread?: number; color: string };
      if (field.kind === "text") {
        return `${s.x}px ${s.y}px ${s.blur}px ${s.color}`;
      }
      return `${s.x}px ${s.y}px ${s.blur}px ${s.spread ?? 0}px ${s.color}`;
    }
    default:
      return String(value ?? "");
  }
}
