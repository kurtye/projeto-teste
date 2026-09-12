'use server';

import { db } from '@/firebase/server';
import { collection, getDocs, orderBy, query, limit, where } from 'firebase/firestore';
import type { PlayerAggregates } from '@/lib/types';
import { clans, getClanFromPlayerName } from '@/lib/clans';

export interface ClanStats {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string;
  memberCount: number;
  totalKills: number;
  totalDeaths: number;
  totalCombat: number;
  totalOffense: number;
  totalDefense: number;
  totalSupport: number;
  totalScore: number;
  totalTimeSeconds: number;
  avgKD: number;
  avgScorePerMember: number;
  avgKillsPerMember: number;
  avgOffensePerMember: number;
  avgDefensePerMember: number;
  avgSupportPerMember: number;
  avgCombatPerMember: number;
  topPlayers: { id: string; name: string; score: number; kills: number }[];
}

export interface ClanHighlight {
  category: string;
  label: string;
  emoji: string;
  clan: ClanStats;
  value: number;
}

export async function getClanRankingStats(): Promise<{
  rankings: ClanStats[];
  highlights: ClanHighlight[];
}> {
  console.log('[LOG] Calculando estatísticas de clãs...');

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const periodId = `month_${year}-${month}`;

    const playersQuery = query(
      collection(db, 'playerMonthlyStats'),
      where('periodId', '==', periodId),
      orderBy('totalKills', 'desc'),
      limit(5000)
    );
    const snapshot = await getDocs(playersQuery);

    // Group players by clan using name-based detection
    const clanPlayersMap: Record<string, PlayerAggregates[]> = {};

    // Initialize all known clans
    for (const clan of clans) {
      clanPlayersMap[clan.tag] = [];
    }

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const player: PlayerAggregates = {
        id: doc.id,
        playerId: data.playerId || doc.id,
        latestPlayerName: data.latestPlayerName || 'Unknown',
        totalKills: Number(data.totalKills || 0),
        totalDeaths: Number(data.totalDeaths || 0),
        totalCombat: Number(data.totalCombat || 0),
        totalOffense: Number(data.totalOffense || 0),
        totalDefense: Number(data.totalDefense || 0),
        totalSupport: Number(data.totalSupport || 0),
        totalTimeSeconds: Number(data.totalTimeSeconds || 0),
      };

      const detectedClan = getClanFromPlayerName(player.latestPlayerName);
      if (detectedClan) {
        if (!clanPlayersMap[detectedClan.tag]) {
          clanPlayersMap[detectedClan.tag] = [];
        }
        clanPlayersMap[detectedClan.tag].push(player);
      }
    });

    // Calculate stats for each clan
    const rankings: ClanStats[] = clans
      .map(clan => {
        const players = clanPlayersMap[clan.tag] || [];
        const memberCount = players.length;

        if (memberCount === 0) {
          return null;
        }

        const totalKills = players.reduce((sum, p) => sum + (p.totalKills || 0), 0);
        const totalDeaths = players.reduce((sum, p) => sum + (p.totalDeaths || 0), 0);
        const totalCombat = players.reduce((sum, p) => sum + (p.totalCombat || 0), 0);
        const totalOffense = players.reduce((sum, p) => sum + (p.totalOffense || 0), 0);
        const totalDefense = players.reduce((sum, p) => sum + (p.totalDefense || 0), 0);
        const totalSupport = players.reduce((sum, p) => sum + (p.totalSupport || 0), 0);
        const totalTimeSeconds = players.reduce((sum, p) => sum + (p.totalTimeSeconds || 0), 0);
        const totalScore = totalCombat + totalOffense + totalDefense + totalSupport;

        const avgKD = totalDeaths > 0 ? totalKills / totalDeaths : 0;

        // Top 3 players by total score
        const topPlayers = players
          .map(p => ({
            id: p.id,
            name: p.latestPlayerName,
            score: (p.totalCombat || 0) + (p.totalOffense || 0) + (p.totalDefense || 0) + (p.totalSupport || 0),
            kills: p.totalKills || 0,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        const result: ClanStats = {
          id: clan.id,
          name: clan.name,
          tag: clan.tag,
          logoUrl: clan.logoUrl,
          memberCount,
          totalKills,
          totalDeaths,
          totalCombat,
          totalOffense,
          totalDefense,
          totalSupport,
          totalScore,
          totalTimeSeconds,
          avgKD: Math.round(avgKD * 100) / 100,
          avgScorePerMember: Math.round(totalScore / memberCount),
          avgKillsPerMember: Math.round(totalKills / memberCount),
          avgOffensePerMember: Math.round(totalOffense / memberCount),
          avgDefensePerMember: Math.round(totalDefense / memberCount),
          avgSupportPerMember: Math.round(totalSupport / memberCount),
          avgCombatPerMember: Math.round(totalCombat / memberCount),
          topPlayers,
        };
        return result;
      })
      .filter((c): c is ClanStats => c !== null)
      .sort((a, b) => b.totalScore - a.totalScore);

    // Generate highlights (best clan in each category)
    const highlights: ClanHighlight[] = [];

    if (rankings.length > 0) {
      const bestOffense = [...rankings].sort((a, b) => b.avgOffensePerMember - a.avgOffensePerMember)[0];
      highlights.push({ category: 'offense', label: 'Clã Mais Ofensivo', emoji: '🗡️', clan: bestOffense, value: bestOffense.avgOffensePerMember });

      const bestDefense = [...rankings].sort((a, b) => b.avgDefensePerMember - a.avgDefensePerMember)[0];
      highlights.push({ category: 'defense', label: 'Clã Mais Defensivo', emoji: '🛡️', clan: bestDefense, value: bestDefense.avgDefensePerMember });

      const bestSupport = [...rankings].sort((a, b) => b.avgSupportPerMember - a.avgSupportPerMember)[0];
      highlights.push({ category: 'support', label: 'Clã Mais Suportivo', emoji: '💚', clan: bestSupport, value: bestSupport.avgSupportPerMember });

      const bestKD = [...rankings].sort((a, b) => b.avgKD - a.avgKD)[0];
      highlights.push({ category: 'kd', label: 'Clã Mais Letal', emoji: '⚔️', clan: bestKD, value: bestKD.avgKD });

      const bestTime = [...rankings].sort((a, b) => (b.totalTimeSeconds / b.memberCount) - (a.totalTimeSeconds / a.memberCount))[0];
      const avgHours = Math.round((bestTime.totalTimeSeconds / bestTime.memberCount) / 3600);
      highlights.push({ category: 'time', label: 'Clã Mais Dedicado', emoji: '⏱️', clan: bestTime, value: avgHours });
    }

    console.log(`[LOG] Estatísticas de clãs calculadas. ${rankings.length} clãs com membros.`);
    return JSON.parse(JSON.stringify({ rankings, highlights }));
  } catch (error) {
    console.error('[ERRO] Falha ao calcular estatísticas de clãs:', error);
    return { rankings: [], highlights: [] };
  }
}
