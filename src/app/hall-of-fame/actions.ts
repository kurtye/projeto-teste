
'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { PlayerAggregates } from '@/lib/types';

// Função interna para sanitizar um jogador manualmente, sem recursão
function sanitizePlayer(id: string, data: any): PlayerAggregates {
  return {
    id: String(id || ''),
    playerId: String(data.playerId || id || ''),
    latestPlayerName: String(data.latestPlayerName || 'Unknown'),
    totalKills: Number(data.totalKills || 0),
    totalDeaths: Number(data.totalDeaths || 0),
    totalCombat: Number(data.totalCombat || 0),
    totalOffense: Number(data.totalOffense || 0),
    totalDefense: Number(data.totalDefense || 0),
    totalSupport: Number(data.totalSupport || 0),
    totalTimeSeconds: Number(data.totalTimeSeconds || 0),
    longestLifeSecs: Number(data.longestLifeSecs || 0),
    status: data.status === 'retired' ? 'retired' : undefined,
  };
}

const STAT_KEYS: string[] = [
  'totalKills',
  'totalCombat',
  'totalOffense',
  'totalDefense',
  'totalSupport',
  'totalTimeSeconds',
  'longestLifeSecs',
];

const CLAN_TAGS = ['SMK', 'HRB', 'RZN', 'OCL', '3LPZ', 'WRT', 'SAP', 'BOLD', 'IDG', 'SOH'];

function hasClanTag(playerName: string): boolean {
  if (!playerName) return false;
  const lowerPlayerName = playerName.toLowerCase();
  return CLAN_TAGS.some(tag => lowerPlayerName.includes(tag.toLowerCase()));
}

export async function getHallOfFameStats(): Promise<{
  records: Record<string, PlayerAggregates | undefined>;
  efficiency: Record<string, (PlayerAggregates & { efficiencyValue: number }) | undefined>;
}> {
  console.log('[LOG] Buscando Hall da Fama (Mapeamento Manual Final)...');
  
  const records: Record<string, PlayerAggregates | undefined> = {};
  const efficiency: Record<string, (PlayerAggregates & { efficiencyValue: number }) | undefined> = {};

  try {
    // 1. Recordes brutos
    const statPromises = STAT_KEYS.map(async (statKey) => {
      const q = query(collection(db, 'playerAggregates'), orderBy(statKey, 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        records[statKey] = sanitizePlayer(docSnap.id, docSnap.data());
      }
    });

    // 2. Eficiência
    const efficiencyCategories = ['totalOffense', 'totalDefense', 'totalSupport', 'totalCombat', 'totalKills'];
    const efficiencyPromises = efficiencyCategories.map(async (cat) => {
      const q = query(
        collection(db, 'playerAggregates'), 
        where('totalTimeSeconds', '>=', 36000),
        orderBy('totalTimeSeconds', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      let bestPlayer: (PlayerAggregates & { efficiencyValue: number }) | undefined = undefined;
      let maxEfficiency = 0;

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const hours = (data.totalTimeSeconds || 0) / 3600;
        const val = (data[cat] as number) || 0;
        const efVal = val / hours;

        if (efVal > maxEfficiency) {
          maxEfficiency = efVal;
          const finalVal = cat === 'totalKills' ? Math.round(efVal * 10) / 10 : Math.round(efVal);
          const sanitized = sanitizePlayer(docSnap.id, data);
          bestPlayer = { ...sanitized, efficiencyValue: finalVal };
        }
      });
      
      efficiency[cat] = bestPlayer;
    });

    // 3. Lobo Solitário
    const loneWolfPromise = async () => {
      const q = query(collection(db, 'playerAggregates'), orderBy('totalKills', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        if (data.latestPlayerName && !hasClanTag(data.latestPlayerName)) {
          records['loneWolf'] = sanitizePlayer(docSnap.id, data);
          return;
        }
      }
    };

    await Promise.all([...statPromises, ...efficiencyPromises, loneWolfPromise()]);
    
    // Ultimate Sterilization
    return JSON.parse(JSON.stringify({ records, efficiency }));

  } catch (error) {
    console.error('[ERRO] Falha no Hall da Fama:', error);
    return JSON.parse(JSON.stringify({ records: {}, efficiency: {} }));
  }
}
