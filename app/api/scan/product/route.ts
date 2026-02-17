import { NextResponse } from "next/server";
import { launchBrowser, setupStealth } from "@/lib/brand/scrapeBrand";
import { scrapeProductPage } from "@/lib/brand/scrapeProducts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : null;
    if (!url) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    const browser = await launchBrowser();
    try {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();
      await setupStealth(page);
      page.setDefaultTimeout(15_000);

      const product = await scrapeProductPage(page, url);
      return NextResponse.json({ success: true, product });
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || /timeout/i.test(err.message));
    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "Product page took too long to load."
          : "Failed to scrape product page.",
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
