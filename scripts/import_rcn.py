#!/usr/bin/env python3
"""
Import RCN (Rejestr Cen Nieruchomości) GeoParquet data into Supabase.

Downloads from: https://opendata.geoportal.gov.pl/InneDane/latest_exports/rcn_transakcje_ceny/PARQUET/

Usage:
  python scripts/import_rcn.py data/0_transakcje_ceny_lokale.parquet
  python scripts/import_rcn.py data/0_transakcje_ceny_budynki.parquet
  python scripts/import_rcn.py data/0_transakcje_ceny_dzialki.parquet
  python scripts/import_rcn.py --inspect data/0_transakcje_ceny_lokale.parquet
"""

import sys
import os
import json
import math
import struct
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error

import pyarrow.parquet as pq
import pyarrow as pa
import pandas as pd
import numpy as np
from pyproj import Transformer
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
TABLE_NAME = "transactions"
BATCH_SIZE = 500  # REST API batch size (smaller for HTTP)
MAX_WORKERS = 6   # Parallel HTTP requests

# EPSG:2180 -> EPSG:4326 transformer
transformer = Transformer.from_crs("EPSG:2180", "EPSG:4326", always_xy=True)


def detect_file_type(filename: str) -> str:
    """Detect property type from filename."""
    name = filename.lower()
    if "lokale" in name:
        return "apartment"
    elif "budynki" in name:
        return "house"
    elif "dzialki" in name:
        return "plot"
    return "apartment"


def parse_wkb_geometry(val: bytes) -> tuple[float, float] | tuple[None, None]:
    """Parse a single WKB geometry (Point or Polygon) and return centroid x,y."""
    if val is None or len(val) < 21:
        return None, None

    byte_order = val[0]
    le = byte_order == 1
    ifmt = "<I" if le else ">I"
    dfmt = "<dd" if le else ">dd"

    wkb_type = struct.unpack(ifmt, val[1:5])[0]

    if wkb_type == 1:  # Point
        x, y = struct.unpack(dfmt, val[5:21])
        return x, y

    elif wkb_type == 3:  # Polygon — compute centroid from first ring
        offset = 5
        num_rings = struct.unpack(ifmt, val[offset:offset+4])[0]
        offset += 4
        if num_rings == 0:
            return None, None
        num_points = struct.unpack(ifmt, val[offset:offset+4])[0]
        offset += 4
        sum_x, sum_y = 0.0, 0.0
        # Exclude last point (duplicate of first in closed ring)
        count = max(1, num_points - 1)
        for p in range(count):
            x, y = struct.unpack(dfmt, val[offset:offset+16])
            sum_x += x
            sum_y += y
            offset += 16
        return sum_x / count, sum_y / count

    elif wkb_type == 6:  # MultiPolygon — centroid of first polygon
        offset = 5
        num_polys = struct.unpack(ifmt, val[offset:offset+4])[0]
        offset += 4
        if num_polys == 0:
            return None, None
        # Skip inner WKB header of first polygon
        offset += 5  # byte_order(1) + type(4)
        num_rings = struct.unpack(ifmt, val[offset:offset+4])[0]
        offset += 4
        if num_rings == 0:
            return None, None
        num_points = struct.unpack(ifmt, val[offset:offset+4])[0]
        offset += 4
        sum_x, sum_y = 0.0, 0.0
        count = max(1, num_points - 1)
        for p in range(count):
            x, y = struct.unpack(dfmt, val[offset:offset+16])
            sum_x += x
            sum_y += y
            offset += 16
        return sum_x / count, sum_y / count

    return None, None


def parse_wkb_geometries(geo_col) -> tuple[np.ndarray, np.ndarray]:
    """Parse WKB geometries (Point, Polygon, MultiPolygon) to centroid x,y arrays."""
    n = len(geo_col)
    xs = np.full(n, np.nan, dtype=np.float64)
    ys = np.full(n, np.nan, dtype=np.float64)

    values = geo_col.to_pylist()

    for i, val in enumerate(values):
        x, y = parse_wkb_geometry(val)
        if x is not None:
            xs[i] = x
            ys[i] = y

    return xs, ys


