/** Brand basics: name, products, tagline, mission, positioning, differentiators, audience, use cases */
export interface BrandBasics {
  brandName: string | null;
  productNames: string[];
  tagline: string | null;
  shortDescription: string | null;
  mission: string | null;
  positioningStatement: string | null;
  keyDifferentiators: string[];
  targetAudienceCues: string | null;
  industriesServed: string[];
  useCases: string[];
  competitiveReferences: string[];
}

/** Logo system: primary, variants, favicons, app icons, rules */
export interface LogoSystem {
  primaryLogo: string | null;
  secondaryLogo: string | null;
  iconMark: string | null;
  wordmark: string | null;
  lightVariants: string[];
  darkVariants: string[];
  horizontalLogos: string[];
  stackedLogos: string[];
  favicons: { url: string; sizes?: string; type?: string }[];
  appIcons: string[];
  touchIcons: string[];
  clearSpaceRules: string | null;
  minimumSizeRules: string | null;
}

/** Color system: primary, secondary, accent, neutrals, status, dark mode, gradients */
export interface ColorSystem {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutrals: string[];
  background: string[];
  surface: string[];
  border: string[];
  status: {
    success: string[];
    warning: string[];
    error: string[];
    info: string[];
  };
  darkModePalette: Record<string, string> | null;
  gradients: { value: string; stops?: string[]; angle?: string }[];
}

/** Voice, tone, and copy patterns */
export interface VoiceAndTone {
  tone: string | null;
  vocabularyConventions: string[];
  ctaVerbs: string[];
  buttonLabelStyle: string | null;
  errorMessageStyle: string | null;
  headlineStructure: string | null;
}

/** Content and messaging structure */
export interface ContentStructure {
  heroFormula: { headline: string | null; subhead: string | null; ctas: string[] };
  featureNamingConventions: string[];
  pricingTierWording: string[];
  trustElements: string[];
  legalLanguagePatterns: string[];
}

/** Assets and technical tokens (CSS vars, images, OG, media kit) */
export interface BrandAssets {
  cssVariables: Record<string, string>;
  svgLogos: string[];
  ogImages: string[];
  mediaKitUrls: string[];
  allImages: string[];
}

/** Raw content extracted from a single page (extended for brand kit) */
export interface PageContent {
  title: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
  h1: string[];
  h2: string[];
  mainText: string;
  aboveFoldText: string;
  logoUrl: string | null;
  heroImage: string | null;
  socialLinks: { platform: string; url: string }[];
  structuredData: unknown[];
  colors: string[];
  footerText: string | null;
  // Extended extraction (optional; present when full extraction runs)
  logoSystemRaw?: {
    logoUrls: string[];
    favicons: { href: string; sizes?: string; type?: string; rel?: string }[];
  };
  colorSystemRaw?: Record<string, string>;
  copySamples?: { buttonTexts: string[]; ctaTexts: string[] };
  allImageUrls?: string[];
  mediaKitLinks?: string[];
}

/** Aggregated data from crawling all pages */
export interface AggregatedScrape {
  url: string;
  domain: string;

  title: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
  logoUrl: string | null;
  heroImage: string | null;
  colors: string[];
  footerText: string | null;

  allH1: string[];
  allH2: string[];
  allMainText: string;
  socialLinks: { platform: string; url: string }[];
  structuredData: unknown[];

  aboutPageText: string | null;
  servicesPageText: string | null;
  contactPageText: string | null;
  pricingPageText?: string | null;

  // Extended aggregated (optional)
  logoSystemRaw?: PageContent["logoSystemRaw"];
  colorSystemRaw?: Record<string, string>;
  copySamples?: PageContent["copySamples"];
  allImageUrls?: string[];
  mediaKitUrls?: string[];
}

/** Final brand profile returned by the API (includes extended sections) */
export interface BrandProfile {
  businessName: string;
  tagline: string | null;
  industry: string | null;
  websiteUrl: string;
  domain: string;

  missionStatement: string | null;
  valueProposition: string | null;
  toneOfVoice: string | null;

  logoUrl: string | null;
  heroImageUrl: string | null;
  brandColors: string[];
  ogImage: string | null;

  socialLinks: { platform: string; url: string }[];

  services: string[];
  targetAudience: string | null;
  uniqueSellingPoints: string[];

  aboutText: string | null;
  homepageText: string | null;

  // Extended sections (optional)
  brandBasics?: BrandBasics | null;
  logoSystem?: LogoSystem | null;
  colorSystem?: ColorSystem | null;
  voiceAndTone?: VoiceAndTone | null;
  contentStructure?: ContentStructure | null;
  assets?: BrandAssets | null;
}
