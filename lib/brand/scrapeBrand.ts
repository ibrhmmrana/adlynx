import { chromium as pwChromium } from "playwright-core";
import type { Browser, Page } from "playwright-core";
import chromium from "@sparticuz/chromium";
import type { PageContent, AggregatedScrape } from "./types";
import { dedupeImageUrls } from "./dedupeImageUrls";

/** Keep total crawl well under the route deadline (~55 s). */
const NAV_TIMEOUT_MS = 18_000;
const POST_LOAD_WAIT_MS = 1_200;
const KEY_PAGE_NAV_TIMEOUT_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_PAGES = 3;
const AUTO_SCROLL_CAP_MS = 5_000;
const KEY_PAGE_PATTERNS = [
  { type: "about", patterns: [/about/i, /who-we-are/i, /our-story/i, /company/i] },
  { type: "services", patterns: [/service/i, /what-we-do/i, /solution/i, /offer/i, /product/i] },
  { type: "contact", patterns: [/contact/i, /get-in-touch/i, /reach-us/i] },
  { type: "pricing", patterns: [/pric/i, /plan/i, /package/i] },
];

export async function launchBrowser(): Promise<Browser> {
  const isServerless =
    !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL;
  const localPath =
    process.env.CHROME_PATH || process.env.CHROME_EXECUTABLE_PATH;
  const executablePath = isServerless
    ? await chromium.executablePath()
    : (localPath || undefined);

  return pwChromium.launch({
    headless: true,
    args: [
      ...(isServerless ? chromium.args : []),
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--single-process",
      "--no-zygote",
      "--disable-gpu",
    ],
    executablePath,
    timeout: 20_000,
  });
}

export async function setupStealth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
  });
}

