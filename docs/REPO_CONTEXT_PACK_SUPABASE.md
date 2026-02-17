# AdLynx — Repo Context Pack for Supabase Integration

**Purpose:** Give an external reviewer and implementer a complete, accurate picture of the current codebase, onboarding flow, and brand scan pipeline so Supabase persistence can be added without guesswork.

---

## 1) Executive Summary

- **Single-page wizard:** The app has one route, `/` (`app/page.tsx`), a Client Component. The entire onboarding (URL → details → profile → products) is a 4-step wizard on that page with no separate results or dashboard routes.
- **Scan entry point:** User submits a website URL on the hero; `POST /api/scan/brand` is called with `{ url: string }`. No auth; no query params for scan ID.
- **Results are ephemeral:** The API returns `{ success: true, scanResult: ScanResult }`. The client stores it in React state (`scanResult`, plus derived editable state). There is no persistence: no DB, no localStorage, no cookies. Refresh or navigate away loses everything.
- **Brand scan pipeline:** URL normalized → Playwright crawl (home + up to 2 key pages) → in-browser extraction (DOM + JSON-LD) → `extractBrandProfile` + `pickTopColors` → Shopify probe in parallel → AI mission (`generateMission`) → `dedupeImageUrls` → `ScanResult` returned. Key types: `ScanResult`, `Product`, `AggregatedScrape`, `PageContent` (all in `lib/brand/types.ts`).
- **Product extraction:** Shopify: `fetchShopifyProducts(domain)` via `/products.json` (no browser). Single product by URL: `POST /api/scan/product` uses Playwright and `scrapeProductPage`. Products are part of `ScanResult.products` and editable in UI state only.
- **No auth:** No NextAuth, Clerk, or custom auth. No user, workspace, or project concept in code.
- **Data flow to UI:** `handleScan` in `app/page.tsx` calls the scan API, then `setScanResult(data.scanResult)`. A `useEffect` syncs `scanResult` into editable state (brandName, tagline, colors, mission, products, allImages). These are passed as props to step UIs; nothing is keyed by user or scan ID.
- **What Supabase must replace:** Persist `ScanResult`-equivalent (brand profile, products, assets) and optionally scan metadata. Introduce a notion of “owner” (user/workspace) and optionally “project” once auth exists. All “save” and “load” behavior currently does not exist and must be added.

---

## 2) Detailed Breakdown

### A) Current user journey and routes

| Route | File path | Server/Client | Description |
|-------|-----------|---------------|-------------|
| **/ (home)** | `app/page.tsx` | **Client** (`"use client"`) | Single page containing the full journey: hero (URL input), details (brand name + selling type), profile (logo, name, tagline, colors, mission), products (list + detail + asset library). No separate “results” or “dashboard” URL. |

- **Onboarding entry:** The hero section is inside `app/page.tsx` (step `"hero"`). User enters URL in a form and submits; `handleScan` runs and POSTs to `/api/scan/brand`, then sets `step` to `"details"` and stores the response in `scanResult`.
- **Results / “where data is shown”:** There is no separate results page. The same `app/page.tsx` renders steps `"details"`, `"profile"`, and `"products"`; each step reads from React state populated by `scanResult` and the editable state derived from it (e.g. `brandName`, `products`, `allImages`). So “results” are embedded as subsequent steps of the wizard.
- **Dashboard / other pages:** There are no dashboard or placeholder dashboard routes. The only other app routes are API routes (see below). The root layout is `app/layout.tsx` (Server Component; wraps children with fonts and metadata).

**API routes (for completeness):**

| Method + path | File path | Purpose |
|---------------|-----------|---------|
| POST `/api/scan/brand` | `app/api/scan/brand/route.ts` | Full brand scan: crawl, extract, AI mission, Shopify products, returns `ScanResult`. |
| POST `/api/scan/product` | `app/api/scan/product/route.ts` | Scrape a single product URL; returns `{ product: Product }`. |

---

### B) Brand scan pipeline (step-by-step, with file and function references)

**Endpoint:** `POST /api/scan/brand`  
**Handler:** `app/api/scan/brand/route.ts` — single `POST` export.

