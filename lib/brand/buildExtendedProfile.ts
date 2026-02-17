import type { AggregatedScrape } from "./types";

/**
 * Build extended profile sections from aggregated scrape data.
 * Kept for potential future use; currently the slim flow uses pickTopColors instead.
 */

export interface ExtendedLogoSystem {
  primaryLogo: string | null;
  favicons: { url: string; sizes?: string; type?: string }[];
}

export interface ExtendedColorSystem {
  primary: string[];
  secondary: string[];
  accent: string[];
}

export interface ExtendedAssets {
  cssVariables: Record<string, string>;
  svgLogos: string[];
  ogImages: string[];
  allImages: string[];
}

export function buildExtendedSections(data: AggregatedScrape): {
  logoSystem: ExtendedLogoSystem;
  colorSystem: ExtendedColorSystem;
  assets: ExtendedAssets;
} {
  const raw = data.logoSystemRaw;
  const vars = data.colorSystemRaw ?? {};
  const byPrefix = (prefix: string): string[] =>
    Object.entries(vars)
      .filter(([k]) => k.toLowerCase().includes(prefix))
      .map(([, v]) => v);

  return {
    logoSystem: {
      primaryLogo: data.logoUrl ?? raw?.logoUrls?.[0] ?? null,
      favicons: (raw?.favicons ?? []).map((f) => ({
        url: f.href,
        sizes: f.sizes,
        type: f.type,
      })),
    },
    colorSystem: {
      primary: byPrefix("primary").length ? byPrefix("primary") : (data.colors ?? []).slice(0, 2),
      secondary: byPrefix("secondary"),
      accent: byPrefix("accent"),
    },
    assets: {
      cssVariables: { ...vars },
      svgLogos: (raw?.logoUrls ?? []).filter((u) => u.includes(".svg")),
      ogImages: data.ogImage ? [data.ogImage] : [],
      allImages: data.allImageUrls ?? [],
    },
  };
}
