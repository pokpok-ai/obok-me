#!/usr/bin/env python3
"""
Backfill function_type column from the lokale parquet file.

Connects directly to PostgreSQL (via SUPABASE_DB_URL) and uses
a temp table for efficient bulk UPDATE.

Usage:
  python3 scripts/backfill_function_type.py
"""

import os
import time
from pathlib import Path
from urllib.parse import unquote

import pyarrow.parquet as pq
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Load .env
load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")

DB_URL = os.environ.get("SUPABASE_DB_URL")
PARQUET_FILE = Path(__file__).parent.parent / "data" / "0_transakcje_ceny_lokale.parquet"
BATCH_SIZE = 5000


def main():
    if not DB_URL:
        print("Error: SUPABASE_DB_URL not set in .env.local")
        return

    if not PARQUET_FILE.exists():
        print(f"Error: Parquet file not found: {PARQUET_FILE}")
        return

    # Read parquet
    print(f"Reading parquet: {PARQUET_FILE}")
    pf = pq.ParquetFile(str(PARQUET_FILE))
    schema_names = [f.name for f in pf.schema_arrow]

    id_col = "tran_lokalny_id_iip" if "tran_lokalny_id_iip" in schema_names else "gid"
    cols = [id_col, "lok_funkcja"]
    if "teryt" in schema_names:
        cols.append("teryt")

    table = pf.read(columns=cols)
    df = table.to_pandas()

    # Filter: drop missing, keep Warsaw only (teryt starts with 1465)
    df = df.dropna(subset=[id_col, "lok_funkcja"])
    df = df[df["lok_funkcja"].str.strip() != ""]
    if "teryt" in df.columns:
        df = df[df["teryt"].str.startswith("1465", na=False)]

    print(f"  Warsaw rows with function_type: {len(df):,}")
    print(f"  Distribution: {df['lok_funkcja'].value_counts().to_dict()}")

    # Prepare (source_id, function_type) pairs
    pairs = list(zip(df[id_col].astype(str), df["lok_funkcja"]))
    print(f"  Total pairs to update: {len(pairs):,}")

    # Connect to PostgreSQL
    # Resolve hostname to IP first (Python DNS may fail in some envs)
    import re
    import subprocess
    db_url = DB_URL
    m = re.search(r'@([^:/@]+)', db_url)
    if m:
        hostname = m.group(1)
        try:
            import socket
            socket.getaddrinfo(hostname, None)
        except socket.gaierror:
            print(f"  Python DNS failed for {hostname}, resolving via dig...")
            ip = subprocess.check_output(
                ["dig", "+short", hostname], text=True
            ).strip().split("\n")[-1]
            print(f"  Resolved to {ip}")
            db_url = db_url.replace(hostname, ip)

    print(f"Connecting to database...")
    conn = psycopg2.connect(db_url, sslmode="require")
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Create temp table
        cur.execute("""
            CREATE TEMP TABLE ft_backfill (
                source_id TEXT,
                function_type TEXT
            ) ON COMMIT DROP;
        """)

        # Bulk insert into temp table
        print("Inserting into temp table...")
        start = time.time()
        for i in range(0, len(pairs), BATCH_SIZE):
            batch = pairs[i:i + BATCH_SIZE]
            execute_values(cur, "INSERT INTO ft_backfill (source_id, function_type) VALUES %s", batch)
            done = min(i + BATCH_SIZE, len(pairs))
            print(f"\r  Inserted {done:,}/{len(pairs):,} ({done * 100 // len(pairs)}%)", end="", flush=True)
        print(f"\n  Temp table ready ({time.time() - start:.1f}s)")

        # Create index on temp table for faster join
        print("Creating index on temp table...")
        cur.execute("CREATE INDEX ON ft_backfill (source_id);")

        # Run the UPDATE
        print("Running UPDATE transactions FROM ft_backfill...")
        start = time.time()
        cur.execute("""
            UPDATE transactions t
            SET function_type = b.function_type
            FROM ft_backfill b
            WHERE t.source_id = b.source_id
              AND t.property_type = 'apartment';
        """)
        updated = cur.rowcount
        elapsed = time.time() - start
        print(f"  Updated {updated:,} rows in {elapsed:.1f}s")

        # Commit
        conn.commit()
        print("\nCommitted successfully!")

        # Verify
        cur.execute("""
            SELECT function_type, COUNT(*)
            FROM transactions
            WHERE property_type = 'apartment'
            GROUP BY function_type
            ORDER BY COUNT(*) DESC;
        """)
        print("\nVerification — function_type distribution:")
        for row in cur.fetchall():
            print(f"  {row[0] or 'NULL'}: {row[1]:,}")

    except Exception as e:
        conn.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
