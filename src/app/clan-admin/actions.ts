
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
    and,
    addDoc,
    serverTimestamp,
    limit,
} from 'firebase/firestore';
import type { ClanMember, PlayerAggregates, PromotionLog } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getWeek, getWeekYear } from 'date-fns';

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
    'Marechal'
];

const CLAN_TAGS = ['SMK', 'HRB', 'RZN', 'OCL', '3LPZ', 'WRT', 'SAP', 'BOLD', 'IDG', 'SOH'];

/**
 * Checks if a player name contains any of the known clan tags.
 * The check is case-insensitive.
 * @param playerName - The name of the player.
 * @returns True if a clan tag is found, false otherwise.
 */
function hasClanTag(playerName: string): boolean {
  if (!playerName) return false;
  const upperPlayerName = playerName.toUpperCase();
  return CLAN_TAGS.some(tag => upperPlayerName.includes(`[${tag}]`) || upperPlayerName.includes(tag));
}

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

        const memberRef = doc(db, 'clans', clanId, 'members', memberId);
        const promotionLogRef = collection(db, 'clans', clanId, 'promotionLog');

        const memberDocQuery = query(collection(db, 'clans', clanId, 'members'), where('playerId', '==', memberId));
        const memberDocSnapshot = await getDocs(memberDocQuery);

        
        if (memberDocSnapshot.empty) {
            return { success: false, error: "Membro não encontrado para registrar a promoção." };
        }
        const memberData = memberDocSnapshot.docs[0].data() as ClanMember;

        const batch = writeBatch(db);

        // Update member's rank
        batch.set(doc(db, 'clans', clanId, 'members', memberData.id), { rank: newRank }, { merge: true });

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
 * This function is more robust and uses a simpler query with server-side filtering.
 */
export async function findPotentialMembersByTag(clanId: string, clanTag: string): Promise<{ success: boolean, players?: PlayerAggregates[], error?: string }> {
  try {
    
    // This query is broad but necessary to find names that contain the tag anywhere.
    const playersQuery = query(collection(db, 'playerAggregates'));
    
    const querySnapshot = await getDocs(playersQuery);
    
    const potentialPlayers = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as PlayerAggregates))
      // Filter on the server side to find tags anywhere in the name
      .filter(p => {
        const upperName = p.latestPlayerName.toUpperCase();
        return upperName.includes(clanTag.toUpperCase());
      });

    // Get all current members of the clan to avoid suggesting existing ones
    const membersCollection = collection(db, 'clans', clanId, 'members');
    const membersSnapshot = await getDocs(membersCollection);
    const existingMemberIds = new Set(membersSnapshot.docs.map(doc => doc.id));

    // Filter out players who are already members
    const newPlayers = potentialPlayers.filter(p => !existingMemberIds.has(p.id));

    if (newPlayers.length === 0) {
        console.log(`[LOG] No new potential members found for tag: ${clanTag}`);
    }

    return { success: true, players: newPlayers };
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
 * Finds top players from the monthly stats who do not have a known clan tag.
 */
export async function findLoneWolves(): Promise<{ success: boolean, players?: PlayerAggregates[], error?: string }> {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const periodId = `month_${year}-${month}`;

        const monthlyStatsQuery = query(
            collection(db, 'playerMonthlyStats'),
            where('periodId', '==', periodId),
            orderBy('totalKills', 'desc'),
            limit(100) // Fetch top 100 players of the month
        );

        const snapshot = await getDocs(monthlyStatsQuery);
        
        const allMonthlyPlayers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().playerId } as PlayerAggregates));
        
        // Filter out players who have a known clan tag
        const loneWolves = allMonthlyPlayers.filter(player => !hasClanTag(player.latestPlayerName));

        return { success: true, players: loneWolves };

    } catch (error: any) {
        console.error("Error finding lone wolves:", error);
        return { success: false, error: "Falha ao buscar jogadores sem clã." };
    }
}
    

    