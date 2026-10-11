import React from 'react';
import { MatchManager } from './_components/MatchManager';
import matchData1567 from '@/app/jsons/positions.json';
import matchData1600 from '@/app/jsons/positions2.json';

async function fetchMatchScoreboard(mapId: string) {
  try {
    const res = await fetch(`https://hrb-stats.hlladmin.com/api/get_map_scoreboard?map_id=${mapId}`, { 
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (e) {
    console.error("Failed to fetch scoreboard", e);
    return null;
  }
}

export default async function MatchAnalyzerPage({
  searchParams,
}: {
  searchParams?: Promise<{ match?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const targetMatchId = resolvedParams.match === '1567' ? '1567' : '1600';

  // Server-side initial data pre-load
  const initialTelemetry = targetMatchId === '1567' ? matchData1567 : matchData1600;
  const initialScoreboard = await fetchMatchScoreboard(targetMatchId);

  return (
    <div className="w-full px-4 py-6 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline uppercase">Analisador de Partidas</h1>
        <p className="text-muted-foreground">
          Analise táticas, movimentação, linhas de frente e métricas de desempenho de partidas competitivas.
        </p>
      </div>

      <MatchManager
        initialMatchId={targetMatchId}
        initialTelemetry={initialTelemetry}
        initialScoreboard={initialScoreboard}
      />
    </div>
  );
}
