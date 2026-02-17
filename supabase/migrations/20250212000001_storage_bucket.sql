-- Storage bucket for AdLynx assets
-- Paths: workspace/{workspaceId}/logo/{filename}, workspace/{workspaceId}/products/{productId}/{filename}
-- Create via SQL; optionally set file_size_limit and allowed_mime_types in Dashboard.

INSERT INTO storage.buckets (id, name, public)
VALUES ('adlynx', 'adlynx', false)
ON CONFLICT (id) DO NOTHING;
