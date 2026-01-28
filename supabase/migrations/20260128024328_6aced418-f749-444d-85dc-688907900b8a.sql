-- Allow updates to paf_generated status from public
CREATE POLICY "Allow update paf_generated status" 
ON public.lca_disclosure 
FOR UPDATE 
USING (true)
WITH CHECK (true);