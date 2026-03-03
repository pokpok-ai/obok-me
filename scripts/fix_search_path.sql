-- obok.me — Fix: Function Search Path Mutable (Supabase Security Advisor lint 0011)
--
-- All RPC functions must set `search_path = ''` and use fully-qualified table
-- references (public.transactions) to prevent search_path manipulation attacks.
--
-- Run this in Supabase SQL Editor to patch all 11 deployed functions.

-- =============================================================
-- 1. transactions_in_view
-- =============================================================
CREATE OR REPLACE FUNCTION transactions_in_view(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 500
)
RETURNS TABLE (
  id BIGINT,
  price NUMERIC,
  price_per_sqm NUMERIC,
  transaction_date DATE,
  property_type TEXT,
  market_type TEXT,
  area_sqm NUMERIC,
  rooms INTEGER,
  floor INTEGER,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  transaction_type TEXT,
  seller_type TEXT,
  buyer_type TEXT,
  property_right TEXT,
  share_fraction TEXT,
  apartment_number TEXT,
  function_type TEXT,
  ancillary_area_sqm NUMERIC,
  building_type TEXT,
  zoning TEXT,
  land_use TEXT,
  additional_info TEXT
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    t.id, t.price, t.price_per_sqm, t.transaction_date,
    t.property_type, t.market_type, t.area_sqm, t.rooms,
    t.floor, t.address, t.lat, t.lng,
    t.transaction_type, t.seller_type, t.buyer_type,
    t.property_right, t.share_fraction,
    t.apartment_number, t.function_type, t.ancillary_area_sqm,
    t.building_type, t.zoning, t.land_use, t.additional_info
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
  ORDER BY t.transaction_date DESC
  LIMIT max_results;
$$;

-- =============================================================
-- 2. viewport_stats
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_stats(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_count BIGINT,
  avg_price_per_sqm NUMERIC,
  median_price_per_sqm NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    COUNT(*)::BIGINT,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.price_per_sqm))::NUMERIC, 0),
    MIN(t.price),
    MAX(t.price)
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
    AND t.price_per_sqm IS NOT NULL;
$$;

-- =============================================================
-- 3. heatmap_points
-- =============================================================
CREATE OR REPLACE FUNCTION heatmap_points(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 5000
)
RETURNS TABLE (
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  weight NUMERIC
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    t.lat,
    t.lng,
    t.price_per_sqm AS weight
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND t.price_per_sqm IS NOT NULL
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
  ORDER BY t.transaction_date DESC
  LIMIT max_results;
$$;

-- =============================================================
-- 4. warsaw_wide_stats
-- =============================================================
CREATE OR REPLACE FUNCTION warsaw_wide_stats(
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_count BIGINT,
  avg_price_per_sqm NUMERIC,
  median_price_per_sqm NUMERIC
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    COUNT(*)::BIGINT,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.price_per_sqm))::NUMERIC, 0)
  FROM public.transactions t
  WHERE t.property_type = 'apartment'
    AND t.price_per_sqm IS NOT NULL
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type);
$$;

-- =============================================================
-- 5. viewport_price_trends
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_price_trends(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  month TEXT,
  avg_price_per_sqm NUMERIC,
  median_price_per_sqm NUMERIC,
  transaction_count BIGINT,
  market_primary_avg NUMERIC,
  market_secondary_avg NUMERIC
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') AS month,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.price_per_sqm))::NUMERIC, 0),
    COUNT(*)::BIGINT,
    ROUND(AVG(CASE WHEN t.market_type = 'primary' THEN t.price_per_sqm END)::NUMERIC, 0),
    ROUND(AVG(CASE WHEN t.market_type = 'secondary' THEN t.price_per_sqm END)::NUMERIC, 0)
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND t.price_per_sqm IS NOT NULL
    AND t.transaction_date IS NOT NULL
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
  GROUP BY DATE_TRUNC('month', t.transaction_date)
  ORDER BY DATE_TRUNC('month', t.transaction_date);
$$;

-- =============================================================
-- 6. viewport_floor_analysis
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_floor_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  floor INTEGER,
  avg_price_per_sqm NUMERIC,
  median_price_per_sqm NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    t.floor,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.price_per_sqm))::NUMERIC, 0),
    COUNT(*)::BIGINT
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND t.price_per_sqm IS NOT NULL
    AND t.floor IS NOT NULL
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
  GROUP BY t.floor
  HAVING COUNT(*) >= 3
  ORDER BY t.floor;
$$;

-- =============================================================
-- 7. viewport_rooms_analysis
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_rooms_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  rooms INTEGER,
  avg_price_per_sqm NUMERIC,
  avg_total_price NUMERIC,
  avg_area NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    t.rooms,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND(AVG(t.price)::NUMERIC, 0),
    ROUND(AVG(t.area_sqm)::NUMERIC, 1),
    COUNT(*)::BIGINT
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND t.price_per_sqm IS NOT NULL
    AND t.rooms IS NOT NULL
    AND t.rooms BETWEEN 1 AND 6
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
  GROUP BY t.rooms
  HAVING COUNT(*) >= 3
  ORDER BY t.rooms;
