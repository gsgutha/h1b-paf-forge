-- The FLAG.gov data stores HOURLY wages in the level columns
-- We imported them as annual but they're actually hourly
-- Let's update the existing data: swap the values (move what's in annual to hourly, calculate annual from hourly * 2080)

UPDATE oflc_prevailing_wages
SET 
  level_1_hourly = level_1_annual,
  level_1_annual = ROUND(level_1_annual * 2080, 2),
  level_2_hourly = level_2_annual,
  level_2_annual = ROUND(level_2_annual * 2080, 2),
  level_3_hourly = level_3_annual,
  level_3_annual = ROUND(level_3_annual * 2080, 2),
  level_4_hourly = level_4_annual,
  level_4_annual = ROUND(level_4_annual * 2080, 2),
  mean_hourly = mean_annual,
  mean_annual = ROUND(mean_annual * 2080, 2)
WHERE wage_year = '2025-2026';