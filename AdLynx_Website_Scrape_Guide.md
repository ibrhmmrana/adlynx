# AdLynx — Website Scraping Guide

## Goal

Given a URL, scrape the user's website and extract everything we need to understand their brand identity, value proposition, industry, and mission — so that later stages can generate relevant ads for them.

The output of this scrape is a structured JSON object called `BrandProfile` that contains the business's name, industry, value proposition, mission, tone of voice, visual identity (colors, logo, imagery), and social media links.

---

## Reference: How Antistatic Does It

Antistatic's scraper lives in `app/api/scan/website/route.ts`. It:

1. Launches a headless Chromium browser via Playwright (`playwright-core` + `@sparticuz/chromium` for serverless).
2. Applies stealth scripts to avoid bot detection.
3. Navigates to the homepage, waits for network idle, then extracts all content via `page.evaluate()`.
4. Crawls internal links (up to 10 pages, depth 2) — homepage, about, services, contact, etc.
5. For each page, it extracts: title, meta description, headings, Open Graph tags, structured data (JSON-LD), main text content, images, logo, social links, forms, contact methods, etc.
6. Post-crawl, it aggregates entities, service keywords, locations, and top phrases across all pages.
7. It resolves a `BusinessIdentity` from the scraped data.

**For AdLynx, we do the same crawl but extract different fields and produce a different output shape.** The scraping infrastructure (Playwright, stealth, page crawling) is identical.

---

## Architecture

```
POST /api/scan/brand
  Body: { url: string }
  Response: { brandProfile: BrandProfile }
```

One API route. One Playwright scrape. Returns a `BrandProfile`.

---

## Step 1: Set Up the Scraper

Use the exact same Playwright + stealth setup as Antistatic. The pattern is:

```typescript
import { chromium as pwChromium } from 'playwright-core';
import type { Browser, Page, BrowserContext } from 'playwright-core';
import chromium from '@sparticuz/chromium';

const TIMEOUT_MS = 30000;

async function launchBrowser(): Promise<Browser> {
  const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;
  const executablePath = isServerless ? await chromium.executablePath() : undefined;

  return pwChromium.launch({
    headless: true,
    args: [
      ...(isServerless ? chromium.args : []),
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    executablePath,
    timeout: TIMEOUT_MS,
  });
}

async function setupStealth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });
}
```

**Dependencies:**
```json
{
  "playwright-core": "latest",
  "@sparticuz/chromium": "latest"
}
```

---

## Step 2: Crawl the Website

Crawl the homepage + up to 5 internal pages (about, services/products, contact, pricing, and one more). We don't need deep crawling — we need the pages that describe the business.

### 2a. Discover Key Pages

From the homepage, find internal links that match these patterns:

```typescript
const KEY_PAGE_PATTERNS = [
  { type: 'about', patterns: [/about/i, /who-we-are/i, /our-story/i, /company/i] },
  { type: 'services', patterns: [/service/i, /what-we-do/i, /solution/i, /offer/i, /product/i] },
  { type: 'contact', patterns: [/contact/i, /get-in-touch/i, /reach-us/i] },
  { type: 'pricing', patterns: [/pric/i, /plan/i, /package/i] },
];
```

Extract internal links from the homepage:

```typescript
const internalLinks = await page.evaluate((baseDomain: string) => {
  return Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.getAttribute('href') || '')
    .filter(href => {
      try {
        const url = new URL(href, window.location.origin);
        return url.hostname === baseDomain || href.startsWith('/');
      } catch { return false; }
    })
    .map(href => new URL(href, window.location.origin).href);
}, baseDomain);
```

Match them to the patterns above. Crawl the homepage + the best match for each key page type (max 5-6 pages total).

### 2b. Extract Content From Each Page

For each page, run `page.evaluate()` to extract:

