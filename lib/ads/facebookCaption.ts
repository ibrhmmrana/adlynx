/**
 * Generate a short Facebook ad caption using OpenAI (gpt-4o-mini).
 */

export type FacebookCaptionInput = {
  brandName: string;
  tagline?: string | null;
  productTitle: string;
  productDescription?: string | null;
};

export async function generateFacebookAdCaption(input: FacebookCaptionInput): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("OPENAI_API_KEY not set (required for Facebook ad caption)");

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
          "You write short, engaging Facebook ad copy. Two or three sentences max. No hashtags. Sound authentic and friendly, like a real brand page post. Include a soft call-to-action (e.g. 'Check it out', 'Link in bio', 'Shop now'). Can include one emoji if it feels natural.",
      },
      {
        role: "user",
        content: `Brand: ${brandName}${tagline ? `. Tagline: "${tagline}"` : ""}.\nProduct: ${productContext}.\n\nWrite one short Facebook post caption for an ad promoting this product.`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });

  const caption = completion.choices?.[0]?.message?.content?.trim();
  if (!caption) throw new Error("OpenAI returned no caption");
  return caption;
}
