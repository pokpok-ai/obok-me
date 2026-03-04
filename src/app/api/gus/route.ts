import { NextRequest, NextResponse } from "next/server";

const BDL_BASE = "https://bdl.stat.gov.pl/api/v1";

// Warsaw city (powiat) TERYT unit ID
const WARSAW_UNIT_ID = "146500000000";

// Known BDL variable IDs for Warsaw-level data
// These are discovered via /api/v1/variables/search and cached here
const KNOWN_VARIABLES: Record<string, { varId: string; subjectId: string; label: string }> = {
  population: { varId: "72305", subjectId: "P2137", label: "Ludnosc ogolem" },
};

interface BdlDataPoint {
  year: number;
  val: number;
}

interface DemographicsResult {
  population: BdlDataPoint[] | null;
  salary: BdlDataPoint[] | null;
  unemployment: BdlDataPoint[] | null;
  crime: BdlDataPoint[] | null;
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
    unemployment: null,
    crime: null,
  };

  // Fetch all in parallel, gracefully handle failures
  const [pop, salary, unemployment, crime] = await Promise.allSettled([
    fetchByVariable("72305"), // population total
    fetchByVariable("64428"), // avg gross salary
    fetchByVariable("60559"), // registered unemployed count
    fetchByVariable("415"),   // crimes ascertained total
  ]);

  if (pop.status === "fulfilled") results.population = pop.value;
  if (salary.status === "fulfilled") results.salary = salary.value;
  if (unemployment.status === "fulfilled") results.unemployment = unemployment.value;
  if (crime.status === "fulfilled") results.crime = crime.value;

  return NextResponse.json({
    unitId: WARSAW_UNIT_ID,
    unitName: "Warszawa",
    data: results,
    fetchedAt: new Date().toISOString(),
  });
}

async function fetchByVariable(varId: string): Promise<BdlDataPoint[]> {
  const url = `${BDL_BASE}/data/by-unit/${WARSAW_UNIT_ID}?var-id=${varId}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 }, // cache 24h
  });

  if (!res.ok) {
    console.warn(`BDL fetch failed for var ${varId}: ${res.status}`);
    return [];
  }

  const json = await res.json();

  // BDL response format: { results: [{ id, name, values: [{ year, val }] }] }
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