$$;

-- =============================================================
-- 8. viewport_area_analysis
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_area_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  area_bucket TEXT,
  bucket_order INTEGER,
  avg_price_per_sqm NUMERIC,
  avg_total_price NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    CASE
      WHEN t.area_sqm < 30 THEN '< 30 m²'
      WHEN t.area_sqm < 50 THEN '30-50 m²'
      WHEN t.area_sqm < 70 THEN '50-70 m²'
      WHEN t.area_sqm < 100 THEN '70-100 m²'
      ELSE '100+ m²'
    END AS area_bucket,
    CASE
      WHEN t.area_sqm < 30 THEN 1
      WHEN t.area_sqm < 50 THEN 2
      WHEN t.area_sqm < 70 THEN 3
      WHEN t.area_sqm < 100 THEN 4
      ELSE 5
    END AS bucket_order,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND(AVG(t.price)::NUMERIC, 0),
    COUNT(*)::BIGINT
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND t.price_per_sqm IS NOT NULL
    AND t.area_sqm IS NOT NULL
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
  GROUP BY area_bucket, bucket_order
  HAVING COUNT(*) >= 3
  ORDER BY bucket_order;
$$;

-- =============================================================
-- 9. viewport_volume_trends
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_volume_trends(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  month TEXT,
  transaction_count BIGINT,
  total_value NUMERIC,
  avg_price NUMERIC
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') AS month,
    COUNT(*)::BIGINT,
    ROUND(SUM(t.price)::NUMERIC, 0),
    ROUND(AVG(t.price)::NUMERIC, 0)
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND t.transaction_date IS NOT NULL
    AND (func_type IS NULL OR t.function_type = func_type)
  GROUP BY DATE_TRUNC('month', t.transaction_date)
  ORDER BY DATE_TRUNC('month', t.transaction_date);
$$;

-- =============================================================
-- 10. viewport_party_analysis
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_party_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  buyer_type TEXT,
  seller_type TEXT,
  avg_price_per_sqm NUMERIC,
  avg_total_price NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  SELECT
    t.buyer_type,
    t.seller_type,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND(AVG(t.price)::NUMERIC, 0),
    COUNT(*)::BIGINT
  FROM public.transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND (t.buyer_type IS NOT NULL OR t.seller_type IS NOT NULL)
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
  GROUP BY t.buyer_type, t.seller_type
  HAVING COUNT(*) >= 2
  ORDER BY COUNT(*) DESC
  LIMIT 20;
$$;

-- =============================================================
-- 11. viewport_yoy_change
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_yoy_change(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  func_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  current_avg NUMERIC,
  previous_avg NUMERIC,
  pct_change NUMERIC,
  current_count BIGINT,
  previous_count BIGINT
)
LANGUAGE SQL STABLE
SET search_path = ''
AS $$
  WITH bounds AS (
    SELECT
      CURRENT_DATE - INTERVAL '12 months' AS current_start,
      CURRENT_DATE AS current_end,
      CURRENT_DATE - INTERVAL '24 months' AS previous_start,
      CURRENT_DATE - INTERVAL '12 months' AS previous_end
  ),
  current_period AS (
    SELECT
      ROUND(AVG(t.price_per_sqm)::NUMERIC, 0) AS avg_ppsm,
      COUNT(*)::BIGINT AS cnt
    FROM public.transactions t, bounds b
    WHERE t.lat BETWEEN min_lat AND max_lat
      AND t.lng BETWEEN min_lng AND max_lng
      AND t.property_type = 'apartment'
      AND t.price_per_sqm IS NOT NULL
      AND t.transaction_date BETWEEN b.current_start AND b.current_end
      AND (func_type IS NULL OR t.function_type = func_type)
  ),
  previous_period AS (
    SELECT
      ROUND(AVG(t.price_per_sqm)::NUMERIC, 0) AS avg_ppsm,
      COUNT(*)::BIGINT AS cnt
    FROM public.transactions t, bounds b
    WHERE t.lat BETWEEN min_lat AND max_lat
      AND t.lng BETWEEN min_lng AND max_lng
      AND t.property_type = 'apartment'
      AND t.price_per_sqm IS NOT NULL
      AND t.transaction_date BETWEEN b.previous_start AND b.previous_end
      AND (func_type IS NULL OR t.function_type = func_type)
  )
  SELECT
    c.avg_ppsm AS current_avg,
    p.avg_ppsm AS previous_avg,
    CASE WHEN p.avg_ppsm > 0 THEN ROUND(((c.avg_ppsm - p.avg_ppsm) / p.avg_ppsm * 100)::NUMERIC, 1) ELSE NULL END AS pct_change,
    c.cnt AS current_count,
    p.cnt AS previous_count
  FROM current_period c, previous_period p;
$$;
