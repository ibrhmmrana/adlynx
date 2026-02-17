import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestId } from "@/lib/supabase/cookies";

export async function GET() {
  const guestId = await getGuestId();
  if (!guestId) {
    return NextResponse.json({ workspace: null });
  }
  const supabase = createServerSupabase();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ workspace });
}