1. **URL normalization and validation**
   - **Where:** `app/api/scan/brand/route.ts`, inside `POST`.
   - **Logic:** `body.url` is read and trimmed. If missing, respond 400. Then `normalized = rawUrl.startsWith("http") ? rawUrl : \`https://${rawUrl}\``; `domain = new URL(normalized).hostname`. No schema validation (e.g. no Zod); invalid URLs would throw when passed to `crawlWebsite` or `fetch`.

2. **Crawling strategy**
   - **Where:** `lib/brand/scrapeBrand.ts`.
   - **Entry:** `crawlWebsite(normalized, abortController.signal)` (exported).
   - **Flow:**
     - **Browser:** `launchBrowser()` (Playwright with `@sparticuz/chromium` in serverless), then `browser.newContext`, `context.newPage()`, `setupStealth(page)`.
     - **Home page:** `page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS })`. On timeout, catch and optionally `page.waitForSelector("body", { timeout: 8_000 })` then continue.
     - **Key pages discovery:** `discoverInternalLinks(page, baseDomain)` — collects `<a href>` same-domain links, matches pathnames against `KEY_PAGE_PATTERNS` (about, services, contact, pricing), dedupes by type, returns up to one URL per type.
     - **Pages to crawl:** `[home]` plus up to `MAX_PAGES - 1` key pages (constant `MAX_PAGES = 3`), so home + up to 2 others.
     - **Per-page scrape:** Home: `scrapePage(page, true)` (full scrape with overlay dismiss, auto-scroll, 1.2s wait). Other pages: `page.goto(pageUrl, ...)`, then `scrapePage(page, false)` (no auto-scroll).
   - **Timeouts (constants in same file):** `NAV_TIMEOUT_MS = 18_000`, `KEY_PAGE_NAV_TIMEOUT_MS = 10_000`, `POST_LOAD_WAIT_MS = 1_200`, `DEFAULT_TIMEOUT_MS = 12_000`. Route-level deadline: 55s via `Promise.race` with `deadlinePromise`.

3. **Extraction logic (DOM parsing, selectors, heuristics)**
   - **Where:** `lib/brand/scrapeBrand.ts` — the string returned by `extractPageContentPayload()` is evaluated in the browser via `page.evaluate(extractPageContentPayload())` inside `scrapePage`.
   - **What runs in browser:** A single IIFE that:
     - Reads title, meta description, og:* meta tags, h1/h2 arrays, main text from `main`/`article`/body (with nav/footer/script stripped), above-fold text.
     - **Logo:** JSON-LD `Organization.logo` first; then scored DOM candidates: images in header/nav/banner or with logo/brand in class/id/alt, with bonus for link-to-home and size 40–500px; fallback `og:image`.
     - **Hero image:** Largest image by dimensions, or first large background-image in hero-like selectors.
     - **Social links:** From `<a href>` containing known social domains.
     - **Structured data:** All `script[type="application/ld+json"]` parsed into array.
     - **Colors:** CSS variables (computed + :root in stylesheets) matching color-related names; `theme-color` meta; plus **element colors** from computed `backgroundColor`/`color` on header, nav, buttons, CTAs (for later brand color inference).
     - **Logo system raw:** All img with logo/brand in class/id/alt; favicons from `<link rel="icon">` etc.
     - **Images:** img src/srcset, picture source, video poster, background-image and data-* bg attributes, og/twitter meta images; deduped by origin+path in-page; max 250 per page.
   - **Aggregation:** `aggregateScrapeData(url, baseDomain, allContents)` in same file merges all pages into one `AggregatedScrape`: combined h1/h2/mainText, social map, structuredData, about/services/contact/pricing text from typed pages, merged logo/color/copySamples/allImageUrls/elementColors.

4. **Profile and colors (server-side, no browser)**
   - **Where:** `lib/brand/extractBrandProfile.ts` — `extractBrandProfile(aggregated)` returns `ExtractedProfile` (businessName, tagline, industry, logoUrl, socialLinks, etc.). Business name from structured data Organization, og:site_name, or title before `|`/`–`, or domain. Tagline from first h1 or og:description.
   - **Where:** `lib/brand/pickTopColors.ts` — `pickTopColors(aggregated)` returns `{ primary, secondary, accent }`. Uses CSS vars (primary/secondary/accent/brand/button/base/link), then legacy `colors`, then non-neutral entries from `aggregated.elementColors`.