function extractPageContentPayload(): string {
  return `
  (function() {
    const title = document.title || null;
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null;
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;
    const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || null;

    const h1 = Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim()).filter(Boolean);
    const h2 = Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim()).filter(Boolean);

    let mainText = '';
    const mainSelectors = ['main', 'article', '[role="main"]', '.main-content', '#main-content'];
    for (const selector of mainSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('nav, footer, header, script, style, noscript').forEach(e => e.remove());
        mainText = (clone.innerText || '').trim();
        if (mainText.length > 100) break;
      }
    }
    if (mainText.length < 100 && document.body) {
      const bodyClone = document.body.cloneNode(true);
      bodyClone.querySelectorAll('nav, footer, header, script, style, noscript, aside').forEach(e => e.remove());
      mainText = (bodyClone.innerText || '').trim();
    }
    mainText = mainText.substring(0, 8000);

    const aboveFoldText = (document.body ? document.body.innerText || '' : '').substring(0, 800).replace(/\\s+/g, ' ').trim();

    // Third-party domains and containers to ignore for logos and images
    const THIRD_PARTY_DOMAINS = /cookieyes|onetrust|cookiebot|hubspot|intercom|drift|tawk|livechat|tidio|crisp\.chat|zendesk|freshdesk|olark|purechat|chatra|smartsupp|userlike|gorgias|facebook\.net|fbcdn|google-analytics|googletagmanager|hotjar|clarity\.ms/i;
    const THIRD_PARTY_CONTAINERS = '#cookieyes, #cky-consent, [class*="cookieyes"], #onetrust-consent-sdk, [class*="cookiebot"], [class*="cookie-banner"], [class*="cookie-consent"], [class*="cookie-notice"], #tidio-chat, [class*="intercom"], [class*="drift-"], [class*="tawk-"], [class*="chat-widget"], [class*="livechat"]';
    const isInsideThirdParty = (el) => {
      try { return !!el.closest(THIRD_PARTY_CONTAINERS); } catch { return false; }
    };
    const isThirdPartySrc = (src) => {
      if (!src) return false;
      return THIRD_PARTY_DOMAINS.test(src);
    };

    // --- Logo: prefer JSON-LD Organization.logo, then scored DOM candidates ---
    let logoUrl = null;
    const jsonLdScriptsForLogo = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const script of jsonLdScriptsForLogo) {
      try {
        const obj = JSON.parse(script.textContent || '{}');
        if (obj['@type'] === 'Organization' && obj.logo) {
          const l = obj.logo;
          logoUrl = typeof l === 'string' ? l : (l.url || l);
          break;
        }
        if (Array.isArray(obj['@graph'])) {
          for (const node of obj['@graph']) {
            if (node && node['@type'] === 'Organization' && node.logo) {
              const l = node.logo;
              logoUrl = typeof l === 'string' ? l : (l.url || l);
              break;
            }
          }
          if (logoUrl) break;
        }
      } catch {}
    }
    if (!logoUrl) {
      const homePath = window.location.pathname === '' || window.location.pathname === '/' ? window.location.href : new URL('/', window.location.origin).href;
      const candidates = [];
      document.querySelectorAll('header img, nav img, [role="banner"] img, .header img, .nav img, .site-header img, .navbar img, img[class*="logo"], img[id*="logo"], img[alt*="logo"], .logo img, #logo img').forEach(img => {
        if (!img || !(img instanceof HTMLImageElement) || !img.src || isInsideThirdParty(img) || isThirdPartySrc(img.src)) return;
        const src = img.currentSrc || img.src;
        let score = 0;
        const inHeader = !!img.closest('header, nav, [role="banner"], .header, .nav, .site-header, .navbar');
        if (inHeader) score += 3;
        const parentLink = img.closest('a');
        if (parentLink && parentLink.href) {
          try {
            const u = new URL(parentLink.href, window.location.origin);
            if (u.pathname === '/' || u.pathname === '' || u.href === homePath) score += 2;
          } catch {}
        }
        const c = (img.className || '').toLowerCase(); const id = (img.id || '').toLowerCase(); const alt = (img.alt || '').toLowerCase();
        if (/logo|brand/.test(c + id + alt)) score += 2;
        const w = img.naturalWidth || img.width || 0; const h = img.naturalHeight || img.height || 0;
        if (w >= 40 && h >= 40 && w <= 500 && h <= 500) score += 1;
        else if (w < 24 || h < 24) score -= 2;
        candidates.push({ src, score });
      });
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        logoUrl = candidates[0].score > 0 ? candidates[0].src : null;
      }
    }
    if (!logoUrl && ogImage) logoUrl = ogImage;

    let heroImage = null;
    let maxSize = 0;
    document.querySelectorAll('img').forEach(img => {
      const src = img.currentSrc || img.src;
      const size = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
      if (src && size > maxSize && size > 50000) {
        maxSize = size;
        heroImage = src;
      }
    });
    // Also check first large background-image in hero-ish containers
    if (!heroImage) {
      const heroSelectors = ['[class*="hero"]', '[class*="banner"]', '[class*="jumbotron"]', 'header', 'section:first-of-type'];
      for (const sel of heroSelectors) {
        const el = document.querySelector(sel);
        if (!el) continue;
        try {
          const bg = getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none') {
            const m = bg.match(/url\\(["']?([^"')]+)["']?\\)/);
            if (m && m[1]) { heroImage = new URL(m[1], window.location.origin).href; break; }
          }
        } catch {}
      }
    }

    const socialDomains = ['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com'];
    const socialLinks = [];
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

    const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const structuredData = jsonLdScripts.map(script => {
      try { return JSON.parse(script.textContent || '{}'); }
      catch { return null; }
    }).filter(Boolean);

    const colors = [];
    const computedStyle = getComputedStyle(document.documentElement);
    ['--primary', '--brand', '--accent', '--primary-color', '--brand-color', '--theme-color'].forEach(prop => {
      const val = computedStyle.getPropertyValue(prop).trim();
      if (val && val !== '') colors.push(val);
    });
    const themeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
    if (themeColor) colors.push(themeColor);

    // Sample computed colors from header, nav, buttons, links (brand-like UI)
    const elementColors = [];
    const colorEls = document.querySelectorAll('header, nav, [role="banner"], .header, .site-header, .navbar, button, .btn, [class*="button"], a[class*="cta"], a[class*="btn"], .header a, nav a');
    colorEls.forEach(el => {
      try {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        const fg = style.color;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') elementColors.push(bg);
        if (fg && fg !== 'rgba(0, 0, 0, 0)' && fg !== 'transparent') elementColors.push(fg);
      } catch {}
    });

    const footerText = document.querySelector('footer')?.textContent?.trim()?.substring(0, 500) || null;

    // --- Extended: Logo system (skip third-party widget logos) ---
    const logoUrls = [];
    document.querySelectorAll('img[src]').forEach(img => {
      if (isInsideThirdParty(img) || isThirdPartySrc(img.src)) return;
      const c = (img.className || '').toLowerCase();
      const id = (img.id || '').toLowerCase();
      const alt = (img.alt || '').toLowerCase();
      if (c.includes('logo') || id.includes('logo') || alt.includes('logo') || c.includes('brand'))
        logoUrls.push(img.src);
    });
    const favicons = [];
    document.querySelectorAll('link[rel]').forEach(link => {
      const rel = (link.getAttribute('rel') || '').toLowerCase();
      const href = link.getAttribute('href');
      if (href && (rel.includes('icon') || rel.includes('apple-touch') || rel.includes('shortcut')))
        favicons.push({ href: new URL(href, window.location.origin).href, sizes: link.getAttribute('sizes') || undefined, type: link.getAttribute('type') || undefined, rel });
    });

    // --- Extended: CSS variables (colors only) ---
    const colorNameRe = /color|primary|secondary|accent|neutral|background|surface|border|success|warning|error|info|gradient|hue|foreground|button|base|link|brand|theme|fill|stroke/i;
    const colorSystemRaw = {};
    try {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      for (let i = 0; i < style.length; i++) {
        const prop = style[i];
        if (!prop.startsWith('--')) continue;
        const val = style.getPropertyValue(prop).trim();
        if (!val) continue;
        if (colorNameRe.test(prop) && /^#|rgb|rgba|hsl|hsla/.test(val)) colorSystemRaw[prop] = val;
      }
      const themeColorMeta = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
      if (themeColorMeta) colorSystemRaw['--theme-color'] = themeColorMeta;
    } catch (e) {}
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          if (!sheet.cssRules) return;
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.indexOf(':root') !== -1 && rule.style) {
              for (let i = 0; i < rule.style.length; i++) {
                const prop = rule.style[i];
                if (!prop.startsWith('--')) continue;
                const val = rule.style.getPropertyValue(prop).trim();
                if (!val) continue;
                if (!(prop in colorSystemRaw) && colorNameRe.test(prop) && /^#|rgb|rgba|hsl|hsla/.test(val))
                  colorSystemRaw[prop] = val;
              }
            }
          }
        } catch (e2) {}
      });
    } catch (e3) {}

    // --- Extended: Copy samples (button and CTA text) ---
    const buttonTexts = [];
    const ctaTexts = [];
    document.querySelectorAll('button, [role="button"], input[type="submit"], .btn, [class*="button"], a[class*="cta"], a[class*="button"]').forEach(el => {
      const t = (el.textContent || '').trim().substring(0, 80);
      if (t && buttonTexts.indexOf(t) === -1) buttonTexts.push(t);
    });
    document.querySelectorAll('a[href]').forEach(a => {
      const t = (a.textContent || '').trim().substring(0, 80);
      const c = (a.className || '').toLowerCase();
      if (t && (c.includes('cta') || c.includes('primary') || c.includes('signup') || c.includes('get started') || /get started|sign up|learn more|book now|contact us/i.test(t)))
        if (ctaTexts.indexOf(t) === -1) ctaTexts.push(t);
    });

    // --- Extended: All images (dedupe by path so same image with different ?w= / size suffix = one) ---
    const imgByPath = {};
    const addImg = (u) => {
      if (!u || typeof u !== 'string') return;
      try {
        const abs = new URL(u, window.location.origin).href;
        if (abs.startsWith('data:') && abs.length < 200) return;
        if (THIRD_PARTY_DOMAINS.test(abs)) return;
        const key = new URL(abs).origin + new URL(abs).pathname;
        const existing = imgByPath[key];
        if (!existing || !new URL(abs).search) imgByPath[key] = abs;
      } catch {}
    };

    // 1) img[src] and img[srcset]
    document.querySelectorAll('img').forEach(img => {
      if (isInsideThirdParty(img)) return;
      addImg(img.src);
      addImg(img.currentSrc);
      const srcset = img.getAttribute('srcset');
      if (srcset) srcset.split(',').forEach(s => addImg(s.trim().split(/\\s+/)[0]));
      // Lazy-load attributes
      ['data-src', 'data-lazy-src', 'data-original', 'data-bg', 'data-bg-src', 'data-srcset'].forEach(attr => {
        const val = img.getAttribute(attr);
        if (val) {
          if (attr.includes('srcset')) val.split(',').forEach(s => addImg(s.trim().split(/\\s+/)[0]));
          else addImg(val);
        }
      });
    });

    // 2) <picture> <source srcset>
    document.querySelectorAll('picture source[srcset]').forEach(src => {
      const srcset = src.getAttribute('srcset');
      if (srcset) srcset.split(',').forEach(s => addImg(s.trim().split(/\\s+/)[0]));
    });

    // 3) <video poster>
    document.querySelectorAll('video[poster]').forEach(v => addImg(v.getAttribute('poster')));

    // 4) CSS background-image on visible elements
    const seen = new Set();
    document.querySelectorAll('div, section, header, footer, article, aside, figure, span, a, li').forEach(el => {
      if (seen.has(el) || Object.keys(imgByPath).length > 250) return;
      seen.add(el);
      try {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const matches = bg.match(/url\\(["']?([^"')]+)["']?\\)/g);
          if (matches) matches.forEach(m => {
            const u = m.replace(/url\\(["']?/, '').replace(/["']?\\)/, '');
            addImg(u);
          });
        }
      } catch {}
      // Also check inline style data attributes for lazy bg
      ['data-bg', 'data-background', 'data-background-image'].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val) addImg(val);
      });
    });

    // 5) OG and other meta images
    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]').forEach(m => {
      addImg(m.getAttribute('content'));
    });

    const allImageUrls = Object.values(imgByPath).slice(0, 250);
    const mediaKitLinks = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (/brand|press|media-kit|mediakit|media_kit|press-kit|logo.*download/.test(href))
        mediaKitLinks.push(new URL(a.getAttribute('href'), window.location.origin).href);
    });

    return {
      title, metaDescription, ogTitle, ogDescription, ogImage, ogSiteName,
      h1, h2, mainText, aboveFoldText, logoUrl, heroImage,
      socialLinks, structuredData, colors, footerText,
      logoSystemRaw: { logoUrls, favicons },
      colorSystemRaw,
      copySamples: { buttonTexts: buttonTexts.slice(0, 25), ctaTexts: ctaTexts.slice(0, 25) },
      allImageUrls,
      mediaKitLinks: [...new Set(mediaKitLinks)].slice(0, 20),
      elementColors: [...new Set(elementColors)].slice(0, 30),
    };
  })();
  `;
}

