import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getOrSetGuestId } from "@/lib/supabase/cookies";
import {
  downloadImage,
  workspaceInsertFromScan,
  productInsertFromScanProduct,
} from "@/lib/db/scan-to-workspace";
import type { ScanResult } from "@/lib/brand/types";

const BUCKET = "adlynx";

function getExtensionFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return ext;
  } catch {}
  return "jpg";
}

export async function POST(request: Request) {
  let body: { scanResult?: ScanResult };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const scanResult = body.scanResult;
  if (!scanResult || typeof scanResult !== "object" || !scanResult.websiteUrl) {
    return NextResponse.json(
      { error: "Missing or invalid scanResult" },
      { status: 400 }
    );
  }

  const guestId = await getOrSetGuestId();
  const supabase = createServerSupabase();

  const { data: bucket } = await supabase.storage.getBucket(BUCKET);
  if (!bucket) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }

  // 1) Create workspace row (logo_storage_path null for now)
  const insertPayload = workspaceInsertFromScan(guestId, scanResult, null);
  const { data: workspace, error: wsErr } = await supabase
    .from("workspaces")
    .insert(insertPayload as Record<string, unknown>)
    .select("id")
    .single();
  if (wsErr || !workspace) {
    return NextResponse.json(
      { error: wsErr?.message || "Failed to create workspace" },
      { status: 500 }
    );
  }
  const workspaceId = workspace.id;

  // 2) Logo: download, upload, update workspace + insert asset
  let logoStoragePath: string | null = null;
  if (scanResult.logoUrl) {
    const buf = await downloadImage(scanResult.logoUrl);
    if (buf) {
      const ext = getExtensionFromUrl(scanResult.logoUrl);
      const path = `workspace/${workspaceId}/logo/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buf, {
          contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        });
      if (!upErr) {
        logoStoragePath = path;
        await supabase
          .from("workspaces")
          .update({ logo_storage_path: path })
          .eq("id", workspaceId);
      }
    }
    await supabase.from("assets").insert({
      workspace_id: workspaceId,
      product_id: null,
      kind: "logo",
      external_url: scanResult.logoUrl,
      storage_path: logoStoragePath,
      meta: null,
    });
  }

  // 3) Products: insert each, then store first 3 images
  for (const p of scanResult.products || []) {
    const productIns = productInsertFromScanProduct(workspaceId, p, []);
    const { data: prodRow, error: prodErr } = await supabase
      .from("products")
      .insert(productIns as Record<string, unknown>)
      .select("id")
      .single();
    if (prodErr || !prodRow) continue;

    const imagesStorage: string[] = [];
    const imagesToStore = (p.images || []).slice(0, 3);
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
  }

  return NextResponse.json({ workspaceId });
}
