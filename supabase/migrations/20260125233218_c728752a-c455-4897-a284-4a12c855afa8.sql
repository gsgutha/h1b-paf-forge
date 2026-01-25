-- Create storage bucket for PAF documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('paf-documents', 'paf-documents', false);

-- Create PAF records table
CREATE TABLE public.paf_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Employer Info
    employer_legal_name TEXT NOT NULL,
    employer_trade_name TEXT,
    employer_address1 TEXT NOT NULL,
    employer_address2 TEXT,
    employer_city TEXT NOT NULL,
    employer_state TEXT NOT NULL,
    employer_postal_code TEXT NOT NULL,
    employer_country TEXT NOT NULL DEFAULT 'United States',
    employer_telephone TEXT NOT NULL,
    employer_fein TEXT NOT NULL,
    employer_naics_code TEXT NOT NULL,
    
    -- Job Details
    job_title TEXT NOT NULL,
    soc_code TEXT NOT NULL,
    soc_title TEXT NOT NULL,
    onet_code TEXT,
    onet_title TEXT,
    is_full_time BOOLEAN NOT NULL DEFAULT true,
    begin_date DATE NOT NULL,
    end_date DATE NOT NULL,
    wage_rate_from DECIMAL(12, 2) NOT NULL,
    wage_rate_to DECIMAL(12, 2),
    wage_unit TEXT NOT NULL,
    workers_needed INTEGER NOT NULL DEFAULT 1,
    is_rd BOOLEAN DEFAULT false,
    
    -- Worksite
    worksite_address1 TEXT NOT NULL,
    worksite_address2 TEXT,
    worksite_city TEXT NOT NULL,
    worksite_state TEXT NOT NULL,
    worksite_postal_code TEXT NOT NULL,
    worksite_county TEXT,
    worksite_area_code TEXT,
    worksite_area_name TEXT,
    
    -- Wage Info
    prevailing_wage DECIMAL(12, 2) NOT NULL,
    prevailing_wage_unit TEXT NOT NULL,
    wage_level TEXT NOT NULL,
    wage_source TEXT NOT NULL,
    wage_source_date DATE NOT NULL,
    actual_wage DECIMAL(12, 2) NOT NULL,
    actual_wage_unit TEXT NOT NULL,
    
    -- H-1B Status
    visa_type TEXT NOT NULL DEFAULT 'H-1B',
    is_h1b_dependent BOOLEAN NOT NULL DEFAULT false,
    is_willful_violator BOOLEAN NOT NULL DEFAULT false,
    
    -- LCA Info
    lca_case_number TEXT,
    lca_file_path TEXT,
    
    -- Supporting Documents
    actual_wage_memo_path TEXT,
    notice_posting_proof_path TEXT,
    benefits_comparison_path TEXT
);

-- Enable RLS on paf_records (public access for now since no auth)
ALTER TABLE public.paf_records ENABLE ROW LEVEL SECURITY;

-- Create policy for public read/write (temporary until auth is added)
CREATE POLICY "Allow public access to paf_records"
ON public.paf_records
FOR ALL
USING (true)
WITH CHECK (true);

-- Storage policies for paf-documents bucket
CREATE POLICY "Allow public uploads to paf-documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'paf-documents');

CREATE POLICY "Allow public read from paf-documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'paf-documents');

CREATE POLICY "Allow public update in paf-documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'paf-documents');

CREATE POLICY "Allow public delete from paf-documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'paf-documents');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_paf_records_updated_at
BEFORE UPDATE ON public.paf_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();