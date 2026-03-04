# obok.me

**Warsaw apartment market intelligence platform.** Real transaction prices on a map with analytics, forecasting, demographic insights, and affordability scoring — built for real estate professionals and apartment buyers.

Live at **[obok.me](https://obok.me)**

## Why obok.me?

Poland's RCN (Rejestr Cen Nieruchomosci) became publicly available on February 13, 2026. It contains **real transaction prices from notarial deeds** — not asking prices, not estimates. obok.me turns this raw government data into actionable market intelligence:

- **"Am I overpaying?"** — compare any neighborhood's prices to the Warsaw average
- **"Is this area safe?"** — letter-graded crime, unemployment, and salary metrics
- **"Can I afford it?"** — mortgage calculator with current NBP rates, salary comparison, buy vs rent analysis
- **"Where is the market heading?"** — price forecasts, volume trends, growth/decline factor analysis

## Features

### Interactive Map
- 168K+ apartment transactions on Google Maps with clustered price markers
- Color-coded by price tier (green = below average, red = above)
- Price heatmap layer toggle
- Warsaw-restricted viewport (zoom level 10+)
- Filter by date range and function type (mieszkalna, garaz, handlowo-uslugowa, inne)

### Market Analytics Sidebar
- **Key Stats** — average price/m², median, transaction count, price range
- **Warsaw Comparison** — viewport avg vs city-wide avg with visual bar and % difference
- **Market Gauge** — semicircular gauge showing buyer/seller market balance with Polish forecast text
- **Volume Sparkline** — monthly transaction volume with mini trend chart
- **Price Trend Chart** — monthly price history with 5-month linear regression forecast (dashed line)
- **Primary vs Secondary Market** — split with visual proportion bar

### External Data Integration
- **NBP Interest Rates** — reference rate (5.75%) with rate corridor visualization (depozytowa → referencyjna → lombardowa)
- **GUS Demographics** — letter-graded cards (A/B/C/D/F) with 12-year sparklines:
  - Bezpieczenstwo (crime rate per 1,000 residents)
  - Dochody (average gross salary)
  - Bezrobocie (registered unemployment rate %)
  - Dostepnosc (price-to-income ratio)
  - Populacja (with YoY trend)
- **Affordability Card** — monthly mortgage payment (annuity formula), semi-circular salary gauge (% of gross salary), buy vs rent comparison with proportional bars
- **Market Factors** — tabbed Growth Drivers / Decline Factors classifying metrics by their impact on prices (unemployment, crime, salary growth, interest rates, price trends)

### Detailed Analysis Tabs
- **Pietro** — price per m² by floor with horizontal bars
- **Pokoje** — price by number of rooms with average area and total price
- **Metraz** — price per m² by area brackets
- **Wolumen** — monthly transaction volume with average prices
- **Strony** — buyer/seller type breakdown (osoba fizyczna, osoba prawna, samorzad, skarb panstwa)

## Data Sources

| Source | Data | Format |
|--------|------|--------|
| **RCN** (Rejestr Cen Nieruchomosci) | 168K Warsaw apartment transactions — real prices from notarial deeds | GeoParquet via geoportal.gov.pl |
| **GUS BDL** (Bank Danych Lokalnych) | Population, salary, unemployment rate, crime statistics for Warsaw | REST JSON API (free, no auth) |
| **NBP** (Narodowy Bank Polski) | Interest rates (reference, lombard, deposit) | Hardcoded with XML fallback |

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4
- **Maps**: @vis.gl/react-google-maps, @googlemaps/markerclusterer
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Hosting**: Vercel (auto-deploy from main)
- **Analytics**: Custom SQL functions (viewport_stats, price_trends, heatmap_points, warsaw_wide_stats)
- **Forecasting**: Linear regression on monthly price trends
- **Scoring**: Letter grades based on Polish city benchmarks

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your keys
2. `npm install`
3. `npm run dev`

### Database Setup

1. Create a Supabase project
2. Run `scripts/setup_db.sql` (core tables + functions)
3. Run `scripts/setup_correlations.sql` (analytics functions)
4. Import data:

```bash
cd scripts
pip install -r requirements.txt
python import_rcn.py path/to/data.parquet
```

### Data Import

Download GeoParquet from [geoportal.gov.pl](https://www.geoportal.gov.pl) → "Pobierz dane" → "Transakcje"

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Main map + sidebar
│   └── api/
│       ├── gus/route.ts          # GUS BDL proxy (demographics)
│       └── nbp/rates/route.ts    # NBP interest rates proxy
├── components/
│   ├── MapContainer.tsx          # Google Maps (Warsaw bounds)
│   ├── AnalyticsSidebar.tsx      # Card-based analytics panel
│   ├── MarketGauge.tsx           # Semicircular market gauge
│   ├── PriceTrendChart.tsx       # SVG price chart + forecast
│   ├── DemographicsGrid.tsx      # Letter-graded demographic cards
│   ├── AffordabilityCard.tsx     # Mortgage + buy vs rent
│   ├── MarketFactors.tsx         # Growth/decline factor analysis
│   ├── InterestRateCard.tsx      # NBP rates with visual bars
│   └── HeatmapLayer.tsx          # Price heatmap overlay
├── lib/
│   ├── api.ts                    # Supabase RPC calls
│   ├── forecast.ts               # Linear regression
│   ├── market-score.ts           # Market score (0-100)
│   ├── demographics-scoring.ts   # Letter grades + benchmarks
│   ├── gus-api.ts                # GUS BDL client
│   └── nbp-api.ts                # NBP rates client
├── hooks/
│   ├── useTransactions.ts        # Map data fetching
│   ├── useInsights.ts            # Analytics data
│   ├── useHeatmap.ts             # Heatmap data
│   └── useExternalData.ts        # GUS + NBP data
└── scripts/
    ├── setup_db.sql              # Core SQL functions
    ├── setup_correlations.sql    # Analytics SQL
    └── import_rcn.py             # Data importer
```

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](LICENSE).

Free to use, share, and adapt for non-commercial purposes with attribution.

Copyright (c) 2026 Viktor Konovalov, pokpok.ai Co-Founder & CEO
