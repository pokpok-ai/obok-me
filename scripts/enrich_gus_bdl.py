#!/usr/bin/env python3
"""
Enrich obok.me transactions with demographic data from GUS BDL API.

GUS BDL (Bank Danych Lokalnych) provides free statistical data at powiat/gmina level:
- Unemployment rate
- Average wages
- Population density
- Education levels
- Migration data

API docs: https://api.stat.gov.pl/Home/BdlApi?lang=en
License: CC BY 4.0
Rate limits: Anonymous 5 req/sec, registered 10 req/sec

Usage:
  python scripts/enrich_gus_bdl.py --list-subjects
  python scripts/enrich_gus_bdl.py --fetch --teryt=1465
  python scripts/enrich_gus_bdl.py --fetch --all-powiats
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

BDL_BASE = "https://bdl.stat.gov.pl/api/v1"

# Key BDL variable IDs for real estate enrichment
# These need to be discovered via the API — the IDs below are starting points
# Run with --list-subjects to explore the full catalog
BDL_SUBJECTS = {
    # Subject ID -> description
    "P2425": "Registered unemployed persons",
    "P2915": "Average monthly gross wages and salaries",
    "P1812": "Population",
    "P3543": "Migration for permanent residence",
    "P2450": "Housing stock",
}

# Key variable IDs (discovered via API exploration)
# Format: variable_id -> (name_pl, name_en, unit)
BDL_VARIABLES = {
    # Unemployment
    "60559": ("Stopa bezrobocia rejestrowanego", "Registered unemployment rate", "%"),
    # Average wages
    "64428": ("Przecietne miesieczne wynagrodzenie brutto", "Average monthly gross wage", "PLN"),
    # Population density
    "72305": ("Ludnosc na 1 km2", "Population per km²", "persons/km²"),
    # Net migration
    "453655": ("Saldo migracji na 1000 ludnosci", "Net migration per 1000 pop", "per 1000"),
    # Dwellings completed
    "415484": ("Mieszkania oddane do uzytkowania", "Dwellings completed", "count"),
}


def bdl_get(endpoint: str, params: dict = None) -> dict:
    """Make a GET request to the BDL API with rate limiting."""
    url = f"{BDL_BASE}/{endpoint}"
    if params:
        query = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        url += f"?{query}"

    req = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "obok.me/1.0 (real estate analytics)",
    })

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Rate limited
                wait = 2 ** (attempt + 1)
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            raise
        except Exception:
            if attempt < 2:
                time.sleep(1)
                continue
            raise

    return {}


def list_subjects():
    """List all top-level BDL subjects."""
    print("Fetching BDL subject catalog...\n")
    data = bdl_get("subjects", {"lang": "en", "format": "json"})

    results = data.get("results", [])
    print(f"Found {len(results)} top-level subjects:\n")
    for s in results:
        print(f"  [{s['id']}] {s['name']}")
        # Fetch children
        children = bdl_get(f"subjects", {"lang": "en", "format": "json", "parent-id": s["id"]})
        for c in children.get("results", [])[:5]:
            print(f"    [{c['id']}] {c['name']}")
        if len(children.get("results", [])) > 5:
            print(f"    ... and {len(children['results']) - 5} more")
    print()


def fetch_variable_data(variable_id: str, teryt: str, year: int = None) -> list:
    """Fetch data for a specific variable and territorial unit."""
    params = {
        "format": "json",
        "unit-level": "5",  # powiat level
    }
    if year:
        params["year"] = str(year)

    endpoint = f"data/by-variable/{variable_id}"
    if teryt:
        endpoint = f"data/by-unit/{teryt}"
        params["var-id"] = variable_id

    data = bdl_get(endpoint, params)
    return data.get("results", [])


def fetch_enrichment_data(teryt: str):
    """Fetch all enrichment variables for a given TERYT code."""
    print(f"\nFetching enrichment data for TERYT={teryt}...")

    enrichment = {"teryt": teryt}

    for var_id, (name_pl, name_en, unit) in BDL_VARIABLES.items():
        print(f"  Fetching: {name_en} (var={var_id})...")
        try:
            results = fetch_variable_data(var_id, teryt)
            if results:
                # Get the most recent year's data
                values = results[0].get("values", []) if results else []
                if values:
                    latest = sorted(values, key=lambda v: v.get("year", 0), reverse=True)
                    if latest:
                        enrichment[name_en.lower().replace(" ", "_")] = {
                            "value": latest[0].get("val"),
                            "year": latest[0].get("year"),
                            "unit": unit,
                        }
                        print(f"    -> {latest[0].get('val')} {unit} ({latest[0].get('year')})")
        except Exception as e:
            print(f"    Error: {e}")

        time.sleep(0.25)  # Stay well within rate limits

    return enrichment


def save_to_supabase(data: list[dict]):
    """Save enrichment data to Supabase district_stats table."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not set. Saving to JSON instead.")
        with open("data/gus_enrichment.json", "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved to data/gus_enrichment.json")
        return

    url = f"{SUPABASE_URL}/rest/v1/district_stats"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates",
    }

    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(f"  Saved {len(data)} district records to Supabase")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")[:200]
        print(f"  Error saving to Supabase: HTTP {e.code}: {err}")
        # Fallback to JSON
        with open("data/gus_enrichment.json", "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Fallback: saved to data/gus_enrichment.json")


def main():
    if "--list-subjects" in sys.argv:
        list_subjects()
        return

    if "--fetch" in sys.argv:
        teryt = None
        for a in sys.argv[1:]:
            if a.startswith("--teryt="):
                teryt = a.split("=", 1)[1]

        if teryt:
            data = fetch_enrichment_data(teryt)
            print(f"\nEnrichment data for TERYT={teryt}:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        elif "--all-powiats" in sys.argv:
            # Fetch for all powiats that have transactions
            print("Fetching list of powiats from transactions...")
            # Would query Supabase for distinct powiats
            print("TODO: Implement bulk fetch for all powiats")
        else:
            print("Error: Specify --teryt=XXXX or --all-powiats")
            sys.exit(1)
        return

    print(__doc__)


if __name__ == "__main__":
    main()
