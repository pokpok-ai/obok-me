-- obok.me — Correlation & Enrichment SQL Functions
-- Run this in Supabase SQL Editor after setup_db.sql

-- =============================================================
-- RPC: Monthly price trends for current viewport
-- Returns avg/median price per m² by month, split by market type
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_price_trends(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  prop_type TEXT DEFAULT NULL
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
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') AS month,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.price_per_sqm))::NUMERIC, 0),
    COUNT(*)::BIGINT,
    ROUND(AVG(CASE WHEN t.market_type = 'primary' THEN t.price_per_sqm END)::NUMERIC, 0),
    ROUND(AVG(CASE WHEN t.market_type = 'secondary' THEN t.price_per_sqm END)::NUMERIC, 0)
  FROM transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.price_per_sqm IS NOT NULL
    AND t.transaction_date IS NOT NULL
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (prop_type IS NULL OR t.property_type = prop_type)
  GROUP BY DATE_TRUNC('month', t.transaction_date)
  ORDER BY DATE_TRUNC('month', t.transaction_date);
$$;


-- =============================================================
-- RPC: Floor premium analysis for apartments in viewport
-- Returns avg price/m² by floor number
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_floor_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  floor INTEGER,
  avg_price_per_sqm NUMERIC,
  median_price_per_sqm NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    t.floor,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.price_per_sqm))::NUMERIC, 0),
    COUNT(*)::BIGINT
  FROM transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.price_per_sqm IS NOT NULL
    AND t.floor IS NOT NULL
    AND t.property_type = 'apartment'
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
  GROUP BY t.floor
  HAVING COUNT(*) >= 3
  ORDER BY t.floor;
$$;


-- =============================================================
-- RPC: Room count vs price analysis
-- Returns avg price/m² by number of rooms
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_rooms_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  rooms INTEGER,
  avg_price_per_sqm NUMERIC,
  avg_total_price NUMERIC,
  avg_area NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    t.rooms,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND(AVG(t.price)::NUMERIC, 0),
    ROUND(AVG(t.area_sqm)::NUMERIC, 1),
    COUNT(*)::BIGINT
  FROM transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.price_per_sqm IS NOT NULL
    AND t.rooms IS NOT NULL
    AND t.rooms BETWEEN 1 AND 6
    AND t.property_type = 'apartment'
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
  GROUP BY t.rooms
  HAVING COUNT(*) >= 3
  ORDER BY t.rooms;
$$;


-- =============================================================
-- RPC: Area size distribution — price/m² by area range buckets
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_area_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  area_bucket TEXT,
  bucket_order INTEGER,
  avg_price_per_sqm NUMERIC,
  avg_total_price NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
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
  FROM transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.price_per_sqm IS NOT NULL
    AND t.area_sqm IS NOT NULL
    AND t.property_type = 'apartment'
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
  GROUP BY area_bucket, bucket_order
  HAVING COUNT(*) >= 3
  ORDER BY bucket_order;
$$;


-- =============================================================
-- RPC: Transaction volume trends — monthly deal counts
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_volume_trends(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  prop_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  month TEXT,
  transaction_count BIGINT,
  total_value NUMERIC,
  avg_price NUMERIC
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') AS month,
    COUNT(*)::BIGINT,
    ROUND(SUM(t.price)::NUMERIC, 0),
    ROUND(AVG(t.price)::NUMERIC, 0)
  FROM transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.transaction_date IS NOT NULL
    AND (prop_type IS NULL OR t.property_type = prop_type)
  GROUP BY DATE_TRUNC('month', t.transaction_date)
  ORDER BY DATE_TRUNC('month', t.transaction_date);
$$;


-- =============================================================
-- RPC: Buyer/Seller type breakdown
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_party_analysis(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  buyer_type TEXT,
  seller_type TEXT,
  avg_price_per_sqm NUMERIC,
  avg_total_price NUMERIC,
  transaction_count BIGINT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    t.buyer_type,
    t.seller_type,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND(AVG(t.price)::NUMERIC, 0),
    COUNT(*)::BIGINT
  FROM transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND (t.buyer_type IS NOT NULL OR t.seller_type IS NOT NULL)
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
  GROUP BY t.buyer_type, t.seller_type
  HAVING COUNT(*) >= 2
  ORDER BY COUNT(*) DESC
  LIMIT 20;
$$;


-- =============================================================
-- RPC: Year-over-year price change for viewport
-- Compares last 12 months avg to previous 12 months avg
-- =============================================================
CREATE OR REPLACE FUNCTION viewport_yoy_change(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  prop_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  current_avg NUMERIC,
  previous_avg NUMERIC,
  pct_change NUMERIC,
  current_count BIGINT,
  previous_count BIGINT
)
LANGUAGE SQL STABLE
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
    FROM transactions t, bounds b
    WHERE t.lat BETWEEN min_lat AND max_lat
      AND t.lng BETWEEN min_lng AND max_lng
      AND t.price_per_sqm IS NOT NULL
      AND t.transaction_date BETWEEN b.current_start AND b.current_end
      AND (prop_type IS NULL OR t.property_type = prop_type)
  ),
  previous_period AS (
    SELECT
      ROUND(AVG(t.price_per_sqm)::NUMERIC, 0) AS avg_ppsm,
      COUNT(*)::BIGINT AS cnt
    FROM transactions t, bounds b
    WHERE t.lat BETWEEN min_lat AND max_lat
      AND t.lng BETWEEN min_lng AND max_lng
      AND t.price_per_sqm IS NOT NULL
      AND t.transaction_date BETWEEN b.previous_start AND b.previous_end
      AND (prop_type IS NULL OR t.property_type = prop_type)
  )
  SELECT
    c.avg_ppsm AS current_avg,
    p.avg_ppsm AS previous_avg,
    CASE WHEN p.avg_ppsm > 0 THEN ROUND(((c.avg_ppsm - p.avg_ppsm) / p.avg_ppsm * 100)::NUMERIC, 1) ELSE NULL END AS pct_change,
    c.cnt AS current_count,
    p.cnt AS previous_count
  FROM current_period c, previous_period p;
$$;


-- =============================================================
-- Indexes to support correlation queries efficiently
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_lat_lng
  ON transactions (lat, lng);

CREATE INDEX IF NOT EXISTS idx_transactions_floor
  ON transactions (floor)
  WHERE floor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_rooms
  ON transactions (rooms)
  WHERE rooms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_market_type
  ON transactions (market_type)
  WHERE market_type IS NOT NULL;
