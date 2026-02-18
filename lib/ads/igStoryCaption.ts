/**
 * Generate a short Instagram Story ad caption/headline using OpenAI (gpt-4o-mini).
 * IG story ads use punchy, short text overlaid on the image.
 */

export type IgStoryCaptionInput = {
  brandName: string;
  tagline?: string | null;
  productTitle: string;
  productDescription?: string | null;
};

export async function generateIgStoryCaption(input: IgStoryCaptionInput): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("OPENAI_API_KEY not set (required for IG story caption)");

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });

  const { brandName, tagline, productTitle, productDescription } = input;
  const productContext = [productTitle, productDescription].filter(Boolean).join(". ");

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You write punchy, short Instagram Story ad copy. Maximum 2 short sentences. Think bold headline energy — exciting, benefit-driven, with urgency or a hook. Can use 1-2 emojis. No hashtags. No links.",
      },
      {
        role: "user",
        content: `Brand: ${brandName}${tagline ? `. Tagline: "${tagline}"` : ""}.\nProduct: ${productContext}.\n\nWrite one punchy Instagram Story ad caption.`,
      },
    ],
    max_tokens: 80,
    temperature: 0.85,
  });

  const caption = completion.choices?.[0]?.message?.content?.trim();
  if (!caption) throw new Error("OpenAI returned no IG story caption");
  return caption;
}
