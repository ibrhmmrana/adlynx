import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `uploads/logos/${crypto.randomUUID()}.${ext}`;

  const supabase = createServerSupabase();
  const buf = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("adlynx")
    .upload(path, buf, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("logo upload error", uploadError);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("adlynx")
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, storagePath: path });
}
