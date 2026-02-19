-- Create a function to bulk-update area_name by area_code for a given wage_year
CREATE OR REPLACE FUNCTION public.patch_area_names(
  p_wage_year TEXT,
  p_area_codes TEXT[],
  p_area_names TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(p_area_codes, 1) LOOP
    UPDATE oflc_prevailing_wages
    SET area_name = p_area_names[i]
    WHERE wage_year = p_wage_year
      AND area_code = p_area_codes[i];
    updated_count := updated_count + ROW_COUNT;
  END LOOP;
  RETURN updated_count;
END;
$$;