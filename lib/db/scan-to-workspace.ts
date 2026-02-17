import type { ScanResult, Product } from "@/lib/brand/types";
import type { Workspace, DbProduct } from "@/lib/db/types";

const IMAGE_DOWNLOAD_TIMEOUT_MS = 8_000;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2MB

/** Download image with timeout and size cap. Returns buffer or null on failure. */
export async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AdLynx/1.0" },
    });
    clearTimeout(timeoutId);
    if (!res.ok || !res.body) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > IMAGE_MAX_BYTES) return null;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

/** Build workspace insert from ScanResult (no logo storage path yet). */
export function workspaceInsertFromScan(
  guestId: string,
  scan: ScanResult,
  logoStoragePath: string | null
): Omit<Workspace, "id" | "created_at" | "updated_at"> {
  return {
    guest_id: guestId,
    website_url: scan.websiteUrl,
    domain: scan.domain,
    business_name: scan.businessName || null,
    tagline: scan.tagline ?? null,
    mission: scan.mission ?? null,
    selling_type: scan.sellingType ?? null,
    colors: scan.colors
      ? {
          primary: scan.colors.primary ?? null,
          secondary: scan.colors.secondary ?? null,
          accent: scan.colors.accent ?? null,
        }
      : null,
    social_links: scan.socialLinks?.length ? scan.socialLinks : null,
    logo_external_url: scan.logoUrl ?? null,
    logo_storage_path: logoStoragePath,
  };
}

/** Build product insert from Product (no storage paths yet). */
export function productInsertFromScanProduct(
  workspaceId: string,
  p: Product,
  imagesStorage: string[] = []
): Omit<DbProduct, "id" | "created_at" | "updated_at"> {
  return {
    workspace_id: workspaceId,
    external_id: p.id || null,
    title: p.title || null,
    description: p.description || null,
    url: p.url || null,
    vendor: p.vendor ?? null,
    price: p.price ?? null,
    images_external: p.images?.length ? p.images : null,
    images_storage: imagesStorage.length ? imagesStorage : null,
  };
}
