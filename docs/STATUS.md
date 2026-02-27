# obok.me — Project Status

**Last updated:** 2026-02-27

## Completed

1. **Repository & Project Setup**
   - GitHub repo: `pokpok-ai/obok-me` (private)
   - Next.js 15 + TypeScript + Tailwind CSS 4
   - All frontend components built (MapContainer, TransactionMarkers, FilterBar, LocateMe, etc.)

2. **Supabase Database**
   - Project: `dxcmafwiuxorvxsqfdas.supabase.co` (org: OyeOye, project: obok.me)
   - PostGIS enabled, schema created (`setup_db.sql`)
   - RPC functions: `transactions_in_view`, `viewport_stats`
   - RLS: public read + public insert policies
   - Indexes: GIST spatial, date, property_type

3. **Data Pipeline**
   - GeoParquet files downloaded from geoportal.gov.pl (national RCN data)
   - Import script: `scripts/import_rcn.py` — REST API based (ports 5432/6543 blocked by network)
   - Handles Point (lokale), Polygon (budynki/dzialki) WKB geometries
   - TERYT filter for city-level imports (`--teryt=1465` for Warsaw)

4. **Warsaw Data Import (TERYT=1465)**
   - Apartments (lokale): **168,211 rows** — 18s, 0 errors
   - Houses (budynki): **316,921 rows** — 22s, 0 errors
   - Plots (dzialki): **679,046 rows** — 48s, 0 errors
   - **Total: 1,164,178 Warsaw transactions**

## Pending / Blocked

### BLOCKER: `location` column is NULL
- The REST API can't call PostGIS functions, so `location` (GEOGRAPHY) is not populated
- Spatial queries (`transactions_in_view`) return empty results until this is fixed
- **Failed attempts:**
  - Single UPDATE on 1.16M rows — timed out
  - DO $$ PL/pgSQL loop with 50K batches — also timed out (Supabase kills the whole statement)
- **Fix:** Run this SQL manually in Supabase SQL Editor, hitting Run repeatedly:

```sql
UPDATE transactions
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE id IN (
  SELECT id FROM transactions
  WHERE location IS NULL AND lat IS NOT NULL
  LIMIT 20000
);
```

  - Run repeatedly until "0 rows affected" (~58 runs for 1.16M rows)
  - Each run takes a few seconds
  - Alternative: upgrade to Supabase Pro for longer statement timeout, or connect directly via VPN

### TODO
- [ ] Populate `location` column (see blocker above)
- [ ] Get Google Maps API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` empty)
- [ ] Get Google Maps Map ID (`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` empty)
- [ ] Test frontend with live data
- [ ] Commit code to GitHub
- [ ] Deploy to Vercel
- [ ] Configure obok.me domain DNS -> Vercel
- [ ] Restrict Google Maps API key to obok.me domain

## Known Issues & Failures

### Network: DB ports blocked
- Direct PostgreSQL connections (ports 5432, 6543) are blocked by the local network
- Workaround: all imports use Supabase REST API over HTTPS (port 443)
- This means we can't use `sqlalchemy`, `psycopg2`, or `COPY` for bulk inserts

### Failed: All-Poland import
- First attempt imported all of Poland (~2M apartments) before user requested Warsaw-only
- Parallel imports of budynki + dzialki (5M + 8M rows) caused Supabase free tier throttling
- Statement timeouts (57014) and 502 errors at ~5-10% rate
- **Resolution:** Cleared DB, re-imported Warsaw only (1.16M rows, 0 errors)

### Old test rows
- 3 test rows (ids 2,3,4) from initial testing have raw (uncleaned) addresses
- 1 test row (id 5, property_type="test") was deleted
- These should be cleaned up after location column is populated

### GeoParquet quirks
- `dok_data` column has malformed timezone (`tz=-24:30`) in lokale file — fixed by casting to `pa.timestamp("ms")`
- Lokale uses Point geometry, budynki/dzialki use Polygon geometry
- ~44% of lokale rows have NULL geometry (row groups 0-23)
- Budynki: 79/123 row groups have geometry
- Dzialki: similar pattern

## File Locations

### Downloaded Data (not in git)
- `data/0_transakcje_ceny_lokale.parquet` — 215MB, 3.5M rows (national apartments)
- `data/0_transakcje_ceny_budynki.parquet` — 560MB, 5.1M rows (national houses)
- `data/0_transakcje_ceny_dzialki.parquet` — 981MB, 8.3M rows (national plots)
- Source: `https://opendata.geoportal.gov.pl/InneDane/latest_exports/rcn_transakcje_ceny/PARQUET/`

### Environment
- `.env.local` — Supabase URL, anon key, DB password, DB URL
- Google Maps keys: **NOT YET SET**

### Key Scripts
- `scripts/import_rcn.py` — GeoParquet -> Supabase REST API import
- `scripts/setup_db.sql` — Database schema, indexes, RPC functions
- `scripts/requirements.txt` — Python dependencies

## Architecture Decisions

1. **REST API for imports** (not direct SQL) — network ports blocked
2. **Warsaw only** (TERYT=1465) — user requested, reduces data to 1.16M rows
3. **Batch size 500** for REST API — balances throughput vs. reliability
4. **6 parallel workers** for HTTP POSTs — good throughput without overwhelming free tier
5. **Polygon centroid** for budynki/dzialki — WKB polygon first-ring average as point location
