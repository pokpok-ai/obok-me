# obok.me — Project Instructions

## What This Is
Real estate analytics platform for Warsaw showing apartment transaction data on Google Maps with analytics sidebar. Inspired by ZipSmart.ai.

## Stack
- Next.js 15, TypeScript, Tailwind CSS 4
- Google Maps (`@vis.gl/react-google-maps`, `@googlemaps/markerclusterer`)
- Supabase PostgreSQL + PostGIS (RPC functions for viewport-scoped queries)
- Vercel (auto-deploy from main)
- Data: Polish RCN (Rejestr Cen Nieruchomosci) — 168K Warsaw apartment transactions

## Critical Rules
- **ONLY FLATS** — no houses (budynki), no plots (dzialki). All SQL hardcodes `property_type = 'apartment'`
- **Preserve existing analytics UI** — AnalyticsSidebar with tabs (Price Trends, Floor, Rooms, Area, Volume, Parties, YoY badge). Extend, don't replace.
- **Map restricted to Warsaw** — minZoom=10, bounds 52.05-52.45 / 20.75-21.35
- **Sub-filters by `function_type`**: mieszkalna, garaz, inne, handlowoUslugowa (from RCN `lok_funkcja`)
- **SQL functions**: Always use `DROP FUNCTION IF EXISTS` before `CREATE OR REPLACE` when changing signatures
- **Supabase MCP**: Installed globally — use for running SQL queries directly

## Supabase
- URL: https://dxcmafwiuxorvxsqfdas.supabase.co
- Anon key: sb_publishable_EZLtNuc16vYWb_Wz4wHDew_5Mjr37le
- DB URL: in `.env.local` as `SUPABASE_DB_URL`
- Supabase MCP: `claude mcp add --scope user --transport http supabase "https://mcp.supabase.com/mcp"`

## Current Status & Next Steps
See `.claude/plan.md` for full roadmap.
