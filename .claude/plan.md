# obok.me — ZipSmart Replication Plan

## Project State (as of 2026-03-04)

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

### What's Done (Phase 2) ✅
- [x] **Heatmap layer** — `HeatmapLayer.tsx` + `useHeatmap.ts` + toggle button (flame icon)
- [x] **SQL: `heatmap_points()`** — returns lat/lng/weight, limit 5000
- [x] **Price forecast** — `forecast.ts` linear regression, 5-month dashed line on chart
- [x] **Market gauge** — `MarketGauge.tsx` using `react-gauge-component` (dynamic import, ssr:false)
- [x] **Market score** — `market-score.ts` composite 0-100 (price 50%, YoY 30%, volume 20%)
- [x] **SQL: `warsaw_wide_stats()`** — city-wide avg/median (no viewport filter)
- [x] **Warsaw comparison card** — viewport avg vs city avg with bars + % diff
- [x] **Volume sparkline card** — last 12 months mini chart
- [x] **Card-based sidebar** — redesigned with large text, rounded-2xl cards, gaps, clear hierarchy
- [x] **Forecast text** — gauge shows Polish sentence ("Do sierpnia prognozujemy...")
- [x] **All existing tabs preserved** — Pietro, Pokoje, Metraz, Wolumen, Strony

