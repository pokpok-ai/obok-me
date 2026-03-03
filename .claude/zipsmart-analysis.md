# ZipSmart.ai — Feature & UI/UX Analysis

**Reference for obok.me Phase 2+ development**

## Platform Overview
- US-based AI real estate analytics (zipsmart.ai)
- Founded 2016, 50+ employees, $10M+ raised
- 150M+ properties, 27K+ zip codes, 50 states
- 24-hour data refresh, ML-powered predictions
- Mapbox + OpenStreetMap, ChatGPT integration

---

## Core Features

### Map Features
- Interactive forecast map with colored overlays
- **Data heatmaps**: past, current, future trends (sales rates, price/sqm, population density)
- Filterable map layers
- Market categorization overlay (balanced/seller/buyer zones)
- Buy/sell signal indicators on map
- Zoom from national → zip code level
- **Data layer overlays**: POI, noise, transport, education, crime, demographics

### Analytics (18+ indicators)
1. Listing price MoM % change
2. 12 months price history
3. **5-month price forecast** (ML, accuracy within 5%)
4. Supply & Demand trends
5. Rent trends
6. Price-to-Income ratio
7. Unemployment rate
8. Mortgage qualification %
9. Higher education %
10. Owner occupancy %
11. Household income
12. Poverty rate
13. Vacancy rate
14. Crime rate
15. Cap rates
16. Monthly/Yearly trend indicators
17. Buy vs Rent analysis
18. REO/Foreclosure predictions

### Specialized Tools
- Mortgage Rate Predictor
- Real Estate Sentiment Gauge (public perception)
- Rental Analysis
- Client-ready PDF reports (one-click)
- CRM integrations (Salesforce, HubSpot, Zoho)
- API access (enterprise tier)
- Natural language Q&A (ChatGPT)

### Filters
- Geographic: zip, county, state, address
- Inventory levels
- Median Days on Market
- Sale inventory (sold properties)
- Unemployment rates
- Price cuts
- Market category (balanced/seller/buyer)

---

## UI/UX Assessment

### Layout
- Dashboard-first with interactive map as primary view
- Data-rich interface — can feel overwhelming for beginners
- Multiple data panels alongside map
- Top-level search by address/zip/county/state

### Panels
1. **Market Overview**: category (balanced/seller/buyer), sentiment gauge
2. **Price Analytics**: current pricing, MoM changes, 12-month history, 5-month forecast
3. **Supply & Demand**: inventory levels, days on market, price cuts
4. **Demographics**: income, education, unemployment, poverty, vacancy
5. **Rental**: rent trends, buy vs rent, cap rates
6. **Forecast**: AI predictions with confidence levels
7. **Mortgage**: rate predictor, qualification %

### UX Feedback (from reviews)
- Pro: "Feels like having a personal assistant"
- Pro: Setup described as "a breeze"
- Con: "Dashboard is data-rich but difficult to understand"
- Con: "Constant app crashes during peak usage"
- Con: "Beginners found indicators overwhelming"

---

## Mapping to obok.me

### Already Done (Phase 1)
| ZipSmart Feature | obok.me Status |
|---|---|
| Interactive map + markers | DONE |
| Price trends (12mo history) | DONE (PriceTrendChart) |
| Volume trends | DONE (VolumeTrend) |
| Primary vs secondary market | DONE (market breakdown) |
| Floor/rooms/area analysis | DONE (3 tabs) |
| Buyer/seller party analysis | DONE (Strony tab) |
| YoY price change | DONE (YoY badge) |
| Function type sub-filters | DONE (4 types) |
| Date range filter | DONE |

### Phase 2 — Feasible with Current Data
| ZipSmart Feature | obok.me Plan | Data Source |
|---|---|---|
| Price heatmap | HeatmapLayer.tsx | RCN lat/lng + price_per_sqm |
| 5-month price forecast | Forecast on PriceTrendChart | Linear regression on PriceTrend[] |
| Market categorization (buyer/seller/balanced) | New indicator in sidebar | Compute from supply/demand trends |
| **Market Sentiment Gauge** (visual dial/meter) | SVG gauge in ViewportSummary | Composite score from price trend + volume trend + YoY change |
| Price distribution histogram | New chart in sidebar | Raw transaction prices in viewport |
| Volume sparkline in summary | Add to ViewportSummary | Existing VolumeTrend data |
| Viewport vs Warsaw-wide comparison | New stat card | New SQL function for Warsaw-wide avg |

### Phase 3 — Needs External Data
| ZipSmart Feature | obok.me Plan | Data Source |
|---|---|---|
| Price-to-Income ratio | DemographicsCard | GUS BDL (avg salary by district) |
| Unemployment rate | DemographicsCard | GUS BDL |
| Population density | DemographicsCard | GUS BDL |
| Interest rates display | NBP widget | NBP API (free) |

### Phase 4 — Advanced
| ZipSmart Feature | obok.me Plan | Data Source |
|---|---|---|
| PDF reports | pdf-report.ts | Generated from analytics |
| AI Q&A summary | Claude API | Viewport stats → Polish summary |

