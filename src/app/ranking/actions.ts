
'use server';

import { db } from '@/firebase/server';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { PlayerAggregates, ClanMember, ClanMemberInfo } from '@/lib/types';
import { getWeek, getWeekYear } from 'date-fns';
import { clans } from '@/lib/clans';
import { unstable_cache } from 'next/cache';

// Limite de jogadores por query de ranking
const QUERY_LIMIT = 500;

// Tempo de cache em segundos (60s = 1 min)
const CACHE_TTL = 60;

function sanitizePlayer(id: string, data: any): PlayerAggregates {
  return {
    id: String(id || ''),
    playerId: String(data.playerId || id || ''),
    latestPlayerName: String(data.playerName || data.latestPlayerName || 'Unknown'),
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

async function _getMonthlyPlayerStats(monthId: string): Promise<PlayerAggregates[]> {
    const q = query(
        collection(db, 'monthly_player_stats'),
        where('month', '==', monthId),
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

export const getMonthlyPlayerStats = unstable_cache(
    _getMonthlyPlayerStats,
    ['monthly-player-stats'],
    { revalidate: CACHE_TTL }
);

export const getAllClanMembers = unstable_cache(
    _getAllClanMembers,
    ['all-clan-members'],
    { revalidate: 3600 }
);
