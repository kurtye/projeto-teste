
export interface PlayerAggregates {
  id: string; // This will be the document ID (player_id)
  playerId: string;
  latestPlayerName: string;
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

export interface PlayerPeriodStats {
  id: string; // Document ID
  playerId: string;
  latestPlayerName: string;
  periodId: string; // e.g., 'week_2024-32' or 'month_2024-08'
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
  adminEmails: string[];
  logoUrl?: string;
}

export interface ClanMember {
  id: string; // This will be the player's ID from playerAggregates
  playerId: string;
  playerName: string;
  rank: string;
  status: 'active' | 'inactive' | 'trial';
  clanTag: string;
  preferredClasses?: string[];
}

export interface PromotionLog {
    id: string;
    playerId: string;
    playerName: string;
    oldRank: string;
    newRank: string;
    promotionDate: {
        seconds: number;
        nanoseconds: number;
    } | Date;
}

export interface ClanMemberInfo {
  clanId: string;
  clanTag: string;
  clanName: string;
  clanLogoUrl?: string;
  rank: string;
}

export interface GlobalWeaponStats {
  id: string;
  name: string;
  totalKills: number;
}

export interface WeaponLeaderboardEntry {
  playerId: string;
  playerName: string;
  kills: number;
}