/** Scroll the full page to trigger lazy-loaded images and content */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 150);
      // Safety cap
      setTimeout(() => { clearInterval(timer); window.scrollTo(0, 0); resolve(); }, 5000);
    });
  });
}

/** Dismiss cookie banners, chat widgets, and other third-party overlays */
async function dismissOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    // --- 1. Click common cookie accept buttons ---
    const acceptSelectors = [
      'button[id*="accept"]', 'button[class*="accept"]',
      'a[id*="accept"]', 'a[class*="accept"]',
      'button[id*="consent"]', 'button[class*="consent"]',
      'button[id*="agree"]', 'button[class*="agree"]',
      'button[id*="allow"]', 'button[class*="cookie-close"]',
      '[data-cky-tag="accept-button"]',
      '.cky-btn-accept', '#cky-btn-accept',
      '.cc-accept', '.cc-allow', '.cc-dismiss',
      '#onetrust-accept-btn-handler',
      '.cmpboxbtn.cmpboxbtnyes',
      '[aria-label="Accept cookies"]', '[aria-label="Accept all cookies"]',
      '[aria-label="Allow all"]', '[aria-label="Accept all"]',
    ];
    for (const sel of acceptSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn instanceof HTMLElement) {
        try { btn.click(); } catch {}
      }
    }

    // --- 2. Remove known third-party overlay containers ---
    const removeSelectors = [
      '#cookieyes', '#cky-consent', '[class*="cookieyes"]',
      '#onetrust-consent-sdk', '#onetrust-banner-sdk',
      '#CybotCookiebotDialog', '[class*="cookiebot"]',
      '[class*="cookie-banner"]', '[class*="cookie-consent"]', '[class*="cookie-notice"]',
      '[id*="cookie-banner"]', '[id*="cookie-consent"]', '[id*="cookie-notice"]',
      '#gdpr', '[class*="gdpr"]',
      '[class*="cc-window"]', '[class*="cc-banner"]',
      // Chat widgets
      '#tidio-chat', '#hubspot-messages-iframe-container',
      '#intercom-container', '[class*="intercom"]',
      '#drift-widget', '[class*="drift-"]',
      '#fb-root', '#fb-customer-chat',
      '[class*="tawk-"]', '#tawk-tooltip',
      '[class*="livechat"]', '[class*="chat-widget"]',
      '[class*="zsiq"]', // Zoho SalesIQ
    ];
    for (const sel of removeSelectors) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }
  });
  // Brief wait for DOM to settle after removals
  await new Promise((r) => setTimeout(r, 300));
}

