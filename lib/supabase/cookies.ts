import { cookies } from "next/headers";

const COOKIE_NAME = "adlynx_guest_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function createGuestId(): string {
  return crypto.randomUUID();
}

function parseGuestIdFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const value = match?.[1]?.trim();
  if (!value) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}

/** For API route handlers: read guest_id from Request. */
export function getGuestIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  return parseGuestIdFromCookieHeader(cookieHeader);
}

/** For API route handlers: get guest id, or create and return Set-Cookie header to attach to response. */
export function getOrSetGuestIdCookie(request: Request): { guestId: string; setCookieHeader?: string } {
  const existing = getGuestIdFromRequest(request);
  if (existing) return { guestId: existing };
  const guestId = createGuestId();
  const setCookieHeader = `${COOKIE_NAME}=${guestId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`;
  return { guestId, setCookieHeader };
}

/** For Server Components: read guest_id from next/headers cookies(). Returns null if not set. */
export async function getGuestId(): Promise<string | null> {
  const c = await cookies();
  const value = c.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}
