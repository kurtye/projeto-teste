
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
    orderBy
} from 'firebase/firestore';
import type { ClanMember, PlayerAggregates } from '@/lib/types';
import { revalidatePath } from 'next/cache';


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
    // 1. Get all players. This is inefficient but necessary for a "contains" search without a dedicated search service.
    // NOTE: This will be very slow and expensive on large datasets. For production, a search service like Algolia or Typesense is recommended.
    const playersQuery = query(collection(db, 'playerAggregates'));
    const querySnapshot = await getDocs(playersQuery);
    
    // Server-side filtering to find names containing the tag.
    const upperCaseClanTag = clanTag.toUpperCase();
    const potentialPlayers = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as PlayerAggregates))
      .filter(p => p.latestPlayerName.toUpperCase().includes(upperCaseClanTag));

    // 2. Get all current members of the clan to avoid suggesting existing ones
    const membersCollection = collection(db, 'clans', clanId, 'members');
    const membersSnapshot = await getDocs(membersCollection);
    const existingMemberIds = new Set(membersSnapshot.docs.map(doc => doc.id));

    // 3. Filter out players who are already members
    const newPlayers = potentialPlayers.filter(p => !existingMemberIds.has(p.id));

    if (newPlayers.length === 0) {
        // This is expected if the database is empty or no new players with the tag are found.
        console.log(`[LOG] No new potential members found for tag: ${clanTag}`);
    }

    return { success: true, players: newPlayers };
  } catch (error: any) {
    console.error("Error finding potential members:", error);
    return { success: false, error: error.message };
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
    
