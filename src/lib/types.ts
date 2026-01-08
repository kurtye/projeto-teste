

export interface PlayerAggregates {
  id: string; // This will be the document ID (player_id)
  playerId: string;
  latestPlayerName: string;
  searchablePlayerName?: string; // For case-insensitive search
  processedServers?: { [key: string]: number }; // Map of serverName to lastProcessedMatchId
  matchesPlayed?: number;
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
  status?: 'retired'; // Field for player status

  // Calculated in the frontend
  totalScore?: number;
  kdRatio?: number;
}

export interface PlayerInteraction {
  id: string; // Will be the player name (or its Base64 representation)
  name: string;
  count: number;
}

export interface WeaponUsage {
  id: string; // Will be the weapon name (or its Base64 representation)
  name: string;
  count: number;
}

export interface GlobalStats {
  id: string; // Should be 'summary'
  maxTotalKills?: number;
  maxTotalCombat?: number;
  maxTotalOffense?: number;
  maxTotalDefense?: number;
  maxTotalSupport?: number;
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  adminUids: string[];
}

export interface ClanMember {
  id: string; // This will be the player's ID
  playerId: string;
  rank: string;
  status: 'active' | 'inactive' | 'trial';
}
