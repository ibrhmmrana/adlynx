/**
 * Generate a UGC creator portrait using "Nano Banana Pro" style:
 * ultra-realistic smartphone mirror selfie, vertical 9:16.
 * Uses OpenAI DALL-E 3 when OPENAI_API_KEY is set. Vertex Imagen / Gemini
 * can be wired via GOOGLE_CLOUD_* env vars in a separate path if needed.
 */

const UGC_CREATOR_PROMPT = `Ultra-realistic smartphone mirror selfie of a diverse female UGC creator, early 20s to mid 30s, natural makeup, authentic smile, holding phone in front of mirror. Soft natural lighting, clean modern bathroom or bedroom background, shallow depth of field. Casual outfit, relatable and approachable. No text, no logos, no watermarks. Photorealistic, 4K quality, vertical portrait orientation.`;

export type GenerateUgcCreatorOptions = {
  seed?: number;
  aspectRatio?: "9:16";
};

export type GenerateUgcCreatorResult = {
  base64Png: string;
  mimeType: string;
};

/**
 * Generate a single vertical UGC creator portrait (9:16).
 * Uses DALL-E 3 for reliability; swap for Vertex Imagen when GOOGLE_CLOUD_* is set.
 */
export async function generateUgcCreatorImage(
  options: GenerateUgcCreatorOptions = {}
): Promise<GenerateUgcCreatorResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("OPENAI_API_KEY not set (required for UGC creator image)");

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });
  const resp = await client.images.generate({
    model: "dall-e-3",
    prompt: UGC_CREATOR_PROMPT,
    n: 1,
    size: "1024x1792",
    response_format: "b64_json",
    quality: "standard",
  });

  const b64 = resp.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image generation returned no data");
  return { base64Png: b64, mimeType: "image/png" };
}
