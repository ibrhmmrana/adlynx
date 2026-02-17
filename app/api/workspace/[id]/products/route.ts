import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getGuestId } from "@/lib/supabase/cookies";
import { productInsertFromScanProduct, downloadImage } from "@/lib/db/scan-to-workspace";
import type { Product } from "@/lib/brand/types";

const BUCKET = "adlynx";

function getExtensionFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return ext;
  } catch {}
  return "jpg";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const guestId = await getGuestId();
  if (!guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerSupabase();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("guest_id", guestId)
    .single();
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let body: { product: Product };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const product = body.product;
  if (!product || typeof product !== "object") {
    return NextResponse.json({ error: "Missing product" }, { status: 400 });
  }

  const productIns = productInsertFromScanProduct(workspaceId, product, []);
  const { data: prodRow, error: insertErr } = await supabase
    .from("products")
    .insert(productIns as Record<string, unknown>)
    .select("id")
    .single();
  if (insertErr || !prodRow) {
    return NextResponse.json(
      { error: insertErr?.message || "Failed to insert product" },
      { status: 500 }
    );
  }

  const imagesStorage: string[] = [];
  const imagesToStore = (product.images || []).slice(0, 3);
  for (let i = 0; i < imagesToStore.length; i++) {
    const imgUrl = imagesToStore[i];
    const buf = await downloadImage(imgUrl);
    if (buf) {
      const ext = getExtensionFromUrl(imgUrl);
      const storagePath = `workspace/${workspaceId}/products/${prodRow.id}/img_${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buf, {
          contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        });
      if (!upErr) {
        imagesStorage.push(storagePath);
        await supabase.from("assets").insert({
          workspace_id: workspaceId,
          product_id: prodRow.id,
          kind: "product_image",
          external_url: imgUrl,
          storage_path: storagePath,
          meta: null,
        });
      }
    }
  }
  if (imagesStorage.length > 0) {
    await supabase
      .from("products")
      .update({ images_storage: imagesStorage })
      .eq("id", prodRow.id);
  }

  const { data: full } = await supabase
    .from("products")
    .select("*")
    .eq("id", prodRow.id)
    .single();
  return NextResponse.json({ product: full });
}