/**
 * Scrape a single page.
 * @param fullScrape  When true, runs auto-scroll + extra wait to trigger lazy
 *                    images. Use for the home page; skip on subpages to save time.
 */
export async function scrapePage(page: Page, fullScrape = false): Promise<PageContent> {
  await dismissOverlays(page);
  if (fullScrape) {
    await autoScroll(page);
    await new Promise((r) => setTimeout(r, 1200));
  }
  const raw = await page.evaluate(extractPageContentPayload());
  return raw as PageContent;
}

export async function discoverInternalLinks(
  page: Page,
  baseDomain: string
): Promise<{ url: string; type: string }[]> {
  const links = await page.evaluate((domain: string) => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href") || "")
      .filter((href) => {
        try {
          const url = new URL(href, window.location.origin);
          return url.hostname === domain || href.startsWith("/");
        } catch {
          return false;
        }
      })
      .map((href) => new URL(href, window.location.origin).href);
  }, baseDomain);

  const seen = new Set<string>();
  const typed: { url: string; type: string }[] = [];

  for (const href of links) {
    if (seen.has(href)) continue;
    const path = new URL(href).pathname.toLowerCase();
    for (const { type, patterns } of KEY_PAGE_PATTERNS) {
      if (patterns.some((p) => p.test(path))) {
        seen.add(href);
        typed.push({ url: href, type });
        break;
      }
    }
  }

  // Dedupe by type: keep first match per type
  const byType = new Map<string, string>();
  for (const { url, type } of typed) {
    if (!byType.has(type)) byType.set(type, url);
  }
  return Array.from(byType.entries()).map(([type, url]) => ({ url, type }));
}

function throwIfAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) throw new Error("Scan timed out");
}

export async function crawlWebsite(
  inputUrl: string,
  signal?: AbortSignal | null
): Promise<AggregatedScrape> {
  let url = inputUrl.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  const parsed = new URL(url);
  const baseDomain = parsed.hostname;

  throwIfAborted(signal);
  const browser = await launchBrowser();
  try {
    throwIfAborted(signal);
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    await setupStealth(page);
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    const pagesToCrawl: { url: string; type: string }[] = [
      { url, type: "home" },
    ];

    throwIfAborted(signal);
    let homeNavTimedOut = false;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    } catch (navErr) {
      if (navErr instanceof Error && /[Tt]imeout/.test(navErr.message)) {
        homeNavTimedOut = true;
      } else {
        throw navErr;
      }
    }
    if (homeNavTimedOut) {
      try {
        await page.waitForSelector("body", { timeout: 8_000 });
      } catch {
        throw new Error("Page body never loaded");
      }
    }
    throwIfAborted(signal);
    await new Promise((r) => setTimeout(r, POST_LOAD_WAIT_MS));
    const keyPages = await discoverInternalLinks(page, baseDomain);
    for (const kp of keyPages) {
      if (pagesToCrawl.length >= MAX_PAGES) break;
      if (!pagesToCrawl.some((p) => p.url === kp.url)) {
        pagesToCrawl.push(kp);
      }
    }

    throwIfAborted(signal);
    const homeContent = await scrapePage(page, true);
    const allContents: { type: string; content: PageContent }[] = [
      { type: "home", content: homeContent },
    ];

    for (let i = 1; i < pagesToCrawl.length; i++) {
      if (signal?.aborted) break;
      const { url: pageUrl } = pagesToCrawl[i];
      try {
        try {
          await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: KEY_PAGE_NAV_TIMEOUT_MS });
        } catch (navErr) {
          if (!(navErr instanceof Error && /[Tt]imeout/.test(navErr.message))) {
            throw navErr;
          }
        }
        await new Promise((r) => setTimeout(r, 800));
        const content = await scrapePage(page, false);
        allContents.push({
          type: pagesToCrawl[i].type,
          content,
        });
      } catch {
        // skip failed page
      }
    }

    await browser.close();

    return aggregateScrapeData(url, baseDomain, allContents);
  } finally {
    await browser.close().catch(() => {});
  }
}

