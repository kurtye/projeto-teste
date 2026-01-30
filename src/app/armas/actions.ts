'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { GlobalWeaponStats } from '@/lib/types';

const WEAPON_QUERY_LIMIT = 100;

export async function getWeaponRanking(): Promise<GlobalWeaponStats[]> {
    console.log('[LOG] Fetching global weapon ranking...');

    try {
        const weaponsQuery = query(
          collection(db, 'globalWeaponStats'),
          orderBy('totalKills', 'desc'),
          limit(WEAPON_QUERY_LIMIT)
        );

        const snapshot = await getDocs(weaponsQuery);

        if (snapshot.empty) {
            console.log('[LOG] No global weapon stats found.');
            return [];
        }

        const weaponStats = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        } as GlobalWeaponStats));

        console.log(`[LOG] Fetched ${weaponStats.length} weapons for ranking.`);
        return weaponStats;

    } catch (error) {
        console.error('[ERRO GERAL] Falha ao buscar ranking de armas:', error);
        return [];
    }
}
