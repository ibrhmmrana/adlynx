/**
 * Sora 2 Pro video generation via OpenAI SDK.
 *
 * Uses the OpenAI Node SDK which handles retries, timeouts, and connection
 * pooling better than raw fetch (avoids ConnectTimeoutError).
 *
 * Max duration: 12 seconds
 * Vertical: 720x1280
 */

import OpenAI from "openai";

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: key, timeout: 60_000 });
}

export type StartSoraOptions = {
  seconds?: 4 | 8 | 12;
  size?: "720x1280" | "1280x720";
  /** Product image buffer used as input_reference (first frame guide) */
  imageBuffer?: Buffer;
  imageName?: string;
};

export async function startSoraGeneration(
  prompt: string,
  options: StartSoraOptions = {}
): Promise<{ videoId: string }> {
  const client = getClient();

  const params: Parameters<typeof client.videos.create>[0] = {
    model: "sora-2-pro",
    prompt,
    seconds: String(options.seconds ?? 12) as "4" | "8" | "12",
    size: options.size ?? "720x1280",
  };

  if (options.imageBuffer) {
    const file = new File(
      [options.imageBuffer],
      options.imageName ?? "product.jpg",
      { type: "image/jpeg" }
    );
    params.input_reference = file;
  }

  const video = await client.videos.create(params);

  if (!video.id) throw new Error("Sora returned no video id");
  return { videoId: video.id };
}

export type SoraStatus = {
  status: "pending" | "completed" | "failed";
  progress?: number;
  error?: string;
};

export async function checkSoraStatus(videoId: string): Promise<SoraStatus> {
  const client = getClient();

  const video = await client.videos.retrieve(videoId);

  if (video.status === "completed") return { status: "completed" };
  if (video.status === "failed") return { status: "failed", error: video.error?.message };
  return { status: "pending", progress: video.progress ?? undefined };
}
