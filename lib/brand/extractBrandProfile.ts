import type { AggregatedScrape } from "./types";

/** Shape returned by the profile extractor */
export interface ExtractedProfile {
  businessName: string;
  tagline: string | null;
  industry: string | null;
  websiteUrl: string;
  domain: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  brandColors: string[];
  ogImage: string | null;
  socialLinks: { platform: string; url: string }[];
  services: string[];
  aboutText: string | null;
  homepageText: string | null;
}

function extractNameFromStructuredData(sd: unknown[]): string | null {
  for (const item of sd as { name?: string; "@graph"?: { name?: string; "@type"?: string }[] }[]) {
    if (item.name && typeof item.name === "string") return item.name;
    if (Array.isArray(item["@graph"])) {
      for (const node of item["@graph"]) {
        if (
          node.name &&
          ["Organization", "LocalBusiness", "Store", "Restaurant"].includes(
            node["@type"] || ""
          )
        ) {
          return node.name;
        }
      }
    }
  }
  return null;
}

function extractNameFromTitle(title: string | null): string | null {
  if (!title) return null;
  const parts = title.split(/\s*[|–—-]\s*/);
  if (parts.length > 0 && parts[0].length > 1 && parts[0].length < 60) {
    return parts[0].trim();
  }
  return title.trim();
}

function extractIndustryFromStructuredData(sd: unknown[]): string | null {
  const skip = ["WebSite", "WebPage", "BreadcrumbList", "SearchAction"];
  for (const item of sd as { "@type"?: string; "@graph"?: { "@type"?: string }[] }[]) {
    if (item["@type"] && !skip.includes(item["@type"])) {
      return item["@type"];
    }
    if (Array.isArray(item["@graph"])) {
      for (const node of item["@graph"]) {
        if (node["@type"] && !skip.includes(node["@type"])) {
          return node["@type"];
        }
      }
    }
  }
  return null;
}

function extractServices(h2s: string[]): string[] {
  return h2s
    .filter((h) => h.length > 3 && h.length < 80)
    .slice(0, 10);
}

export function extractBrandProfile(data: AggregatedScrape): ExtractedProfile {
  const businessName =
    extractNameFromStructuredData(data.structuredData) ||
    data.ogSiteName ||
    extractNameFromTitle(data.title) ||
    data.domain.split(".")[0];

  const tagline = data.allH1[0] || data.ogDescription || null;
  const industry = extractIndustryFromStructuredData(data.structuredData);
  const services = extractServices(data.allH2);

  return {
    businessName,
    tagline,
    industry,
    websiteUrl: data.url,
    domain: data.domain,
    logoUrl: data.logoUrl,
    heroImageUrl: data.heroImage,
    brandColors: data.colors || [],
    ogImage: data.ogImage,
    socialLinks: data.socialLinks,
    services,
    aboutText: data.aboutPageText,
    homepageText: data.allMainText.substring(0, 5000),
  };
}
