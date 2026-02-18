/**
 * POST /api/ads/instagram-story-ad
 *
 * Generates one Instagram Story ad creative:
 *  - Image: DALL-E 3 vertical 9:16 — product-focused, brand-colored
 *  - Caption: OpenAI gpt-4o-mini — short, punchy IG story overlay text
 *
 * Body: { brand: { name, tagline?, colors? }, product: { title, description? } }
 * Returns: { imageBase64, caption }
 */

import { NextResponse } from "next/server";
import { generateIgStoryImage } from "@/lib/ads/igStoryImage";
import { generateIgStoryCaption } from "@/lib/ads/igStoryCaption";

type Body = {
  brand?: {
    name?: string;
    tagline?: string;
    colors?: { primary?: string; secondary?: string; accent?: string };
  };
  product?: { title?: string; description?: string };
};

export async function POST(request: Request) {
  try {
    let body: Body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const brand = body.brand;
    const product = body.product;
    const brandName = brand?.name?.trim();
    if (!brandName) return NextResponse.json({ error: "Missing brand.name" }, { status: 400 });

    const productTitle = (product?.title ?? "").trim() || "our product";
    const productDescription = product?.description ?? null;

    const [imageResult, caption] = await Promise.all([
      generateIgStoryImage({
        brandName,
        tagline: brand?.tagline ?? null,
        productTitle,
        productDescription,
        colors: brand?.colors ?? null,
      }),
      generateIgStoryCaption({
        brandName,
        tagline: brand?.tagline ?? null,
        productTitle,
        productDescription,
      }),
    ]);

    return NextResponse.json({
      imageBase64: imageResult.base64Png,
      caption,
    });
  } catch (err) {
    console.error("[instagram-story-ad] Error:", err);
    const message = err instanceof Error ? err.message : "Instagram story ad generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
