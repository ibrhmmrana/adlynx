import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getOrSetGuestIdCookie } from "@/lib/supabase/cookies";

type WorkspaceSummary = { id: string; business_name: string | null; domain: string | null; logo_external_url: string | null; logo_storage_path: string | null };

export async function GET(request: Request) {
  const { guestId, setCookieHeader } = getOrSetGuestIdCookie(request);
  const { searchParams } = new URL(request.url);
  const workspaceIdParam = searchParams.get("workspaceId");

  const supabase = createServerSupabase();

  if (workspaceIdParam) {
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("id, business_name, domain, logo_external_url, logo_storage_path")
      .eq("id", workspaceIdParam)
      .eq("guest_id", guestId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Failed to load workspace" }, { status: 500 });
    if (!workspace) return NextResponse.json({ workspaceId: null, workspace: null });
    const w = workspace as WorkspaceSummary;
    const res = NextResponse.json({ workspaceId: w.id, workspace: w });
    if (setCookieHeader) res.headers.set("Set-Cookie", setCookieHeader);
    return res;
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, business_name, domain, logo_external_url, logo_storage_path")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load workspace" }, { status: 500 });
  const w = workspace as WorkspaceSummary | null;
  const res = NextResponse.json({
    workspaceId: w?.id ?? null,
    workspace: w ?? null,
  });
  if (setCookieHeader) res.headers.set("Set-Cookie", setCookieHeader);
  return res;
}
