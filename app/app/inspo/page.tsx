import { getGuestId } from "@/lib/supabase/cookies";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function InspoPage() {
  const guestId = await getGuestId();
  if (!guestId) redirect("/onboarding");
  const supabase = createServerSupabase();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!workspace) redirect("/onboarding");

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Inspo</h1>
      <p className="mb-4 text-[15px] text-gray-500">Moodboard and inspiration (coming soon).</p>
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center text-[14px] text-gray-500">
        Empty. Add reference images and boards here later.
      </div>
    </div>
  );
}
