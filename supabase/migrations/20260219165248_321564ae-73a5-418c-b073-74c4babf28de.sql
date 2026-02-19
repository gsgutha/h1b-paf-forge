-- Create a function to efficiently clear wage data for a specific year
-- using batched deletes to avoid statement timeout
CREATE OR REPLACE FUNCTION public.clear_wage_year(p_wage_year text)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  deleted_total INTEGER := 0;
  deleted_batch INTEGER;
BEGIN
  LOOP
    DELETE FROM oflc_prevailing_wages
    WHERE id IN (
      SELECT id FROM oflc_prevailing_wages
      WHERE wage_year = p_wage_year
      LIMIT 10000
    );
    GET DIAGNOSTICS deleted_batch = ROW_COUNT;
    deleted_total := deleted_total + deleted_batch;
    EXIT WHEN deleted_batch = 0;
  END LOOP;
  RETURN deleted_total;
END;
$$;