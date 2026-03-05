#!/usr/bin/env python3
"""
Fetch Booksy salon data for Warsaw and load into Supabase.

Two-step approach:
1. Scrape HTML listing pages to get all business IDs + basic info
2. Call detail API for each salon to get services/prices

Usage:
  python scripts/fetch_booksy.py                  # Full fetch (list + details)
  python scripts/fetch_booksy.py --list-only       # Only fetch listing (no details)
  python scripts/fetch_booksy.py --details-only    # Only fetch details for existing salons
  python scripts/fetch_booksy.py --test            # Test with first 2 pages only
"""

import sys
import os
import json
import time
import re
import random
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

import socket
import ssl

from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")


# --- DNS override for booksy.com / pl.booksy.com ---
# These hosts don't always resolve via local DNS
_original_getaddrinfo = socket.getaddrinfo
DNS_OVERRIDES = {
    "booksy.com": "34.36.67.73",
    "pl.booksy.com": "34.36.67.73",
    "dxcmafwiuxorvxsqfdas.supabase.co": "104.18.38.10",
}

def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host in DNS_OVERRIDES:
        ip = DNS_OVERRIDES[host]
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, port))]
    return _original_getaddrinfo(host, port, *args, **kwargs)

socket.getaddrinfo = _patched_getaddrinfo

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Booksy API config
BOOKSY_API_KEY = "web-e3d812bf-d7a2-445d-ab38-55589ae6a121"
BOOKSY_API_HOST = "pl.booksy.com"
BOOKSY_API_IP = "34.36.67.73"
BOOKSY_WEB_HOST = "booksy.com"
WARSAW_LOCATION_ID = 3

BATCH_SIZE = 100
MAX_WORKERS = 4


def booksy_api_request(path: str) -> dict | None:
    """Call Booksy internal API with required headers."""
    url = f"https://{BOOKSY_API_HOST}{path}"
    headers = {
        "x-api-key": BOOKSY_API_KEY,
        "x-app-version": "3.0",
        "Accept": "application/json",
        "Accept-Language": "pl-PL, pl",
        "Origin": "https://booksy.com",
        "Referer": "https://booksy.com/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Host": BOOKSY_API_HOST,
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"  API error {e.code} for {path}: {e.read().decode()[:200]}")
        return None
    except Exception as e:
        print(f"  Request error for {path}: {e}")
        return None


