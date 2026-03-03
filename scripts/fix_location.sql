-- obok.me — Fix NULL location column
-- The import script populates lat/lng but not the GEOGRAPHY location column.
-- This causes spatial queries (transactions_in_view, viewport_stats) to return 0 rows.
--
-- Run this ONCE in Supabase SQL Editor. Takes ~2-5 min for 1.16M rows.

-- Step 1: Populate location from lat/lng
UPDATE transactions
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE location IS NULL
  AND lat IS NOT NULL
  AND lng IS NOT NULL;

-- Step 2: Verify
SELECT
  COUNT(*) AS total_rows,
  COUNT(location) AS rows_with_location,
  COUNT(*) - COUNT(location) AS rows_without_location
FROM transactions;
