
'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { PlayerAggregates, ClanMember, ClanMemberInfo } from '@/lib/types';
import { getWeek, getWeekYear, format } from 'date-fns';
import { clans } from '@/lib/clans';

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
    let periodId: string;
    
    if (period === 'weekly') {
        collectionName = 'playerWeeklyStats';
        const year = getWeekYear(now, { weekStartsOn: 1 });
        const week = getWeek(now, { weekStartsOn: 1 });
        periodId = `week_${year}-${week.toString().padStart(2, "0")}`;
    } else { // monthly
        collectionName = 'playerMonthlyStats';
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        periodId = `month_${year}-${month}`;
    }

    const playersQuery = query(
        collection(db, collectionName),
        where('periodId', '==', periodId),
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

export async function getAllClanMembers(): Promise<Record<string, ClanMemberInfo>> {
    const memberMap: Record<string, ClanMemberInfo> = {};

    const allClans = clans; 

    for (const clan of allClans) {
        const membersCollectionRef = collection(db, 'clans', clan.id, 'members');
        const membersQuery = query(membersCollectionRef);
        try {
            const membersSnapshot = await getDocs(membersQuery);
            membersSnapshot.forEach(doc => {
                const memberData = doc.data() as ClanMember;
                memberMap[memberData.playerId] = {
                    clanId: clan.id,
                    clanTag: clan.tag,
                    clanName: clan.name,
                    clanLogoUrl: clan.logoUrl,
                    rank: memberData.rank,
                };
            });
        } catch (error) {
            console.error(`Error fetching members for clan ${clan.id}:`, error);
        }
    }

    return memberMap;
}
