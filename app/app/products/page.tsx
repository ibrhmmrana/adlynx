import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestId } from "@/lib/supabase/cookies";
import { redirect } from "next/navigation";
import ProductsList from "./ProductsList";

export default async function ProductsPage() {
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

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true });

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Products</h1>
      <ProductsList workspaceId={workspace.id} initialProducts={products ?? []} />
    </div>
  );
}