def read_parquet_to_df(file_path: str) -> pd.DataFrame:
    """Read GeoParquet using pyarrow, handling the malformed timezone."""
    pf = pq.ParquetFile(file_path)

    # Read only row groups that have geometry data
    # First pass: identify which row groups have geometry
    print(f"  Scanning {pf.metadata.num_row_groups} row groups for geometry...")
    valid_rgs = []
    for rg_idx in range(pf.metadata.num_row_groups):
        rg_table = pf.read_row_group(rg_idx, columns=["geometry"])
        geo = rg_table.column("geometry")
        if geo.null_count < len(geo):
            valid_rgs.append(rg_idx)

    print(f"  Found {len(valid_rgs)} row groups with geometry data")

    if not valid_rgs:
        # Return empty DataFrame
        return pd.DataFrame()

    # Read only valid row groups
    table = pf.read_row_groups(valid_rgs)

    # Fix dok_data timezone issue: cast to timestamp without tz
    if "dok_data" in table.column_names:
        col = table.column("dok_data")
        fixed = col.cast(pa.timestamp("ms"))
        idx = table.column_names.index("dok_data")
        table = table.set_column(idx, "dok_data", fixed)

    # Parse WKB geometries
    print(f"  Parsing {len(table):,} WKB geometries...")
    geo_col = table.column("geometry")
    xs, ys = parse_wkb_geometries(geo_col)

    # Drop geometry columns before converting to pandas
    cols_to_drop = ["geometry", "geometry_bbox"]
    keep_cols = [c for c in table.column_names if c not in cols_to_drop]
    table = table.select(keep_cols)

    df = table.to_pandas()
    df["geo_x"] = xs  # Easting in EPSG:2180
    df["geo_y"] = ys  # Northing in EPSG:2180

    return df


def inspect_data(file_path: str) -> None:
    """Print schema and sample data."""
    pf = pq.ParquetFile(file_path)
    print(f"\n=== Schema ===")
    print(pf.schema_arrow)
    print(f"\nTotal rows: {pf.metadata.num_rows}")

    # Read small sample
    table = pf.read_row_group(0)
    t = table.slice(0, 5)
    print(f"\n=== First 5 rows ===")
    for col in t.column_names:
        if col in ("geometry", "geometry_bbox"):
            print(f"  {col}: [binary data]")
            continue
        try:
            if col == "dok_data":
                arr = t.column(col).cast(pa.timestamp("ms"))
                print(f"  {col}: {arr.to_pylist()}")
            else:
                print(f"  {col}: {t.column(col).to_pylist()}")
        except Exception as e:
            print(f"  {col}: [error: {e}]")


