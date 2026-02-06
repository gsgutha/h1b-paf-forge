-- Add posting date and location columns to paf_records for tracking notice posting lifecycle
ALTER TABLE public.paf_records
ADD COLUMN notice_posting_start_date TEXT,
ADD COLUMN notice_posting_end_date TEXT,
ADD COLUMN notice_posting_location TEXT,
ADD COLUMN notice_posting_location2 TEXT;