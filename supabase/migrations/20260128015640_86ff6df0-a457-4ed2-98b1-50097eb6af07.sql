-- Add paf_generated tracking column to lca_disclosure
ALTER TABLE public.lca_disclosure 
ADD COLUMN paf_generated boolean NOT NULL DEFAULT false;

-- Add paf_generated_at timestamp for tracking when PAF was generated
ALTER TABLE public.lca_disclosure 
ADD COLUMN paf_generated_at timestamp with time zone;

-- Create an index for efficient filtering of pending LCAs by employer
CREATE INDEX idx_lca_disclosure_employer_paf_status 
ON public.lca_disclosure (employer_name, paf_generated, case_status);