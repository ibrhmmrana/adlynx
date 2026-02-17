import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getOrSetGuestIdCookie } from "@/lib/supabase/cookies";

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
    const res = NextResponse.json({ workspaceId: workspace.id, workspace });
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
  const res = NextResponse.json({
    workspaceId: workspace?.id ?? null,
    workspace: workspace ?? null,
  });
  if (setCookieHeader) res.headers.set("Set-Cookie", setCookieHeader);
  return res;
}
