#!/usr/bin/env python3
"""
Backfill function_type column from the lokale parquet file.

The function_type column was added via ALTER TABLE AFTER the initial data import,
so all values are NULL. This script reads lok_funkcja from the parquet and updates
matching rows in Supabase via source_id.

Usage:
  python scripts/backfill_function_type.py
"""

import os
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import pyarrow.parquet as pq
import pandas as pd
from dotenv import load_dotenv

# Load .env
load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
TABLE_NAME = "transactions"
PARQUET_FILE = Path(__file__).parent.parent / "data" / "0_transakcje_ceny_lokale.parquet"

# Batch size for IN filter (URL length limit ~8KB, so ~100 IDs per batch)
BATCH_SIZE = 100
MAX_WORKERS = 4


def patch_batch(source_ids: list[str], function_type: str, batch_idx: int) -> tuple[int, int, str]:
    """PATCH function_type for a batch of source_ids."""
    # Build URL with IN filter
    ids_csv = ",".join(f'"{sid}"' for sid in source_ids)
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?source_id=in.({ids_csv})"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    body = json.dumps({"function_type": function_type}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return (batch_idx, len(source_ids), "")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:300]
        return (batch_idx, 0, f"HTTP {e.code}: {err_body}")
    except Exception as e:
        return (batch_idx, 0, str(e)[:200])


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set")
        return

    if not PARQUET_FILE.exists():
        print(f"Error: Parquet file not found: {PARQUET_FILE}")
        return

    # Read only the columns we need
    print(f"Reading parquet: {PARQUET_FILE}")
    pf = pq.ParquetFile(str(PARQUET_FILE))

    # Check which columns exist
    schema_names = [f.name for f in pf.schema_arrow]
    if "lok_funkcja" not in schema_names:
        print("Error: lok_funkcja column not found in parquet")
        return

    id_col = "tran_lokalny_id_iip" if "tran_lokalny_id_iip" in schema_names else "gid"
    print(f"  Using ID column: {id_col}")

    # Read only needed columns
    table = pf.read(columns=[id_col, "lok_funkcja"])
    df = table.to_pandas()

    # Drop rows without function_type or source_id
    df = df.dropna(subset=[id_col, "lok_funkcja"])
    df = df[df["lok_funkcja"].str.strip() != ""]

    print(f"  Rows with function_type: {len(df):,}")
    print(f"  Unique function_types: {df['lok_funkcja'].value_counts().to_dict()}")

    # Group by function_type
    grouped = df.groupby("lok_funkcja")[id_col].apply(list).to_dict()

    total_updated = 0
    total_errors = 0
    start_time = time.time()

    for func_type, source_ids in grouped.items():
        source_ids = [str(sid) for sid in source_ids]
        print(f"\nUpdating {len(source_ids):,} rows with function_type='{func_type}'...")

        # Split into batches
        batches = []
        for i in range(0, len(source_ids), BATCH_SIZE):
            batches.append(source_ids[i:i + BATCH_SIZE])

        updated = 0
        errors = 0

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {}
            for idx, batch in enumerate(batches):
                f = executor.submit(patch_batch, batch, func_type, idx)
                futures[f] = idx

            for f in as_completed(futures):
                batch_idx, count, err = f.result()
                if err:
                    errors += 1
                    if errors <= 3:
                        print(f"\n  Batch {batch_idx} error: {err}")
                else:
                    updated += count

                print(f"\r  {func_type}: {updated:,}/{len(source_ids):,} "
                      f"({updated * 100 // max(1, len(source_ids))}%) errors: {errors}",
                      end="", flush=True)

        total_updated += updated
        total_errors += errors
        print()

    elapsed = time.time() - start_time
    print(f"\nDone! Updated {total_updated:,} rows in {elapsed:.0f}s, {total_errors} batch errors")


if __name__ == "__main__":
    main()
