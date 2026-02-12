import type {
  AggregatedScrape,
  LogoSystem,
  ColorSystem,
  BrandAssets,
} from "./types";

/** Build logo system from aggregated raw data */
function buildLogoSystem(data: AggregatedScrape): LogoSystem {
  const raw = data.logoSystemRaw;
  const logoUrls = raw?.logoUrls ?? [];
  const favicons = raw?.favicons ?? [];
  const primary = data.logoUrl ?? logoUrls[0] ?? null;
  return {
    primaryLogo: primary,
    secondaryLogo: logoUrls[1] ?? null,
    iconMark: logoUrls.find((u) => /icon|mark|symbol/i.test(u)) ?? logoUrls[2] ?? null,
    wordmark: logoUrls.find((u) => /wordmark|word-mark|text/i.test(u)) ?? logoUrls[0] ?? null,
    lightVariants: logoUrls.filter((_, i) => i > 2).slice(0, 5),
    darkVariants: [],
    horizontalLogos: logoUrls.slice(0, 3),
    stackedLogos: [],
    favicons: favicons.map((f) => ({
      url: f.href,
      sizes: f.sizes,
      type: f.type,
    })),
    appIcons: favicons.filter((f) => /apple|touch|192|512/.test(f.href || "")).map((f) => f.href),
    touchIcons: favicons.filter((f) => /touch|apple/.test(f.rel || "")).map((f) => f.href),
    clearSpaceRules: null,
    minimumSizeRules: null,
  };
}

/** Build color system from CSS variables and legacy colors */
function buildColorSystem(data: AggregatedScrape): ColorSystem {
  const vars = data.colorSystemRaw ?? {};
  const legacy = data.colors ?? [];
  const allValues = [...Object.values(vars), ...legacy].filter(Boolean);

  const byPrefix = (prefix: string): string[] =>
    Object.entries(vars)
      .filter(([k]) => k.toLowerCase().includes(prefix))
      .map(([, v]) => v);

  return {
    primary: byPrefix("primary").length ? byPrefix("primary") : legacy.slice(0, 2),
    secondary: byPrefix("secondary"),
    accent: byPrefix("accent"),
    neutrals: byPrefix("neutral"),
    background: byPrefix("background").length ? byPrefix("background") : byPrefix("bg"),
    surface: byPrefix("surface"),
    border: byPrefix("border"),
    status: {
      success: byPrefix("success"),
      warning: byPrefix("warning"),
      error: byPrefix("error"),
      info: byPrefix("info"),
    },
    darkModePalette: null,
    gradients: [],
  };
}

/** Build assets (CSS vars, images, OG, media kit) */
function buildAssets(data: AggregatedScrape): BrandAssets {
  const cssVariables: Record<string, string> = { ...(data.colorSystemRaw ?? {}) };
  return {
    cssVariables,
    svgLogos: (data.logoSystemRaw?.logoUrls ?? []).filter((u) => u.includes(".svg") || u.includes("svg")),
    ogImages: data.ogImage ? [data.ogImage] : [],
    mediaKitUrls: data.mediaKitUrls ?? [],
    allImages: data.allImageUrls ?? [],
  };
}

export function buildExtendedSections(data: AggregatedScrape): {
  logoSystem: LogoSystem;
  colorSystem: ColorSystem;
  assets: BrandAssets;
} {
  return {
    logoSystem: buildLogoSystem(data),
    colorSystem: buildColorSystem(data),
    assets: buildAssets(data),
  };
}
