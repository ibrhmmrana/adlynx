import { cookies } from "next/headers";

const GUEST_ID_COOKIE = "adlynx_guest_id";
const GUEST_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Get or create guest_id from httpOnly cookie. Call from server only. */
export async function getOrSetGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_ID_COOKIE)?.value;
  if (existing) return existing;
  const newId = crypto.randomUUID();
  store.set(GUEST_ID_COOKIE, newId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GUEST_ID_MAX_AGE,
    path: "/",
  });
  return newId;
}

/** Get guest_id without creating. Returns null if not set. */
export async function getGuestId(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_ID_COOKIE)?.value ?? null;
}
