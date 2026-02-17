import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestIdFromRequest } from "@/lib/supabase/cookies";
import type { Workspace } from "@/lib/db/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const guestId = getGuestIdFromRequest(_request);
  if (!guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load workspace" }, { status: 500 });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const guestId = getGuestIdFromRequest(request);
  if (!guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const update: Partial<Workspace> = { updated_at: new Date().toISOString() };
  if (typeof body.businessName === "string") update.business_name = body.businessName;
  if (body.tagline !== undefined) update.tagline = body.tagline as string | null;
  if (body.mission !== undefined) update.mission = body.mission as string | null;
  if (body.sellingType !== undefined) update.selling_type = body.sellingType as string | null;
  if (body.colors !== undefined) update.colors = body.colors as Workspace["colors"];
  if (body.socialLinks !== undefined) update.social_links = body.socialLinks as Workspace["social_links"];
  if (body.logoUrl !== undefined) update.logo_external_url = body.logoUrl as string | null;

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .update(update)
    .eq("id", workspaceId)
    .eq("guest_id", guestId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  return NextResponse.json(workspace);
}
