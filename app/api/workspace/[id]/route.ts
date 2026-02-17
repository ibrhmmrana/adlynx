import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestId } from "@/lib/supabase/cookies";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guestId = await getGuestId();
  if (!guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerSupabase();
  const { data: workspace, error: wsErr } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .eq("guest_id", guestId)
    .single();
  if (wsErr || !workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ workspace, products: products ?? [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guestId = await getGuestId();
  if (!guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerSupabase();
  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", id)
    .eq("guest_id", guestId)
    .single();
  if (!existing) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = [
    "business_name",
    "tagline",
    "mission",
    "selling_type",
    "colors",
    "social_links",
  ] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ workspaceId: id });
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update(updates)
    .eq("id", id)
    .eq("guest_id", guestId)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ workspace: data });
}
