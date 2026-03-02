# Data Enrichment & Correlations Plan

Reference: [ZipSmart.ai](https://www.zipsmart.ai/) — AI-driven real estate analytics platform with price forecasts, demographic overlays, and market indicators.

## Current Data Points (from RCN GeoParquet)

We already import **22 fields** per transaction:

| Field | Source | Coverage |
|-------|--------|----------|
| price | RCN | ~100% |
| price_per_sqm | Calculated | where area available |
| transaction_date | RCN | ~100% |
| property_type | Filename | 100% |
| market_type | RCN (tran_rodzaj_rynku) | partial |
| area_sqm | RCN (lok/bud/dzi) | ~80% |
| rooms | RCN (lok/bud_liczba_izb) | apartments ~70% |
| floor | RCN (lok_nr_kond) | apartments ~60% |
| address | RCN (lok/bud/dzi_adres) | ~90% |
| transaction_type | RCN (tran_rodzaj_trans) | partial |
| seller_type | RCN (tran_sprzedajacy) | partial |
| buyer_type | RCN (tran_kupujacy) | partial |
| property_right | RCN (nier_prawo) | partial |
| share_fraction | RCN (nier_udzial) | partial |
| function_type | RCN (lok_funkcja) | apartments |
| apartment_number | RCN (lok_nr_lokalu) | apartments |
| ancillary_area_sqm | RCN (lok_pow_przyn) | partial |
| land_area_sqm | RCN (nier_pow_gruntu) | plots/houses |
| vat_amount | RCN (lok_vat/tran_vat) | partial |
| lat/lng | RCN geometry | 100% |
| powiat (TERYT) | RCN | 100% |

## Phase 1: Correlations from Existing Data (No External APIs)

SQL-computed analytics from the 1.16M transactions already in the database:

### 1. Price Trend Over Time
- Monthly avg/median price per m² for the current viewport
- Shows price movement and seasonality
- Compare primary vs secondary market trends

### 2. Floor Premium Analysis
- Average price/m² by floor number
- Shows the "golden floor" premium (typically floors 3-6)
- Ground floor and top floor price differentials

### 3. Room Count vs Price
- Avg price/m² by number of rooms (1-room, 2-room, 3-room, 4+)
- Shows which unit types command premiums

### 4. Area Size Distribution
- Price/m² buckets by area ranges (< 30m², 30-50m², 50-70m², 70-100m², 100m²+)
- Shows economy-of-scale effects

### 5. Market Type Spread
- Primary vs secondary market price gap over time
- Developer premium tracking

### 6. Transaction Volume Trends
- Monthly transaction count — market liquidity indicator
- Volume spikes/drops correlate with market cycles

### 7. Buyer/Seller Type Analysis
- Who is buying: individuals vs companies vs government
- Average prices by buyer/seller type

## Phase 2: External Data Enrichment

### GUS BDL API (free, CC BY 4.0)
- **Endpoint**: https://bdl.stat.gov.pl/api/v1/
- **Granularity**: powiat (county) and gmina (municipality) level
- **Data available**:
  - Unemployment rate by district
  - Average wages/income
  - Population density & demographics
  - Education levels
  - Migration data (net inflows/outflows)
  - Housing stock statistics

### Warsaw Open Data (api.um.warszawa.pl)
- Public transport stops & metro stations
- Schools and kindergartens
- Parks and green areas
- Infrastructure projects

### OpenStreetMap / Overpass API
- POI density (shops, restaurants, pharmacies)
- Distance to nearest metro/tram
- Green space percentage

### dane.gov.pl
- Developer mandatory price disclosures (dataset 7499)
- Asking prices vs transaction prices comparison
- Daily transaction reports (dataset 23051)

## Phase 3: Predictive Analytics (Future)

- Price forecasting using historical trends
- Market cycle detection (buyer's/seller's market)
- Investment opportunity scoring
- Rental yield estimation (when rent data available)
