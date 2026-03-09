
'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from 'firebase/firestore';
import type { PlayerAggregates, GlobalStats } from '@/lib/types';

const STAT_KEYS: (keyof PlayerAggregates)[] = [
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
  const lowerPlayerName = playerName.toLowerCase();
  return CLAN_TAGS.some(tag => lowerPlayerName.includes(tag.toLowerCase()));
}

export async function getHallOfFameStats(): Promise<{
  records: Record<string, PlayerAggregates | undefined>;
  efficiency: Record<string, (PlayerAggregates & { efficiencyValue: number }) | undefined>;
}> {
  console.log('[LOG] Iniciando busca avançada para o Hall da Fama...');
  
  const records: Record<string, PlayerAggregates | undefined> = {};
  const efficiency: Record<string, (PlayerAggregates & { efficiencyValue: number }) | undefined> = {};

  try {
    // 1. Buscar recordes brutos (Top 1)
    const statPromises = STAT_KEYS.map(async (statKey) => {
      const q = query(collection(db, 'playerAggregates'), orderBy(statKey, 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        records[statKey] = { ...doc.data(), id: doc.id } as PlayerAggregates;
      }
    });

    // 2. Buscar recordistas de eficiência (PPH)
    // Buscamos um pool de jogadores ativos (min 10h) para encontrar os mais eficientes
    const efficiencyCategories = ['totalOffense', 'totalDefense', 'totalSupport', 'totalCombat'];
    const efficiencyPromises = efficiencyCategories.map(async (cat) => {
      // Buscamos os 200 melhores por total para ter uma base sólida de jogadores experientes
      const q = query(
        collection(db, 'playerAggregates'), 
        where('totalTimeSeconds', '>=', 36000), // Mínimo 10 horas
        orderBy('totalTimeSeconds', 'desc'),
        limit(200)
      );
      
      const querySnapshot = await getDocs(q);
      let bestPlayer: (PlayerAggregates & { efficiencyValue: number }) | undefined;
      let maxPPH = 0;

      querySnapshot.forEach(doc => {
        const data = doc.data() as PlayerAggregates;
        const hours = (data.totalTimeSeconds || 0) / 3600;
        const val = (data[cat as keyof PlayerAggregates] as number) || 0;
        const pph = val / hours;

        if (pph > maxPPH) {
          maxPPH = pph;
          bestPlayer = { ...data, id: doc.id, efficiencyValue: Math.round(pph) };
        }
      });
      
      efficiency[cat] = bestPlayer;
    });

    // 3. Lobo Solitário
    const loneWolfPromise = async () => {
      const q = query(collection(db, 'playerAggregates'), orderBy('totalKills', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      for (const doc of querySnapshot.docs) {
        const player = { ...doc.data(), id: doc.id } as PlayerAggregates;
        if (player.latestPlayerName && !hasClanTag(player.latestPlayerName)) {
          records['loneWolf'] = player;
          return;
        }
      }
    };

    await Promise.all([...statPromises, ...efficiencyPromises, loneWolfPromise()]);

    return { records, efficiency };

  } catch (error) {
    console.error('[ERRO GERAL] Falha ao buscar dados do Hall da Fama:', error);
    return { records: {}, efficiency: {} };
  }
}