### Phase 2 Decisions
- **Warsaw comparison card: KEPT** — useful when zoomed into a neighborhood (shows +10% in Wilanow etc.)
- **Gauge library: react-gauge-component** — user said "use some UI library, do not invent gauge"
- **R² threshold: 0.01** (was 0.1, too strict — forecast wasn't showing)
- **Sidebar style: ZipSmart reference** — card-based, large text, proper hierarchy, bg-gray-50 between cards
- **Sidebar width: 440px** (was 420px)

### What's Done (Phase 3) ✅
- [x] **GUS BDL API** — correct unit `071412865000` (Warsaw powiat, level 5)
- [x] **GUS variables**: population (72305), salary (64428), unemployment rate % (60270), crime total (58559), crime per 1000 (398594)
- [x] **NBP interest rates** — hardcoded fallback (5.75% ref, 6.25% lombard, 5.25% deposit)
- [x] **Demographics scoring** — `demographics-scoring.ts` with letter grades (A/B/C/D/F)
- [x] **DemographicsGrid rewrite** — color-coded graded cards (not raw counts)
- [x] **AffordabilityCard** — mortgage calculator + buy vs rent + salary % bar
- [x] **InterestRateCard** — hero reference rate + key NBP rates

### Phase 3 Decisions
- **GUS unit ID: `071412865000`** (Warsaw powiat) — NOT `146500000000` which doesn't exist
- **Use GUS-provided rates** — unemployment % (var 60270) and crime/1000 (var 398594) come directly from GUS, no computation needed
- **Salary at powiat level only** — var 64428 has no data at gmina level (6), only powiat (5)
- **NBP: hardcoded fallback** — XML at `static.nbp.pl` fails on Vercel, rates unchanged since Oct 2023
- **Crime grading per 1000** — A<15, B<20, C<30, D<40, F>40 (Warsaw ~27 = C)
- **Salary grading** — A>9000, B>7500, C>6000, D>5000 (Warsaw 10,715 = A)
- **Warsaw avg rent: 85 PLN/m²/month** — hardcoded from NBP quarterly data
- **Bank margin: 1.7%** above NBP reference rate for mortgage calc

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

## Phase 4 — Reports & AI (NEXT)

**RULE: Keep ALL existing ANALIZA functionality. Only ADD new features on top.**

### 4.1 PDF Report
- NEW: `src/lib/pdf-report.ts` (jsPDF or browser print CSS)
- Downloadable viewport analytics PDF
- Include: key stats, price trend, market gauge, demographics grades, affordability

### 4.2 AI Summary
- Send viewport stats to Claude API
- Return 2-3 sentence market summary in Polish
- Display in a card above the section tabs

---

## Feature Feasibility Matrix

| Feature | Data Source | Status |
|---------|-----------|--------|
| Interactive map + markers | RCN + Google Maps | ✅ DONE |
| Price trends by viewport | RCN monthly aggregates | ✅ DONE |
| Volume trends | RCN transaction counts | ✅ DONE |
| Primary vs secondary market | `market_type` column | ✅ DONE |
| Floor/rooms/area analysis | RCN columns | ✅ DONE |
| Buyer/seller party analysis | RCN columns | ✅ DONE |
| YoY price change | RCN dates | ✅ DONE |
| Function type sub-filters | RCN `lok_funkcja` | ✅ DONE |
| Price heatmap | RCN lat/lng + price_per_sqm | ✅ DONE |
| Price forecast | RCN trend regression | ✅ DONE |
| Market gauge + signal | RCN trends composite | ✅ DONE |
| Warsaw comparison | viewport avg vs city avg | ✅ DONE |
| Card-based sidebar | ZipSmart-style UI | ✅ DONE |
| Demographics (population, salary, crime, unemployment) | GUS BDL API | ✅ DONE |
| Letter grades (A/B/C/D/F) | GUS benchmarks | ✅ DONE |
| Crime rate per 1000 | GUS BDL var 398594 | ✅ DONE |
| Unemployment rate % | GUS BDL var 60270 | ✅ DONE |
| Interest rates | NBP (hardcoded fallback) | ✅ DONE |
| Price-to-Income ratio | GUS salary + RCN price | ✅ DONE |
| Mortgage affordability | NBP rate + viewport price | ✅ DONE |
| Buy vs Rent | Mortgage vs NBP avg rent | ✅ DONE |
| PDF reports | Generated from analytics | Phase 4 |
| AI Q&A summary | Claude API | Phase 4 |
| Shadow Inventory | No listing data | ❌ NOT POSSIBLE |
| Days on Market | No listing dates | ❌ NOT POSSIBLE |
| Real-time alerts | RCN is batch | ❌ NOT POSSIBLE |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `scripts/setup_db.sql` | Core SQL: transactions_in_view, viewport_stats, heatmap_points, warsaw_wide_stats |
| `scripts/setup_correlations.sql` | 7 analytics functions (price trends, floor, rooms, area, volume, parties, yoy) |
| `scripts/import_rcn.py` | RCN parquet → Supabase importer |
| `src/lib/api.ts` | All Supabase RPC calls |
| `src/lib/forecast.ts` | Linear regression + 5-month price forecast |
| `src/lib/market-score.ts` | Market score (0-100) + signal labels |
| `src/lib/demographics-scoring.ts` | Letter grades (A-F) + mortgage calc + benchmarks |
| `src/lib/gus-api.ts` | GUS BDL client + helpers (latestValue, yoyChange) |
| `src/lib/nbp-api.ts` | NBP rates client + formatRateName |
| `src/hooks/useTransactions.ts` | Fetch transactions + stats for viewport |
| `src/hooks/useInsights.ts` | Fetch all analytics + Warsaw stats |
| `src/hooks/useHeatmap.ts` | Fetch heatmap points (only when enabled) |
| `src/hooks/useExternalData.ts` | Fetch NBP rates + GUS demographics |
| `src/app/api/gus/route.ts` | GUS BDL proxy (unit 071412865000, 5 variables) |
| `src/app/api/nbp/rates/route.ts` | NBP rates proxy (XML parse + hardcoded fallback) |
| `src/components/MapContainer.tsx` | Google Maps with Warsaw bounds restriction |
| `src/components/FilterBar.tsx` | Function type filters + date range |
| `src/components/TransactionMarkers.tsx` | Color-coded markers by price |
| `src/components/HeatmapLayer.tsx` | Google Maps visualization heatmap |
| `src/components/MarketGauge.tsx` | Semicircular gauge + forecast text |
| `src/components/AnalyticsSidebar.tsx` | Card-based analytics panel (ZipSmart style) |
| `src/components/PriceTrendChart.tsx` | SVG chart with forecast dashed line |
| `src/components/InterestRateCard.tsx` | NBP reference rate + key rates |
| `src/components/DemographicsGrid.tsx` | Letter-graded demographic cards (2x3 grid) |
| `src/components/AffordabilityCard.tsx` | Mortgage calc + buy vs rent + salary % |
| `src/components/LocateMe.tsx` | Geolocation button (bottom-left) |
