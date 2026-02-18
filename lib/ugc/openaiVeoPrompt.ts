import OpenAI from "openai";
import { promptPayloadSchema, type VeoPromptPayload } from "./veoPromptSchema";

export type BrandProductInput = {
  brandName: string;
  tagline?: string | null;
  mission?: string | null;
  productTitle: string;
  productDescription?: string | null;
};

const STRUCTURED_PROMPT = `You are a video scriptwriter for short UGC-style testimonial ads. Generate a structured video prompt that follows this exact style:

1) **Intro shot (shotId: "intro")**: Close-up face intro, casual and friendly. The creator looks at camera and gives a quick genuine smile or wave. Natural at-home or casual setting. transition: "cut".
2) **Product close-up (shotId: "product_closeup")**: Shallow depth of field product close-up with packaging in focus. Creator's hands can hold or frame the product. No impossible physics. transition: "cut".
3) **Interaction (shotId: "interaction")**: Medium shot of creator interacting with the product—holding, applying, opening, or unboxing depending on what fits the product type. Plausible, natural actions only. transition: "none".

CRITICAL REQUIREMENTS:
- Each shot MUST have a "transition" field set to "cut" (hard cut, NO morphing/blending between scenes) except the last shot which is "none".
- Each shot MUST have a "subtitle" field: a short, punchy line (5–10 words max) that would appear as an on-screen caption in the bottom third. Subtitles should summarize the spoken dialogue in a catchy TikTok/Reels style (e.g. "this literally changed my skin", "no seriously look at this"). Use lowercase, casual tone.
- Dialogue must sound like a short real testimonial (1–3 short lines per shot), not overly salesy.
- durationSeconds: choose between 8 and 12.
- style: "UGC testimonial, authentic, vertical 9:16, natural lighting".
- audio.voice: describe the tone (e.g. "warm, conversational").
- audio.soundtrack: "none" or "subtle background music".
- camera.shot and camera.movement: concise (e.g. "close-up", "slow push-in").
- Do not claim impossible actions (e.g. no "product floating").
- config.negativePrompt must include: "overly cinematic lighting, heavy VFX, text artifacts, warped hands, unnatural skin smoothing, brand-new product labels changing, unreadable packaging, smooth transitions, morphing between scenes".`;

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: key });
}

/**
 * Generate a structured Veo prompt JSON using OpenAI. Response is validated with Zod.
 */
export async function generateVeoPromptJson(input: BrandProductInput): Promise<VeoPromptPayload> {
  const openai = getOpenAI();
  const userContent = `
Brand: ${input.brandName}
${input.tagline ? `Tagline: ${input.tagline}` : ""}
${input.mission ? `Mission: ${input.mission}` : ""}

Product: ${input.productTitle}
${input.productDescription ? `Description: ${input.productDescription}` : ""}

Respond with ONLY a single JSON object, no markdown or extra text. It must have:
- "prompt": object with "shots" (array of exactly 3 objects with shotId "intro", "product_closeup", "interaction"), "durationSeconds" (8–12), "style", "audio" (voice, soundtrack), "product" (brand, name).
- "config": object with "model", "negativePrompt", optional "seed".
Each shot: shotId, scene, dialogue (string array), subtitle (short catchy caption for bottom-third text), camera (shot, movement, aspectRatio "9:16"), lighting, environment, action, transition ("cut" or "none").
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: STRUCTURED_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI did not return content");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  const parsed = promptPayloadSchema.safeParse(raw);
  if (!parsed.success) throw new Error("OpenAI response did not match Veo prompt schema: " + parsed.error.message);
  return parsed.data;
}
