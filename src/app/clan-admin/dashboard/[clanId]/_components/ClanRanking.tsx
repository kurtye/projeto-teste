'use client';

import type { PlayerAggregates } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Medal, Sword, Shield, HeartPulse, Crosshair, Clock, RefreshCw, TrendingUp } from 'lucide-react';
import { useState, useTransition, useMemo } from 'react';
import { getClanMemberAggregates } from '../../../actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ClanRankingProps {
  clanId: string;
}

type SortKey = 'totalScore' | 'totalKills' | 'totalCombat' | 'totalOffense' | 'totalDefense' | 'totalSupport' | 'totalTimeSeconds';

interface ColumnDef {
  key: SortKey;
  label: string;
  icon: React.ElementType;
  formatter: (val: number) => string;
}

const columns: ColumnDef[] = [
  { key: 'totalScore', label: 'Pontuação', icon: Trophy, formatter: (val) => val.toLocaleString() },
  { key: 'totalKills', label: 'Kills', icon: Crosshair, formatter: (val) => val.toLocaleString() },
  { key: 'totalCombat', label: 'Combate', icon: Sword, formatter: (val) => val.toLocaleString() },
  { key: 'totalOffense', label: 'Ataque', icon: Sword, formatter: (val) => val.toLocaleString() },
  { key: 'totalDefense', label: 'Defesa', icon: Shield, formatter: (val) => val.toLocaleString() },
  { key: 'totalSupport', label: 'Suporte', icon: HeartPulse, formatter: (val) => val.toLocaleString() },
  { key: 'totalTimeSeconds', label: 'Horas', icon: Clock, formatter: (val) => `${Math.floor(val / 3600)}h` },
];

function getRankBadge(position: number) {
  if (position === 0) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bold">🥇 1°</Badge>;
  if (position === 1) return <Badge className="bg-gray-400/20 text-gray-300 border-gray-400/30 font-bold">🥈 2°</Badge>;
  if (position === 2) return <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30 font-bold">🥉 3°</Badge>;
  return <span className="text-muted-foreground text-sm font-mono">{position + 1}°</span>;
}

export function ClanRanking({ clanId }: ClanRankingProps) {
  const [players, setPlayers] = useState<(PlayerAggregates & { totalScore: number })[]>([]);
  const [isFetching, startFetching] = useTransition();
  const [hasFetched, setHasFetched] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({
    key: 'totalScore',
    direction: 'descending',
  });

  const handleFetch = () => {
    startFetching(async () => {
      const result = await getClanMemberAggregates(clanId);
      if (result.success && result.players) {
        const withScore = result.players.map(p => ({
          ...p,
          totalScore: (p.totalCombat || 0) + (p.totalOffense || 0) + (p.totalDefense || 0) + (p.totalSupport || 0),
        }));
        setPlayers(withScore);
      }
      setHasFetched(true);
    });
  };

  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const valA = (a[sortConfig.key] as number) || 0;
      const valB = (b[sortConfig.key] as number) || 0;
      if (sortConfig.direction === 'ascending') return valA - valB;
      return valB - valA;
    });
  }, [players, sortConfig]);

  // Top 3 stats
  const topPlayer = sortedPlayers[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-accent" />
                Ranking Geral do Clã
              </CardTitle>
              <CardDescription>
                Pontuação total dos membros baseada em Combate + Ataque + Defesa + Suporte.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {players.length > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-accent">{players.length}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Membros</p>
                </div>
              )}
              <Button onClick={handleFetch} disabled={isFetching}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                {isFetching ? 'Carregando...' : hasFetched ? 'Atualizar' : 'Carregar Ranking'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasFetched && !isFetching ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-4 rounded-full bg-accent/10">
                <Trophy className="h-12 w-12 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Ranking de Pontuação</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Clique em &quot;Carregar Ranking&quot; para buscar as estatísticas agregadas de todos os membros do clã.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Top 3 highlight cards */}
              {sortedPlayers.length >= 3 && sortConfig.key === 'totalScore' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {sortedPlayers.slice(0, 3).map((player, i) => {
                    const colors = [
                      'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20',
                      'from-gray-400/10 to-gray-400/5 border-gray-400/20',
                      'from-orange-600/10 to-orange-600/5 border-orange-600/20',
                    ];
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <Card key={player.id} className={cn("bg-gradient-to-br border", colors[i])}>
                        <CardContent className="pt-6 text-center">
                          <span className="text-3xl">{medals[i]}</span>
                          <Link
                            href={`/player/${encodeURIComponent(player.id)}`}
                            className="block mt-2 font-bold text-lg truncate hover:underline hover:text-accent"
                          >
                            {player.latestPlayerName}
                          </Link>
                          <p className="text-2xl font-black text-accent mt-1">
                            {player.totalScore.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">pontos</p>
                          <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>{(player.totalKills || 0).toLocaleString()} kills</span>
                            <span>{Math.floor((player.totalTimeSeconds || 0) / 3600)}h jogadas</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Jogador</TableHead>
                      {columns.map(col => {
                        const isActive = sortConfig.key === col.key;
                        const directionIcon = sortConfig.direction === 'ascending' ? '▲' : '▼';
                        return (
                          <TableHead key={col.key} className="text-right">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort(col.key)}
                              className="group h-auto p-2 justify-end w-full"
                            >
                              {col.label}
                              <span className={cn(
                                "ml-1 transition-opacity text-xs",
                                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                              )}>
                                {directionIcon}
                              </span>
                            </Button>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFetching ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          {columns.map(col => (
                            <TableCell key={col.key} className="text-right">
                              <Skeleton className="h-5 w-16 ml-auto" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : sortedPlayers.length > 0 ? (
                      sortedPlayers.map((player, index) => (
                        <TableRow key={player.id} className={cn(index < 3 && "bg-accent/5")}>
                          <TableCell>{getRankBadge(index)}</TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/player/${encodeURIComponent(player.id)}`}
                              className="hover:underline hover:text-accent truncate max-w-[180px] block"
                            >
                              {player.latestPlayerName}
                            </Link>
                          </TableCell>
                          {columns.map(col => (
                            <TableCell
                              key={col.key}
                              className={cn(
                                "text-right",
                                col.key === sortConfig.key && "font-semibold text-accent"
                              )}
                            >
                              {col.formatter((player[col.key] as number) || 0)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                          Nenhum membro encontrado com estatísticas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
