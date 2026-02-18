import { NextResponse } from "next/server";

/**
 * GET /api/ugc/video?soraId=<sora-video-id>
 *
 * Proxies Sora video download with server-side API key so the browser never sees credentials.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const soraId = searchParams.get("soraId");

  if (!soraId) {
    return NextResponse.json({ error: "Missing soraId" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    return NextResponse.json({ error: "Server missing OpenAI API key" }, { status: 500 });
  }

  const upstream = await fetch(`https://api.openai.com/v1/videos/${soraId}/content`, {
    headers: { Authorization: `Bearer ${openaiKey}` },
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error("[ugc/video] Sora download error:", upstream.status, errText.slice(0, 500));
    return NextResponse.json({ error: "Failed to fetch Sora video" }, { status: upstream.status });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "video/mp4");
  const cl = upstream.headers.get("Content-Length");
  if (cl) headers.set("Content-Length", cl);
  headers.set("Cache-Control", "private, max-age=3600");

  return new Response(upstream.body, { status: 200, headers });
}
