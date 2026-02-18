/**
 * Generate an Instagram Story ad creative image using DALL-E 3.
 * Vertical 9:16 (1024x1792), product-focused, brand-colored.
 */

export type IgStoryImageInput = {
  brandName: string;
  tagline?: string | null;
  productTitle: string;
  productDescription?: string | null;
  colors?: { primary?: string | null; secondary?: string | null; accent?: string | null } | null;
};

export type IgStoryImageResult = {
  base64Png: string;
  mimeType: string;
};

function buildIgStoryPrompt(input: IgStoryImageInput): string {
  const { brandName, tagline, productTitle, productDescription, colors } = input;

  const colorParts: string[] = [];
  if (colors?.primary) colorParts.push(colors.primary);
  if (colors?.secondary) colorParts.push(colors.secondary);
  if (colors?.accent) colorParts.push(colors.accent);
  const colorHint = colorParts.length
    ? `The color palette subtly incorporates the brand colors: ${colorParts.join(", ")} in the background tones, lighting, or props.`
    : "";

  const productDesc = productDescription ? ` — ${productDescription}` : "";
  const taglineHint = tagline ? ` The brand's identity: "${tagline}".` : "";

  return [
    `Vertical 9:16 full-screen Instagram Story advertisement photo.`,
    `Brand: "${brandName}".${taglineHint}`,
    `Hero product: "${productTitle}"${productDesc}.`,
    `The product is the central subject, shown up close with dramatic, moody lighting.`,
    `Background: clean, slightly dark or richly colored to make the product pop — suitable for a full-bleed mobile story format.`,
    colorHint,
    `Shot from a flattering angle, the product fills most of the vertical frame.`,
    `Lifestyle context with subtle props that suggest the product's use case.`,
    `Style: photorealistic, high-contrast, scroll-stopping mobile ad photography.`,
    `Absolutely NO text, NO logos, NO watermarks, NO overlays, NO UI elements.`,
    `4K quality, vertical portrait orientation, studio-grade lighting.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateIgStoryImage(
  input: IgStoryImageInput
): Promise<IgStoryImageResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("OPENAI_API_KEY not set (required for IG story image)");

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });

  const prompt = buildIgStoryPrompt(input);

  const resp = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1792",
    response_format: "b64_json",
    quality: "hd",
  });

  const b64 = resp.data?.[0]?.b64_json;
  if (!b64) throw new Error("DALL-E 3 IG story image generation returned no data");
  return { base64Png: b64, mimeType: "image/png" };
}
