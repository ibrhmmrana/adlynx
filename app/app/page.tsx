import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestId } from "@/lib/supabase/cookies";

export default async function AppHome() {
  const guestId = await getGuestId();
  const supabase = createServerSupabase();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("guest_id", guestId ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        {workspace?.logo_external_url ? (
          <img src={workspace.logo_external_url} alt="" className="h-12 w-12 rounded-xl border border-gray-200 object-contain bg-white p-1" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-lg font-semibold text-gray-500">
            {(workspace?.business_name || "W")[0]}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{workspace?.business_name || "Your workspace"}</h1>
          <p className="text-[14px] text-gray-500">{workspace?.domain || ""}</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Start here</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/app/products" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow">
            <span className="font-medium text-gray-900">Products</span>
            <p className="mt-1 text-[13px] text-gray-500">Add and manage products</p>
          </Link>
          <Link href="/app/dna" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow">
            <span className="font-medium text-gray-900">Context</span>
            <p className="mt-1 text-[13px] text-gray-500">Brand DNA and voice</p>
          </Link>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-75">
            <span className="font-medium text-gray-600">Moodboard</span>
            <p className="mt-1 text-[13px] text-gray-400">Coming soon</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Most popular</h2>
        <div className="flex flex-wrap gap-3">
          {["Concept", "Clone", "Variations", "Animate"].map((name) => (
            <div key={name} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-[14px] font-medium text-gray-700 shadow-sm">
              {name}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-gray-400">Generators coming soon</p>
      </section>
    </div>
  );
}
