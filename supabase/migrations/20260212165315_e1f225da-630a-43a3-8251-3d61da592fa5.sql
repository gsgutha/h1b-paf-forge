
-- Step 1: Drop all overly permissive policies

-- authorized_signatories: drop public read/write
DROP POLICY IF EXISTS "Allow public read access to signatories" ON public.authorized_signatories;
DROP POLICY IF EXISTS "Allow public write access to signatories" ON public.authorized_signatories;

-- lca_disclosure: drop public read and update
DROP POLICY IF EXISTS "Allow public read access to LCA disclosure data" ON public.lca_disclosure;
DROP POLICY IF EXISTS "Allow update paf_generated status" ON public.lca_disclosure;

-- paf_records: drop public all
DROP POLICY IF EXISTS "Allow public access to paf_records" ON public.paf_records;

-- Step 2: Create auth-required policies

-- authorized_signatories: authenticated users can read, write
CREATE POLICY "Authenticated users can read signatories"
ON public.authorized_signatories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage signatories"
ON public.authorized_signatories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- lca_disclosure: authenticated read and update
CREATE POLICY "Authenticated users can read LCA data"
ON public.lca_disclosure
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update LCA status"
ON public.lca_disclosure
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- paf_records: authenticated users only
CREATE POLICY "Authenticated users can manage PAF records"
ON public.paf_records
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 3: Tighten storage policies for paf-documents
DROP POLICY IF EXISTS "Allow public uploads to paf-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from paf-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update in paf-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from paf-documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload to paf-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'paf-documents');

CREATE POLICY "Authenticated users can read from paf-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'paf-documents');

CREATE POLICY "Authenticated users can update in paf-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'paf-documents');

CREATE POLICY "Authenticated users can delete from paf-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'paf-documents');

-- Step 4: Tighten lca-imports storage policies
DROP POLICY IF EXISTS "Allow public uploads to lca-imports" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from lca-imports" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from lca-imports" ON storage.objects;

CREATE POLICY "Authenticated users can upload to lca-imports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lca-imports');

CREATE POLICY "Authenticated users can read from lca-imports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lca-imports');

CREATE POLICY "Authenticated users can delete from lca-imports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lca-imports');
