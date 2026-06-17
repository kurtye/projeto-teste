
'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { PlayerAggregates, ClanMember, ClanMemberInfo } from '@/lib/types';
import { getWeek, getWeekYear } from 'date-fns';
import { clans } from '@/lib/clans';
import { unstable_cache } from 'next/cache';

// Limite aumentado para mostrar mais jogadores no ranking. A esterilização manual e o JSON.parse já previnem o RangeError do Next.js
const QUERY_LIMIT = 1000;

// Tempo de cache em segundos (60s = 1 min)
const CACHE_TTL = 60;

function sanitizePlayer(id: string, data: any): PlayerAggregates {
  return {
    id: String(id || ''),
    playerId: String(data.playerId || id || ''),
    latestPlayerName: String(data.latestPlayerName || 'Unknown'),
    totalKills: Number(data.totalKills || 0),
    totalDeaths: Number(data.totalDeaths || 0),
    totalScore: Number(data.totalScore || 0),
    totalCombat: Number(data.totalCombat || 0),
    totalOffense: Number(data.totalOffense || 0),
    totalDefense: Number(data.totalDefense || 0),
    totalSupport: Number(data.totalSupport || 0),
    totalTimeSeconds: Number(data.totalTimeSeconds || 0),
    status: data.status === 'retired' ? 'retired' : undefined,
  };
}

// --- Funções internas (sem cache) ---

async function _getPlayerAggregates(): Promise<PlayerAggregates[]> {
    const playersQuery = query(
      collection(db, 'playerAggregates'),
      orderBy('totalKills', 'desc'),
      limit(QUERY_LIMIT)
    );

    const snapshot = await getDocs(playersQuery);
    const data = snapshot.docs.map(doc => sanitizePlayer(doc.id, doc.data()));
    return JSON.parse(JSON.stringify(data));
}

async function _getPlayerPeriodStats(period: 'weekly' | 'monthly'): Promise<PlayerAggregates[]> {
    const now = new Date();
    let colName: string;
    let periodId: string;
    
    if (period === 'weekly') {
        colName = 'playerWeeklyStats';
        const year = getWeekYear(now, { weekStartsOn: 1 });
        const week = getWeek(now, { weekStartsOn: 1 });
        periodId = `week_${year}-${week.toString().padStart(2, "0")}`;
    } else { // monthly
        colName = 'playerMonthlyStats';
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        periodId = `month_${year}-${month}`;
    }

    const q = query(
        collection(db, colName),
        where('periodId', '==', periodId),
        orderBy('totalKills', 'desc'),
        limit(QUERY_LIMIT)
    );
    
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return sanitizePlayer(d.playerId || docSnap.id, d);
    });
    return JSON.parse(JSON.stringify(data));
}

async function _getAllClanMembers(): Promise<Record<string, ClanMemberInfo>> {
    const memberMap: Record<string, ClanMemberInfo> = {};

    // Busca todos os clãs em paralelo em vez de sequencialmente
    const results = await Promise.all(
        clans.map(async (clan) => {
            const membersRef = collection(db, 'clans', clan.id, 'members');
            try {
                const snapshot = await getDocs(membersRef);
                const members: { playerId: string; info: ClanMemberInfo }[] = [];
                snapshot.forEach(docSnap => {
                    const memberData = docSnap.data() as ClanMember;
                    members.push({
                        playerId: memberData.playerId,
                        info: {
                            clanId: clan.id,
                            clanTag: clan.tag,
                            clanName: clan.name,
                            clanLogoUrl: clan.logoUrl || '',
                            rank: String(memberData.rank || 'Recruta'),
                        },
                    });
                });
                return members;
            } catch (error) {
                console.error(`Error fetching members for clan ${clan.id}:`, error);
                return [];
            }
        })
    );

    for (const clanMembers of results) {
        for (const member of clanMembers) {
            memberMap[member.playerId] = member.info;
        }
    }

    return JSON.parse(JSON.stringify(memberMap));
}

// --- Funções exportadas com cache de 60s ---

export const getPlayerAggregates = unstable_cache(
    _getPlayerAggregates,
    ['ranking-player-aggregates'],
    { revalidate: CACHE_TTL }
);

export const getPlayerPeriodStats = unstable_cache(
    _getPlayerPeriodStats,
    ['ranking-player-period-stats'],
    { revalidate: CACHE_TTL }
);

export const getAllClanMembers = unstable_cache(
    _getAllClanMembers,
    ['ranking-clan-members'],
    { revalidate: CACHE_TTL }
);
