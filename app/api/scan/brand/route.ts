import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/brand/scrapeBrand";
import { extractBrandProfile } from "@/lib/brand/extractBrandProfile";
import { pickTopColors } from "@/lib/brand/pickTopColors";
import { generateMission } from "@/lib/brand/aiBrandAnalysis";
import { fetchShopifyProducts } from "@/lib/brand/scrapeProducts";
import { dedupeImageUrls } from "@/lib/brand/dedupeImageUrls";
import type { ScanResult, Product } from "@/lib/brand/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Total time budget for the ENTIRE operation (crawl + Shopify + AI + response).
 * Must leave headroom below maxDuration (60 s) for JSON serialisation.
 */
const DEADLINE_MS = 55_000;
const AI_TIMEOUT_MS = 10_000;
const SHOPIFY_TIMEOUT_MS = 12_000;

export async function POST(request: Request) {
  const abortController = new AbortController();
  let deadlineId: ReturnType<typeof setTimeout>;
  const deadlinePromise = new Promise<never>((_, reject) => {
    deadlineId = setTimeout(() => {
      abortController.abort();
      reject(new Error("Scan timed out"));
    }, DEADLINE_MS);
  });

  try {
    const body = await request.json();
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : null;
    if (!rawUrl) {
      clearTimeout(deadlineId!);
      return NextResponse.json(
        { success: false, error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    const domain = new URL(normalized).hostname;

    // ── Kick off Shopify probe immediately (plain HTTP, no browser needed) ──
    const shopifyPromise: Promise<{ isShopify: boolean; products: Product[] }> = (async () => {
      try {
        const probeRes = await fetch(
          `https://${domain}/products.json?limit=1`,
          { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) }
        );
        if (!probeRes.ok) return { isShopify: false, products: [] };
        const probeData = await probeRes.json();
        if (!probeData?.products) return { isShopify: false, products: [] };
        const products = await fetchShopifyProducts(domain);
        return { isShopify: true, products };
      } catch {
        return { isShopify: false, products: [] };
      }
    })();

    // ── Crawl website in parallel with the Shopify probe ──
    const crawlPromise = crawlWebsite(normalized, abortController.signal);

    // Wait for crawl (the heavy part), racing against the deadline
    const aggregated = await Promise.race([crawlPromise, deadlinePromise]);

    const partial = extractBrandProfile(aggregated);
    const colors = pickTopColors(aggregated);
    const businessName = partial.businessName ?? domain.split(".")[0];
    const tagline = partial.tagline ?? null;

    // ── Collect Shopify results + generate AI mission in parallel ──
    const [shopifyResult, mission] = await Promise.race([
      Promise.all([
        // Shopify was already started, just await (with a safety timeout)
        Promise.race([
          shopifyPromise,
          new Promise<{ isShopify: false; products: Product[] }>((r) =>
            setTimeout(() => r({ isShopify: false, products: [] }), SHOPIFY_TIMEOUT_MS)
          ),
        ]),
        // AI mission
        (async (): Promise<string | null> => {
          try {
            return await Promise.race([
              generateMission(businessName, tagline, aggregated.allMainText, aggregated.aboutPageText),
              new Promise<null>((r) => setTimeout(() => r(null), AI_TIMEOUT_MS)),
            ]);
          } catch {
            return null;
          }
        })(),
      ]) as Promise<[{ isShopify: boolean; products: Product[] }, string | null]>,
      deadlinePromise,
    ]);

    clearTimeout(deadlineId!);

    const allImages = dedupeImageUrls(aggregated.allImageUrls ?? [], 300);

    const scanResult: ScanResult = {
      businessName,
      tagline,
      logoUrl: partial.logoUrl ?? null,
      colors,
      mission,
      products: shopifyResult.products,
      allImages,
      socialLinks: partial.socialLinks ?? [],
      sellingType: shopifyResult.isShopify ? "products" : null,
      websiteUrl: aggregated.url,
      domain: aggregated.domain,
    };

    return NextResponse.json({ success: true, scanResult });
  } catch (err) {
    clearTimeout(deadlineId!);
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" ||
        err.name === "AbortError" ||
        /timeout|timed out|aborted/i.test(err.message));
    if (isTimeout) {
      return NextResponse.json(
        {
          success: false,
          error: "Website took too long to load. Try again or use a different URL.",
          code: "TIMEOUT",
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to scan website. The site may be blocking automated access or is unavailable.",
      },
      { status: 500 }
    );
  }
}
