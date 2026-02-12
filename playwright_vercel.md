# AdLynx: Playwright on Vercel (replicated from Antistatic)

Antistatic runs Playwright in Vercel serverless successfully by **not** using the full Playwright bundle with its own Chromium. It uses **playwright-core** (no bundled browser) plus **@sparticuz/chromium**, a trimmed Chromium build that fits Vercel’s size and execution limits.

---

## 1. Dependencies

**Use these (same as Antistatic):**

- `playwright-core` – Playwright API only, no bundled browser.
- `@sparticuz/chromium` – Serverless-friendly Chromium binary (Vercel/Lambda).

**Do not use:**

- `playwright` (full package) – pulls in large browser binaries that exceed serverless limits.

In AdLynx `package.json`:

```json
{
  "dependencies": {
    "playwright-core": "^1.57.0",
    "@sparticuz/chromium": "^143.0.4"
  }
}
```

Pin `@sparticuz/chromium` to a version compatible with your `playwright-core` (see [chromium version mapping](https://github.com/Sparticuz/chromium#version-mapping)). Antistatic uses `playwright-core@^1.57` and `@sparticuz/chromium@^143.0.4`.

---

## 2. Next.js config (keep Playwright/Chromium external)

So that Next doesn’t try to bundle Playwright’s optional deps (and break the build), mark them as external:

**`next.config.js` (or `next.config.mjs`):**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your other config
  experimental: {
    serverComponentsExternalPackages: [
      "playwright-core",
      "@sparticuz/chromium",
      "playwright",
    ],
  },
};

module.exports = nextConfig;
```

This matches Antistatic’s `next.config.js` and avoids build-time resolution of Playwright’s optional deps (electron, chromium-bidi, etc.).

---

## 3. API route: Node runtime and duration

Playwright does **not** run on the Edge runtime. Use Node and set a long enough duration for the brand scan.

At the top of the route that runs the browser (e.g. brand scan):

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;  // seconds; requires Vercel Pro for 60+ or set in vercel.json
```

---

## 4. Launch pattern (copy this into your brand-scan route)

Environment detection and launch logic used in Antistatic:

```ts
import { chromium as pwChromium } from 'playwright-core';
import type { Browser, Page, BrowserContext } from 'playwright-core';
import chromium from '@sparticuz/chromium';

function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function launchBrowser(): Promise<Browser> {
  const serverless = isServerless();
  const localPath = process.env.CHROME_PATH || process.env.CHROME_EXECUTABLE_PATH;

  const executablePath = serverless
    ? await chromium.executablePath()
    : (localPath || undefined);

  return pwChromium.launch({
    headless: true,
    args: [
      ...(serverless ? chromium.args : []),
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--single-process',
      '--no-zygote',
      '--disable-gpu',
    ],
    executablePath,
    timeout: 60000,
  });
}
```

- **On Vercel (or Lambda):** `chromium.executablePath()` points at the @sparticuz/chromium binary; `chromium.args` are the recommended flags for that build.
- **Locally:** use system Chromium or set `CHROME_PATH` / `CHROME_EXECUTABLE_PATH` to a local binary so you don’t rely on the serverless package.

Always close the browser in a `finally` block to avoid leaks:

```ts
let browser: Browser | null = null;
try {
  browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  // ... your scrape (e.g. page.goto with waitUntil: 'domcontentloaded', timeout: 45000)
} finally {
  if (browser) await browser.close();
}
```

---

## 5. Navigation and timeouts (avoid 500s and timeouts)

From Antistatic and your own timeout fix doc:

- Use **`waitUntil: 'domcontentloaded'`** (not `'networkidle'`) so the serverless function doesn’t wait forever on slow networks or third-party scripts.
- Set an explicit **navigation timeout** (e.g. 45s) and a **route `maxDuration`** (e.g. 60–120s).
- On timeout or failure, return a **504** (or structured error) instead of letting the route hang and 500.

Example:

```ts
await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 45_000,
});
```

---

## 6. Optional: TypeScript declaration for @sparticuz/chromium

Antistatic uses a small declaration file so TypeScript knows the shape of the default export:

**`types/sparticuz-chromium.d.ts`:**

```ts
declare module "@sparticuz/chromium" {
  const chromium: {
    args: string[];
    headless: boolean;
    executablePath: () => Promise<string>;
  };
  export default chromium;
}
```

---

## 7. Summary checklist for AdLynx

| Item | What to do |
|------|------------|
| **Packages** | Use `playwright-core` + `@sparticuz/chromium`; avoid full `playwright`. |
| **Next config** | Add `serverComponentsExternalPackages: ["playwright-core", "@sparticuz/chromium", "playwright"]`. |
| **Route** | `export const runtime = 'nodejs'` and `export const maxDuration = 120` (or 60 if no Pro). |
| **Launch** | In serverless: `await chromium.executablePath()` and `chromium.args`; locally: env path or `undefined`. |
| **Navigation** | `waitUntil: 'domcontentloaded'`, explicit timeout (e.g. 45s), return 504 on timeout. |
| **Cleanup** | Always `browser.close()` in `finally`. |
| **Types** | Optional: `types/sparticuz-chromium.d.ts` for default export. |

With this, AdLynx uses the same serverless-friendly Playwright + Chromium setup as Antistatic and avoids Vercel binary size and execution issues.
