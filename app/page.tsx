import { redirect } from "next/navigation";
import { getGuestId } from "@/lib/supabase/cookies";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Home() {
  const guestId = await getGuestId();
  if (!guestId) {
    redirect("/onboarding");
  }
  const supabase = createServerSupabase();
  const { data: rows } = await supabase
    .from("workspaces")
    .select("id")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (rows && rows.length > 0) {
    redirect("/app");
  }
  redirect("/onboarding");
}
