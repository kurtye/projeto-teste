export interface PlayerAggregates {
  id: string; // This will be the document ID (player_id)
  playerId: string;
  latestPlayerName: string;
  processedServers?: { [key: string]: number }; // Map of serverName to lastProcessedMatchId
  totalTimeSeconds?: number;
  longestLifeSecs?: number;
  totalKills?: number;
  totalDeaths?: number;
  totalCombat?: number;
  totalOffense?: number;
  totalDefense?: number;
  totalSupport?: number;
  totalTeamKills?: number;
  totalDeathsByTK?: number;
  
  // Calculated in the frontend
  totalScore?: number;
  kdRatio?: number;
}

export interface PlayerInteraction {
  id: string; // Will be the player name
  name: string;
  count: number;
}

export interface WeaponUsage {
  id: string; // Will be the weapon name
  name: string;
  count: number;
}
