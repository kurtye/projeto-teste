
'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { PlayerAggregates } from '@/lib/types';

// Define the keys for the stats we want to fetch record holders for.
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

/**
 * Checks if a player name contains any of the known clan tags.
 * The check is case-insensitive.
 * @param playerName - The name of the player.
 * @returns True if a clan tag is found, false otherwise.
 */
function hasClanTag(playerName: string): boolean {
  const lowerPlayerName = playerName.toLowerCase();
  return CLAN_TAGS.some(tag => lowerPlayerName.includes(tag.toLowerCase()));
}


/**
 * Fetches the top player for a set of predefined statistical categories.
 * @returns A promise that resolves to an object where each key is a stat category
 *          and the value is the PlayerAggregates document of the top player.
 */
export async function getHallOfFameStats(): Promise<Record<string, PlayerAggregates | undefined>> {
  console.log('[LOG] Iniciando busca dos recordistas para o Hall da Fama...');
  
  const hallOfFameData: Record<string, PlayerAggregates | undefined> = {};

  try {
    // 1. Fetch individual stat leaders in parallel
    const statPromises = STAT_KEYS.map(async (statKey) => {
      console.log(`[LOG] Buscando recordista para: ${statKey}`);
      
      const q = query(
        collection(db, 'playerAggregates'),
        orderBy(statKey, 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const topPlayerDoc = querySnapshot.docs[0];
        const topPlayerData = { ...topPlayerDoc.data(), id: topPlayerDoc.id } as PlayerAggregates;
        hallOfFameData[statKey] = topPlayerData;
        console.log(`[LOG] Recordista para ${statKey} encontrado: ${topPlayerData.latestPlayerName} com ${topPlayerData[statKey]}`);
      } else {
        hallOfFameData[statKey] = undefined;
        console.log(`[LOG] Nenhum recordista encontrado para: ${statKey}`);
      }
    });

    // 2. Fetch top players to find the "Lone Wolf"
    const loneWolfPromise = async () => {
      console.log('[LOG] Buscando melhor jogador sem clã...');
      const q = query(
        collection(db, 'playerAggregates'),
        orderBy('totalKills', 'desc'),
        limit(100) // Fetch a decent number to find one without a clan
      );
      const querySnapshot = await getDocs(q);
      
      for (const doc of querySnapshot.docs) {
        const player = { ...doc.data(), id: doc.id } as PlayerAggregates;
        if (player.latestPlayerName && !hasClanTag(player.latestPlayerName)) {
          hallOfFameData['loneWolf'] = player;
          console.log(`[LOG] Melhor jogador sem clã encontrado: ${player.latestPlayerName}`);
          return; // Stop after finding the first one
        }
      }
      console.log('[LOG] Nenhum jogador sem clã encontrado no top 100.');
    };

    // 3. Wait for all promises to complete
    await Promise.all([...statPromises, loneWolfPromise()]);

    console.log('[LOG] Busca do Hall da Fama concluída.');
    return hallOfFameData;

  } catch (error) {
    console.error('[ERRO GERAL] Falha ao buscar dados do Hall da Fama:', error);
    // In case of a general error, return what we have.
    return hallOfFameData;
  }
}
