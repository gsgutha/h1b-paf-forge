-- Add lca_status column to track In Process vs Certified LCA status
ALTER TABLE public.paf_records 
ADD COLUMN lca_status TEXT NOT NULL DEFAULT 'certified' 
CHECK (lca_status IN ('in_process', 'certified'));

-- Add comment for clarity
COMMENT ON COLUMN public.paf_records.lca_status IS 'Tracks whether the LCA is still in process or has been certified by DOL';