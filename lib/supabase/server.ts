import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

/** Server-only Supabase client with service role. Use for all writes and RLS-bypass reads. */
export function createServerSupabase() {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