### NOT Possible (Missing Data)
| ZipSmart Feature | Why Not |
|---|---|
| Cap rate / Rental analysis | No Polish rental data in RCN |
| Days on Market | RCN has transaction dates only, no listing dates |
| Real-time alerts | RCN is quarterly batch data |
| Mortgage qualification % | US-specific metric |
| Crime/school/POI overlays | Separate data sources needed (OpenStreetMap possible for future) |
| Sentiment gauge (news/social) | Would need Polish news/social media API (but see Phase 2: we CAN build a data-driven gauge from RCN trends) |
| REO/Foreclosure predictions | Not applicable to Polish market |

---

## ZipSmart Forecast Panel — UI Reference (from screenshot)

### Header
- Location name (e.g. "Illinois") + **signal badge** ("STRONG SELL" in red pill) + weather icon
- **Time horizon tabs**: `Best` | `3 Mos.` | `6 Mos.` | `9 Mos.` | `12 Mos.`

### Semicircular Gauge (KEY VISUAL)
- **Semicircle dial** with color gradient:
  - Left = **Buyers Market** (deep red/orange) — labeled "Prices Drop"
  - Center top = **Balanced Market** (yellow-green transition) — labeled "Stable"
  - Right = **Sellers Market** (green) — labeled "Prices Increase"
- **Two indicators on the gauge**:
  - **Blue circle** = Current position (with blue needle)
  - **Pink/magenta circle** = Forecast position
- Legend below: `● Current` `● Forecast`

### Forecast Text (right of gauge)
- "**ZipSmart Forecast**"
- "By **August**, our algorithm projects a **11% market worsening for sellers** with **60% confidence**. Prices are likely to **stabilize**."
- Key: bold numbers, confidence %, directional language

### Bottom Panel (collapsible)
- "Zipsmart Forecast: Loading..." header with info icon + collapse arrow
- **Three tabs**: `Mtg Rates` | `ZMPI Trend` | `Rents`
- **Bar chart** under ZMPI Trend — declining bars showing market index over time
- "Market Conditions" section below

### Market Conditions Panel (from screenshot)
- **Header**: "Market Conditions" with collapse arrow
- **Tabs**: `Current Market` | `Housing Data` (selected) | `Growth Drivers` | `Decline Factors` | `Customize +`
- **3x2 grid of stat cards**, each card has:
  - Info icon (i) in top-right corner for tooltip/explanation
  - Large colored value centered (bold, prominent)
  - Label below in small gray text
- **Cards shown (Housing Data tab)**:
  - Crime Rate: **C+** (green — good)
  - Poverty: **8%** (teal — neutral)
  - Higher Education: **24%** (orange — warning)
  - Shadow Inventory: **12%** (orange)
  - Buy vs Rent: **16%** (orange)
  - Household Income: **$64K** (orange)
- Color coding: green = good, teal = neutral, orange = needs attention

**obok.me equivalent (Phase 3 — GUS BDL data)**:
- Tab: "Dane demograficzne" with similar 3x2 grid
- Available from GUS BDL API:
  - Populacja (population)
  - Sr. wynagrodzenie (avg salary) — equivalent of Household Income
  - Bezrobocie % (unemployment) — equivalent of Poverty
  - Wyksztalcenie wyzsze % (higher education)
  - Gestosc zaludnienia (population density)
  - Cena/dochod (price-to-income ratio) — computed from RCN price + GUS salary
- NOT available: Crime Rate, Shadow Inventory, Buy vs Rent (no rental data in Poland)

### Design Notes
- Clean white card with slight shadow over map
- Strong visual hierarchy: location → signal badge → gauge → forecast text
- Gauge is the hero element — immediately communicates market state
- Two-point gauge (current vs forecast) shows direction of change
- Color logic: RED = buyer (prices dropping = bad for sellers), GREEN = seller (prices rising)

---

### obok.me Implementation (Phase 2.3)

**SVG Gauge Component** (`src/components/MarketGauge.tsx`):
- Semicircular arc with gradient: red → yellow → green
- Blue needle + dot for current market state
- Optional pink dot for forecast (if Phase 2.2 forecast is done)
- Labels in Polish:
  - Left: "Rynek kupujacego" / "Ceny spadaja"
  - Center: "Zrownowazony" / "Stabilnie"
  - Right: "Rynek sprzedajacego" / "Ceny rosna"

**Signal Badge**:
- Compute from composite score (0-100):
  - 0-20: "SILNY ZAKUP" (strong buy, green)
  - 20-40: "ZAKUP" (buy, light green)
  - 40-60: "NEUTRALNY" (neutral, yellow)
  - 60-80: "SPRZEDAZ" (sell, orange)
  - 80-100: "SILNA SPRZEDAZ" (strong sell, red)
- Score derived from: price trend slope + volume trend + YoY change

**Placement**: In ViewportSummary section of AnalyticsSidebar, above stat cards

---

## Key Takeaways for Phase 2

1. **Heatmap is table stakes** — ZipSmart has multiple heatmap layers. We need at least price/sqm heatmap.
2. **Forecast is the hero feature** — Their 5-month forecast with "5% accuracy" is the main selling point. Even simple linear regression adds significant value.
3. **Market categorization** is low-effort, high-impact — classify viewport as buyer/seller/balanced based on volume + price trends.
4. **Don't overwhelm** — ZipSmart's biggest UX complaint is being too complex. Keep obok.me clean.
5. **PDF export** is expected by professionals — agents need shareable reports.
6. **Warsaw-wide comparison** adds context — "your area vs city average" is more useful than raw numbers alone.