def process_dataframe(df: pd.DataFrame, property_type: str, teryt_filter: str = None) -> pd.DataFrame:
    """Transform RCN data to match our DB schema."""

    # Filter by TERYT (powiat) if specified
    if teryt_filter and "teryt" in df.columns:
        before = len(df)
        df = df[df["teryt"] == teryt_filter].copy()
        print(f"  TERYT filter '{teryt_filter}': {before:,} -> {len(df):,} rows")
        if len(df) == 0:
            return df

    # Drop rows without geometry
    df = df.dropna(subset=["geo_x", "geo_y"]).copy()
    df = df[(df["geo_x"] != 0) & (df["geo_y"] != 0)]

    # Convert EPSG:2180 to EPSG:4326 (WGS84)
    print("Converting coordinates EPSG:2180 -> EPSG:4326...")
    lngs, lats = transformer.transform(
        df["geo_x"].values, df["geo_y"].values
    )
    df["lat"] = lats
    df["lng"] = lngs

    # Filter to valid Poland bounds
    df = df[(df["lat"] > 49) & (df["lat"] < 55) &
            (df["lng"] > 14) & (df["lng"] < 25)]

    # Map price - use lok_cena_brutto for lokale, bud_cena_brutto for budynki,
    # or fall back to tran_cena_brutto
    price_cols = ["lok_cena_brutto", "bud_cena_brutto", "dzi_cena_brutto",
                  "nier_cena_brutto", "tran_cena_brutto"]
    df["price"] = None
    for col in price_cols:
        if col in df.columns:
            mask = df["price"].isna() & df[col].notna() & (df[col] > 0)
            df.loc[mask, "price"] = df.loc[mask, col]

    # Filter out rows without price
    df = df[df["price"].notna() & (df["price"] > 0)]

    # Transaction date
    if "dok_data" in df.columns:
        df["transaction_date"] = pd.to_datetime(df["dok_data"], errors="coerce").dt.date

    # Area
    area_cols = ["lok_pow_uzyt", "bud_pow_uzyt", "dzi_pow"]
    df["area_sqm"] = None
    for col in area_cols:
        if col in df.columns:
            mask = df["area_sqm"].isna() & df[col].notna() & (df[col] > 0)
            df.loc[mask, "area_sqm"] = df.loc[mask, col]

    # Price per sqm
    df["price_per_sqm"] = None
    mask = df["price"].notna() & df["area_sqm"].notna() & (df["area_sqm"] > 0)
    df.loc[mask, "price_per_sqm"] = (
        df.loc[mask, "price"] / df.loc[mask, "area_sqm"]
    ).round(2)

    # Property type
    df["property_type"] = property_type

    # Market type
    if "tran_rodzaj_rynku" in df.columns:
        market_map = {"wtorny": "secondary", "pierwotny": "primary"}
        df["market_type"] = df["tran_rodzaj_rynku"].map(market_map)
    else:
        df["market_type"] = None

    # Rooms
    rooms_cols = ["lok_liczba_izb", "bud_liczba_izb"]
    df["rooms"] = None
    for col in rooms_cols:
        if col in df.columns:
            mask = df["rooms"].isna() & df[col].notna()
            df.loc[mask, "rooms"] = df.loc[mask, col]

    # Floor
    if "lok_nr_kond" in df.columns:
        df["floor"] = df["lok_nr_kond"]
    else:
        df["floor"] = None

    # Address
    addr_cols = ["lok_adres", "bud_adres", "dzi_adres"]
    df["address"] = None
    for col in addr_cols:
        if col in df.columns:
            mask = df["address"].isna() & df[col].notna()
            df.loc[mask, "address"] = df.loc[mask, col]

    # Clean up address format: "MSC:KRAKÓW;UL:ZAKRZOWIECKA;NR_PORZ:53" -> "Zakrzowiecka 53, Kraków"
    def clean_address(addr):
        if not addr or not isinstance(addr, str):
            return addr
        parts = {}
        for segment in addr.split(";"):
            if ":" in segment:
                key, val = segment.split(":", 1)
                parts[key.strip()] = val.strip()
        city = parts.get("MSC", "").title()
        street = parts.get("UL", "").title()
        number = parts.get("NR_PORZ", "")
        if street and number:
            return f"{street} {number}, {city}" if city else f"{street} {number}"
        elif city:
            return city
        return addr

    df["address"] = df["address"].apply(clean_address)

    # Source ID
    if "tran_lokalny_id_iip" in df.columns:
        df["source_id"] = df["tran_lokalny_id_iip"]
    elif "gid" in df.columns:
        df["source_id"] = df["gid"].astype(str)

    # TERYT as powiat
    if "teryt" in df.columns:
        df["powiat"] = df["teryt"]

    # --- Extra fields ---
    # Transaction type
    if "tran_rodzaj_trans" in df.columns:
        df["transaction_type"] = df["tran_rodzaj_trans"]
    # Seller / buyer type
    if "tran_sprzedajacy" in df.columns:
        df["seller_type"] = df["tran_sprzedajacy"]
    if "tran_kupujacy" in df.columns:
        df["buyer_type"] = df["tran_kupujacy"]
    # Property right (ownership type)
    if "nier_prawo" in df.columns:
        df["property_right"] = df["nier_prawo"]
    # Share fraction
    if "nier_udzial" in df.columns:
        df["share_fraction"] = df["nier_udzial"]
    # Land area
    if "nier_pow_gruntu" in df.columns:
        df["land_area_sqm"] = df["nier_pow_gruntu"]
    # Apartment number
    if "lok_nr_lokalu" in df.columns:
        df["apartment_number"] = df["lok_nr_lokalu"]
    # Function type (residential, commercial etc.)
    if "lok_funkcja" in df.columns:
        df["function_type"] = df["lok_funkcja"]
    # Ancillary area (storage/basement)
    if "lok_pow_przyn" in df.columns:
        df["ancillary_area_sqm"] = df["lok_pow_przyn"]
    # VAT amount
    vat_cols = ["lok_vat", "tran_vat"]
    df["vat_amount"] = None
    for col in vat_cols:
        if col in df.columns:
            mask = df["vat_amount"].isna() & df[col].notna()
            df.loc[mask, "vat_amount"] = df.loc[mask, col]

    # Select target columns
    target_cols = [
        "price", "price_per_sqm", "transaction_date", "property_type",
        "market_type", "area_sqm", "rooms", "floor", "address",
        "lat", "lng", "source_id", "powiat",
        "transaction_type", "seller_type", "buyer_type",
        "property_right", "share_fraction", "land_area_sqm",
        "apartment_number", "function_type", "ancillary_area_sqm",
        "vat_amount",
    ]
    result = df[[c for c in target_cols if c in df.columns]].copy()

    # Convert numeric columns to nullable int
    for col in ["rooms", "floor"]:
        if col in result.columns:
            result[col] = pd.to_numeric(result[col], errors="coerce")
            result[col] = result[col].astype("Int64")

    return result


