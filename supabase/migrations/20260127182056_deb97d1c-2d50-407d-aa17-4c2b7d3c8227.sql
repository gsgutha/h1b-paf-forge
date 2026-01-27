-- Create storage bucket for LCA import files
INSERT INTO storage.buckets (id, name, public)
VALUES ('lca-imports', 'lca-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated uploads (we'll use service role in edge function)
CREATE POLICY "Allow service role access to lca-imports"
ON storage.objects
FOR ALL
USING (bucket_id = 'lca-imports')
WITH CHECK (bucket_id = 'lca-imports');