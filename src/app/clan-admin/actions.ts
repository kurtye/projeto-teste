
'use server';

import { db } from '@/firebase/server';
import { 
    doc,
    setDoc,
} from 'firebase/firestore';
import type { ClanMember } from '@/lib/types';
import { revalidatePath } from 'next/cache';


/**
 * Updates a clan member's data (rank or status).
 * This data is stored in a separate subcollection to not overwrite the main player aggregate.
 */
export async function updateClanMember(clanId: string, playerId: string, data: Partial<Pick<ClanMember, 'rank' | 'status'>>): Promise<{ success: boolean, error?: string }> {
    try {
        // The document ID in the 'members' subcollection is the player's ID
        const memberRef = doc(db, 'clans', clanId, 'members', playerId);
        
        // Use setDoc with merge to create or update the document with rank/status info.
        await setDoc(memberRef, data, { merge: true });

        // Revalidate the dashboard path to show the updated data
        revalidatePath(`/clan-admin/dashboard/${clanId}`);
        return { success: true };

    } catch (error: any) {
        console.error("Error updating clan member:", error);
        return { success: false, error: error.message };
    }
}

    