5. **AI enrichment**
   - **Where:** `lib/brand/aiBrandAnalysis.ts` — single exported function `generateMission(businessName, tagline, homepageText, aboutPageText)`.
   - **Model:** `gpt-4o-mini` via OpenAI SDK. Prompt is inline in that function (brand strategist, 1–2 sentence mission; inputs are business name, tagline, first 2000 chars homepage, first 1500 chars about). No JSON schema; raw text response, or `null` if response is "null" or empty.
   - **Called from:** `app/api/scan/brand/route.ts`, in parallel with awaiting Shopify result, wrapped in 10s timeout; failure yields `mission: null`.

6. **Product extraction**
   - **Shopify (no browser):** In the brand route, a promise is started that fetches `https://${domain}/products.json?limit=1`. If OK and `products` exists, `fetchShopifyProducts(domain)` is called (`lib/brand/scrapeProducts.ts`). That function fetches `/products.json?limit=250&page=N` up to 3 pages, maps each item to `Product` (id, title, description, images, url, price, vendor). Products are merged into the final `ScanResult`; `sellingType` becomes `"products"` when Shopify detected.
   - **Single product by URL:** Not part of the main scan. `POST /api/scan/product` uses `launchBrowser` + `scrapeProductPage(page, url)` in `lib/brand/scrapeProducts.ts` (Playwright, then page.evaluate for og:title, h1, meta description, product img selectors, JSON-LD Product). Used by the UI “add product by URL” in the products step.

7. **Image deduplication**
   - **Where:** `lib/brand/dedupeImageUrls.ts` — `dedupeImageUrls(urls, maxCount?)`. Uses `getCanonicalImageKey` (origin + normalized path base, stripping size/retina/thumb suffixes) and `urlPreferenceScore` to keep one URL per canonical image, up to maxCount (300 in the route).

8. **Output type**
   - **Where:** `lib/brand/types.ts` — `ScanResult`: businessName, tagline, logoUrl, colors `{ primary, secondary, accent }`, mission, products, allImages, socialLinks, sellingType, websiteUrl, domain. Returned as `NextResponse.json({ success: true, scanResult })`.

**Summary table of main functions/files:**

| Step | File | Function / export |
|------|------|-------------------|
| Crawl | `lib/brand/scrapeBrand.ts` | `crawlWebsite`, `launchBrowser`, `setupStealth`, `scrapePage`, `discoverInternalLinks`, `aggregateScrapeData`, `extractPageContentPayload` (used inside evaluate) |
| Profile from raw | `lib/brand/extractBrandProfile.ts` | `extractBrandProfile` |
| Colors | `lib/brand/pickTopColors.ts` | `pickTopColors` |
| AI mission | `lib/brand/aiBrandAnalysis.ts` | `generateMission` |
| Shopify products | `lib/brand/scrapeProducts.ts` | `fetchShopifyProducts` |
| Single product | `lib/brand/scrapeProducts.ts` | `scrapeProductPage` |
| Dedupe images | `lib/brand/dedupeImageUrls.ts` | `dedupeImageUrls` |
| API | `app/api/scan/brand/route.ts` | `POST` handler |

---

### C) Current state management and persistence

- **Where data is stored today:**
  - **React state only.** In `app/page.tsx`: `scanResult`, `url`, `scanning`, `scanError`, `step`, and the editable fields `brandName`, `sellingType`, `logoUrl`, `tagline`, `colors`, `mission`, `products`, `allImages`. No localStorage, no sessionStorage, no cookies, no query params, no server-side session or in-memory cache keyed by user/scan.
  - **No database.** No Prisma, Drizzle, or Supabase client in the repo. No file writes for scan results.

