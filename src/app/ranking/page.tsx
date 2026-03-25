
import { getHallOfFameStats } from '@/app/hall-of-fame/actions';
import { Ranking } from '@/components/Ranking';
import { getPlayerAggregates, getPlayerPeriodStats, getAllClanMembers } from './actions';

// Force dynamic rendering to always get the latest data
export const dynamic = 'force-dynamic';

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

export default async function RankingPage() {
    
  const hallOfFameData = await getHallOfFameStats();
  const hallOfFame = hallOfFameData.records;
  
  const fameMap: HallOfFameMap = {};
  
  if (hallOfFame) {
    Object.entries(hallOfFame).forEach(([key, player]) => {
      if (player && player.id) {
          if (!fameMap[player.id]) {
              fameMap[player.id] = [];
          }
          fameMap[player.id].push(STAT_CATEGORY_NAMES[key] || key);
      }
    });
  }

  // Fetch all rankings in parallel
  const [geral, mensal, semanal, clanMembers] = await Promise.all([
    getPlayerAggregates(),
    getPlayerPeriodStats('monthly'),
    getPlayerPeriodStats('weekly'),
    getAllClanMembers(),
  ]);

  const initialRankings = { geral, mensal, semanal };

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="space-y-8">
        <Ranking 
          initialRankings={initialRankings} 
          initialHallOfFame={fameMap} 
          initialClanMembers={clanMembers}
        />
      </div>
    </div>
  );
}
