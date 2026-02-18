/**
 * POST /api/ugc/testimonial
 *
 * Generates a UGC testimonial video using Sora 2 Pro only.
 * Requires OPENAI_API_KEY. Returns jobId for polling; client polls status then uses
 * /api/ugc/video?soraId=xxx to stream the MP4.
 */

import { NextResponse } from "next/server";
import { generateVeoPromptJson } from "@/lib/ugc/openaiVeoPrompt";
import { startSoraGeneration } from "@/lib/ugc/soraVideo";
import type { VeoPromptPayload } from "@/lib/ugc/veoPromptSchema";

function buildSoraPrompt(vp: VeoPromptPayload): string {
  const p = vp.prompt;
  const shots = p.shots;

  const sceneParts = shots.map((shot, i) => {
    const dialogue = (shot.dialogue || []).join(" ");
    const subtitle = shot.subtitle || dialogue;
    let desc = shot.scene;
    if (shot.action) desc += `. ${shot.action}`;
    if (subtitle) desc += `. She says: "${subtitle}"`;
    if (i < shots.length - 1) desc += ". Cut to next scene.";
    return desc;
  });

  return [
    `A vertical 9:16 UGC-style testimonial video, well-lit and clearly visible.`,
    `A young woman films herself with her phone talking about ${p.product.brand} ${p.product.name}.`,
    `Natural lighting, authentic feel, casual home setting. The video has bold white subtitle text in the bottom third.`,
    ...sceneParts,
    `The video is bright, well-exposed, and looks like a real TikTok/Instagram Reel testimonial.`,
  ].join(" ");
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "image/*" } });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    return Buffer.from(buf);
  } catch {
    return null;
  }
}

type Body = {
  brand?: { name?: string; tagline?: string; mission?: string; colors?: Record<string, string>; websiteUrl?: string; domain?: string };
  product?: { title?: string; description?: string; imageUrl?: string };
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    let body: Body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const brand = body.brand;
    const product = body.product;
    if (!brand?.name?.trim()) return NextResponse.json({ error: "Missing brand.name" }, { status: 400 });

    const [promptJson, imageBuffer] = await Promise.all([
      generateVeoPromptJson({
        brandName: brand.name.trim(),
        tagline: brand.tagline ?? null,
        mission: brand.mission ?? null,
        productTitle: (product?.title ?? "").trim() || "Product",
        productDescription: product?.description ?? null,
      }),
      product?.imageUrl ? fetchImageBuffer(product.imageUrl.trim()) : Promise.resolve(null),
    ]);

    const soraPrompt = buildSoraPrompt(promptJson);
    const { videoId } = await startSoraGeneration(soraPrompt, {
      seconds: 12,
      size: "720x1280",
      imageBuffer: imageBuffer ?? undefined,
    });

    console.info("[ugc/testimonial] requestId=%s soraVideoId=%s", requestId, videoId);

    return NextResponse.json({
      success: true,
      prompt: promptJson,
      video: { jobId: videoId },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UGC testimonial failed";
    console.warn("[ugc/testimonial] requestId=%s error=%s", requestId, message);
    const isContentFilter =
      /content filter|blocked by|content policy|safety|400.*blocked|policy violation/i.test(message);
    const status = isContentFilter ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
