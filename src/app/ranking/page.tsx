
import { getMonthlyHallOfFame } from '@/app/hall-of-fame/actions';
import { Ranking } from '@/components/Ranking';
import { getMonthlyPlayerStats, getAllClanMembers } from './actions';

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
    
  const currentDate = new Date();
  const currentMonthId = `month_${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;

  // Fetch all data in parallel
  const [hallOfFameData, mensal, clanMembers] = await Promise.all([
    getMonthlyHallOfFame(currentMonthId),
    getMonthlyPlayerStats(currentMonthId),
    getAllClanMembers(),
  ]);

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

  const initialRankings = { mensal };

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
