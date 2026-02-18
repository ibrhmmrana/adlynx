import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getOrSetGuestIdCookie } from "@/lib/supabase/cookies";

const UPLOAD_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

type BootstrapBody = {
  websiteUrl: string;
  domain: string;
  profile: {
    businessName: string;
    tagline: string | null;
    mission: string | null;
    sellingType: string | null;
    colors: { primary?: string; secondary?: string; accent?: string } | null;
    socialLinks: unknown;
    logoUrl: string | null;
    logoStoragePath: string | null;
  };
  products: Array<{
    externalId?: string | null;
    title: string;
    description?: string | null;
    url?: string | null;
    vendor?: string | null;
    price?: string | null;
    images: string[];
  }>;
  allImages: string[];
};

export async function POST(request: Request) {
  const { guestId, setCookieHeader } = getOrSetGuestIdCookie(request);
  let body: BootstrapBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { websiteUrl, domain, profile, products: productsInput, allImages } = body;
  if (!websiteUrl || typeof websiteUrl !== "string" || !domain || typeof domain !== "string") {
    return NextResponse.json({ error: "Missing websiteUrl or domain" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const workspaceInsert = {
    guest_id: guestId,
    website_url: websiteUrl.trim(),
    domain: domain.trim(),
    business_name: profile?.businessName?.trim() ?? null,
    tagline: profile?.tagline?.trim() ?? null,
    mission: profile?.mission?.trim() ?? null,
    selling_type: profile?.sellingType ?? null,
    colors: profile?.colors ?? null,
    social_links: profile?.socialLinks ?? null,
    logo_external_url: profile?.logoUrl?.trim() ?? null,
    logo_storage_path: profile?.logoStoragePath?.trim() ?? null,
  };

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert(workspaceInsert as never)
    .select("id")
    .single();

  if (wsError || !workspace) {
    console.error("workspace insert error", wsError);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  const workspaceId = (workspace as { id: string }).id;

  const productsArray = Array.isArray(productsInput) ? productsInput : [];
  const productRows: { workspace_id: string; external_id: string | null; title: string | null; description: string | null; url: string | null; vendor: string | null; price: string | null; images_external: string[]; images_storage: string[] | null }[] = [];
  for (const p of productsArray) {
    const images = Array.isArray(p.images) ? p.images : [];
    productRows.push({
      workspace_id: workspaceId,
      external_id: p.externalId ?? null,
      title: p.title ?? null,
      description: p.description ?? null,
      url: p.url ?? null,
      vendor: p.vendor ?? null,
      price: p.price ?? null,
      images_external: images,
      images_storage: null,
    });
  }

  if (productRows.length > 0) {
    const { error: productsError } = await supabase.from("products").insert(productRows as never);
    if (productsError) {
      console.error("products insert error", productsError);
      return NextResponse.json({ error: "Failed to create products" }, { status: 500 });
    }
  }

  const { data: insertedProducts } = await supabase
    .from("products")
    .select("id, images_external")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  type ProductRow = { id: string; images_external: string[] | null };
  const productIdList: ProductRow[] = (insertedProducts ?? []) as ProductRow[];

  const assetsToInsert: { workspace_id: string; product_id: string | null; kind: string; external_url: string | null; storage_path: string | null; meta: null }[] = [];

  if (profile?.logoUrl?.trim()) {
    assetsToInsert.push({
      workspace_id: workspaceId,
      product_id: null,
      kind: "logo",
      external_url: profile.logoUrl.trim(),
      storage_path: null,
      meta: null,
    });
  }

  for (let i = 0; i < productIdList.length; i++) {
    const prod = productIdList[i];
    const urls = (prod.images_external ?? []) as string[];
    const firstThree = urls.slice(0, 3);
    for (const u of firstThree) {
      if (typeof u === "string" && u) {
        assetsToInsert.push({
          workspace_id: workspaceId,
          product_id: prod.id,
          kind: "product_image",
          external_url: u,
          storage_path: null,
          meta: null,
        });
      }
    }
  }

  if (assetsToInsert.length > 0) {
    const { error: assetsError } = await supabase.from("assets").insert(assetsToInsert as never);
    if (assetsError) {
      console.error("assets insert error", assetsError);
      return NextResponse.json({ error: "Failed to create assets" }, { status: 500 });
    }
  }

  const phase2Timeout = new Promise<void>((r) => setTimeout(r, 6000));
  await Promise.race([
    (async () => {
      try {
        if (profile?.logoUrl?.trim()) {
          const buf = await fetchWithLimit(profile.logoUrl.trim(), UPLOAD_TIMEOUT_MS, MAX_IMAGE_BYTES);
          if (buf) {
            const ext = getImageExt(profile.logoUrl);
            const path = `workspace/${workspaceId}/logo/logo${ext}`;
            const { data: up } = await supabase.storage.from("adlynx").upload(path, buf, { contentType: getContentType(ext), upsert: true });
            if (up?.path) await supabase.from("workspaces").update({ logo_storage_path: up.path } as never).eq("id", workspaceId);
          }
        }
        for (const prod of productIdList) {
          const urls = ((prod.images_external ?? []) as string[]).slice(0, 3);
          const paths: string[] = [];
          for (let i = 0; i < urls.length; i++) {
            const buf = await fetchWithLimit(urls[i], UPLOAD_TIMEOUT_MS, MAX_IMAGE_BYTES);
            if (buf) {
              const ext = getImageExt(urls[i]);
              const path = `workspace/${workspaceId}/products/${prod.id}/${i}${ext}`;
              const { data: up } = await supabase.storage.from("adlynx").upload(path, buf, { contentType: getContentType(ext), upsert: true });
              if (up?.path) paths.push(up.path);
            }
          }
          if (paths.length > 0) await supabase.from("products").update({ images_storage: paths } as never).eq("id", prod.id);
        }
      } catch {
        // keep external_url only; do not fail bootstrap
      }
    })(),
    phase2Timeout,
  ]);

  const res = NextResponse.json({ workspaceId });
  if (setCookieHeader) {
    res.headers.set("Set-Cookie", setCookieHeader);
  }
  return res;
}

async function fetchWithLimit(url: string, timeoutMs: number, maxBytes: number): Promise<ArrayBuffer | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: c.signal });
    if (!res.ok) return null;
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function getImageExt(url: string): string {
  const p = url.split("?")[0].toLowerCase();
  if (p.endsWith(".png")) return ".png";
  if (p.endsWith(".webp")) return ".webp";
  if (p.endsWith(".gif")) return ".gif";
  return ".jpg";
}

function getContentType(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}
