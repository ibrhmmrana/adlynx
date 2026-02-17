import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestIdFromRequest } from "@/lib/supabase/cookies";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const guestId = getGuestIdFromRequest(_request);
  if (!guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const { data: products, error } = await supabase
    .from("products")
    .select("id, title, description, url, images_external, images_storage")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  return NextResponse.json(products ?? []);
}
