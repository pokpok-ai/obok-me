-- obok.me — District Statistics Table for GUS BDL Enrichment Data
-- Run this in Supabase SQL Editor after setup_db.sql

-- =============================================================
-- Table: district_stats — demographic/economic data per powiat
-- Populated by scripts/enrich_gus_bdl.py
-- =============================================================
CREATE TABLE IF NOT EXISTS district_stats (
  id BIGSERIAL PRIMARY KEY,
  teryt TEXT UNIQUE NOT NULL,          -- TERYT code (powiat)
  name TEXT,                           -- District name

  -- Demographics
  population INTEGER,
  population_density NUMERIC,          -- persons/km²
  net_migration_per_1000 NUMERIC,      -- net migration rate

  -- Economy
  unemployment_rate NUMERIC,           -- %
  avg_monthly_wage NUMERIC,            -- PLN

  -- Housing
  dwellings_completed INTEGER,         -- new dwellings per year

  -- Metadata
  data_year INTEGER,                   -- year of the statistics
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_district_stats_teryt
  ON district_stats (teryt);

-- =============================================================
-- RLS: public read access
-- =============================================================
ALTER TABLE district_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON district_stats;
CREATE POLICY "Public read access"
  ON district_stats FOR SELECT
  USING (true);
