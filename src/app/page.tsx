
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';
import { getHallOfFameStats } from '@/app/hall-of-fame/actions';
import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { PlayerAggregates } from '@/lib/types';
import { Ranking } from '@/components/Ranking';
import { AdBanner } from '@/components/AdBanner';

interface HallOfFameMap {
  [playerId: string]: string[];
}

const STAT_CATEGORY_NAMES: Record<string, string> = {
  totalKills: 'Rei dos Kills',
  totalCombat: 'Rei do Combate',
  totalOffense: 'Rei do Ataque',
  totalDefense: 'Rei da Defesa',
  totalSupport: 'Rei do Suporte',
  totalTimeSeconds: 'Mais Tempo Jogado',
  longestLifeSecs: 'Vida Mais Longa',
  loneWolf: 'O Lobo Solitário',
};

async function getPlayerAggregates(): Promise<PlayerAggregates[]> {
    const queryLimit = 2000;
    const playersQuery = query(
      collection(db, 'playerAggregates'),
      orderBy('totalKills', 'desc'),
      limit(queryLimit)
    );

    const snapshot = await getDocs(playersQuery);
    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
    } as PlayerAggregates));
}


export default async function Home() {
    
  const stats = await getHallOfFameStats();
  const fameMap: HallOfFameMap = {};
  for (const key in stats) {
      const player = stats[key as keyof typeof stats];
      if (player && player.id) {
          if (!fameMap[player.id]) {
              fameMap[player.id] = [];
          }
          fameMap[player.id].push(STAT_CATEGORY_NAMES[key] || key);
      }
  }

  const rawPlayers = await getPlayerAggregates();

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="space-y-8">
        <Ranking initialPlayers={rawPlayers} initialHallOfFame={fameMap} />
      </div>
    </div>
  );
}
