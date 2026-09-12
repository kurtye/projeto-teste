'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { MonthlyPlayerStats } from '@/lib/types';
import { unstable_cache } from 'next/cache';

const STAT_KEYS: string[] = [
  'totalKills',
  'totalCombat',
  'totalOffense',
  'totalDefense',
  'totalSupport',
  'totalTimeSeconds',
  'longestLifeSecs',
  'totalVehicleKills',
  'maxKillsStreak'
];

const CLAN_TAGS = ['SMK', 'HRB', 'RZN', 'OCL', '3LPZ', 'WRT', 'SAP', 'BOLD', 'IDG', 'SOH'];

function hasClanTag(playerName: string): boolean {
  if (!playerName) return false;
  const lowerPlayerName = playerName.toLowerCase();
  return CLAN_TAGS.some(tag => lowerPlayerName.includes(tag.toLowerCase()));
}

async function _getMonthlyHallOfFame(month: string): Promise<{
  records: Record<string, MonthlyPlayerStats | undefined>;
  efficiency: Record<string, (MonthlyPlayerStats & { efficiencyValue: number }) | undefined>;
  roles: Record<number, MonthlyPlayerStats | undefined>;
}> {
  console.log(`[LOG] Buscando Hall da Fama Mensal para: ${month}`);
  
  const records: Record<string, MonthlyPlayerStats | undefined> = {};
  const efficiency: Record<string, (MonthlyPlayerStats & { efficiencyValue: number }) | undefined> = {};
  const roles: Record<number, MonthlyPlayerStats | undefined> = {};

  try {
    const collRef = collection(db, 'monthly_player_stats');

    // 1. Recordes brutos
    const statPromises = STAT_KEYS.map(async (statKey) => {
      const q = query(collRef, where('month', '==', month), orderBy(statKey, 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        records[statKey] = querySnapshot.docs[0].data() as MonthlyPlayerStats;
      }
    });

    // 2. Eficiência (exige mínimo de 2 horas no mês)
    const MIN_HOURS_EFFICIENCY = 2;
    const efficiencyCategories = ['totalOffense', 'totalDefense', 'totalSupport', 'totalCombat', 'totalKills'];
    
    const efficiencyPromises = efficiencyCategories.map(async (cat) => {
      const q = query(
        collRef, 
        where('month', '==', month),
        where('totalTimeSeconds', '>=', MIN_HOURS_EFFICIENCY * 3600),
        orderBy('totalTimeSeconds', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      let bestPlayer: (MonthlyPlayerStats & { efficiencyValue: number }) | undefined = undefined;
      let maxEfficiency = 0;

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data() as MonthlyPlayerStats;
        const hours = (data.totalTimeSeconds || 0) / 3600;
        const val = (data[cat as keyof MonthlyPlayerStats] as number) || 0;
        const efVal = val / hours;

        if (efVal > maxEfficiency) {
          maxEfficiency = efVal;
          const finalVal = cat === 'totalKills' ? Math.round(efVal * 10) / 10 : Math.round(efVal);
          bestPlayer = { ...data, efficiencyValue: finalVal };
        }
      });
      
      efficiency[cat] = bestPlayer;
    });

    // 3. Lobo Solitário
    const loneWolfPromise = async () => {
      const q = query(collRef, where('month', '==', month), orderBy('totalKills', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data() as MonthlyPlayerStats;
        if (data.playerName && !hasClanTag(data.playerName)) {
          records['loneWolf'] = data;
          return;
        }
      }
    };

    // 4. Melhores por Classe (Roles principais)
    // Vamos pegar o melhor combat score por classe
    const ROLE_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const rolesPromises = ROLE_IDS.map(async (roleId) => {
      const q = query(collRef, where('month', '==', month), where('mainRole', '==', roleId), orderBy('totalCombat', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        roles[roleId] = querySnapshot.docs[0].data() as MonthlyPlayerStats;
      }
    });

    await Promise.all([...statPromises, ...efficiencyPromises, loneWolfPromise(), ...rolesPromises]);
    
    return JSON.parse(JSON.stringify({ records, efficiency, roles }));

  } catch (error) {
    console.error('[ERRO] Falha no Hall da Fama Mensal:', error);
    return JSON.parse(JSON.stringify({ records: {}, efficiency: {}, roles: {} }));
  }
}

export const getMonthlyHallOfFame = unstable_cache(
    _getMonthlyHallOfFame,
    ['monthly-hall-of-fame-stats'],
    { revalidate: 60 }
);
