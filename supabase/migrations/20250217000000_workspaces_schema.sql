-- Workspaces (brand profiles) scoped by guest_id
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  guest_id uuid NOT NULL,
  website_url text NOT NULL,
  domain text NOT NULL,
  business_name text,
  tagline text,
  mission text,
  selling_type text,
  colors jsonb,
  social_links jsonb,
  logo_external_url text,
  logo_storage_path text
);

CREATE INDEX IF NOT EXISTS idx_workspaces_guest_id ON workspaces (guest_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_domain ON workspaces (domain);

-- Products per workspace
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  external_id text,
  title text,
  description text,
  url text,
  vendor text,
  price text,
  images_external jsonb,
  images_storage jsonb
);

CREATE INDEX IF NOT EXISTS idx_products_workspace_id ON products (workspace_id);

-- Assets (logo, product images, scraped, creatives)
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  external_url text,
  storage_path text,
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace_id ON assets (workspace_id);

-- Creatives (scaffold for later)
CREATE TABLE IF NOT EXISTS creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text,
  prompt text,
  aspect_ratio text,
  status text,
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_creatives_workspace_id ON creatives (workspace_id);

-- RLS: strict, no direct client access; server uses service role
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

-- No policies that allow anon/authenticated; service role bypasses RLS
CREATE POLICY "No public access workspaces" ON workspaces FOR ALL USING (false);
CREATE POLICY "No public access products" ON products FOR ALL USING (false);
CREATE POLICY "No public access assets" ON assets FOR ALL USING (false);
CREATE POLICY "No public access creatives" ON creatives FOR ALL USING (false);

-- updated_at trigger for workspaces
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
