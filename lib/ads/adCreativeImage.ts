/**
 * Generate a Facebook ad creative image using "Nano Banana Pro" (DALL-E 3).
 *
 * Unlike the UGC selfie portrait, this produces a product-focused lifestyle
 * image suitable for a Facebook feed ad. The prompt is dynamically built
 * from brand context: name, product, brand colors, and overall aesthetic.
 */

export type AdCreativeImageInput = {
  brandName: string;
  tagline?: string | null;
  productTitle: string;
  productDescription?: string | null;
  colors?: { primary?: string | null; secondary?: string | null; accent?: string | null } | null;
  logoDescription?: string | null;
};

export type AdCreativeImageResult = {
  base64Png: string;
  mimeType: string;
};

function buildAdPrompt(input: AdCreativeImageInput): string {
  const { brandName, tagline, productTitle, productDescription, colors } = input;

  const colorParts: string[] = [];
  if (colors?.primary) colorParts.push(colors.primary);
  if (colors?.secondary) colorParts.push(colors.secondary);
  if (colors?.accent) colorParts.push(colors.accent);
  const colorHint = colorParts.length
    ? `The color palette subtly incorporates the brand colors: ${colorParts.join(", ")}. These tones appear in the background, lighting accents, or props—never as flat color fills.`
    : "";

  const productDesc = productDescription
    ? ` — ${productDescription}`
    : "";

  const taglineHint = tagline
    ? ` The brand's identity: "${tagline}".`
    : "";

  return [
    `High-end commercial product photograph for a Facebook advertisement.`,
    `Brand: "${brandName}".${taglineHint}`,
    `Hero product: "${productTitle}"${productDesc}.`,
    `The product is the clear focal point, beautifully lit and centered in frame.`,
    `Lifestyle context: the product is shown in a clean, modern, aspirational setting that fits the brand's category — think soft natural light, shallow depth of field, and an editorial feel.`,
    colorHint,
    `Composition: rule-of-thirds, slightly overhead or 3/4 angle, inviting and scroll-stopping.`,
    `Style: photorealistic, magazine-quality advertising photography, warm and inviting.`,
    `Absolutely NO text, NO logos, NO watermarks, NO overlays, NO UI elements.`,
    `4K quality, professional studio lighting with soft fill.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateAdCreativeImage(
  input: AdCreativeImageInput
): Promise<AdCreativeImageResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("OPENAI_API_KEY not set (required for ad creative image)");

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });

  const prompt = buildAdPrompt(input);

  const resp = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
    quality: "hd",
  });

  const b64 = resp.data?.[0]?.b64_json;
  if (!b64) throw new Error("DALL-E 3 image generation returned no data");
  return { base64Png: b64, mimeType: "image/png" };
}
