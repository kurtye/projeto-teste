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

/**
 * Fetches the top player for a set of predefined statistical categories.
 * @returns A promise that resolves to an object where each key is a stat category
 *          and the value is the PlayerAggregates document of the top player.
 */
export async function getHallOfFameStats(): Promise<Record<string, PlayerAggregates | undefined>> {
  console.log('[LOG] Iniciando busca dos recordistas para o Hall da Fama...');
  
  const hallOfFameData: Record<string, PlayerAggregates | undefined> = {};

  try {
    // Create an array of promises, one for each stat query.
    const promises = STAT_KEYS.map(async (statKey) => {
      console.log(`[LOG] Buscando recordista para: ${statKey}`);
      
      const q = query(
        collection(db, 'playerAggregates'),
        orderBy(statKey, 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const topPlayerDoc = querySnapshot.docs[0];
        // Ensure the document ID is included in the returned object.
        const topPlayerData = { ...topPlayerDoc.data(), id: topPlayerDoc.id } as PlayerAggregates;
        hallOfFameData[statKey] = topPlayerData;
        console.log(`[LOG] Recordista para ${statKey} encontrado: ${topPlayerData.latestPlayerName} com ${topPlayerData[statKey]}`);
      } else {
        hallOfFameData[statKey] = undefined;
        console.log(`[LOG] Nenhum recordista encontrado para: ${statKey}`);
      }
    });

    // Wait for all queries to complete.
    await Promise.all(promises);

    console.log('[LOG] Busca do Hall da Fama concluída.');
    return hallOfFameData;

  } catch (error) {
    console.error('[ERRO GERAL] Falha ao buscar dados do Hall da Fama:', error);
    // In case of a general error, return an empty object or re-throw.
    // Returning what we have might also be an option depending on desired behavior.
    return hallOfFameData;
  }
}
