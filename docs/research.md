# obok.me — Data Sources Research

## RCN Is Now Free (Since 13 February 2026)

Amendment to *Prawo geodezyjne i kartograficzne* (passed 26 Sep 2025) abolished all fees for RCN access.
Contains **real transaction prices** from notarial deeds — not asking prices.
~320 out of 380 powiat-level registries available online. ~700K transactions/year. Data from July 2021+.

**Caveat**: Lag of several months to 24 months between transaction date and RCN appearance.

---

## Primary Data Sources

### 1. Geoportal.gov.pl — Nationwide RCN Download

| Feature | Details |
|---|---|
| Interactive map | https://www.geoportal.gov.pl/mapy/rejestr-cen-nieruchomosci/ |
| WMS/WFS service | `https://mapy.geoportal.gov.pl/wss/service/rcn` |
| Bulk download | "Pobierz dane" → "Dane powiatowe" → "Transakcje" |
| Formats | GeoParquet (national/voivodeship), GeoPackage (voivodeship/powiat) |
| KICN WMS | `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaCenNieruchomosci` |

**Data fields**: transaction price (gross), VAT amount, transaction date, notarial deed reference, property type, market type (primary/secondary), floor area, ancillary space area, building address, cadastral info, location geometry.

**Coordinates**: EPSG:2180 (Polish system) — must convert to WGS84 (EPSG:4326).

### 2. Warsaw City Portal — RCN Search Tool

- **Search tool**: https://mapa.um.warszawa.pl/rcn-szukaj/
- **GML bulk download**: https://architektura.um.warszawa.pl/udostepniane-dane-rcn1 (updated Feb 12, 2026)
- **REST API**: Warsaw's Biuro Geodezji i Katastru published a REST API
- **Old map**: https://mapa.um.warszawa.pl/mapaApp1/mapa?service=rciwn
- Filters: year (2018+), market type, property function, area range, price range
- Data back to 2010 for residential and land

### 3. dane.gov.pl — Open Data Portal

| Dataset | URL | Type |
|---|---|---|
| Developer price data | https://dane.gov.pl/en/dataset/7499 | Mandatory daily uploads since Sep 2025 |
| Daily transaction reports | https://dane.gov.pl/en/dataset/23051 | e.g. 2026-01-30 |
| Aggregated price reports | https://dane.gov.pl/pl/dataset/7668 | Latest: 15.02.2026 |
| Asking prices (for comparison) | https://dane.gov.pl/pl/dataset/5853 | Developer asking prices |

### 4. GUS BDL API — Statistical Data

- **API**: https://api.stat.gov.pl/Home/BdlApi
- Aggregated county/regional level (not individual transactions)
- Rate limits: Anonymous 5 req/sec, registered 10 req/sec
- License: CC BY 4.0

---

## Key URLs

| Service | URL |
|---------|-----|
| RCN Main Portal | https://www.rciwn.pl/ |
| RCN Geoportal Map | https://www.geoportal.gov.pl/mapy/rejestr-cen-nieruchomosci/ |
| KICN WMS | https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaCenNieruchomosci |
| RCN WMS/WFS | https://mapy.geoportal.gov.pl/wss/service/rcn |
| GUS BDL API | https://api.stat.gov.pl/Home/BdlApi |
| dane.gov.pl | https://dane.gov.pl/ |
| Warsaw RCN Search | https://mapa.um.warszawa.pl/rcn-szukaj/ |
| Warsaw GML Data | https://architektura.um.warszawa.pl/udostepniane-dane-rcn1 |

---

## News Sources

- https://blog.ongeo.pl/news-rejestr-cen-nieruchomosci-za-darmo-od-13-lutego-2026
- https://www.rp.pl/nieruchomosci/art43810951-ceny-transakcyjne-nieruchomosci-juz-jawne-rcn-otwarty-dla-wszystkich
- https://www.rmf24.pl/fakty/polska/news-rejestr-cen-nieruchomosci-otwarty-co-to-oznacza-dla-kupujacy,nId,8067053
- https://muratordom.pl/prawo/finanse/rejestr-cen-nieruchomosci-dostepny-dla-kazdego-to-rewolucja-na-rynku-bezplatny-dostep-do-cen-domow-mieszkan-i-dzialek-aa-e8nu-QojC-1XV9.html
- https://www.prawo.pl/biznes/rejestr-cen-nieruchomosci-juz-bezplatny,1538708.html
- https://forsal.pl/nieruchomosci/aktualnosci/artykuly/10643729,rzad-ujawnil-transakcyjne-ceny-mieszkan-koniec-tajemnicy.html
- https://tvn24.pl/biznes/nieruchomosci/rejestr-cen-nieruchomosci-geoportal-gov-pl-juz-nie-musimy-placic-za-ujawnienie-ceny-st8906603
- https://businessinsider.com.pl/nieruchomosci/darmowy-dostep-do-cen-mieszkan-jak-dziala-rejestr-cen-nieruchomosci/mcwwb0l

---

## Future: DOM Portal (Q1 2027)

- Portal Danych o Obrocie Mieszkaniami (Housing Transaction Data Portal)
- Operator: Ubezpieczeniowy Fundusz Gwarancyjny
- Budget: ~44M PLN
- Features: searchable database, developer history, buyer protection
- Source: https://forsal.pl/kraj/aktualnosci/artykuly/10633145,powstaje-rzadowy-portal-nieruchomosci-sprawdzisz-ceny-rynkowe-oraz-historie-dewelopera.html

---

## Timeline

- Sep 11, 2025: Developers mandated to publish daily prices on dane.gov.pl
- Nov 1, 2025: President signs law eliminating RCN access fees
- Nov 12, 2025: Amendment published in Official Journal
- Dec 2025: DOM Portal contractor selected (Eviden, 44M PLN)
- **Feb 13, 2026: FREE public access to RCN begins**
- Q1 2027: DOM Portal expected launch
