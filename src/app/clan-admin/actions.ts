
'use server';

import { db } from '@/firebase/server';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    writeBatch,
    deleteDoc,
    setDoc,
    getDoc,
    limit,
    or
} from 'firebase/firestore';
import type { ClanMember, PlayerAggregates } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Searches for players in the main playerAggregates collection by name.
 * Used for the "add member" autocomplete functionality.
 */
export async function searchPlayersByName(name: string): Promise<PlayerAggregates[]> {
    if (!name || name.length < 3) {
        return [];
    }

    try {
        const playersRef = collection(db, 'playerAggregates');
        const q = query(
            playersRef,
            where('latestPlayerName', '>=', name),
            where('latestPlayerName', '<=', name + '\uf8ff'),
            limit(10)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerAggregates));
    } catch (error) {
        console.error("Error searching players:", error);
        return [];
    }
}

/**
 * Adds a new member to a clan and updates the player's main document with the clan tag.
 */
export async function addClanMember(clanId: string, clanTag: string, player: PlayerAggregates): Promise<{ success: boolean, error?: string }> {
    try {
        const batch = writeBatch(db);

        // 1. Add player to the clan's members subcollection
        const memberRef = doc(db, 'clans', clanId, 'members', player.id);
        const newMember: Omit<ClanMember, 'id'> = {
            playerId: player.id,
            playerName: player.latestPlayerName,
            clanTag: clanTag,
            rank: 'Recruta', // Default rank
            status: 'trial', // Default status
        };
        batch.set(memberRef, newMember);

        // 2. Update the player's document in playerAggregates with the clan tag
        const playerRef = doc(db, 'playerAggregates', player.id);
        batch.update(playerRef, { clanTag: clanTag });

        await batch.commit();
        
        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error adding clan member:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Removes a member from a clan and removes the clan tag from the player's main document.
 */
export async function removeClanMember(clanId: string, playerId: string): Promise<{ success: boolean, error?: string }> {
     try {
        const batch = writeBatch(db);

        // 1. Remove player from the clan's members subcollection
        const memberRef = doc(db, 'clans', clanId, 'members', playerId);
        batch.delete(memberRef);

        // 2. Remove the clan tag from the player's document
        const playerRef = doc(db, 'playerAggregates', playerId);
        batch.update(playerRef, { clanTag: null }); // or FieldValue.delete()

        await batch.commit();

        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error removing clan member:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates a clan member's data (rank or status).
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
 * Syncs clan members by searching for players with the clan tag in their name
 * and adding them to the clan if they aren't already members.
 */
export async function syncClanMembersByTag(clanId: string, clanTag: string): Promise<{ success: boolean, addedCount: number, error?: string }> {
    console.log(`[LOG] Iniciando sincronização para o clã ${clanId} com a tag '${clanTag}'`);
    try {
        const playersRef = collection(db, 'playerAggregates');
        
        // This query now looks for names that start with "TAG " OR "[TAG]".
        // Firestore range queries are powerful for "startsWith" functionality.
        const q = query(
            playersRef,
             or(
                where('latestPlayerName', '>=', `${clanTag} `),
                where('latestPlayerName', '<', `${clanTag }z`),
                where('latestPlayerName', '>=', `[${clanTag}]`),
                where('latestPlayerName', '<', `[${clanTag}]z`)
            ),
            limit(500) // Limit to avoid reading too many documents at once.
        );

        const querySnapshot = await getDocs(q);
        
        // Manual filter because Firestore query is not exact for "startsWith"
        const playersWithTag = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as PlayerAggregates))
          .filter(p => 
            p.latestPlayerName.startsWith(`${clanTag} `) || 
            p.latestPlayerName.startsWith(`[${clanTag}]`)
          );

        console.log(`[LOG] Encontrados ${playersWithTag.length} jogadores com a tag.`);

        if (playersWithTag.length === 0) {
            console.log(`[LOG] Nenhum novo membro para adicionar.`);
            return { success: true, addedCount: 0 };
        }

        let addedCount = 0;
        const batch = writeBatch(db);

        for (const player of playersWithTag) {
            // Check if player is already in a clan.
            if (player.clanTag) {
                continue; // Skip players who are already in any clan.
            }

            const memberRef = doc(db, 'clans', clanId, 'members', player.id);
            const playerRef = doc(db, 'playerAggregates', player.id);

            const newMember: Omit<ClanMember, 'id'> = {
                playerId: player.id,
                playerName: player.latestPlayerName,
                clanTag: clanTag,
                rank: 'Recruta',
                status: 'trial',
            };

            batch.set(memberRef, newMember);
            batch.update(playerRef, { clanTag: clanTag });
            addedCount++;
        }
        
        if(addedCount > 0) {
            await batch.commit();
            console.log(`[LOG] ${addedCount} novos membros adicionados ao clã ${clanId}.`);
        } else {
            console.log(`[LOG] Nenhum novo membro para adicionar (jogadores encontrados já possuem clã).`);
        }

        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true, addedCount };
    } catch (error: any) {
        console.error(`[ERRO] Falha ao sincronizar membros do clã ${clanId}:`, error);
        return { success: false, addedCount: 0, error: error.message };
    }
}
