'use server';

import { db } from '@/firebase/server';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import type { PlayerAggregates } from '@/lib/types';

export interface GlobalCommunityStats {
  totalPlayers: number;
  totalKills: number;
  totalTimeHours: number;
  totalTeamKills: number;
}

/**
 * Fetches and calculates global community statistics from the playerAggregates collection.
 * It iterates through all players to sum up kills, time played, and team kills.
 * It also gets the total count of players.
 * @returns A promise that resolves to an object containing the global stats.
 */
export async function getGlobalCommunityStats(): Promise<GlobalCommunityStats> {
  console.log('[LOG] Iniciando cálculo das estatísticas globais da comunidade...');

  try {
    const playerAggregatesRef = collection(db, 'playerAggregates');

    // Promise para contar o total de jogadores de forma eficiente
    const countPromise = getCountFromServer(playerAggregatesRef);
    
    // Promise para buscar todos os documentos para somar os campos
    const docsPromise = getDocs(playerAggregatesRef);

    // Aguarda ambas as promises resolverem
    const [countSnapshot, aqqregatesSnapshot] = await Promise.all([countPromise, docsPromise]);

    const totalPlayers = countSnapshot.data().count;
    console.log(`[LOG] Total de jogadores encontrado: ${totalPlayers}`);

    let totalKills = 0;
    let totalTimeSeconds = 0;
    let totalTeamKills = 0;

    aqqregatesSnapshot.forEach(doc => {
      const data = doc.data() as PlayerAggregates;
      totalKills += data.totalKills || 0;
      totalTimeSeconds += data.totalTimeSeconds || 0;
      totalTeamKills += data.totalTeamKills || 0;
    });

    const totalTimeHours = Math.floor(totalTimeSeconds / 3600);

    const stats: GlobalCommunityStats = {
      totalPlayers,
      totalKills,
      totalTimeHours,
      totalTeamKills,
    };

    console.log('[LOG] Cálculo das estatísticas globais concluído:', stats);
    return stats;

  } catch (error) {
    console.error('[ERRO GERAL] Falha ao buscar estatísticas da comunidade:', error);
    // Retorna um objeto com valores zerados em caso de erro
    return {
      totalPlayers: 0,
      totalKills: 0,
      totalTimeHours: 0,
      totalTeamKills: 0,
    };
  }
}
