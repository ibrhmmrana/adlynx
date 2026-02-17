# AdLynx — Development Summary

## What We’ve Built

- **Landing page** — Hero with URL input and “Scan my website” CTA; results section shows the generated brand profile.
- **Brand scan API** — `POST /api/scan/brand` with `{ "url": "https://example.com" }`. Crawls the site, extracts brand data, enriches with AI, returns a structured `BrandProfile`.
- **Vercel-ready scraping** — Uses `playwright-core` + `@sparticuz/chromium` (no full Playwright bundle), Node runtime, `serverExternalPackages`, and serverless-friendly launch args so the scan runs on Vercel.

**Tech:** Next.js 15 (App Router), TypeScript, Tailwind, Playwright for headless browsing, OpenAI (gpt-4o-mini) for narrative fields.

---

## What We Scrape

**Pages:** Homepage plus up to 5 internal pages (about, services, contact, pricing), discovered from links. Uses `domcontentloaded`, 45s nav timeout, cookie/overlay dismissal, and light auto-scroll to trigger lazy images.

**Data we extract:**

| Category | Data points |
|----------|-------------|
| **Basics** | Page title, meta description, OG title/description/image/site name, domain, business name, tagline, industry (AI), mission, value proposition, short description, positioning, differentiators, target audience, use cases, industries served, competitive references. |
| **Logo** | Primary logo URL, hero image, favicons, logo variants (light/dark, horizontal/stacked), icon mark, wordmark, app/touch icons, clear-space and minimum-size rules. |
| **Colors** | CSS variables (primary, secondary, accent, neutrals, background, surface, border, status colors, dark mode, gradients), theme-color meta, scraped brand color list. |
| **Voice & tone** | Tone (AI), vocabulary conventions, CTA verbs, button label style, error-message style, headline structure. |
| **Content structure** | Hero formula (headline, subhead, CTAs), feature naming, pricing tier wording, trust elements, legal language patterns. |
| **Social** | Links to Instagram, Facebook, LinkedIn, Twitter/X, TikTok, YouTube. |
| **Copy samples** | Button texts, CTA link texts (from buttons, CTAs, primary-style links). |
| **Assets** | All image URLs (img src/srcset, picture/source, video poster, CSS background-image, OG/twitter meta), SVG logos, media kit / press kit links. |
| **Other** | H1/H2 lists, main body text (per page), above-the-fold text, footer text, JSON-LD structured data. |

**AI enrichment (OpenAI):** Industry, mission, value proposition, tone, target audience, USPs, positioning, differentiators, vocabulary/CTA/headline patterns, hero formula, and related narrative fields when raw scrape text is available.

---

## Out of Scope (Current Build)

- No fonts or typography extraction.
- No “UI & design tokens” beyond colors/CSS variables.
- No Google Business Profile or social-media API ingestion.
- No ad generation or campaign setup — scan and brand profile only.
