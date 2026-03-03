-- obok.me Database Schema
-- Run this in Supabase SQL Editor

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Main transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,

  -- Transaction data
  price NUMERIC,
  price_per_sqm NUMERIC,
  transaction_date DATE,
  property_type TEXT,       -- 'apartment' | 'house' | 'plot' | 'commercial'
  market_type TEXT,         -- 'primary' | 'secondary'

  -- Property details
  area_sqm NUMERIC,
  rooms INTEGER,
  floor INTEGER,
  address TEXT,

  -- Location (WGS84)
  location GEOGRAPHY(POINT, 4326),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Metadata
  source_id TEXT,
  powiat TEXT,
  wojewodztwo TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index (critical for viewport queries)
CREATE INDEX IF NOT EXISTS idx_transactions_location
  ON transactions USING GIST (location);

-- Date index for filtering
CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions (transaction_date);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_transactions_date_type
  ON transactions (transaction_date, property_type);

-- Property type index
CREATE INDEX IF NOT EXISTS idx_transactions_type
  ON transactions (property_type);


-- =============================================================
-- RPC: Get transactions within map viewport
-- Hardcoded to apartments only; supports function_type sub-filter
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
AS $$
  SELECT
    t.id, t.price, t.price_per_sqm, t.transaction_date,
    t.property_type, t.market_type, t.area_sqm, t.rooms,
    t.floor, t.address, t.lat, t.lng,
    t.transaction_type, t.seller_type, t.buyer_type,
    t.property_right, t.share_fraction,
    t.apartment_number, t.function_type, t.ancillary_area_sqm,
    t.building_type, t.zoning, t.land_use, t.additional_info
  FROM transactions t
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
-- RPC: Get aggregate stats for current viewport
-- Hardcoded to apartments only; supports function_type sub-filter
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
AS $$
  SELECT
    COUNT(*)::BIGINT,
    ROUND(AVG(t.price_per_sqm)::NUMERIC, 0),
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.price_per_sqm))::NUMERIC, 0),
    MIN(t.price),
    MAX(t.price)
  FROM transactions t
  WHERE t.lat BETWEEN min_lat AND max_lat
    AND t.lng BETWEEN min_lng AND max_lng
    AND t.property_type = 'apartment'
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (func_type IS NULL OR t.function_type = func_type)
    AND t.price_per_sqm IS NOT NULL;
$$;


-- =============================================================
-- Row Level Security: public read access via anon key
-- =============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON transactions;
CREATE POLICY "Public read access"
  ON transactions FOR SELECT
  USING (true);
