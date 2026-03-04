import { NextResponse } from "next/server";

const NBP_XML_URL = "https://static.nbp.pl/dane/stopy/stopy_procentowe.xml";

interface RateEntry {
  name: string;
  value: number;
  effectiveDate: string;
}

export async function GET() {
  try {
    const res = await fetch(NBP_XML_URL, {
      next: { revalidate: 86400 }, // cache 24h
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch NBP data" },
        { status: 502 }
      );
    }

    const xml = await res.text();
    const rates = parseNbpXml(xml);

    return NextResponse.json({ rates, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("NBP rates fetch error:", err);
    return NextResponse.json(
      { error: "NBP service unavailable" },
      { status: 502 }
    );
  }
}

function parseNbpXml(xml: string): RateEntry[] {
  const rates: RateEntry[] = [];

  // Extract each <pozycja> block
  const positionRegex = /<pozycja>[\s\S]*?<\/pozycja>/g;
  const positions = xml.match(positionRegex) || [];

  for (const pos of positions) {
    const nameMatch = pos.match(/<nazwa>(.*?)<\/nazwa>/);
    const name = nameMatch?.[1]?.trim() || "";

    // Get the most recent rate (last <stan> entry)
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
