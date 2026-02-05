
'use server';

import { db } from '@/firebase/server';
import { 
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    orderBy,
    addDoc,
    serverTimestamp,
    limit,
    deleteDoc,
} from 'firebase/firestore';
import type { ClanMember, PlayerAggregates, PromotionLog, PlayerPeriodStats } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { clans } from '@/lib/clans';

const RANKS = [
    'Recruta',
    'Soldado',
    'Cabo',
    'Terceiro-Sargento',
    'Segundo-Sargento',
    'Primeiro-Sargento',
    'Subtenente',
    'Aspirante',
    'Segundo-Tenente',
    'Primeiro-Tenente',
    'Capitao',
    'Major',
    'Tenente-Coronel',
    'Coronel',
    'General-de-Brigada',
    'General-de-Divisao',
    'General-de-Exercito',
    'Marechal',
    'Subcomandante',
    'Comandante'
];

/**
 * Promotes a clan member to the next rank and logs the promotion.
 */
export async function promoteClanMember(clanId: string, memberId: string, currentRank: string): Promise<{ success: boolean; error?: string }> {
    try {
        const currentIndex = RANKS.indexOf(currentRank);
        if (currentIndex === -1 || currentIndex >= RANKS.length - 1) {
            return { success: false, error: "Este membro já está na patente máxima ou a patente atual é inválida." };
        }
        
        const newRank = RANKS[currentIndex + 1];

        const promotionLogRef = collection(db, 'clans', clanId, 'promotionLog');

        const memberDocQuery = query(collection(db, 'clans', clanId, 'members'), where('playerId', '==', memberId));
        const memberDocSnapshot = await getDocs(memberDocQuery);

        
        if (memberDocSnapshot.empty) {
            return { success: false, error: "Membro não encontrado para registrar a promoção." };
        }
        const memberDoc = memberDocSnapshot.docs[0];
        const memberData = memberDoc.data() as ClanMember;

        const batch = writeBatch(db);

        // Update member's rank
        batch.set(doc(db, 'clans', clanId, 'members', memberDoc.id), { rank: newRank }, { merge: true });

        // Create promotion log entry
        const promotionLogEntry: Omit<PromotionLog, 'id' | 'promotionDate'> & { promotionDate: any } = {
            playerId: memberId,
            playerName: memberData.playerName,
            oldRank: currentRank,
            newRank: newRank,
            promotionDate: serverTimestamp(),
        };
        batch.set(doc(promotionLogRef), promotionLogEntry);
        
        await batch.commit();

        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true };

    } catch (error: any) {
        console.error("Error promoting clan member:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Updates a clan member's data (rank or status).
 * This data is stored in a separate subcollection to not overwrite the main player aggregate.
 */
export async function updateClanMember(clanId: string, playerId: string, data: Partial<Pick<ClanMember, 'rank' | 'status'>>): Promise<{ success: boolean, error?: string }> {
    try {
        const memberRef = doc(db, 'clans', clanId, 'members', playerId);
        await setDoc(memberRef, data, { merge: true });

        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true };

    } catch (error: any) {
        console.error("Error updating clan member:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Finds players whose names match the clan tag but are not yet members.
 * It fetches the top 2000 players by kills and filters them.
 */
export async function findPotentialMembersByTag(clanId: string, clanTag: string): Promise<{ success: boolean, players?: PlayerAggregates[], error?: string }> {
  try {
    const playersQuery = query(
      collection(db, 'playerAggregates'),
      orderBy('totalKills', 'desc'),
      limit(2000)
    );
    
    const querySnapshot = await getDocs(playersQuery);
    const topPlayers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerAggregates));

    const membersCollection = collection(db, 'clans', clanId, 'members');
    const membersSnapshot = await getDocs(membersCollection);
    const existingMemberIds = new Set(membersSnapshot.docs.map(doc => doc.id));

    const tagUpper = clanTag.toUpperCase();
    const potentialPlayers = topPlayers.filter(p => {
      if (!p.latestPlayerName) return false;
      if (existingMemberIds.has(p.id)) return false;

      const nameParts = p.latestPlayerName.toUpperCase().split(/[\s\[\]\-|\\/._,()<>*+!?¿¡'"]+/);
      return nameParts.includes(tagUpper);
    });

    if (potentialPlayers.length === 0) {
        console.log(`[LOG] No new potential members found for tag: ${clanTag}`);
    }

    return { success: true, players: potentialPlayers };
  } catch (error: any) {
    console.error("Error finding potential members:", error);
    return { success: false, error: "Falha ao buscar jogadores. Verifique as permissões ou tente mais tarde." };
  }
}


/**
 * Adds a list of players to the clan's member subcollection.
 */
export async function addMembersToClan(clanId: string, players: PlayerAggregates[]): Promise<{ success: boolean, error?: string }> {
    if (!players || players.length === 0) {
        return { success: false, error: "No players selected to add." };
    }

    try {
        const batch = writeBatch(db);
        const membersCollectionRef = collection(db, 'clans', clanId, 'members');

        players.forEach(player => {
            const memberDocRef = doc(membersCollectionRef, player.id);
            const newMember: ClanMember = {
                id: player.id,
                playerId: player.id,
                playerName: player.latestPlayerName,
                rank: 'Recruta',
                status: 'trial',
                clanTag: clanId, // Assuming clanId is the tag, like 'smk'
            };
            batch.set(memberDocRef, newMember, { merge: true });
        });

        await batch.commit();
        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true };

    } catch (error: any) {
        console.error("Error adding members to clan:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches monthly stats for all members of a given clan for a specific period.
 */
export async function getClanMonthlyStats(clanId: string, periodId: string): Promise<{ success: boolean, stats?: (PlayerPeriodStats & { playerName: string })[], error?: string }> {
    try {
        // 1. Get all member IDs for the clan
        const membersRef = collection(db, 'clans', clanId, 'members');
        const membersSnapshot = await getDocs(membersRef);
        if (membersSnapshot.empty) {
            return { success: true, stats: [] };
        }
        const memberIds = membersSnapshot.docs.map(doc => doc.id);
        const memberNamesMap = new Map(membersSnapshot.docs.map(doc => [doc.id, doc.data().playerName]));

        // 2. Fetch monthly stats for those members for the given period
        // Firestore 'in' query is limited to 30 items. If a clan has more, we need to do multiple queries.
        const stats: (PlayerPeriodStats & { playerName: string })[] = [];
        const chunkSize = 30;
        for (let i = 0; i < memberIds.length; i += chunkSize) {
            const chunk = memberIds.slice(i, i + chunkSize);
            
            const statsQuery = query(
                collection(db, 'playerMonthlyStats'),
                where('periodId', '==', periodId),
                where('playerId', 'in', chunk)
            );

            const statsSnapshot = await getDocs(statsQuery);
            statsSnapshot.forEach(doc => {
                const data = doc.data() as PlayerPeriodStats;
                stats.push({
                    ...data,
                    id: doc.id,
                    playerId: data.playerId,
                    playerName: memberNamesMap.get(data.playerId) || data.latestPlayerName,
                });
            });
        }
        
        // 3. Sort the results by totalKills descending
        stats.sort((a, b) => (b.totalKills || 0) - (a.totalKills || 0));

        return { success: true, stats };
    } catch (error: any) {
        console.error("Error fetching clan monthly stats:", error);
        return { success: false, error: "Falha ao buscar estatísticas mensais do clã." };
    }
}
    
/**
 * Removes a member from a clan.
 */
export async function removeClanMember(clanId: string, memberId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const memberRef = doc(db, 'clans', clanId, 'members', memberId);
        await deleteDoc(memberRef);

        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true };

    } catch (error: any) {
        console.error("Error removing clan member:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Finds top active players in the current month who are not yet in any clan.
 * It also filters out players who have a known clan tag in their name.
 */
export async function findUnclaimedPlayers(): Promise<{ success: boolean, players?: PlayerPeriodStats[], error?: string }> {
    try {
        // 1. Get all player IDs that are already in a clan subcollection
        const allClanMemberIds = new Set<string>();
        for (const clan of clans) {
            const membersSnapshot = await getDocs(collection(db, 'clans', clan.id, 'members'));
            membersSnapshot.forEach(doc => {
                allClanMemberIds.add(doc.id);
            });
        }

        // 2. Determine current month periodId
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const periodId = `month_${year}-${month}`;

        // 3. Fetch top players from this month's stats
        const monthlyStatsQuery = query(
            collection(db, 'playerMonthlyStats'),
            where('periodId', '==', periodId),
            orderBy('totalKills', 'desc'),
            limit(200) // Fetch top 200 players of the month
        );

        const monthlyStatsSnapshot = await getDocs(monthlyStatsQuery);
        if (monthlyStatsSnapshot.empty) {
            return { success: true, players: [] };
        }
        
        const topMonthlyPlayers = monthlyStatsSnapshot.docs.map(doc => doc.data() as PlayerPeriodStats);

        // 4. Filter out players who are already in a clan's member list
        const playersNotInAClanList = topMonthlyPlayers.filter(player => !allClanMemberIds.has(player.playerId));
        
        // 5. Get all known clan tags for name filtering
        const allClanTags = clans.map(c => c.tag.toUpperCase());

        // 6. Filter out players who have a clan tag in their name from the remaining list
        const unclaimedPlayers = playersNotInAClanList.filter(player => {
            if (!player.latestPlayerName) return true; // Keep players without a name if any
            const nameParts = player.latestPlayerName.toUpperCase().split(/[\s\[\]\-|\\/._,()<>*+!?¿¡'"]+/);
            // Check if any part of the player's name matches a known clan tag
            const hasKnownTag = nameParts.some(part => allClanTags.includes(part));
            return !hasKnownTag; // Return true only if the player does NOT have a known tag in their name
        });
        
        return { success: true, players: unclaimedPlayers };

    } catch (error: any) {
        console.error("Error finding unclaimed players:", error);
        return { success: false, error: "Falha ao buscar jogadores sem clã." };
    }
}
    




