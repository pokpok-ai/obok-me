import { NextRequest, NextResponse } from "next/server";

const BDL_BASE = "https://bdl.stat.gov.pl/api/v1";
// Warsaw powiat (level 5) — works for all variables
const WARSAW_POWIAT_ID = "071412865000";

interface BdlDataPoint {
  year: number;
  val: number;
}

interface DemographicsResult {
  population: BdlDataPoint[] | null;
  salary: BdlDataPoint[] | null;
  unemploymentRate: BdlDataPoint[] | null; // % directly from GUS
  crimeTotal: BdlDataPoint[] | null;
  crimePer1000: BdlDataPoint[] | null; // per 1000 residents, directly from GUS
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") || "demographics";

  if (action === "demographics") {
    return getDemographics();
  }

  if (action === "search") {
    const name = request.nextUrl.searchParams.get("name") || "";
    return searchVariables(name);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function getDemographics() {
  const results: DemographicsResult = {
    population: null,
    salary: null,
    unemploymentRate: null,
    crimeTotal: null,
    crimePer1000: null,
  };

  // Fetch all in parallel — using correct variable IDs for Warsaw powiat
  const [pop, salary, unempRate, crimeTotal, crimePer1000] = await Promise.allSettled([
    fetchByVariable("72305"),  // population total
    fetchByVariable("64428"),  // avg gross salary (PLN/month)
    fetchByVariable("60270"),  // unemployment rate % (directly from GUS!)
    fetchByVariable("58559"),  // total crimes (new var, data up to 2024)
    fetchByVariable("398594"), // crimes per 1000 residents (directly from GUS!)
  ]);

  if (pop.status === "fulfilled") results.population = pop.value;
  if (salary.status === "fulfilled") results.salary = salary.value;
  if (unempRate.status === "fulfilled") results.unemploymentRate = unempRate.value;
  if (crimeTotal.status === "fulfilled") results.crimeTotal = crimeTotal.value;
  if (crimePer1000.status === "fulfilled") results.crimePer1000 = crimePer1000.value;

  return NextResponse.json({
    unitId: WARSAW_POWIAT_ID,
    unitName: "Warszawa",
    data: results,
    fetchedAt: new Date().toISOString(),
  });
}

async function fetchByVariable(varId: string): Promise<BdlDataPoint[]> {
  const url = `${BDL_BASE}/data/by-unit/${WARSAW_POWIAT_ID}?var-id=${varId}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    console.warn(`BDL fetch failed for var ${varId}: ${res.status}`);
    return [];
  }

  const json = await res.json();
  const results = json.results || [];
  if (results.length === 0) return [];

  const values = results[0].values || [];
  return values
    .filter((v: { year: number; val: number | null }) => v.val !== null)
    .map((v: { year: number; val: number }) => ({ year: v.year, val: v.val }))
    .sort((a: BdlDataPoint, b: BdlDataPoint) => a.year - b.year);
}

async function searchVariables(name: string) {
  const url = `${BDL_BASE}/variables/search?name=${encodeURIComponent(name)}&format=json&page-size=20`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `BDL search failed: ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  return NextResponse.json(json);
}
