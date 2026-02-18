import { NextResponse } from "next/server";
import { checkSoraStatus } from "@/lib/ugc/soraVideo";

/**
 * GET /api/ugc/testimonial/status?jobId=xxx
 *
 * Poll Sora video job. Returns { status: 'pending' | 'completed' | 'failed', video?: { url }, progress?: number, error?: string }.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId?.trim()) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const result = await checkSoraStatus(jobId);
    if (result.status === "completed") {
      const proxiedUrl = `/api/ugc/video?soraId=${encodeURIComponent(jobId)}`;
      return NextResponse.json({ status: "completed", video: { url: proxiedUrl } });
    }
    if (result.status === "failed") {
      return NextResponse.json({ status: "failed", error: result.error ?? "Sora generation failed" });
    }
    return NextResponse.json({ status: "pending", progress: result.progress });
  } catch (e) {
    console.warn("[ugc/status] Sora poll error:", (e as Error).message);
    return NextResponse.json({ status: "pending" });
  }
}
