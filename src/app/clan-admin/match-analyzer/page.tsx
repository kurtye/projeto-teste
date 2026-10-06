import React from 'react';
import { MatchReplay } from './_components/MatchReplay';
// We load the local JSON for now. 
// In the future this can be fetched from Firebase Storage or an API
import matchData from '@/app/jsons/positions.json';

async function fetchMatchScoreboard(mapId: string) {
  try {
    const res = await fetch(`https://hrb-stats.hlladmin.com/api/get_map_scoreboard?map_id=${mapId}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    return data.result;
  } catch (e) {
    console.error("Failed to fetch scoreboard", e);
    return null;
  }
}

export default async function MatchAnalyzerPage() {
  // Hardcoded match ID for the current JSON
  const scoreboard = await fetchMatchScoreboard('1567');
  const capFlips = scoreboard?.cap_flips || [];
  const playerStats = scoreboard?.player_stats || [];

  return (
    <div className="w-full px-4 py-6 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline uppercase">Analisador de Partidas</h1>
        <p className="text-muted-foreground">Analise táticas, movimentação e estatísticas de partidas competitivas.</p>
      </div>

      <MatchReplay matchData={matchData as any} capFlips={capFlips} playerStats={playerStats} />
    </div>
  );
}
