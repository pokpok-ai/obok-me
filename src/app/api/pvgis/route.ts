import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  const pvgisUrl = new URL('https://re.jrc.ec.europa.eu/api/v5_2/PVcalc');
  pvgisUrl.searchParams.set('lat', lat);
  pvgisUrl.searchParams.set('lon', lng);
  pvgisUrl.searchParams.set('peakpower', '1');
  pvgisUrl.searchParams.set('loss', '14');
  pvgisUrl.searchParams.set('outputformat', 'json');

  try {
    const resp = await fetch(pvgisUrl.toString());
    if (!resp.ok) {
      return NextResponse.json({ error: `PVGIS HTTP ${resp.status}` }, { status: 502 });
    }
    const data = await resp.json();
    const yearlyEnergy = data?.outputs?.totals?.fixed?.E_y;

    if (typeof yearlyEnergy !== 'number') {
      return NextResponse.json({ error: 'No data' }, { status: 404 });
    }

    return NextResponse.json({ yearlyEnergy });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PVGIS fetch failed' },
      { status: 502 }
    );
  }
}
