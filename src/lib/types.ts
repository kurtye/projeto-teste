
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

export interface MonthlyPlayerStats {
  id: string; // YYYY_MM_playerId
  playerId: string;
  playerName: string;
  month: string; // YYYY_MM

  // Agregações
  totalKills: number;
  totalDeaths: number;
  totalCombat: number;
  totalOffense: number;
  totalDefense: number;
  totalSupport: number;
  totalTimeSeconds?: number;
  matchesPlayed?: number; // Partidas jogadas
  
  totalVehicleKills?: number;
  totalVehiclesDestroyed?: number;
  totalTeamkills?: number;
  deathsByTk?: number; // Mortes por TK
  
  // Máximos
  longestLifeSecs?: number;
  maxKillsStreak: number;

  // Roles
  timePlayedByRole?: Record<number, number>; // key is role id
  mainRole?: number;
  topWeapons?: Record<string, number>;
  topVictims?: Record<string, number>; // Quem ele mais matou
  topKilledBy?: Record<string, number>; // Quem mais matou ele
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
  // Filled by the preferences form
  primaryRole?: string;
  secondaryRole?: string;
  secondaryRole2?: string;
  roleToLearn?: string;
  playstyle?: string;
  notes?: string;
  preferencesUpdatedAt?: any;
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

export interface PlayerPreference {
  memberId?: string;
  playerName: string;
  primaryRole: string;
  secondaryRole: string;
  playstyle: string;
  updatedAt?: any;
}