```typescript
const pageContent = await page.evaluate(() => {
  // --- Title & Meta ---
  const title = document.title || null;
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;

  // --- Open Graph ---
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null;
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;
  const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || null;

  // --- Headings ---
  const h1 = Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim()).filter(Boolean);
  const h2 = Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim()).filter(Boolean);

  // --- Main Text (excluding nav/footer/header) ---
  let mainText = '';
  const mainSelectors = ['main', 'article', '[role="main"]', '.main-content', '#main-content'];
  for (const selector of mainSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('nav, footer, header, script, style, noscript').forEach(e => e.remove());
      mainText = clone.innerText?.trim() || '';
      if (mainText.length > 100) break;
    }
  }
  if (mainText.length < 100) {
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    bodyClone.querySelectorAll('nav, footer, header, script, style, noscript, aside').forEach(e => e.remove());
    mainText = bodyClone.innerText?.trim() || '';
  }
  mainText = mainText.substring(0, 8000);

  // --- Above-the-fold text (first visible content) ---
  const aboveFoldText = (document.body?.innerText || '').substring(0, 800).replace(/\s+/g, ' ').trim();

  // --- Logo ---
  let logoUrl: string | null = null;
  const logoSelectors = [
    'img[class*="logo"]', 'img[id*="logo"]', 'img[alt*="logo"]',
    '.logo img', '#logo img', 'header img:first-of-type',
  ];
  for (const sel of logoSelectors) {
    const img = document.querySelector(sel);
    if (img && img instanceof HTMLImageElement && img.src) {
      logoUrl = img.src;
      break;
    }
  }

  // --- Hero Image ---
  let heroImage: string | null = null;
  let maxSize = 0;
  document.querySelectorAll('img').forEach(img => {
    const size = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
    if (size > maxSize && size > 50000) {
      maxSize = size;
      heroImage = img.src;
    }
  });

  // --- Social Links ---
  const socialDomains = ['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com'];
  const socialLinks: { platform: string; url: string }[] = [];
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') || '';
    for (const domain of socialDomains) {
      if (href.includes(domain)) {
        const platform = domain.replace('.com', '').replace('x', 'twitter');
        if (!socialLinks.find(s => s.platform === platform)) {
          socialLinks.push({ platform, url: href });
        }
      }
    }
  });

  // --- Structured Data (JSON-LD) ---
  const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  const structuredData = jsonLdScripts.map(script => {
    try { return JSON.parse(script.textContent || '{}'); }
    catch { return null; }
  }).filter(Boolean);

  // --- Brand Colors (from CSS custom properties and inline styles) ---
  const colors: string[] = [];
  const computedStyle = getComputedStyle(document.documentElement);
  // Check common CSS variable names for brand colors
  ['--primary', '--brand', '--accent', '--primary-color', '--brand-color', '--theme-color'].forEach(prop => {
    const val = computedStyle.getPropertyValue(prop).trim();
    if (val && val !== '') colors.push(val);
  });
  // Also check theme-color meta
  const themeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
  if (themeColor) colors.push(themeColor);

  // --- Copyright / Footer ---
  const footerText = document.querySelector('footer')?.textContent?.trim()?.substring(0, 500) || null;

  return {
    title, metaDescription,
    ogTitle, ogDescription, ogImage, ogSiteName,
    h1, h2, mainText, aboveFoldText,
    logoUrl, heroImage,
    socialLinks, structuredData,
    colors, footerText,
  };
});
```

---

## Step 3: Aggregate Data Across Pages

After crawling all pages, merge the data:

```typescript
interface AggregatedScrape {
  url: string;
  domain: string;

  // From homepage
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

  // Aggregated across all pages
  allH1: string[];         // All H1 headings from all pages
  allH2: string[];         // All H2 headings from all pages
  allMainText: string;     // Concatenated main text (homepage first, then about, then services)
  socialLinks: { platform: string; url: string }[];
  structuredData: any[];   // All JSON-LD from all pages

  // Identified key pages
  aboutPageText: string | null;
  servicesPageText: string | null;
  contactPageText: string | null;
}
```

Priority rules:
- `title`, `ogTitle`, `ogSiteName`, `ogImage`, `logoUrl`, `heroImage`, `colors` → take from homepage.
- `allH1`, `allH2` → merge from all pages, deduplicate.
- `allMainText` → concatenate: homepage text first, then about page text, then services page text. Cap at 15,000 characters total.
- `socialLinks` → merge from all pages, deduplicate by platform.
- `structuredData` → merge from all pages.
- `aboutPageText` → main text from the about page specifically.
- `servicesPageText` → main text from the services page specifically.

---

