'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs, collectionGroup, where, getDoc } from 'firebase/firestore';
import type { GlobalWeaponStats, PlayerAggregates, WeaponLeaderboardEntry } from '@/lib/types';

// Fetches all weapons that have stats, ordered by total kills
export async function getAvailableWeapons(): Promise<Pick<GlobalWeaponStats, 'name'>[]> {
    try {
        const weaponsQuery = query(
          collection(db, 'globalWeaponStats'),
          orderBy('totalKills', 'desc'),
          limit(200) // Limit to 200 weapons max
        );

        const snapshot = await getDocs(weaponsQuery);

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            name: doc.data().name,
        }));

    } catch (error) {
        console.error('[ERRO] Falha ao buscar armas disponíveis:', error);
        return [];
    }
}


// Fetches the leaderboard for a specific weapon
export async function getWeaponLeaderboard(weaponName: string): Promise<WeaponLeaderboardEntry[]> {
    console.log(`[LOG] Fetching leaderboard for weapon: ${weaponName}`);
    try {
        const usageQuery = query(
            collectionGroup(db, 'weaponUsage'),
            where('name', '==', weaponName),
            orderBy('count', 'desc'),
            limit(100) // Top 100 players
        );

        const snapshot = await getDocs(usageQuery);

        if (snapshot.empty) {
            console.log(`[LOG] No usage data found for weapon: ${weaponName}`);
            return [];
        }

        const leaderboardPromises = snapshot.docs.map(async (doc) => {
            const usageData = doc.data() as { name: string; count: number };
            const playerRef = doc.ref.parent.parent;
            
            if (!playerRef) return null;

            const playerSnap = await getDoc(playerRef);
            if (!playerSnap.exists()) return null;
            
            const playerData = playerSnap.data() as PlayerAggregates;

            return {
                playerId: playerSnap.id,
                playerName: playerData.latestPlayerName,
                kills: usageData.count,
            };
        });

        const leaderboard = (await Promise.all(leaderboardPromises)).filter((p): p is WeaponLeaderboardEntry => p !== null);

        console.log(`[LOG] Found ${leaderboard.length} players for ${weaponName} leaderboard.`);
        return leaderboard;

    } catch (error) {
        console.error(`[ERRO] Falha ao buscar ranking para a arma ${weaponName}:`, error);
        return [];
    }
}
