export interface Player {
  id: string;
  rank: number;
  name: string;
  avatarUrl: string;
  kills: number;
  deaths: number;
  assists: number;
  revives: number;
  kdRatio: number;
  winRate: number;
  matchesPlayed: number;
  server: 'EU Central' | 'US East' | 'Asia Pacific';
  performanceHistory: { month: string; kills: number; deaths: number }[];
  isCheater?: boolean;
}
