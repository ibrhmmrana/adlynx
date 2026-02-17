/** DB row types for Supabase tables (workspaces, products, assets, creatives) */

export interface Workspace {
  id: string;
  created_at: string;
  updated_at: string;
  guest_id: string;
  website_url: string;
  domain: string;
  business_name: string | null;
  tagline: string | null;
  mission: string | null;
  selling_type: string | null;
  colors: { primary: string | null; secondary: string | null; accent: string | null } | null;
  social_links: { platform: string; url: string }[] | null;
  logo_external_url: string | null;
  logo_storage_path: string | null;
}

export interface DbProduct {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  external_id: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  vendor: string | null;
  price: string | null;
  images_external: string[] | null;
  images_storage: string[] | null;
}

export interface Asset {
  id: string;
  workspace_id: string;
  product_id: string | null;
  created_at: string;
  kind: string;
  external_url: string | null;
  storage_path: string | null;
  meta: Record<string, unknown> | null;
}

export interface Creative {
  id: string;
  workspace_id: string;
  created_at: string;
  type: string | null;
  prompt: string | null;
  aspect_ratio: string | null;
  status: string | null;
  meta: Record<string, unknown> | null;
}
