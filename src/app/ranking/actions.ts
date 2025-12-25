
'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { PlayerAggregates } from '@/lib/types';
import { getYear, getWeek, format } from 'date-fns';

const QUERY_LIMIT = 2000;

export async function getPlayerAggregates(): Promise<PlayerAggregates[]> {
    const playersQuery = query(
      collection(db, 'playerAggregates'),
      orderBy('totalKills', 'desc'),
      limit(QUERY_LIMIT)
    );

    const snapshot = await getDocs(playersQuery);
    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
    } as PlayerAggregates));
}

export async function getPlayerPeriodStats(period: 'weekly' | 'monthly'): Promise<PlayerAggregates[]> {
    const now = new Date();
    let collectionName: string;
    
    if (period === 'weekly') {
        collectionName = 'playerWeeklyStats';
    } else {
        collectionName = 'playerMonthlyStats';
    }

    const playersQuery = query(
        collection(db, collectionName),
        orderBy('totalKills', 'desc'),
        limit(QUERY_LIMIT)
    );
    
    const snapshot = await getDocs(playersQuery);
    if (snapshot.empty) {
        return [];
    }

    // Mapeia para o tipo PlayerAggregates para reutilizar o componente do frontend
    return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.data().playerId // O ID do documento é composto, então pegamos o playerId de dentro dos dados
    } as PlayerAggregates));
}
