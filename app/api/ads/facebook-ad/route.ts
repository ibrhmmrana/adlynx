/**
 * POST /api/ads/facebook-ad
 *
 * Generates one Facebook ad creative:
 *  - Image: Nano Banana Pro (DALL-E 3) — product-focused lifestyle photo
 *    incorporating brand colors and product context.
 *  - Caption: OpenAI gpt-4o-mini — short, engaging Facebook ad copy.
 *
 * Body: {
 *   brand: { name, tagline?, colors?: { primary?, secondary?, accent? } },
 *   product: { title, description? }
 * }
 * Returns: { imageBase64, caption }
 */

import { NextResponse } from "next/server";
import { generateAdCreativeImage } from "@/lib/ads/adCreativeImage";
import { generateFacebookAdCaption } from "@/lib/ads/facebookCaption";

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
      generateAdCreativeImage({
        brandName,
        tagline: brand?.tagline ?? null,
        productTitle,
        productDescription,
        colors: brand?.colors ?? null,
      }),
      generateFacebookAdCaption({
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
    console.error("[facebook-ad] Error:", err);
    const message = err instanceof Error ? err.message : "Facebook ad generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
