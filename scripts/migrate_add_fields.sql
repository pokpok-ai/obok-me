-- obok.me — Schema migration: add missing RCN fields
-- Based on §40 of Rozporządzenie w sprawie ewidencji gruntów i budynków (Dz.U.2021.1390)
--
-- Run this in Supabase SQL Editor to add columns not in the original schema.

-- =====================================================
-- Fields already imported but missing from setup_db.sql
-- =====================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS property_right TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS share_fraction TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS land_area_sqm NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS apartment_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS function_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ancillary_area_sqm NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS vat_amount NUMERIC;

-- =====================================================
-- NEW: Fields from §40 not currently imported
-- =====================================================

-- §40 ust.5 pkt 3: rodzaj budynku (building type per KŚT classification)
-- e.g. "mieszkalny", "przemysłowy", "handlowo-usługowy", "biurowy"
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS building_type TEXT;

-- §40 ust.4 pkt 4: przeznaczenie w MPZP (zoning designation)
-- e.g. "MN" (single-family), "MW" (multi-family), "U" (services), "P" (industrial)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS zoning TEXT;

-- §40 ust.4 pkt 5: sposób użytkowania (land use type)
-- e.g. "grunty orne", "pastwiska", "tereny mieszkaniowe", "lasy"
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS land_use TEXT;

-- §40 ust.4-6 pkt 8/7: dodatkowe informacje (additional info from notarial deed)
-- Free-text field that may contain: rok budowy, stan techniczny, materiał,
-- liczba kondygnacji, standard, and other details not in standardized columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Notarial deed reference (§40 ust.1 pkt 3)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deed_number TEXT;

-- =====================================================
-- Update transactions_in_view to return new fields
-- =====================================================
CREATE OR REPLACE FUNCTION transactions_in_view(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  prop_type TEXT DEFAULT NULL,
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
    AND (date_from IS NULL OR t.transaction_date >= date_from)
    AND (date_to IS NULL OR t.transaction_date <= date_to)
    AND (prop_type IS NULL OR t.property_type = prop_type)
  ORDER BY t.transaction_date DESC
  LIMIT max_results;
$$;