- **How results get from API to UI:**
  - `handleScan` calls `fetch("/api/scan/brand", { method: "POST", body: JSON.stringify({ url: url.trim() }) })`, then `const data = await res.json()`. On success, `setScanResult(data.scanResult)`.
  - A `useEffect` depends on `scanResult` and updates all the editable state (brandName, sellingType, logoUrl, tagline, colors, mission, products, allImages). So the “source of truth” for the wizard after a scan is `scanResult`; the user’s edits live in the separate state variables and are never re-persisted anywhere.
  - Products step: `ProductListPanel` receives `products` and `onProductsChange={setProducts}`. “Add product by URL” calls `POST /api/scan/product` and then appends the returned product to local state. So product list and asset library are in-memory only; they are lost on refresh.

**What will need to change for Supabase:**  
After a successful scan (and optionally after each step), persist the current “brand profile” and products to Supabase. On load (or when the user has an identity), load the latest profile/scan for that user/workspace. The wizard would then initialize state from DB instead of only from the last API response. Any “save” or “continue” that should persist will need to call Supabase (insert/update). The single-product scan (`/api/scan/product`) could optionally persist the new product to the same brand/profile record.

---

### D) Auth and multi-tenant assumptions

- **Auth:** **No auth is implemented.** There is no NextAuth, Clerk, or custom auth middleware. `package.json` has no auth-related dependencies. No `getServerSession`, no protected routes, no auth cookies.
- **User / workspace / project:** There is no concept of “user”, “workspace”, or “project” in the codebase. The UI and API do not take a user id or workspace id; the scan is anonymous and the result exists only in React state. Supabase integration will need to introduce at least a “user” (or “anon” until auth is added) and optionally “workspace” or “project” to scope brand profiles and scans.

---

### E) File inventory (key areas)

- **Onboarding UI**
  - `app/page.tsx` — Single Client Component: hero form, steps (details, profile, products), all state and `handleScan`.
  - `app/layout.tsx` — Root layout (fonts, metadata).

- **Scan API**
  - `app/api/scan/brand/route.ts` — POST handler: validation, crawl, extract, AI, Shopify, dedupe, build `ScanResult`.
  - `app/api/scan/product/route.ts` — POST handler: single product URL scrape, returns `Product`.

- **Scraper (Playwright)**
  - `lib/brand/scrapeBrand.ts` — `launchBrowser`, `setupStealth`, `crawlWebsite`, `scrapePage`, `discoverInternalLinks`, `aggregateScrapeData`, `extractPageContentPayload` (injected script).
  - `lib/brand/scrapeProducts.ts` — `fetchShopifyProducts`, `scrapeProductPage`, `detectShopify` (latter not used in brand route).

- **AI**
  - `lib/brand/aiBrandAnalysis.ts` — `generateMission` (OpenAI `gpt-4o-mini`, inline prompt).

- **Types / schemas**
  - `lib/brand/types.ts` — `Product`, `ScanResult`, `PageContent`, `AggregatedScrape` (TypeScript interfaces only; no Zod or other runtime schema).

- **Profile/color helpers**
  - `lib/brand/extractBrandProfile.ts` — `extractBrandProfile`, `ExtractedProfile`.
  - `lib/brand/pickTopColors.ts` — `pickTopColors`, `TopColors`.
  - `lib/brand/dedupeImageUrls.ts` — `dedupeImageUrls`, `getCanonicalImageKey`.

- **UI for brand profile and products**
  - `components/brand/ProductList.tsx` — `ProductListPanel`, product sidebar, detail panel, add-by-URL and manual add; uses local state for selected product and product list.
  - `components/brand/AssetLibrary.tsx` — Grid of `allImages` with lightbox; no persistence.

- **Unused / legacy**
  - `lib/brand/buildExtendedProfile.ts` — `buildExtendedSections` (extended logo/color/assets); not referenced by the current scan route or types used in the wizard.

---

### F) Supabase-ready data model draft (tables and columns)

Based only on existing output structures (`ScanResult`, `Product`, and how images/social links are used), a minimal draft schema:

