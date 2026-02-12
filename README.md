# AdLynx

Performance media powered by hybrid intelligence. This phase focuses on **website scraping**: enter a URL, get a structured brand profile.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Install Playwright Chromium (required for local scanning)**

   ```bash
   npx playwright install chromium
   ```

3. **Environment**

   Copy `.env.example` to `.env` and set `OPENAI_API_KEY` for AI-derived fields (mission, value proposition, tone of voice, etc.). Scraping still works without it; those fields will be null or fallbacks.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter a website URL and click **Scan my website**. The app will crawl the site and return a brand profile.

## API

- **POST /api/scan/brand**  
  Body: `{ "url": "https://example.com" }`  
  Response: `{ "success": true, "brandProfile": { ... } }`

## Scope (current)

- Hero landing page with URL input and CTA
- Website scraper (Playwright + stealth): homepage + up to 5 key pages (about, services, contact, pricing)
- Aggregation and deterministic extraction (name, tagline, logo, colors, social links, services)
- Optional OpenAI pass for mission, value proposition, tone, target audience, USPs
- Brand profile card UI showing all extracted fields
