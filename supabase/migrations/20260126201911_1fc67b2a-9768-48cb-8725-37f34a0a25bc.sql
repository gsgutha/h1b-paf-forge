-- Create table for OFLC prevailing wage data from FLAG.gov
CREATE TABLE public.oflc_prevailing_wages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wage_year text NOT NULL, -- e.g., '2024-25', '2025-26'
    area_code text NOT NULL, -- Geographic area code
    area_name text NOT NULL, -- Geographic area name
    soc_code text NOT NULL, -- Standard Occupational Classification code
    soc_title text NOT NULL, -- SOC occupation title
    
    -- Level 1 wages (17th percentile - Entry)
    level_1_hourly numeric,
    level_1_annual numeric,
    
    -- Level 2 wages (34th percentile - Qualified)
    level_2_hourly numeric,
    level_2_annual numeric,
    
    -- Level 3 wages (50th percentile - Experienced)
    level_3_hourly numeric,
    level_3_annual numeric,
    
    -- Level 4 wages (67th percentile - Fully Competent)
    level_4_hourly numeric,
    level_4_annual numeric,
    
    -- Mean wage
    mean_hourly numeric,
    mean_annual numeric,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Composite index for fast lookups
    UNIQUE(wage_year, area_code, soc_code)
);

-- Enable RLS
ALTER TABLE public.oflc_prevailing_wages ENABLE ROW LEVEL SECURITY;

-- Allow public read access (wage data is public information)
CREATE POLICY "Allow public read access to wage data"
ON public.oflc_prevailing_wages
FOR SELECT
USING (true);

-- Create indexes for common query patterns
CREATE INDEX idx_oflc_wages_soc_code ON public.oflc_prevailing_wages(soc_code);
CREATE INDEX idx_oflc_wages_area_code ON public.oflc_prevailing_wages(area_code);
CREATE INDEX idx_oflc_wages_year ON public.oflc_prevailing_wages(wage_year);
CREATE INDEX idx_oflc_wages_lookup ON public.oflc_prevailing_wages(wage_year, soc_code, area_code);