## Step 4: Resolve the Brand Profile

This is a server-side function that takes the `AggregatedScrape` and produces a `BrandProfile`. Two parts: deterministic extraction, then AI interpretation.

### 4a. Deterministic Extraction

```typescript
interface BrandProfile {
  // Identity
  businessName: string;
  tagline: string | null;           // Usually the H1 or og:description
  industry: string | null;          // From structured data @type or AI
  websiteUrl: string;
  domain: string;

  // Brand voice
  missionStatement: string | null;  // Extracted from about page or AI
  valueProposition: string | null;  // The main selling point
  toneOfVoice: string | null;       // e.g. "professional", "casual", "luxury" — AI-derived

  // Visual identity
  logoUrl: string | null;
  heroImageUrl: string | null;
  brandColors: string[];            // Hex codes
  ogImage: string | null;           // Fallback brand image

  // Social presence
  socialLinks: { platform: string; url: string }[];

  // Content context (for ad generation later)
  services: string[];               // What they offer
  targetAudience: string | null;    // AI-derived from content
  uniqueSellingPoints: string[];    // Key differentiators

  // Raw data (for AI to reference later)
  aboutText: string | null;
  homepageText: string | null;
}
```

Extract what you can deterministically:

```typescript
function extractBrandProfile(data: AggregatedScrape): Partial<BrandProfile> {
  // Business name: priority order
  const businessName =
    extractNameFromStructuredData(data.structuredData) ||
    data.ogSiteName ||
    extractNameFromTitle(data.title) ||
    data.domain.split('.')[0];

  // Tagline: usually the first H1 or og:description
  const tagline = data.allH1[0] || data.ogDescription || null;

  // Industry from structured data
  const industry = extractIndustryFromStructuredData(data.structuredData);

  // Services from H2 headings on services page + homepage
  const services = extractServices(data.allH2, data.servicesPageText);

  return {
    businessName,
    tagline,
    industry,
    websiteUrl: data.url,
    domain: data.domain,
    logoUrl: data.logoUrl,
    heroImageUrl: data.heroImage,
    brandColors: data.colors,
    ogImage: data.ogImage,
    socialLinks: data.socialLinks,
    services,
    aboutText: data.aboutPageText,
    homepageText: data.allMainText.substring(0, 5000),
  };
}

function extractNameFromStructuredData(sd: any[]): string | null {
  for (const item of sd) {
    if (item.name && typeof item.name === 'string') return item.name;
    if (item['@graph']) {
      for (const node of item['@graph']) {
        if (node.name && ['Organization', 'LocalBusiness', 'Store', 'Restaurant'].includes(node['@type'])) {
          return node.name;
        }
      }
    }
  }
  return null;
}

function extractNameFromTitle(title: string | null): string | null {
  if (!title) return null;
  // Common patterns: "Business Name | Tagline" or "Business Name - Tagline"
  const parts = title.split(/\s*[|–—-]\s*/);
  if (parts.length > 0 && parts[0].length > 1 && parts[0].length < 60) {
    return parts[0].trim();
  }
  return title.trim();
}

function extractIndustryFromStructuredData(sd: any[]): string | null {
  for (const item of sd) {
    if (item['@type'] && item['@type'] !== 'WebSite' && item['@type'] !== 'WebPage') {
      return item['@type']; // e.g. "Restaurant", "LegalService", "RealEstateAgent"
    }
    if (item['@graph']) {
      for (const node of item['@graph']) {
        if (node['@type'] && !['WebSite', 'WebPage', 'BreadcrumbList', 'SearchAction'].includes(node['@type'])) {
          return node['@type'];
        }
      }
    }
  }
  return null;
}

function extractServices(h2s: string[], servicesText: string | null): string[] {
  // H2 headings from the services page are usually individual services
  const services = h2s
    .filter(h => h.length > 3 && h.length < 80)
    .slice(0, 10);
  return services;
}
```

### 4b. AI Interpretation

Pass the deterministic extraction + raw text to OpenAI to fill in the gaps:

```typescript
const prompt = `You are a brand analyst. Given the following website content, extract the brand profile.

Business name: ${partial.businessName}
Homepage text (first 3000 chars):
${data.allMainText.substring(0, 3000)}

