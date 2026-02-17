/* ── Product ── */
export interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  url: string;
  price?: string;
  vendor?: string;
}

/* ── ScanResult (new slim API response) ── */
export interface ScanResult {
  businessName: string;
  tagline: string | null;
  logoUrl: string | null;
  colors: { primary: string | null; secondary: string | null; accent: string | null };
  mission: string | null;
  products: Product[];
  allImages: string[];
  socialLinks: { platform: string; url: string }[];
  sellingType: "products" | "saas" | "services" | null;
  websiteUrl: string;
  domain: string;
}

/* ── Raw page content (from in-browser extraction) ── */
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
  logoSystemRaw?: {
    logoUrls: string[];
    favicons: { href: string; sizes?: string; type?: string; rel?: string }[];
  };
  colorSystemRaw?: Record<string, string>;
  copySamples?: { buttonTexts: string[]; ctaTexts: string[] };
  allImageUrls?: string[];
  mediaKitLinks?: string[];
  /** Computed colors from header, nav, buttons, links (for brand color inference) */
  elementColors?: string[];
}

/* ── Aggregated data from crawling all pages ── */
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

  logoSystemRaw?: PageContent["logoSystemRaw"];
  colorSystemRaw?: Record<string, string>;
  copySamples?: PageContent["copySamples"];
  allImageUrls?: string[];
  mediaKitUrls?: string[];
  elementColors?: string[];
}
