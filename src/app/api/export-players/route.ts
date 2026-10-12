import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { clans, getClanFromPlayerName } from '@/lib/clans';

export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const periodId = `month_${year}-${month}`;

    const playersQuery = query(
      collection(db, 'playerMonthlyStats'),
      where('periodId', '==', periodId),
      limit(5000)
    );
    const snapshot = await getDocs(playersQuery);
    
    const clanPlayersMap: Record<string, any[]> = {};
    for (const clan of clans) {
      clanPlayersMap[clan.name] = [];
    }

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const detectedClan = getClanFromPlayerName(data.latestPlayerName || 'Unknown');
      
      if (detectedClan) {
        if (!clanPlayersMap[detectedClan.name]) {
          clanPlayersMap[detectedClan.name] = [];
        }
        clanPlayersMap[detectedClan.name].push({
          name: data.latestPlayerName || 'Unknown',
          playerId: data.playerId || doc.id
        });
      }
    });

    const result: Record<string, any> = {};
    for (const clan of clans) {
      if (clanPlayersMap[clan.name] && clanPlayersMap[clan.name].length > 0) {
        result[clan.name] = clanPlayersMap[clan.name];
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