def fetch_listing_page(page: int) -> list[dict]:
    """Fetch a single listing page via HTML scrape + __NUXT__ parse."""
    url = f"https://{BOOKSY_WEB_HOST}/pl-pl/s/{WARSAW_LOCATION_ID}_warszawa?businessesPage={page}"
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": f"_bf={random.randint(10000000, 99999999)}-test; _bc=pl; _bl=pl",
        "Host": BOOKSY_WEB_HOST,
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8")
    except Exception as e:
        print(f"  Page {page} fetch error: {e}")
        return []

    # Extract __NUXT__ JS expression
    m = re.search(r'window\.__NUXT__=(.*?)\s*</script>', html, re.DOTALL)
    if not m:
        print(f"  Page {page}: no __NUXT__ found (HTML {len(html)} chars)")
        return []

    # Parse with Node.js (the __NUXT__ is a JS function expression, not JSON)
    js_code = m.group(1)
    node_script = f"""
const d = {js_code};
const results = d.state?.search?.results;
if (results && results.businesses) {{
    console.log(JSON.stringify(results.businesses.map(b => ({{
        booksy_id: b.id,
        name: b.name,
        slug: b.slug || null,
        category_id: b.primary_category || null,
        lat: b.location?.coordinate?.latitude || null,
        lng: b.location?.coordinate?.longitude || null,
        address: b.location?.address || null,
        city: b.location?.city || null,
        rating: b.reviews_rank || null,
        review_count: b.reviews_count || 0,
        is_promoted: b.promoted || false,
        max_discount_pct: b.max_discount_rate || 0,
        photo_url: b.images?.cover?.[0]?.image || null,
        url_slug: b.url || null,
    }}))));
}} else {{
    console.log("[]");
}}
"""
    try:
        result = subprocess.run(
            ["node", "-e", node_script],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            print(f"  Page {page}: Node.js error: {result.stderr[:200]}")
            return []
        businesses = json.loads(result.stdout)
        return businesses
    except Exception as e:
        print(f"  Page {page}: parse error: {e}")
        return []


def fetch_all_listings(max_pages: int | None = None) -> list[dict]:
    """Fetch all salon listings from Booksy for Warsaw.
    Upserts to DB every 10 pages for incremental progress."""
    print("Step 1: Fetching salon listings from HTML pages...", flush=True)

    # First page to get total count
    page1 = fetch_listing_page(1)
    if not page1:
        print("  Failed to fetch page 1!", flush=True)
        return []

    all_salons = list(page1)
    batch_buffer = list(page1)
    print(f"  Page 1: {len(page1)} salons", flush=True)

    total_pages = max_pages or 371
    total_upserted = 0

    for page in range(2, total_pages + 1):
        if max_pages and page > max_pages:
            break

        time.sleep(random.uniform(1.0, 2.0))

        salons = fetch_listing_page(page)
        if not salons:
            print(f"  Page {page}: empty — stopping pagination", flush=True)
            break

        all_salons.extend(salons)
        batch_buffer.extend(salons)

        # Upsert every 10 pages for incremental progress
        if page % 10 == 0:
            loaded = upsert_salons(batch_buffer)
            total_upserted += loaded
            print(f"  Page {page}/{total_pages}: {len(all_salons)} scraped, {total_upserted} upserted", flush=True)
            batch_buffer = []

    # Upsert remaining buffer
    if batch_buffer:
        loaded = upsert_salons(batch_buffer)
        total_upserted += loaded

    # Deduplicate by booksy_id
    seen = set()
    unique = []
    for s in all_salons:
        if s["booksy_id"] not in seen:
            seen.add(s["booksy_id"])
            unique.append(s)

    print(f"  Total unique salons: {len(unique)}, upserted: {total_upserted}", flush=True)
    return unique


def fetch_salon_details(booksy_id: int) -> dict | None:
    """Fetch full details for a single salon via API."""
    data = booksy_api_request(f"/core/v2/customer_api/businesses/{booksy_id}/")
    if not data or "business" not in data:
        return None

    b = data["business"]
    services = []

    # Extract services from service_categories
    for cat in b.get("service_categories", []):
        cat_name = cat.get("name", "")
        for svc in cat.get("services", []):
            variant = svc.get("variants", [{}])[0] if svc.get("variants") else {}
            price = variant.get("price")
            promo = variant.get("promotion")

            service = {
                "service_name": svc.get("name", "Unknown"),
                "category_name": cat_name,
                "price_pln": price,
                "original_price_pln": price if promo else None,
                "discount_pct": int(promo["rate"]) if promo and promo.get("rate") else None,
                "duration_minutes": variant.get("duration"),
            }
            if promo and promo.get("price", {}).get("price"):
                service["price_pln"] = promo["price"]["price"]
                service["original_price_pln"] = price

            services.append(service)

    # Also include top_services if service_categories was empty
    if not services:
        for svc in b.get("top_services", []):
            variant = svc.get("variants", [{}])[0] if svc.get("variants") else {}
            price = variant.get("price")
            promo = variant.get("promotion")

            service = {
                "service_name": svc.get("name", "Unknown"),
                "category_name": svc.get("category_name", ""),
                "price_pln": price,
                "original_price_pln": price if promo else None,
                "discount_pct": int(promo["rate"]) if promo and promo.get("rate") else None,
                "duration_minutes": variant.get("duration"),
            }
            if promo and promo.get("price", {}).get("price"):
                service["price_pln"] = promo["price"]["price"]
                service["original_price_pln"] = price

            services.append(service)

    return {
        "phone": b.get("phone"),
        "website": b.get("website"),
        "services": services,
        "has_promotion": any(s["discount_pct"] for s in services if s.get("discount_pct")),
    }


# Category ID to name mapping (from Booksy's primary_category field)
CATEGORY_MAP = {
    6: "fryzjer",
    8: "inne",
    10: "paznokcie",
    16: "barber",
    18: "kosmetyka",
    188: "brwi-i-rzesy",
    22: "masaz",
    24: "tatuaz",
    20: "depilacja",
}


def upsert_salons(salons: list[dict]) -> int:
    """Upsert salon basic data to Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/booksy_salons?on_conflict=booksy_id"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates",
    }

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for s in salons:
        lat = s.get("lat")
        lng = s.get("lng")
        if not lat or not lng:
            continue

        # Extract district from address (last part after comma usually)
        address = s.get("address", "")
        district = None
        if address:
            parts = [p.strip() for p in address.split(",")]
            if len(parts) >= 2:
                district = parts[-1]

        rows.append({
            "booksy_id": s["booksy_id"],
            "name": s["name"],
            "slug": s.get("url_slug"),
            "category_id": s.get("category_id"),
            "category_name": CATEGORY_MAP.get(s.get("category_id"), "inne"),
            "address": address,
            "district": district,
            "lat": lat,
            "lng": lng,
            "rating": s.get("rating"),
            "review_count": s.get("review_count", 0),
            "photo_url": s.get("photo_url"),
            "is_promoted": s.get("is_promoted", False),
            "max_discount_pct": s.get("max_discount_pct", 0),
            "has_promotion": (s.get("max_discount_pct", 0) or 0) > 0,
            "last_scraped_at": now,
            "updated_at": now,
        })

    if not rows:
        return 0

    # Deduplicate within batch by booksy_id (keep last occurrence)
    seen = {}
    for r in rows:
        seen[r["booksy_id"]] = r
    rows = list(seen.values())

    loaded = 0
    errors = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        body = json.dumps(batch).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                loaded += len(batch)
        except urllib.error.HTTPError as e:
            errors += 1
            err_body = e.read().decode("utf-8", errors="replace")[:300]
            print(f"  Upsert error batch {i // BATCH_SIZE}: HTTP {e.code}: {err_body}")
        except Exception as e:
            errors += 1
            print(f"  Upsert error: {e}")

    return loaded


def upsert_services(salon_db_id: int, services: list[dict]) -> int:
    """Upsert services for a salon to Supabase."""
    if not services:
        return 0

    url = f"{SUPABASE_URL}/rest/v1/booksy_services?on_conflict=salon_id,service_name"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates",
    }

    now = datetime.now(timezone.utc).isoformat()
    rows = [{
        "salon_id": salon_db_id,
        "service_name": s["service_name"][:200],  # Truncate long names
        "category_name": s.get("category_name"),
        "price_pln": s.get("price_pln"),
        "original_price_pln": s.get("original_price_pln"),
        "discount_pct": s.get("discount_pct"),
        "duration_minutes": s.get("duration_minutes"),
        "last_scraped_at": now,
    } for s in services]

    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return len(rows)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:300]
        print(f"  Service upsert error: HTTP {e.code}: {err_body}")
        return 0
    except Exception as e:
        print(f"  Service upsert error: {e}")
        return 0


def get_salon_db_ids() -> dict[int, int]:
    """Get mapping of booksy_id -> db id from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/booksy_salons?select=id,booksy_id"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }

    all_rows = []
    offset = 0
    while True:
        req = urllib.request.Request(
            f"{url}&offset={offset}&limit=1000",
            headers=headers
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
            if not rows:
                break
            all_rows.extend(rows)
            offset += len(rows)
            if len(rows) < 1000:
                break

    return {r["booksy_id"]: r["id"] for r in all_rows}


def fetch_and_store_details(id_map: dict[int, int], max_salons: int | None = None) -> None:
    """Fetch service details for each salon and store in DB."""
    booksy_ids = list(id_map.keys())
    if max_salons:
        booksy_ids = booksy_ids[:max_salons]

    total = len(booksy_ids)
    print(f"\nStep 2: Fetching details for {total} salons...")

    fetched = 0
    services_total = 0
    errors = 0
    start_time = time.time()

    for i, booksy_id in enumerate(booksy_ids):
        time.sleep(random.uniform(0.5, 1.0))  # Polite delay

        details = fetch_salon_details(booksy_id)
        if not details:
            errors += 1
            continue

        db_id = id_map[booksy_id]

        # Update salon promotion status
        if details.get("has_promotion"):
            update_url = f"{SUPABASE_URL}/rest/v1/booksy_salons?id=eq.{db_id}"
            update_headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            }
            body = json.dumps({
                "has_promotion": True,
                "phone": details.get("phone"),
                "website": details.get("website"),
            }).encode("utf-8")
            req = urllib.request.Request(update_url, data=body, headers=update_headers, method="PATCH")
            try:
                urllib.request.urlopen(req, timeout=30)
            except Exception:
                pass

        # Upsert services
        svc_count = upsert_services(db_id, details["services"])
        services_total += svc_count
        fetched += 1

        if (i + 1) % 50 == 0:
            elapsed = time.time() - start_time
            rate = fetched / elapsed if elapsed > 0 else 0
            eta = (total - i - 1) / rate / 60 if rate > 0 else 0
            print(f"  {i + 1}/{total} ({fetched} ok, {errors} err) | "
                  f"{services_total} services | {rate:.1f}/s | ETA {eta:.0f}min")

    elapsed = time.time() - start_time
    print(f"\nDetails done! {fetched}/{total} salons, "
          f"{services_total} services in {elapsed:.0f}s ({errors} errors)")


def main():
    test_mode = "--test" in sys.argv
    list_only = "--list-only" in sys.argv
    details_only = "--details-only" in sys.argv

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required")
        sys.exit(1)

    max_pages = 2 if test_mode else None
    max_details = 10 if test_mode else None

    if not details_only:
        # Step 1: Fetch listings (upserts incrementally every 10 pages)
        salons = fetch_all_listings(max_pages=max_pages)
        if not salons:
            print("No salons found!", flush=True)
            sys.exit(1)

        # Final dedup upsert
        print(f"\nFinal upsert of {len(salons)} salons...", flush=True)
        loaded = upsert_salons(salons)
        print(f"  Upserted {loaded} salons", flush=True)

    if not list_only:
        # Step 2: Fetch details
        print("\nLoading salon IDs from DB...", flush=True)
        id_map = get_salon_db_ids()
        print(f"  Found {len(id_map)} salons in DB", flush=True)

        if id_map:
            fetch_and_store_details(id_map, max_salons=max_details)

    print("\nDone!", flush=True)


if __name__ == "__main__":
    main()
