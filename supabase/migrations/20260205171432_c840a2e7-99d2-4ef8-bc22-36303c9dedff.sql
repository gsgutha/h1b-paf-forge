-- Add worker/beneficiary name field to paf_records
ALTER TABLE public.paf_records 
ADD COLUMN worker_name text;