'use server';

import { removeCheaters } from '@/ai/flows/remove-cheaters-from-leaderboard';
import type { Player } from '@/lib/types';

export async function cleanLeaderboardAction(
  players: Player[]
): Promise<{ success: boolean; data?: Player[]; error?: string }> {
  try {
    const leaderboardString = JSON.stringify(
      players,
      (key, value) => (key === 'performanceHistory' || key === 'avatarUrl' ? undefined : value),
      2
    );

    const cleanedLeaderboardString = await removeCheaters(leaderboardString);
    
    // The AI's output might be wrapped in markdown, so we need to extract the JSON part.
    const jsonMatch = cleanedLeaderboardString.match(/```json\n([\s\S]*?)\n```/);
    const jsonToParse = jsonMatch ? jsonMatch[1] : cleanedLeaderboardString;

    const cleanedPlayers: Player[] = JSON.parse(jsonToParse);
    
    // The AI only returns a subset of fields. We need to merge back the full data.
    const originalPlayerMap = new Map(players.map(p => [p.id, p]));
    const restoredPlayers = cleanedPlayers
      .map(cleanedPlayer => {
        const originalPlayer = originalPlayerMap.get(cleanedPlayer.id);
        return originalPlayer ? { ...originalPlayer, ...cleanedPlayer } : null;
      })
      .filter((p): p is Player => p !== null)
      .sort((a, b) => a.rank - b.rank);

    return { success: true, data: restoredPlayers };
  } catch (error) {
    console.error('Error cleaning leaderboard:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return { success: false, error: `Failed to parse AI response: ${errorMessage}` };
  }
}
