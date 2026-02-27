# obok.me

Real estate transaction prices on a map. Shows actual deal prices from Poland's RCN (Rejestr Cen Nieruchomosci) — the national register of property transaction prices that became free on February 13, 2026.

## Features

- Google Maps with clustered price markers
- Filter by date range and property type
- "Near me" geolocation
- Viewport aggregate statistics (avg price/m2, transaction count)
- Data from official notarial deeds (real prices, not asking prices)

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Maps**: @vis.gl/react-google-maps, @googlemaps/markerclusterer
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Data**: GeoParquet from geoportal.gov.pl

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your keys
2. `npm install`
3. `npm run dev`

### Data Import

1. Download GeoParquet/GeoPackage from [geoportal.gov.pl](https://www.geoportal.gov.pl) -> "Pobierz dane" -> "Transakcje"
2. Set up Supabase project and run `scripts/setup_db.sql`
3. Import data:

```bash
cd scripts
pip install -r requirements.txt
python import_rcn.py path/to/data.parquet
```

## Data Sources

- **RCN**: geoportal.gov.pl — real transaction prices from notarial deeds
- **WMS/WFS**: mapy.geoportal.gov.pl/wss/service/rcn
- **Warsaw**: mapa.um.warszawa.pl/rcn-szukaj/
- **dane.gov.pl**: developer disclosure data
