-- Booksy Salon Data Schema
-- Run this in Supabase SQL Editor

-- =============================================================
-- Table: booksy_salons
-- =============================================================
CREATE TABLE IF NOT EXISTS booksy_salons (
  id BIGSERIAL PRIMARY KEY,
  booksy_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  category_id INTEGER,
  category_name TEXT,
  address TEXT,
  district TEXT,

  -- Location (WGS84) — same pattern as transactions
  location GEOGRAPHY(POINT, 4326),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Business info
  rating NUMERIC(3,2),
  review_count INTEGER,
  phone TEXT,
  website TEXT,
  photo_url TEXT,

  -- Promotions
  has_promotion BOOLEAN DEFAULT FALSE,
  max_discount_pct INTEGER DEFAULT 0,
  is_promoted BOOLEAN DEFAULT FALSE,

  -- Metadata
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for viewport queries
CREATE INDEX IF NOT EXISTS idx_booksy_salons_location
  ON booksy_salons USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_booksy_salons_category
  ON booksy_salons (category_id);

CREATE INDEX IF NOT EXISTS idx_booksy_salons_promotion
  ON booksy_salons (has_promotion) WHERE has_promotion = TRUE;

CREATE INDEX IF NOT EXISTS idx_booksy_salons_promoted
  ON booksy_salons (is_promoted) WHERE is_promoted = TRUE;

-- RLS: public read
ALTER TABLE booksy_salons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read booksy_salons" ON booksy_salons;
CREATE POLICY "public read booksy_salons" ON booksy_salons FOR SELECT USING (true);

-- =============================================================
-- Table: booksy_services
-- =============================================================
CREATE TABLE IF NOT EXISTS booksy_services (
  id BIGSERIAL PRIMARY KEY,
  salon_id BIGINT REFERENCES booksy_salons(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  category_name TEXT,
  price_pln NUMERIC,
  original_price_pln NUMERIC,
  discount_pct INTEGER,
  duration_minutes INTEGER,
  last_scraped_at TIMESTAMPTZ,

  UNIQUE(salon_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_booksy_services_salon
  ON booksy_services (salon_id);

-- RLS: public read
ALTER TABLE booksy_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read booksy_services" ON booksy_services;
CREATE POLICY "public read booksy_services" ON booksy_services FOR SELECT USING (true);

-- =============================================================
-- RPC: Salons in viewport with top 3 services
-- =============================================================
DROP FUNCTION IF EXISTS booksy_salons_in_view(float, float, float, float, integer, boolean, boolean, integer);

CREATE OR REPLACE FUNCTION booksy_salons_in_view(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  cat INTEGER DEFAULT NULL,
  promo_only BOOLEAN DEFAULT FALSE,
  promoted_only BOOLEAN DEFAULT FALSE,
  max_results INTEGER DEFAULT 300
)
RETURNS TABLE (
  id BIGINT,
  booksy_id INTEGER,
  name TEXT,
  category_id INTEGER,
  category_name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating NUMERIC,
  review_count INTEGER,
  has_promotion BOOLEAN,
  max_discount_pct INTEGER,
  is_promoted BOOLEAN,
  photo_url TEXT,
  top_services JSONB
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id, s.booksy_id, s.name, s.category_id, s.category_name,
    s.address, s.lat, s.lng, s.rating, s.review_count,
    s.has_promotion, s.max_discount_pct, s.is_promoted,
    s.photo_url,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', sv.service_name,
        'price', sv.price_pln,
        'original_price', sv.original_price_pln,
        'discount_pct', sv.discount_pct,
        'duration', sv.duration_minutes
      ) ORDER BY sv.price_pln ASC NULLS LAST), '[]'::jsonb)
      FROM (SELECT * FROM booksy_services WHERE salon_id = s.id ORDER BY price_pln ASC NULLS LAST LIMIT 3) sv
    ) AS top_services
  FROM booksy_salons s
  WHERE s.lat BETWEEN min_lat AND max_lat
    AND s.lng BETWEEN min_lng AND max_lng
    AND (cat IS NULL OR s.category_id = cat)
    AND (NOT promo_only OR s.has_promotion = TRUE)
    AND (NOT promoted_only OR s.is_promoted = TRUE)
  ORDER BY s.rating DESC NULLS LAST
  LIMIT max_results;
$$;
