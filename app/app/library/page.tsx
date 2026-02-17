import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestId } from "@/lib/supabase/cookies";
import { redirect } from "next/navigation";

export default async function LibraryPage() {
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

  const { data: creatives } = await supabase
    .from("creatives")
    .select("id, type, status, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Library</h1>
      <p className="mb-4 text-[15px] text-gray-500">Saved creatives will appear here.</p>
      {!creatives?.length ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center text-[14px] text-gray-500">
          No creatives yet. Generate ads from the dashboard and save them here.
        </div>
      ) : (
        <ul className="space-y-2">
          {creatives.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-700">
              {c.type ?? "creative"} · {c.status ?? "—"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