About page text:
${data.aboutPageText?.substring(0, 2000) || 'Not available'}

Services page text:
${data.servicesPageText?.substring(0, 2000) || 'Not available'}

Respond in JSON only. Fill in these fields:
{
  "industry": "the industry or category (e.g. 'Restaurant', 'Digital Marketing Agency', 'Plumber')",
  "missionStatement": "their mission or purpose, 1-2 sentences, or null if not found",
  "valueProposition": "their main selling point in 1 sentence, or null",
  "toneOfVoice": "one of: professional, casual, luxury, playful, authoritative, friendly, technical",
  "targetAudience": "who their customers are, 1 sentence, or null",
  "uniqueSellingPoints": ["point 1", "point 2", "point 3"]
}`;
```

Use `gpt-4o-mini` or `gpt-4o` — it's one call per scrape, so cost is negligible.

Merge the AI response into the `BrandProfile`.

---

## Step 5: Return the Result

The API route returns:

```typescript
return NextResponse.json({
  success: true,
  brandProfile: {
    // Identity
    businessName: "Cafe Paradiso",
    tagline: "Single-origin coffee in the heart of Cape Town",
    industry: "Cafe",
    websiteUrl: "https://cafeparadiso.co.za",
    domain: "cafeparadiso.co.za",

    // Brand voice
    missionStatement: "We believe great coffee starts at the source. We partner directly with farmers to bring you the freshest single-origin beans.",
    valueProposition: "Direct-sourced single-origin coffee with a neighbourhood feel",
    toneOfVoice: "casual",

    // Visual identity
    logoUrl: "https://cafeparadiso.co.za/logo.png",
    heroImageUrl: "https://cafeparadiso.co.za/hero.jpg",
    brandColors: ["#2d5016", "#f5e6d3"],
    ogImage: "https://cafeparadiso.co.za/og.jpg",

    // Social presence
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/cafeparadiso" },
      { platform: "facebook", url: "https://facebook.com/cafeparadiso" }
    ],

    // Content context
    services: ["Single-origin coffee", "Pastries & baked goods", "Catering", "Coffee subscriptions"],
    targetAudience: "Young professionals and coffee enthusiasts in Cape Town's city bowl",
    uniqueSellingPoints: [
      "Direct relationships with coffee farmers",
      "Roasted in-house weekly",
      "Zero-waste packaging initiative"
    ],

    // Raw data
    aboutText: "Founded in 2019, Cafe Paradiso started with a simple idea...",
    homepageText: "Welcome to Cafe Paradiso. Single-origin coffee..."
  }
});
```

---

## Step 6: Display the Brand Profile

Show the extracted brand profile in a clean card UI. This is purely a display step — no logic, just rendering the JSON above.

Show:
- Business name + tagline at the top
- Logo (if found) + hero image (if found)
- Industry badge
- Mission statement
- Value proposition
- Services list
- Social links (as icons)
- Brand colors (as swatches)
- Tone of voice badge
- Target audience
- Unique selling points

If a field is `null`, don't show it. Don't show empty sections.

---

## File Structure

```
app/
  api/
    scan/
      brand/
        route.ts          ← The API route (Playwright scrape + AI)
lib/
  brand/
    scrapeBrand.ts        ← Playwright crawl logic (launchBrowser, scrapePage, discoverKeyPages)
    extractBrandProfile.ts ← Deterministic extraction from aggregated scrape
    aiBrandAnalysis.ts     ← OpenAI call to fill in gaps
    types.ts               ← BrandProfile, AggregatedScrape, PageContent interfaces
components/
  brand/
    BrandProfileCard.tsx   ← UI display of the brand profile
```

---

## Summary

1. **Playwright** crawls the homepage + up to 5 key internal pages.
2. From each page, we extract: title, meta, OG tags, headings, main text, logo, hero image, social links, structured data, brand colors.
3. We **aggregate** across all pages into one `AggregatedScrape`.
4. We **deterministically** extract what we can (business name, tagline, services, etc.).
5. We send the text to **OpenAI** to fill in: mission, value proposition, tone, target audience, USPs.
6. We return a `BrandProfile` JSON and **display it** in the UI.

That's it. No competitors, no ads, no further processing. Just: URL in → brand identity out.