- **brand_profiles**
  - `id` (uuid, PK)
  - `created_at`, `updated_at` (timestamptz)
  - `owner_id` (uuid, FK to auth.users or a “workspaces” table; nullable if you support anon first)
  - `website_url` (text), `domain` (text)
  - `business_name` (text), `tagline` (text nullable), `logo_url` (text nullable)
  - `color_primary` (text nullable), `color_secondary` (text nullable), `color_accent` (text nullable)
  - `mission` (text nullable)
  - `selling_type` (text nullable: 'products' | 'saas' | 'services')
  - `social_links` (jsonb: array of `{ platform, url }`)
  - Optional: `industry`, `hero_image_url`, `og_image` if you want to persist more from `ExtractedProfile` later.

- **products**
  - `id` (uuid, PK)
  - `created_at`, `updated_at` (timestamptz)
  - `brand_profile_id` (uuid, FK to brand_profiles)
  - `external_id` (text nullable) — e.g. Shopify product id or `manual-{ts}`
  - `title` (text), `description` (text), `url` (text nullable)
  - `images` (jsonb: array of image URLs)
  - `price` (text nullable), `vendor` (text nullable)

- **assets** (extracted images and future creative outputs)
  - `id` (uuid, PK)
  - `created_at` (timestamptz)
  - `brand_profile_id` (uuid, FK to brand_profiles)
  - `url` (text) — image URL or storage path
  - `source` (text nullable) — e.g. 'scan', 'product', 'upload', 'generated'
  - Optional: `product_id` (uuid nullable, FK to products) if you want to link an asset to a product.

- **scans** (each scan run for auditing / re-run / status)
  - `id` (uuid, PK)
  - `created_at` (timestamptz)
  - `brand_profile_id` (uuid nullable, FK to brand_profiles — nullable if scan fails before profile is created)
  - `website_url` (text), `domain` (text)
  - `status` (text: 'running' | 'completed' | 'failed' | 'timeout')
  - `completed_at` (timestamptz nullable)
  - `error_message` (text nullable)
  - `payload_snapshot` (jsonb nullable) — optional; store a minimal copy of ScanResult or a pointer (e.g. storage path) to avoid bloating the table. Alternatively, “current” profile state is in brand_profiles and products/assets; this table is for history.

This is a draft only; RLS, indexes, and exact column types should be decided when implementing.

---

## 3) Questions / Risks

- **No scan or profile ID in the UI:** The client never receives or stores a scan id or profile id. To “save” or “update” a profile in Supabase, you will need to either (a) create a profile on first successful scan and return a profile id (and optionally scan id) in the API response, then have the client pass that id on subsequent saves, or (b) identify the profile by something else (e.g. `owner_id` + `domain`) and upsert. The current API returns only `scanResult` with no id.

- **Edits never sent back to server:** User edits (brand name, tagline, colors, mission, product list, etc.) live only in React state. There is no “Save” or “Update profile” API. Supabase will require new API route(s) or server actions to persist these, and the client must call them when the user saves or advances.

- **Single product scan and ownership:** `POST /api/scan/product` returns a product that the client appends to local state. To persist it, the client (or API) must know which `brand_profile_id` to attach it to; that implies the client has a current profile id from a prior scan or load.

- **Anonymous usage:** If you want to support “try without signing up”, you may need to allow `brand_profiles` (and related rows) with a null or temporary `owner_id`, then later “claim” the profile when the user signs up (e.g. link by session or email). The current app has no notion of session or device id.

- **Rate limits and quotas:** The scan is expensive (Playwright, multiple pages, OpenAI). There is no rate limiting or per-user quota in code. Supabase + auth could be used to enforce limits per user or per workspace.

- **Large payloads:** `ScanResult.allImages` can be hundreds of URLs; `products[].images` per product as well. Storing these in JSONB is fine, but if you later store binary assets in Supabase Storage, you’ll need a strategy for which URLs to download and store vs. keep as external URLs.

- **buildExtendedProfile:** `lib/brand/buildExtendedProfile.ts` exists and builds extended logo/color/asset structures but is not used by the current route or wizard. You can ignore it for the first Supabase pass or align the schema with it later if you reintroduce those fields.

---

*End of Repo Context Pack. All references are to the codebase as of the document date; file paths and function names are intended to be exact.*
