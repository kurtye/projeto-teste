export interface PlayerAggregates {
  id: string; // This will be the document ID (steam_id_64)
  playerId: string;
  latestPlayerName: string;
  lastProcessedMatchId?: number;
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
  weaponUsage?: { [key: string]: number };
  mostKilledBy?: { [key:string]: number };
  mostKilledPlayers?: { [key: string]: number };
  
  // Calculated in the frontend
  totalScore?: number;
  kdRatio?: number;
}
