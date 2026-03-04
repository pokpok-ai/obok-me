import { NextResponse } from "next/server";

interface RateEntry {
  name: string;
  value: number;
  effectiveDate: string;
}

// NBP rates — unchanged since Oct 2023. RPP meets monthly.
// Source: https://nbp.pl/polityka-pieniezna/decyzje-rpp/podstawowe-stopy-procentowe-nbp/
const CURRENT_RATES: RateEntry[] = [
  { name: "Stopa referencyjna", value: 5.75, effectiveDate: "2023-10-05" },
  { name: "Stopa lombardowa", value: 6.25, effectiveDate: "2023-10-05" },
  { name: "Stopa depozytowa", value: 5.25, effectiveDate: "2023-10-05" },
  { name: "Stopa redyskontowa weksli", value: 5.80, effectiveDate: "2023-10-05" },
  { name: "Stopa dyskontowa weksli", value: 5.85, effectiveDate: "2023-10-05" },
];

const NBP_XML_URL = "https://static.nbp.pl/dane/stopy/stopy_procentowe.xml";

export async function GET() {
  // Try fetching live XML from NBP, fall back to hardcoded rates
  try {
    const res = await fetch(NBP_XML_URL, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const xml = await res.text();
      const rates = parseNbpXml(xml);
      if (rates.length > 0) {
        return NextResponse.json({ rates, source: "nbp-live", fetchedAt: new Date().toISOString() });
      }
    }
  } catch {
    // XML fetch failed — use fallback
  }

  // Fallback: hardcoded rates (updated manually when RPP changes rates)
  return NextResponse.json({
    rates: CURRENT_RATES,
    source: "hardcoded-2023-10",
    fetchedAt: new Date().toISOString(),
  });
}

function parseNbpXml(xml: string): RateEntry[] {
  const rates: RateEntry[] = [];

  const positionRegex = /<pozycja>[\s\S]*?<\/pozycja>/g;
  const positions = xml.match(positionRegex) || [];

  for (const pos of positions) {
    const nameMatch = pos.match(/<nazwa>(.*?)<\/nazwa>/);
    const name = nameMatch?.[1]?.trim() || "";

    const stanRegex = /<stan>[\s\S]*?<\/stan>/g;
    const stans = pos.match(stanRegex) || [];
    const lastStan = stans[stans.length - 1];

    if (!lastStan) continue;

    const valueMatch = lastStan.match(/<oprocentowanie>([\d.,]+)<\/oprocentowanie>/);
    const dateMatch = lastStan.match(/<obowiazuje_od>([\d-]+)<\/obowiazuje_od>/);

    if (valueMatch) {
      rates.push({
        name,
        value: parseFloat(valueMatch[1].replace(",", ".")),
        effectiveDate: dateMatch?.[1] || "",
      });
    }
  }

  return rates;
}
