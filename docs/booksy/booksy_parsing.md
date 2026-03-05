# GOAL

Find all options how to get data form booksy, via api or not.

I want to see all salons (postition on map) and actual promotions and prices on booksy. Also check active boosted promotions

# DRAFT 
Booksy does not offer a public API, so there is no official way for third parties to query salon data, promotions, or prices programmatically. However, several alternative methods exist to access this data — ranging from ready-made scraping tools to reverse-engineering Booksy's internal APIs. Here's a comprehensive breakdown.
​

Official Integrations (Limited)
Booksy provides no public developer API or API documentation. Their GitHub organization only contains Zendesk-related repos, not data-access APIs. The only official data-sharing mechanisms are:
​

Booking Widget — A JavaScript embed code you can place on any website. It connects to Booksy's backend to show services and allow booking, but it's designed for individual salons, not bulk data access.
​

Reserve with Google / Google AI Mode — Booksy feeds live availability and service data to Google Search and Maps. This confirms their backend supports structured data exchange, but it's a private partnership, not something you can tap into.
​

Base.com (BaseLinker) Integration — A bidirectional integration available in Poland that syncs orders, prices, and listings between Booksy and the Base.com panel. This is aimed at Booksy business ow

# NOT A SOLUTION

Apify Booksy Leads Scraper (Paid Tool)
The simplest ready-to-use option is the Booksy Leads Scraper on Apify. It extracts business profiles including:
​

Field	Available
Business name, address, phone	✅
Rating & review count	✅
Website, Facebook, Instagram, LinkedIn	✅
Contact email	✅
Service prices & promotions	❌ Not included
Pricing starts at $2.00 per 1,000 results, with a free plan limited to 5 businesses per run. The scraper works by providing Booksy search URLs like https://booksy.com/en-us/s/haircut-beard/102522_newport-beach. Note that this tool extracts lead-generation data (contact info, ratings) but not detailed service prices or promotions.
​

# POTENTIAL SOLUTION 1

Web Scraping (DIY)
Booksy's marketplace pages are publicly accessible and contain the data you're looking for. The URL structure is predictable:

Search pages: booksy.com/{lang}/s/{service_category}/{area_id}_{city} — e.g., booksy.com/pl-pl/s/salon-kosmetyczny/3_warszawa

Individual salon profiles: booksy.com/{lang}/{business_id}_{slug}_{category}_{area_id}_{city}

Search result pages already show salon names, selected services with prices, and discount percentages (e.g., "Zaoszczędź do 10%"). Individual profile pages contain the full service menu with descriptions, durations, and pricing.
​

Tools for scraping
Python + Selenium/Playwright — Best for JavaScript-rendered content. Use headless Chrome to load pages and extract data from the rendered DOM.

Python + BeautifulSoup/Scrapy — If the page content is server-rendered or you combine it with Selenium for initial rendering.
​

Firecrawl — AI-powered scraping tool that can extract structured data using natural language schemas instead of CSS selectors, which is more resilient to HTML changes.

# POTENTIAL SOLUTION 2

Reverse-Engineering Internal APIs
Booksy's web app and mobile apps communicate with backend APIs that return structured JSON data. These can be discovered and replayed:

How to discover the endpoints
Browser DevTools (Network tab) — Open booksy.com, navigate to search results or a salon profile, and monitor XHR/Fetch requests in Chrome DevTools. Look for requests to API endpoints returning JSON with salon/service data.
​

Mobile app traffic interception — Use tools like Charles Proxy, mitmproxy, or HTTP Toolkit to capture API calls from the Booksy mobile app. You may need a rooted device or Frida to bypass SSL certificate pinning.

Postman collection — A public Postman collection called "Booksy Service Listing" exists from a user called timelyAI, which documents at least one Booksy API endpoint.
​

What you can typically find
Once you identify the endpoints, you can call them directly with Python's requests library. Internal APIs often return richer data than the HTML pages, including service IDs, exact pricing, promotion details, availability, and review metadata.
​

Risks and limitations
Booksy may use authentication tokens (JWT/Bearer) that expire and need refreshing.
​

Rate limiting and IP blocking are common defenses.
​

Certificate pinning on mobile apps makes interception harder (bypass with Frida).
​

This approach may violate Booksy's Terms of Service.

# RECO

Recommended Starting Point
For your goal of seeing all salons, promotions, and prices, the most practical path is web scraping Booksy search pages and individual salon profiles using Selenium or Playwright in Python. The marketplace pages at booksy.com/pl-pl/s/{category}/{area_id}_{city} already display service names, prices, and discount percentages directly in the HTML. You can paginate through results (e.g., ?businessesPage=2) to collect all listings for a given city and service category. For deeper data (full service menus, exact promotion details), follow links to individual salon profile pages and extract the structured service lists.
​