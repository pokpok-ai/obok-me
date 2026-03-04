# obok.me — TODO

## Done (2026-03-03)

### Phase 1 — Data & Filters
- [x] Verified function_type backfill is complete (168K rows, zero NULLs)
- [x] Merged biurowa (250) + produkcyjna (10) into inne in DB
- [x] Removed stale "gospodarcza"/"uzytkowa" from TransactionInfoWindow.tsx
- [x] Removed stale type colors from TransactionMarkers.tsx
- [x] Cleaned up FilterBar.tsx typeColors/typeLabels (4 types only)
- [x] Fixed 500 errors: anon role statement_timeout 3s → 8s
- [x] Added partial index idx_transactions_apt_lat_lng
- [x] Default filter set to "Mieszkalna" (src/app/page.tsx)
- [x] Created persistent RCN data reference (memory/rcn-data-reference.md)
- [x] All changes committed & pushed to main (auto-deployed to Vercel)

### UI Polish
- [x] Added footer: open source non-commercial notice + ceo@xclv.com contact
- [x] Made Analityka sidebar toggle label larger (text-xs, font-semibold)
- [x] Moved LocateMe button to bottom-left (was overlapping Google Maps zoom controls)
- [x] Restored Google Maps default UI (zoom controls etc.)

### Phase 2 — Core Analytics
- [x] Price heatmap layer (HeatmapLayer.tsx + toggle button)
- [x] SQL: `heatmap_points()` — lat/lng/weight, limit 5000
- [x] Price forecast — linear regression, 5-month projection on PriceTrendChart
- [x] Market gauge — react-gauge-component with signal badge + forecast text
- [x] Market score computation (price trend 50%, YoY 30%, volume 20%)
- [x] SQL: `warsaw_wide_stats()` — city-wide avg/median
- [x] Warsaw comparison card (viewport avg vs city avg with % diff) — KEPT
- [x] Volume sparkline card
- [x] Card-based sidebar redesign — large text, gaps, ZipSmart-style hierarchy
- [x] All existing ANALIZA tabs preserved (Pietro, Pokoje, Metraz, Wolumen, Strony)

**Decision: Keep Warsaw comparison card** — useful when zoomed into neighborhoods (e.g. Wilanow +10% vs city avg)

## Done (2026-03-04)

### Phase 3 — External Data & Demographics
- [x] GUS BDL API integration — correct unit ID `071412865000` (Warsaw powiat)
- [x] GUS variables: population (72305), salary (64428), unemployment rate % (60270), crime total (58559), crime per 1000 (398594)
- [x] NBP interest rates — hardcoded fallback (XML fetch fails on Vercel), referencyjna 5.75%
- [x] Demographics letter grades (A/B/C/D/F) — ZipSmart-style color-coded cards
- [x] Scoring benchmarks: crime/1000, salary PLN, unemployment %, price-to-income ratio
- [x] DemographicsGrid rewritten: grades + rates (not raw counts)
- [x] AffordabilityCard: mortgage calculator (annuity formula) + buy vs rent comparison
- [x] Price-to-income ratio computed from viewport avg price + GUS salary
- [x] Buy vs Rent: mortgage (NBP ref rate + 1.7% margin) vs Warsaw avg rent (85 PLN/m²)
- [x] Salary percentage bar (rata vs pensja brutto)

**Key findings during implementation:**
- GUS unit `146500000000` does NOT exist — correct Warsaw powiat is `071412865000`
- GUS provides crime rate per 1000 (var 398594) and unemployment rate % (var 60270) directly — no need to compute from raw counts
- Salary data only available at powiat level (5), not gmina level (6)
- NBP has NO JSON API for interest rates — only XML at `static.nbp.pl`, which fails server-side on Vercel
- Rates unchanged since Oct 2023 — hardcoded fallback is fine

### Address Search
- [x] AddressSearch component — Google Places Autocomplete, Warsaw-biased, Poland-restricted
- [x] Lifted APIProvider from MapContainer to page.tsx (so FilterBar can use Places library)
- [x] MapContainer: added zoom prop for controlled zoom on place selection
- [x] FilterBar: search field between function type buttons and date range
- [x] On address select → map zooms to street level (zoom 16)

## Done (2026-03-04) — Phase 4: Smart Intelligence

### 4.1 Smart Comps (auto-find similar nearby transactions)
- [x] SQL function `nearby_comparable_transactions` — PostGIS ST_DWithin, rooms ±1, area ±30%, last 24 months, radius 1km
- [x] Component `ComparableTransactions.tsx` — overlay panel with source reference card + comp list (price diff %, distance, area, rooms, floor, date)
- [x] Trigger: "Porownaj z podobnymi" button in TransactionInfoWindow (only when price_per_sqm exists)
- [x] Wired via onCompare prop through TransactionMarkers → page.tsx state

### 4.2 District Rankings (18 Warsaw dzielnice)
- [x] SQL function `district_rankings` — 18 bounding boxes as VALUES table, grouped stats, HAVING count≥10
- [x] Component `DistrictRankings.tsx` — horizontal bar chart, color-coded (green→red), % vs Warsaw avg
- [x] Click district → map pans + zooms to district center (zoom 14)
- [x] Rendered as card in AnalyticsSidebar (after MarketFactors, before section tabs)

### 4.3 Price Estimation for Address
- [x] SQL function `estimate_price_at_point` — plpgsql with widening radius (500→1000→2000m), p20/median/p80/avg
- [x] Component `PriceEstimateCard.tsx` — overlay after address search with range bar, confidence indicator, total price
- [x] Triggered automatically on address search (handlePlaceSelect sets priceEstimate state)
- [x] Close button to dismiss

**Key decisions:**
- Districts defined by bounding boxes (not address parsing — addresses have no district name)
- Comps filter: ±1 room, ±30% area, last 24 months, 1km radius, max 6 results
- Price estimate uses widening radius fallback (min 5 comps), confidence: high (≥50), medium (≥20), low (<20)

## Future — Phase 5
- [ ] PDF report export
- [ ] AI summary (Claude API)

## Known Issues
- Build fails on `npm run build` due to Google Fonts fetch error (network issue, not code)
- DB has 168K of 319K Warsaw parquet rows (~151K dropped: no geometry or no price)
- Google Maps API key doesn't allow localhost — test on production (obok.me)
- NBP XML rates: hardcoded fallback — update manually if RPP changes rates
