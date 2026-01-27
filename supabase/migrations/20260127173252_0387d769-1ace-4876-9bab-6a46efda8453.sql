-- Create table for LCA disclosure data
CREATE TABLE public.lca_disclosure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL,
  case_status text NOT NULL,
  received_date date,
  decision_date date,
  visa_class text NOT NULL,
  
  -- Employer info
  employer_name text NOT NULL,
  employer_dba text,
  employer_fein text,
  employer_address1 text,
  employer_address2 text,
  employer_city text,
  employer_state text,
  employer_postal_code text,
  employer_country text,
  employer_phone text,
  naics_code text,
  
  -- Job info
  job_title text,
  soc_code text,
  soc_title text,
  full_time_position boolean DEFAULT true,
  begin_date date,
  end_date date,
  total_workers integer DEFAULT 1,
  
  -- Worksite info
  worksite_city text,
  worksite_county text,
  worksite_state text,
  worksite_postal_code text,
  
  -- Wage info
  wage_rate_from numeric,
  wage_rate_to numeric,
  wage_unit text,
  prevailing_wage numeric,
  pw_unit text,
  pw_wage_level text,
  pw_source text,
  
  -- H-1B dependency
  h1b_dependent boolean DEFAULT false,
  willful_violator boolean DEFAULT false,
  
  -- Metadata
  fiscal_year text,
  created_at timestamptz DEFAULT now(),
  
  -- Unique constraint on case number
  CONSTRAINT lca_disclosure_case_number_key UNIQUE (case_number)
);

-- Enable RLS
ALTER TABLE public.lca_disclosure ENABLE ROW LEVEL SECURITY;

-- Allow public read access (LCA data is public information)
CREATE POLICY "Allow public read access to LCA disclosure data"
  ON public.lca_disclosure
  FOR SELECT
  USING (true);

-- Create indexes for common lookups
CREATE INDEX idx_lca_disclosure_fein ON public.lca_disclosure(employer_fein);
CREATE INDEX idx_lca_disclosure_employer_name ON public.lca_disclosure(employer_name);
CREATE INDEX idx_lca_disclosure_case_number ON public.lca_disclosure(case_number);
CREATE INDEX idx_lca_disclosure_soc_code ON public.lca_disclosure(soc_code);
CREATE INDEX idx_lca_disclosure_fiscal_year ON public.lca_disclosure(fiscal_year);