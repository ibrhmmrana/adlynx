import type { AggregatedScrape } from "./types";

export interface TopColors {
  primary: string | null;
  secondary: string | null;
  accent: string | null;
}

const COLOR_RE = /^(#[\da-fA-F]{3,8}|rgb\s*\(|rgba\s*\(|hsl\s*\(|hsla\s*\()/;

function isColor(v: string): boolean {
  return typeof v === "string" && COLOR_RE.test(v.trim());
}

/** Normalize to a comparable string (lowercase hex preferred for deduping) */
function normalizeColor(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v.toLowerCase();
  if (v.startsWith("rgb")) return v.replace(/\s+/g, "");
  return v;
}

/** Reject neutrals: near-white, near-black, and medium grays (not brand-like) */
function isNeutral(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === "white" || v === "transparent") return true;
  if (v.startsWith("rgb")) {
    const m = v.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      const avg = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (spread < 30 && (avg > 240 || avg < 25)) return true; // near white or black
      if (spread < 40 && avg > 100 && avg < 180) return true;   // medium gray
    }
  }
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    if (hex.length <= 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = hex.length >= 2 ? parseInt(hex[1] + hex[1], 16) : r;
      const b = hex.length >= 3 ? parseInt(hex[2] + hex[2], 16) : g;
      const avg = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (spread < 30 && (avg > 240 || avg < 25)) return true;
      if (spread < 40 && avg > 100 && avg < 180) return true;
    } else {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const avg = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (spread < 30 && (avg > 240 || avg < 25)) return true;
      if (spread < 40 && avg > 100 && avg < 180) return true;
    }
  }
  return false;
}

function firstColorByPrefix(
  vars: Record<string, string>,
  prefixes: string[]
): string | null {
  for (const prefix of prefixes) {
    for (const [k, v] of Object.entries(vars)) {
      if (k.toLowerCase().includes(prefix) && isColor(v)) return v.trim();
    }
  }
  return null;
}

/**
 * Pick the 3 most important brand colors from scraped data.
 * Priority: CSS variables (primary/secondary/accent/brand/button) -> theme-color ->
 * element colors (header/buttons/links, excluding neutrals) -> legacy colors.
 */
export function pickTopColors(data: AggregatedScrape): TopColors {
  const vars = data.colorSystemRaw ?? {};
  const legacy = (data.colors ?? []).filter((c) => isColor(c));
  const fromElements = (data.elementColors ?? [])
    .filter((c) => isColor(c) && !isNeutral(c))
    .map((c) => c.trim());

  // 1) CSS variables with semantic names (expanded patterns)
  const primary =
    firstColorByPrefix(vars, ["primary", "brand", "button-background", "color-button", "color-base"]) ??
    legacy[0] ??
    null;

  const secondary =
    firstColorByPrefix(vars, ["secondary", "color-secondary"]) ??
    legacy[1] ??
    null;

  const accent =
    firstColorByPrefix(vars, ["accent", "color-accent", "link", "color-link"]) ??
    firstColorByPrefix(vars, ["brand"]) ??
    legacy[2] ??
    null;

  // 2) If we're missing any, fill from element colors (first non-duplicate, brand-like)
  const used = new Set<string>();
  [primary, secondary, accent].forEach((c) => c && used.add(normalizeColor(c)));

  function nextFromElements(): string | null {
    for (const c of fromElements) {
      const n = normalizeColor(c);
      if (!used.has(n)) {
        used.add(n);
        return c;
      }
    }
    return null;
  }

  return {
    primary: primary ?? nextFromElements(),
    secondary: secondary ?? nextFromElements(),
    accent: accent ?? nextFromElements(),
  };
}
