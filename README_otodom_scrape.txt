Otodom scrape package

Files
- otodom_scraper_local.py : local-ready scraper
- otodom_offers_import_template.xlsx : import-ready workbook structure

Quick run
1. Install:
   pip install requests beautifulsoup4 openpyxl

2. Run:
   python otodom_scraper_local.py --search-url "https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/warszawa" --max-pages 50 --output-prefix otodom_warszawa

3. Import:
   Open the generated XLSX directly in Excel or import the CSV/XLSX into Google Sheets.

Notes
- This environment could not complete a live Otodom scrape.
- If selectors break, update:
  SEARCH_LINK_SELECTOR
  DESCRIPTION_SELECTOR
  TOP_TABLE_SELECTOR