function aggregateScrapeData(
  url: string,
  domain: string,
  allContents: { type: string; content: PageContent }[]
): AggregatedScrape {
  const home = allContents.find((c) => c.type === "home")?.content;
  if (!home) throw new Error("No homepage content");

  const allH1: string[] = [];
  const allH2: string[] = [];
  let allMainText = "";
  const socialMap = new Map<string, string>();
  const structuredData: unknown[] = [];
  let aboutPageText: string | null = null;
  let servicesPageText: string | null = null;
  let contactPageText: string | null = null;
  let pricingPageText: string | null = null;

  const order = ["home", "about", "services", "contact", "pricing"];
  const sorted = [...allContents].sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
  );

  for (const { type, content } of sorted) {
    allH1.push(...content.h1);
    allH2.push(...content.h2);
    allMainText += (content.mainText || "").trim() + "\n\n";
    for (const s of content.socialLinks) {
      if (!socialMap.has(s.platform)) socialMap.set(s.platform, s.url);
    }
    structuredData.push(...content.structuredData);
    if (type === "about") aboutPageText = content.mainText || null;
    if (type === "services") servicesPageText = content.mainText || null;
    if (type === "contact") contactPageText = content.mainText || null;
    if (type === "pricing") pricingPageText = content.mainText || null;
  }

  allMainText = allMainText.trim().substring(0, 15000);

  const logoUrlsSet = new Set<string>();
  const faviconsMap = new Map<string, { href: string; sizes?: string; type?: string; rel?: string }>();
  const colorSystemRaw: Record<string, string> = {};
  const buttonTextsSet = new Set<string>();
  const ctaTextsSet = new Set<string>();
  const allImageUrlsAccum: string[] = [];
  const mediaKitUrlsSet = new Set<string>();
  const elementColorsAccum: string[] = [];

  for (const { content } of sorted) {
    const ext = content as PageContent;
    if (ext.logoSystemRaw) {
      ext.logoSystemRaw.logoUrls.forEach((u) => logoUrlsSet.add(u));
      ext.logoSystemRaw.favicons.forEach((f) => faviconsMap.set(f.href, f));
    }
    if (ext.colorSystemRaw) Object.assign(colorSystemRaw, ext.colorSystemRaw);
    if (ext.copySamples) {
      ext.copySamples.buttonTexts.forEach((t) => buttonTextsSet.add(t));
      ext.copySamples.ctaTexts.forEach((t) => ctaTextsSet.add(t));
    }
    if (ext.allImageUrls) allImageUrlsAccum.push(...ext.allImageUrls);
    if (ext.mediaKitLinks) ext.mediaKitLinks.forEach((u) => mediaKitUrlsSet.add(u));
    if (ext.elementColors) elementColorsAccum.push(...ext.elementColors);
  }

  const allImageUrlsDeduped = dedupeImageUrls(allImageUrlsAccum, 300);

  return {
    url,
    domain,
    title: home.title,
    metaDescription: home.metaDescription,
    ogTitle: home.ogTitle,
    ogDescription: home.ogDescription,
    ogImage: home.ogImage,
    ogSiteName: home.ogSiteName,
    logoUrl: home.logoUrl,
    heroImage: home.heroImage,
    colors: home.colors || [],
    footerText: home.footerText,
    allH1: [...new Set(allH1)],
    allH2: [...new Set(allH2)],
    allMainText,
    socialLinks: Array.from(socialMap.entries()).map(([platform, url]) => ({
      platform,
      url,
    })),
    structuredData,
    aboutPageText,
    servicesPageText,
    contactPageText,
    pricingPageText,
    logoSystemRaw: logoUrlsSet.size || faviconsMap.size ? { logoUrls: [...logoUrlsSet], favicons: [...faviconsMap.values()] } : undefined,
    colorSystemRaw: Object.keys(colorSystemRaw).length ? colorSystemRaw : undefined,
    copySamples: { buttonTexts: [...buttonTextsSet].slice(0, 30), ctaTexts: [...ctaTextsSet].slice(0, 30) },
    allImageUrls: allImageUrlsDeduped,
    mediaKitUrls: [...mediaKitUrlsSet],
    elementColors: elementColorsAccum.length ? [...new Set(elementColorsAccum)].slice(0, 50) : undefined,
  };
}
