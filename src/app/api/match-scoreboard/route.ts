import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let mapId = searchParams.get('map_id');

  // If user passed a full URL like https://hrb-stats.hlladmin.com/games/1600
  if (mapId && mapId.includes('/')) {
    const parts = mapId.split('/').filter(Boolean);
    mapId = parts[parts.length - 1] || '1600';
  }

  if (!mapId) {
    return NextResponse.json({ error: 'Missing map_id' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://hrb-stats.hlladmin.com/api/get_map_scoreboard?map_id=${mapId}`, {
      next: { revalidate: 3600 },
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HRB API returned status ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching HRB scoreboard:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch scoreboard' }, { status: 500 });
  }
}
