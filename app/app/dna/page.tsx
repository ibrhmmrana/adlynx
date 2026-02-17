import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestId } from "@/lib/supabase/cookies";
import { redirect } from "next/navigation";
import DnaEditor from "./DnaEditor";

export default async function DnaPage() {
  const guestId = await getGuestId();
  if (!guestId) redirect("/onboarding");
  const supabase = createServerSupabase();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!workspace) redirect("/onboarding");

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Brand context</h1>
      <DnaEditor workspace={workspace} />
    </div>
  );
}
