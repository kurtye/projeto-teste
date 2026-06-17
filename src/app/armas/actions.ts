'use server';

import { db } from '@/firebase/server';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { WeaponLeaderboardEntry } from '@/lib/types';

interface WeaponRankingDoc {
  weaponName: string;
  players: {
    [playerId: string]: {
      playerName: string;
      kills: number;
    };
  };
  lastUpdated?: any;
}

/**
 * Busca todas as armas disponíveis na coleção weaponsRanking,
 * ordenadas por total de kills (soma de todos os jogadores).
 */
export async function getAvailableWeapons(): Promise<{ name: string; totalKills: number }[]> {
  try {
    const snapshot = await getDocs(collection(db, 'weaponsRanking'));

    if (snapshot.empty) {
      return [];
    }

    const weapons = snapshot.docs.map(docSnap => {
      const data = docSnap.data() as WeaponRankingDoc;
      const totalKills = data.players
        ? Object.values(data.players).reduce((sum, p) => sum + (p.kills || 0), 0)
        : 0;
      return {
        name: data.weaponName || docSnap.id,
        totalKills,
      };
    });

    // Ordena por total de kills (maior primeiro)
    weapons.sort((a, b) => b.totalKills - a.totalKills);

    return weapons.slice(0, 200);
  } catch (error) {
    console.error('[ERRO] Falha ao buscar armas disponíveis:', error);
    return [];
  }
}

/**
 * Busca o leaderboard de uma arma específica na coleção weaponsRanking.
 * Os dados vêm do campo `players` do documento da arma.
 */
export async function getWeaponLeaderboard(weaponName: string): Promise<WeaponLeaderboardEntry[]> {
  console.log(`[LOG] Buscando ranking da arma: ${weaponName}`);
  try {
    const weaponDocRef = doc(db, 'weaponsRanking', weaponName);
    const weaponSnap = await getDoc(weaponDocRef);

    if (!weaponSnap.exists()) {
      console.log(`[LOG] Nenhum dado encontrado para a arma: ${weaponName}`);
      return [];
    }

    const data = weaponSnap.data() as WeaponRankingDoc;

    if (!data.players) {
      return [];
    }

    const leaderboard: WeaponLeaderboardEntry[] = Object.entries(data.players)
      .map(([playerId, info]) => ({
        playerId,
        playerName: info.playerName,
        kills: info.kills || 0,
      }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 100); // Top 100

    console.log(`[LOG] Encontrados ${leaderboard.length} jogadores para ${weaponName}.`);
    return leaderboard;
  } catch (error) {
    console.error(`[ERRO] Falha ao buscar ranking para a arma ${weaponName}:`, error);
    return [];
  }
}

/**
 * Busca o leaderboard semanal de uma arma específica.
 * Usa a coleção weaponsRankingWeekly e o documento com ID `{weekId}_{weaponName}`.
 */
export async function getWeaponWeeklyLeaderboard(
  weaponName: string,
  weekId: string
): Promise<WeaponLeaderboardEntry[]> {
  console.log(`[LOG] Buscando ranking semanal da arma: ${weaponName} (${weekId})`);
  try {
    const docId = `${weekId}_${weaponName}`;
    const weaponDocRef = doc(db, 'weaponsRankingWeekly', docId);
    const weaponSnap = await getDoc(weaponDocRef);

    if (!weaponSnap.exists()) {
      return [];
    }

    const data = weaponSnap.data() as WeaponRankingDoc;

    if (!data.players) {
      return [];
    }

    return Object.entries(data.players)
      .map(([playerId, info]) => ({
        playerId,
        playerName: info.playerName,
        kills: info.kills || 0,
      }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 50);
  } catch (error) {
    console.error(`[ERRO] Falha ao buscar ranking semanal para ${weaponName}:`, error);
    return [];
  }
}
