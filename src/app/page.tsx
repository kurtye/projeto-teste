
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
import { getPlayerAggregates, getPlayerPeriodStats } from '@/app/ranking/actions';

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


export default async function Home() {
    
  const hallOfFameStats = await getHallOfFameStats();
  const fameMap: HallOfFameMap = {};
  for (const key in hallOfFameStats) {
      const player = hallOfFameStats[key as keyof typeof hallOfFameStats];
      if (player && player.id) {
          if (!fameMap[player.id]) {
              fameMap[player.id] = [];
          }
          fameMap[player.id].push(STAT_CATEGORY_NAMES[key] || key);
      }
  }

  // Fetch all rankings in parallel
  const [geral, mensal, semanal] = await Promise.all([
    getPlayerAggregates(),
    getPlayerPeriodStats('monthly'),
    getPlayerPeriodStats('weekly')
  ]);

  const initialRankings = { geral, mensal, semanal };

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="space-y-8">
        <Ranking 
          initialRankings={initialRankings} 
          initialHallOfFame={fameMap} 
        />
      </div>
    </div>
  );
}
