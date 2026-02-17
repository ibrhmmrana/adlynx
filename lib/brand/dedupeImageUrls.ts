/**
 * Deduplicate image URLs so variants of the same asset (different query params,
 * size suffixes, retina/cache-busting in the path) count as one.
 * Uses a canonical key: origin + normalized path (query stripped, path base collapsed).
 */

/** Normalize pathname to a "base" so size/retina/cache variants map to the same key */
function normalizedPathBase(pathname: string): string {
  try {
    const decoded = decodeURIComponent(pathname);
    // Strip query already handled by caller (we only get pathname here)
    // Remove common size/density/cache patterns from the filename (before extension)
    // Match last path segment (filename) and clean it
    const lastSlash = decoded.lastIndexOf("/");
    const segment = lastSlash === -1 ? decoded : decoded.slice(lastSlash + 1);
    const beforeExt = segment.lastIndexOf(".");
    const ext = beforeExt === -1 ? "" : segment.slice(beforeExt);
    const name = beforeExt === -1 ? segment : segment.slice(0, beforeExt);

    // Collapse: -300x200, _300x200, .300x200, -100x100, etc.
    let baseName = name.replace(/[-_.]\d+x\d+$/i, "");
    // @2x, @3x, -2x, _2x
    baseName = baseName.replace(/[@\-_](\d+)x$/i, "");
    // -thumb, _thumb, -small, _small, -medium, _medium, -large, _large, -min, -scaled
    baseName = baseName.replace(
      /[-_](?:thumb|small|medium|large|min|scaled|mini|tiny|big|full|original)$/i,
      ""
    );
    // Cache-bust / hash before extension: .abc123def or -abc123
    baseName = baseName.replace(/[-.]([a-f0-9]{8,})$/i, "");
    const pathBefore = lastSlash === -1 ? "" : decoded.slice(0, lastSlash + 1);
    return pathBefore + baseName + ext;
  } catch {
    return pathname;
  }
}

/**
 * Canonical key for an image URL: same key = treat as same image.
 * Uses origin + normalized path (no query), with path base collapsed for size/retina variants.
 */
export function getCanonicalImageKey(urlString: string): string {
  try {
    const url = new URL(urlString);
    const pathBase = normalizedPathBase(url.pathname);
    return url.origin.toLowerCase() + pathBase;
  } catch {
    return urlString;
  }
}

/** Score for choosing which URL to keep when multiple map to same key (higher = prefer) */
function urlPreferenceScore(urlString: string): number {
  try {
    const url = new URL(urlString);
    let score = 0;
    if (!url.search) score += 10;
    const name = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
    if (!/\d+x\d+/.test(name)) score += 5;
    if (!/[@\-_](?:thumb|small|mini|tiny)/i.test(name)) score += 3;
    return score;
  } catch {
    return 0;
  }
}

/**
 * Deduplicate image URLs by canonical key. Keeps one URL per key, preferring
 * the one without query params and without size/thumb suffix in the path.
 */
export function dedupeImageUrls(
  urls: string[],
  maxCount?: number
): string[] {
  const byKey = new Map<string, string>();
  for (const u of urls) {
    if (!u || typeof u !== "string") continue;
    const key = getCanonicalImageKey(u);
    const existing = byKey.get(key);
    if (
      !existing ||
      urlPreferenceScore(u) > urlPreferenceScore(existing)
    ) {
      byKey.set(key, u);
    }
  }
  const out = Array.from(byKey.values());
  return maxCount != null ? out.slice(0, maxCount) : out;
}
