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

## Pending — Phase 2
- [ ] Price heatmap layer (HeatmapLayer.tsx)
- [ ] Price forecast (linear regression on PriceTrendChart)
- [ ] Enhanced analytics sidebar (district comparison, histogram)
- [ ] **RULE: Keep all existing ANALIZA functionality — only add new**

## Pending — Phase 3
- [ ] GUS BDL demographics integration
- [ ] NBP interest rates display

## Pending — Phase 4
- [ ] PDF report export
- [ ] AI summary (Claude API)

## Known Issues
- Build fails on `npm run build` due to Google Fonts fetch error (network issue, not code)
- DB has 168K of 319K Warsaw parquet rows (~151K dropped: no geometry or no price)
