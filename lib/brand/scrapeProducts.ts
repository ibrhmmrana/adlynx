import type { Product } from "./types";
import type { Page } from "playwright-core";

/* ── Shopify /products.json shape ── */
interface ShopifyImage {
  src: string;
}
interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  vendor?: string;
  images: ShopifyImage[];
  variants?: { price?: string }[];
}
interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#?\w+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect if the page is a Shopify store */
export async function detectShopify(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    if (typeof (window as unknown as Record<string, unknown>).Shopify !== "undefined") return true;
    const metaGen = document.querySelector('meta[name="generator"]');
    if (metaGen && /shopify/i.test(metaGen.getAttribute("content") || "")) return true;
    const links = document.querySelectorAll('link[href*="cdn.shopify"]');
    if (links.length > 0) return true;
    return false;
  });
}

/** Fetch products from Shopify /products.json (no browser needed) */
export async function fetchShopifyProducts(
  domain: string
): Promise<Product[]> {
  const baseUrl = `https://${domain}`;
  const allProducts: Product[] = [];
  let page = 1;
  const maxPages = 3;

  while (page <= maxPages) {
    const url = `${baseUrl}/products.json?limit=250&page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) break;

    const data = (await res.json()) as ShopifyProductsResponse;
    if (!data.products || data.products.length === 0) break;

    for (const p of data.products) {
      allProducts.push({
        id: String(p.id),
        title: p.title,
        description: stripHtml(p.body_html || ""),
        images: p.images.map((img) => img.src),
        url: `${baseUrl}/products/${p.handle}`,
        price: p.variants?.[0]?.price ?? undefined,
        vendor: p.vendor ?? undefined,
      });
    }

    if (data.products.length < 250) break;
    page++;
  }

  return allProducts;
}

/** Scrape a single product page for manual "add by URL" */
export async function scrapeProductPage(
  page: Page,
  url: string
): Promise<Product> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await new Promise((r) => setTimeout(r, 1500));

  const data = await page.evaluate(() => {
    const title =
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      document.querySelector("h1")?.textContent?.trim() ||
      document.title ||
      "";

    const description =
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      "";

    const images: string[] = [];
    const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (ogImg) images.push(ogImg);

    document.querySelectorAll('[class*="product"] img, [data-product] img, .product-single__photo img, main img').forEach((img) => {
      const src = (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src;
      if (src && !images.includes(src) && images.length < 20) images.push(src);
    });

    const price =
      document.querySelector('[class*="price"]')?.textContent?.trim() ||
      document.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ||
      null;

    let jsonLdTitle: string | null = null;
    let jsonLdDesc: string | null = null;
    let jsonLdImages: string[] = [];
    let jsonLdPrice: string | null = null;
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const d = JSON.parse(s.textContent || "{}");
        if (d["@type"] === "Product") {
          jsonLdTitle = d.name || null;
          jsonLdDesc = d.description || null;
          if (d.image) {
            const imgs = Array.isArray(d.image) ? d.image : [d.image];
            jsonLdImages = imgs.filter((i: unknown) => typeof i === "string");
          }
          if (d.offers) {
            const offer = Array.isArray(d.offers) ? d.offers[0] : d.offers;
            jsonLdPrice = offer?.price ?? null;
          }
        }
      } catch { /* ignore */ }
    });

    return {
      title: jsonLdTitle || title,
      description: jsonLdDesc || description,
      images: jsonLdImages.length ? [...new Set([...jsonLdImages, ...images])] : images,
      price: jsonLdPrice || price,
    };
  });

  return {
    id: `manual-${Date.now()}`,
    title: data.title,
    description: data.description,
    images: data.images.slice(0, 20),
    url,
    price: data.price ?? undefined,
  };
}
