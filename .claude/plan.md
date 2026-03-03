# obok.me — ZipSmart Replication Plan

## Project State (as of 2026-03-03)

### What's Done (Phase 1)
- [x] SQL functions use `lat/lng BETWEEN` (not broken `location` column)
- [x] All SQL functions hardcode `property_type = 'apartment'`
- [x] All SQL functions accept `func_type TEXT DEFAULT NULL` param
- [x] `DROP FUNCTION` before `CREATE OR REPLACE` (signature changes)
- [x] Filters: `propertyType` → `functionType` across types, api, page, FilterBar
- [x] FilterBar shows: Wszystkie / Mieszkalna / Garaz / Handlowo-usl. / Inne
- [x] Map restricted to Warsaw (minZoom=10, restriction bounds 52.05-52.45, 20.75-21.35)
- [x] InsightsPanel.tsx deleted (replaced by AnalyticsSidebar)
- [x] Supabase MCP installed globally
- [x] function_type backfill complete (168,211 rows, zero NULLs)
- [x] Merged biurowa + produkcyjna into inne (too few rows)
- [x] Removed stale "gospodarcza"/"uzytkowa" from UI (never existed in RCN lokale data)
- [x] Fixed anon role statement_timeout (3s → 8s) — was causing 500 errors on full viewport
- [x] Added partial index `idx_transactions_apt_lat_lng` for apartment queries
- [x] Default filter set to "Mieszkalna" (not "Wszystkie")
- [x] Added footer (open source non-commercial + ceo@xclv.com)
- [x] Enlarged Analityka sidebar toggle label
- [x] Moved LocateMe to bottom-left (no more overlap with Maps zoom controls)

### Final function_type set (4 values only)
| function_type | DB count | % |
|---|---|---|
| mieszkalna | 128,215 | 76.2% |
| garaz | 31,725 | 18.9% |
| inne | 5,604 | 3.3% |
| handlowoUslugowa | 2,667 | 1.6% |

### DB Stats
- 168,211 total rows (all `property_type = 'apartment'`, Warsaw only)
- 319K rows in parquet, ~151K lost on import (no geometry or no price)

---

## Phase 2 — Core Analytics (NEXT)

**RULE: Keep ALL existing ANALIZA functionality. Only ADD new features on top.**
**Reference: `.claude/zipsmart-analysis.md` for ZipSmart feature parity targets.**

### 2.1 Price Heatmap Layer
- NEW: `src/components/HeatmapLayer.tsx`
- Google Maps `google.maps.visualization.HeatmapLayer`
- Weight points by price_per_sqm, color: green (cheap) → red (expensive)
- Toggle button on map UI (bottom-left, near LocateMe)
- Modify: `src/app/page.tsx` — heatmap toggle state
- NEW SQL: `heatmap_points()` — returns lat/lng/price_per_sqm with higher limit (~5000) for density
- Needs: `libraries=["visualization"]` in Google Maps APIProvider

### 2.2 Simple Price Forecast
- NEW: `src/lib/forecast.ts` — linear regression on monthly price trends
- Project 5 months forward as dashed line on PriceTrendChart (matches ZipSmart's 5-month horizon)
- Modify: `src/components/PriceTrendChart.tsx` — forecast extension
- Data source: existing `PriceTrend[]` from `viewport_price_trends()` — has monthly avg_price_per_sqm

### 2.3 Market Categorization (NEW — inspired by ZipSmart)
- Classify viewport as: Rynek kupujacego / Rynek sprzedajacego / Rynek zrownowazony
- Compute from: volume trend (rising/falling) + price trend (rising/falling) + YoY change
- Display as badge/indicator in ViewportSummary section
- No new SQL needed — derive from existing priceTrends + volumeTrends + yoyChange

### 2.4 Enhanced Analytics Sidebar
- **Viewport vs Warsaw-wide comparison**: avg price/m² in viewport vs all-Warsaw average
  - NEW SQL: `warsaw_wide_stats()` — returns city-wide avg/median price_per_sqm (no viewport filter)
- Volume sparkline in summary section (mini chart from existing VolumeTrend data)
- Price distribution histogram (buckets from raw transaction prices in viewport)
- **Keep all existing tabs**: Price Trends, Floor, Rooms, Area, Volume, Parties, YoY badge

---

## Phase 3 — External Data

### 3.1 GUS BDL Demographics (FREE API)
- URL: https://api.stat.gov.pl/Home/BdlApi (REST, JSON, no auth)
- NEW: `src/lib/gus-api.ts`
- NEW: `src/components/DemographicsCard.tsx`
- Data: population, avg salary, unemployment by Warsaw district
- Calculate: price-to-income ratio

### 3.2 NBP Interest Rates (FREE API)
- NEW: `src/lib/nbp-api.ts`
- Display: reference rate in sidebar

---

## Phase 4 — Reports & AI

### 4.1 PDF Report
- NEW: `src/lib/pdf-report.ts` (jsPDF or browser print CSS)
- Downloadable viewport analytics PDF

### 4.2 AI Summary
- Send viewport stats to Claude API
- Return 2-3 sentence market summary in Polish

---

## Feature Feasibility Matrix

| Feature | Data Source | Status |
|---------|-----------|--------|
| Interactive map + markers | RCN + Google Maps | DONE |
| Price trends by viewport | RCN monthly aggregates | DONE |
| Volume trends | RCN transaction counts | DONE |
| Primary vs secondary market | `market_type` column | DONE |
| Floor/rooms/area analysis | RCN columns | DONE |
| Buyer/seller party analysis | RCN columns | DONE |
| YoY price change | RCN dates | DONE |
| Function type sub-filters | RCN `lok_funkcja` | DONE |
| Price heatmap | RCN lat/lng + price_per_sqm | Phase 2 |
| Price forecast | RCN trend regression | Phase 2 |
| Demographics | GUS BDL API | Phase 3 |
| Interest rates | NBP API | Phase 3 |
| PDF reports | Generated from analytics | Phase 4 |
| AI Q&A summary | Claude API | Phase 4 |
| Cap rate / Rental | No rental data | NOT POSSIBLE |
| Days on Market | No listing dates | NOT POSSIBLE |
| Real-time alerts | RCN is batch | NOT POSSIBLE |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `scripts/setup_db.sql` | Core SQL: transactions_in_view, viewport_stats |
| `scripts/setup_correlations.sql` | 7 analytics functions (price trends, floor, rooms, area, volume, parties, yoy) |
| `scripts/import_rcn.py` | RCN parquet → Supabase importer |
| `src/lib/api.ts` | All Supabase RPC calls |
| `src/hooks/useTransactions.ts` | Fetch transactions + stats for viewport |
| `src/hooks/useInsights.ts` | Fetch all 7 analytics datasets |
| `src/components/MapContainer.tsx` | Google Maps with Warsaw bounds restriction |
| `src/components/FilterBar.tsx` | Function type filters + date range |
| `src/components/TransactionMarkers.tsx` | Color-coded markers by price |
| `src/components/AnalyticsSidebar.tsx` | Tabbed analytics panel |
| `src/components/PriceTrendChart.tsx` | SVG sparkline for price trends |
| `src/components/LocateMe.tsx` | Geolocation button (bottom-left) |
