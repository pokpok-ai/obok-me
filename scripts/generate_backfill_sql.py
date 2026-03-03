#!/usr/bin/env python3
"""
Generate SQL to backfill function_type from the lokale parquet file.

Generates multiple SQL files, each under 500KB so they fit in
Supabase SQL Editor (which has a ~1MB limit).

Usage:
  python3 scripts/generate_backfill_sql.py
  # Then run each generated SQL file in Supabase SQL Editor
"""

import os
from pathlib import Path
import pyarrow.parquet as pq
import pandas as pd

PARQUET_FILE = Path(__file__).parent.parent / "data" / "0_transakcje_ceny_lokale.parquet"
OUTPUT_DIR = Path(__file__).parent
BATCH_SIZE = 200  # source_ids per UPDATE statement
MAX_FILE_KB = 400  # max file size in KB (safe for SQL Editor ~1MB limit)


def main():
    print(f"Reading parquet: {PARQUET_FILE}")
    pf = pq.ParquetFile(str(PARQUET_FILE))

    schema_names = [f.name for f in pf.schema_arrow]
    id_col = "tran_lokalny_id_iip" if "tran_lokalny_id_iip" in schema_names else "gid"

    cols = [id_col, "lok_funkcja"]
    if "teryt" in schema_names:
        cols.append("teryt")
    table = pf.read(columns=cols)
    df = table.to_pandas()

    df = df.dropna(subset=[id_col, "lok_funkcja"])
    df = df[df["lok_funkcja"].str.strip() != ""]

    if "teryt" in df.columns:
        df = df[df["teryt"].str.startswith("1465", na=False)]

    print(f"  Warsaw rows: {len(df):,}")
    print(f"  Distribution: {df['lok_funkcja'].value_counts().to_dict()}")

    grouped = df.groupby("lok_funkcja")[id_col].apply(list).to_dict()

    # Step 1: mieszkalna default (tiny file)
    step1 = OUTPUT_DIR / "backfill_01_mieszkalna_default.sql"
    step1.write_text(
        "-- Step 1: Set default function_type for all apartments\n"
        "-- This covers ~72% of rows (mieszkalna is the most common type)\n"
        "UPDATE transactions\n"
        "SET function_type = 'mieszkalna'\n"
        "WHERE property_type = 'apartment'\n"
        "  AND function_type IS NULL;\n"
    )
    print(f"\n  {step1.name} (tiny)")

    # Step 2+: correction files for non-mieszkalna types
    file_idx = 2
    total_files = 1  # counting step 1

    for func_type in ["garaz", "inne", "handlowoUslugowa", "biurowa", "produkcyjna"]:
        if func_type not in grouped:
            continue

        source_ids = [str(sid) for sid in grouped[func_type]]

        # Build statements and split into files under MAX_FILE_KB
        current_lines = [f"-- Backfill function_type = '{func_type}' (part {{part}})", ""]
        current_size = 0
        part = 1

        for i in range(0, len(source_ids), BATCH_SIZE):
            batch = source_ids[i:i + BATCH_SIZE]
            escaped = [sid.replace("'", "''") for sid in batch]
            ids_str = ", ".join(f"'{sid}'" for sid in escaped)
            stmt = (
                f"UPDATE transactions SET function_type = '{func_type}' "
                f"WHERE source_id IN ({ids_str});"
            )
            stmt_size = len(stmt.encode()) / 1024

            if current_size + stmt_size > MAX_FILE_KB and len(current_lines) > 2:
                # Write current file
                current_lines[0] = current_lines[0].format(part=part)
                fname = OUTPUT_DIR / f"backfill_{file_idx:02d}_{func_type}_p{part}.sql"
                fname.write_text("\n".join(current_lines))
                fsize = len("\n".join(current_lines).encode()) / 1024
                print(f"  {fname.name} ({fsize:.0f} KB)")
                total_files += 1

                # Start new file
                part += 1
                current_lines = [f"-- Backfill function_type = '{func_type}' (part {{part}})", ""]
                current_size = 0

            current_lines.append(stmt)
            current_size += stmt_size

        # Write remaining
        if len(current_lines) > 2:
            current_lines[0] = current_lines[0].format(part=part)
            if part == 1:
                fname = OUTPUT_DIR / f"backfill_{file_idx:02d}_{func_type}.sql"
            else:
                fname = OUTPUT_DIR / f"backfill_{file_idx:02d}_{func_type}_p{part}.sql"
            fname.write_text("\n".join(current_lines))
            fsize = len("\n".join(current_lines).encode()) / 1024
            print(f"  {fname.name} ({fsize:.0f} KB)")
            total_files += 1

        file_idx += 1

    print(f"\nTotal files: {total_files}")
    print(f"Run them in order in Supabase SQL Editor:")
    print(f"  1. backfill_01_mieszkalna_default.sql (sets all to mieszkalna)")
    print(f"  2-N. backfill_0N_*.sql (corrects non-mieszkalna types)")


if __name__ == "__main__":
    main()