def df_to_rows(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to list of JSON-serializable dicts for REST API."""
    # Pre-process columns for JSON serialization
    out = df.copy()

    for col in out.columns:
        dtype = out[col].dtype
        if pd.api.types.is_datetime64_any_dtype(dtype):
            out[col] = out[col].astype(str).replace("NaT", None)
        elif pd.api.types.is_integer_dtype(dtype):
            out[col] = out[col].astype("Int64")  # nullable int
        elif col == "transaction_date":
            out[col] = out[col].astype(str).replace("None", None)

    # Use to_dict for speed (much faster than iterrows)
    rows = out.where(out.notna(), None).to_dict(orient="records")

    # Clean up numpy types
    clean_rows = []
    for row in rows:
        d = {}
        for k, v in row.items():
            if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                d[k] = None
            elif isinstance(v, (np.integer,)):
                d[k] = int(v)
            elif isinstance(v, (np.floating,)):
                d[k] = round(float(v), 6)
            elif isinstance(v, pd.Timestamp):
                d[k] = v.isoformat()
            elif str(v) in ("NaT", "nan", "None", "<NA>"):
                d[k] = None
            else:
                d[k] = v
        clean_rows.append(d)

    return clean_rows


def post_batch(url: str, headers: dict, batch: list[dict], batch_idx: int) -> tuple[int, int, str]:
    """POST a batch of rows to Supabase REST API. Returns (batch_idx, count, error)."""
    body = json.dumps(batch).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return (batch_idx, len(batch), "")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:200]
        return (batch_idx, 0, f"HTTP {e.code}: {err_body}")
    except Exception as e:
        return (batch_idx, 0, str(e)[:200])


def load_to_supabase(df: pd.DataFrame) -> None:
    """Load DataFrame into Supabase via REST API (HTTPS)."""
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    total = len(df)
    print(f"\nLoading {total:,} transactions via REST API...")
    print(f"  Endpoint: {url}")
    print(f"  Batch size: {BATCH_SIZE}, Workers: {MAX_WORKERS}")

    # Convert entire dataframe to rows
    print("  Converting to JSON...")
    all_rows = df_to_rows(df)

    # Split into batches
    batches = []
    for i in range(0, len(all_rows), BATCH_SIZE):
        batches.append(all_rows[i:i + BATCH_SIZE])

    print(f"  Total batches: {len(batches)}")

    loaded = 0
    errors = 0
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {}
        for idx, batch in enumerate(batches):
            f = executor.submit(post_batch, url, headers, batch, idx)
            futures[f] = idx

        for f in as_completed(futures):
            batch_idx, count, err = f.result()
            if err:
                errors += 1
                if errors <= 5:
                    print(f"\n  Batch {batch_idx} error: {err}")
                elif errors == 6:
                    print(f"\n  ... suppressing further errors")
            else:
                loaded += count

            done = loaded + errors * BATCH_SIZE
            elapsed = time.time() - start_time
            rate = loaded / elapsed if elapsed > 0 else 0
            eta = (total - loaded) / rate if rate > 0 else 0
            print(f"\r  Loaded {loaded:,}/{total:,} ({loaded*100//total}%) | "
                  f"{rate:.0f} rows/s | ETA {eta:.0f}s | Errors: {errors}",
                  end="", flush=True)

    elapsed = time.time() - start_time
    print(f"\n\nDone! Loaded {loaded:,}/{total:,} in {elapsed:.0f}s "
          f"({loaded/elapsed:.0f} rows/s, {errors} batch errors)")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    inspect_only = "--inspect" in sys.argv
    teryt_filter = None
    for a in sys.argv[1:]:
        if a.startswith("--teryt="):
            teryt_filter = a.split("=", 1)[1]
    file_paths = [a for a in sys.argv[1:] if not a.startswith("--")]

    if not file_paths:
        print("Error: No file path provided")
        sys.exit(1)

    for file_path in file_paths:
        if not os.path.exists(file_path):
            print(f"Error: File not found: {file_path}")
            continue

        print(f"\n{'='*60}")
        print(f"Processing: {file_path}")
        print(f"{'='*60}")

        if inspect_only:
            inspect_data(file_path)
            continue

        if not SUPABASE_URL or not SUPABASE_KEY:
            print("Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set")
            sys.exit(1)

        # Detect property type from filename
        property_type = detect_file_type(os.path.basename(file_path))
        print(f"Property type: {property_type}")

        # Read data
        print("Reading GeoParquet...")
        df = read_parquet_to_df(file_path)
        print(f"Raw rows: {len(df):,}")

        # Process
        print("Processing...")
        df = process_dataframe(df, property_type, teryt_filter=teryt_filter)
        print(f"Valid transactions: {len(df):,}")

        if len(df) == 0:
            print("No valid data to import!")
            continue

        # Load
        load_to_supabase(df)


if __name__ == "__main__":
    main()
