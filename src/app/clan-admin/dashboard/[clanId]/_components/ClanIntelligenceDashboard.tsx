'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import type { MonthlyPlayerStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Trophy, Activity, Sword, Shield, HeartPulse, Crosshair, Users, Skull, Flame, Target, Truck, Zap, Star, UserX, Clock, Medal } from 'lucide-react';
import { getClanMonthlyAggregates, syncPlayerElo, getPlayerNamesByIds } from '../../../actions';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_MAPPING } from '@/lib/roles';
import { format, subMonths } from 'date-fns';

interface ClanIntelligenceDashboardProps {
  clanId: string;
  isPublic?: boolean;
}

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0h';
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
}

// Colors for PieChart
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#a8a29e'];

export function getDivision(mainRole: number | undefined) {
    if (mainRole === undefined) return { name: 'Desconhecida', color: 'text-gray-500', icon: Info };
    const roleName = ROLE_MAPPING[mainRole]?.name;
    
    if (['Officer', 'Spotter', 'Tank Commander'].includes(roleName)) {
        return { name: 'Liderança', color: 'text-yellow-500', icon: Star };
    }
    if (['Assault', 'Auto Rifleman', 'Machine Gunner', 'Rifleman'].includes(roleName)) {
        return { name: 'Linha de Frente', color: 'text-red-500', icon: Sword };
    }
    if (['Medic', 'Support', 'Engineer'].includes(roleName)) {
        return { name: 'Apoio & Logística', color: 'text-green-500', icon: HeartPulse };
    }
    if (['Crewman', 'Anti-Tank'].includes(roleName)) {
        return { name: 'Anti-Blindados & Veículos', color: 'text-orange-500', icon: Truck };
    }
    if (['Sniper'].includes(roleName)) {
        return { name: 'Reconhecimento', color: 'text-purple-500', icon: Crosshair };
    }
    return { name: 'Geral', color: 'text-blue-500', icon: Users };
}

const StatCard = ({ title, value, icon: Icon, subtext, highlightColor }: { title: string; value: string | number; icon: React.ElementType; subtext?: string; highlightColor?: string; }) => (
  <Card className="bg-card/50 backdrop-blur-sm transition-all hover:border-accent hover:shadow-lg border-accent/10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={cn("h-4 w-4", highlightColor || "text-accent")} />
    </CardHeader>
    <CardContent>
      <div className={cn("text-2xl font-bold", highlightColor || "text-foreground")}>{value}</div>
      {subtext && <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-wider">{subtext}</p>}
    </CardContent>
  </Card>
);

export function ClanIntelligenceDashboard({ clanId, isPublic = false }: ClanIntelligenceDashboardProps) {
  const [players, setPlayers] = useState<(MonthlyPlayerStats & { totalScore: number; hoursPlayed: number; kdRatio: number; ofcScore: number; tankScore: number; artiScore: number; scorePerHour: number })[]>([]);
  const [isFetching, startFetching] = useTransition();
  const [hasFetched, setHasFetched] = useState(false);
  const [minHoursFilter, setMinHoursFilter] = useState<number>(0);
  const [periodFilter, setPeriodFilter] = useState<string>('custom');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [sortConfig, setSortConfig] = useState<{ key: 'hoursPlayed' | 'totalKills' | 'totalScore' | 'kdRatio' | 'elo' | 'ofcScore' | 'tankScore' | 'artiScore' | 'totalVehiclesDestroyed' | 'scorePerHour'; direction: 'asc' | 'desc' }>({ key: 'totalScore', direction: 'desc' });
  const [isSyncingElos, setIsSyncingElos] = useState(false);
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);
  const [nemesisNames, setNemesisNames] = useState<Record<string, string>>({});

  useEffect(() => {
    handleFetch();
  }, [periodFilter, selectedYear, selectedMonth]);

  useEffect(() => {
    if (hasFetched && players.length > 0 && !hasAttemptedSync) {
        setHasAttemptedSync(true);
        handleSyncMissingElos();
    }
  }, [hasFetched, players, hasAttemptedSync]);

  const handleFetch = () => {
    startFetching(async () => {
      setHasAttemptedSync(false);
      const now = new Date();
      const currentMonthStr = format(now, 'yyyy-MM');
      const lastMonthStr = format(subMonths(now, 1), 'yyyy-MM');
      const twoMonthsAgoStr = format(subMonths(now, 2), 'yyyy-MM');

      let periodsToFetch = [`month_${currentMonthStr}`];
      if (periodFilter === '3months') {
        periodsToFetch = [`month_${currentMonthStr}`, `month_${lastMonthStr}`, `month_${twoMonthsAgoStr}`];
      } else if (periodFilter === 'custom') {
        periodsToFetch = [`month_${selectedYear}-${selectedMonth}`];
      }

      const result = await getClanMonthlyAggregates(clanId, periodsToFetch);
      if (result.success && result.players) {
        const enhanced = result.players.map(p => {
          const totalScore = (p.totalCombat || 0) + (p.totalOffense || 0) + (p.totalDefense || 0) + (p.totalSupport || 0);
          const kdRatio = p.totalDeaths ? (p.totalKills / p.totalDeaths) : (p.totalKills || 0);
          const hoursPlayed = (p.totalTimeSeconds || 0) / 3600;
          
          const ofcScore = ((p as any).timePlayedByRole?.[0] || 0) + ((p as any).timePlayedByRole?.[13] || 0);
          const tankScore = ((p as any).timePlayedByRole?.[11] || 0) + ((p as any).timePlayedByRole?.[12] || 0);
          const artiScore = ((p as any).timePlayedByRole?.[14] || 0) + ((p as any).timePlayedByRole?.[15] || 0);
          const scorePerHour = hoursPlayed > 0 ? totalScore / hoursPlayed : 0;

          return {
            ...p,
            totalScore,
            kdRatio,
            hoursPlayed,
            ofcScore,
            tankScore,
            artiScore,
            scorePerHour
          };
        });
        setPlayers(enhanced);
      }
      setHasFetched(true);
    });
  };

  const handleSyncMissingElos = async () => {
      setIsSyncingElos(true);
      try {
          // Find players without elo
          const missing = players.filter(p => !p.elo);
          console.log(`Buscando ELO para ${missing.length} jogadores...`);
          let successCount = 0;
          for (const p of missing) {
              const res = await syncPlayerElo(p.playerId);
              console.log(`Resultado ELO ${p.playerName}:`, res);
              if (res.success && res.elo) {
                  setPlayers(prev => prev.map(player => player.playerId === p.playerId ? { ...player, elo: res.elo } : player));
                  successCount++;
              }
              // Small delay to avoid hammering the API
              await new Promise(r => setTimeout(r, 200));
          }
          if (missing.length > 0 && successCount === 0) {
             console.warn('A sincronização falhou para os jogadores. Possível bloqueio da API.');
          }
      } catch (err) {
          console.error("Error syncing elos", err);
      } finally {
          setIsSyncingElos(false);
      }
  };

  const filteredPlayers = useMemo(() => {
    return players.filter(p => p.hoursPlayed >= minHoursFilter);
  }, [players, minHoursFilter]);

  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers];
    sorted.sort((a, b) => {
      let valA = a[sortConfig.key] || 0;
      let valB = b[sortConfig.key] || 0;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredPlayers, sortConfig]);

  const requestSort = (key: 'hoursPlayed' | 'totalKills' | 'totalScore' | 'kdRatio' | 'elo' | 'ofcScore' | 'tankScore' | 'artiScore' | 'totalVehiclesDestroyed' | 'scorePerHour') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const globalStats = useMemo(() => {
      let totalScore = 0;
      let totalKills = 0;
      let totalDeaths = 0;
      let matchesPlayed = 0;
      let totalVehiclesDestroyed = 0;
      let totalTeamkills = 0;
      let deathsByTk = 0;
      let totalTimeSeconds = 0;

      filteredPlayers.forEach(p => {
          totalScore += p.totalScore;
          totalKills += p.totalKills || 0;
          totalDeaths += p.totalDeaths || 0;
          matchesPlayed += p.matchesPlayed || 0;
          totalVehiclesDestroyed += p.totalVehiclesDestroyed || 0;
          totalTeamkills += p.totalTeamkills || 0;
          deathsByTk += p.deathsByTk || 0;
          totalTimeSeconds += p.totalTimeSeconds || 0;
      });

      const kdRatio = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);

      return {
          totalScore,
          totalKills,
          totalDeaths,
          matchesPlayed,
          totalVehiclesDestroyed,
          totalTeamkills,
          deathsByTk,
          totalTimeSeconds,
          kdRatio
      };
  }, [filteredPlayers]);

  const averages = useMemo(() => {
    if (!filteredPlayers.length) return { c: 1, o: 1, d: 1, s: 1 };
    return {
      c: filteredPlayers.reduce((sum, p) => sum + (p.totalCombat || 0), 0) / filteredPlayers.length,
      o: filteredPlayers.reduce((sum, p) => sum + (p.totalOffense || 0), 0) / filteredPlayers.length,
      d: filteredPlayers.reduce((sum, p) => sum + (p.totalDefense || 0), 0) / filteredPlayers.length,
      s: filteredPlayers.reduce((sum, p) => sum + (p.totalSupport || 0), 0) / filteredPlayers.length,
    };
  }, [filteredPlayers]);

  const radarData = useMemo(() => {
    if (!filteredPlayers.length) return [];
    const avgC = averages.c;
    const avgO = averages.o;
    const avgD = averages.d;
    const avgS = averages.s;

    return [
      { subject: 'Combate', A: Math.round(avgC), fullMark: Math.max(avgC, avgO, avgD, avgS) * 1.2 },
      { subject: 'Ataque', A: Math.round(avgO), fullMark: Math.max(avgC, avgO, avgD, avgS) * 1.2 },
      { subject: 'Defesa', A: Math.round(avgD), fullMark: Math.max(avgC, avgO, avgD, avgS) * 1.2 },
      { subject: 'Suporte', A: Math.round(avgS), fullMark: Math.max(avgC, avgO, avgD, avgS) * 1.2 },
    ];
  }, [filteredPlayers, averages]);

  const clanMeta = useMemo(() => {
      const roleTotals: Record<number, number> = {};
      filteredPlayers.forEach(p => {
          if (p.timePlayedByRole) {
              for (const [r, t] of Object.entries(p.timePlayedByRole)) {
                  const roleId = Number(r);
                  roleTotals[roleId] = (roleTotals[roleId] || 0) + (t as number);
              }
          }
      });
      return Object.entries(roleTotals)
        .map(([id, t]) => ({ 
            id: Number(id), 
            name: ROLE_MAPPING[Number(id)]?.name || 'Desconhecido', 
            seconds: t,
            value: Math.floor(t / 3600) // in hours for chart
        }))
        .filter(r => r.value > 0)
        .sort((a, b) => b.seconds - a.seconds);
  }, [filteredPlayers]);

  const divisionCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredPlayers.forEach(p => {
          const div = getDivision(p.mainRole).name;
          counts[div] = (counts[div] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredPlayers]);

  const clanWeapons = useMemo(() => {
      const wTotals: Record<string, number> = {};
      filteredPlayers.forEach(p => {
          if (p.topWeapons) {
              for (const [w, c] of Object.entries(p.topWeapons)) {
                  wTotals[w] = (wTotals[w] || 0) + (c as number);
              }
          }
      });
      return Object.entries(wTotals)
        .map(([w, c]) => ({ name: w, count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
  }, [filteredPlayers]);

  const clanNemesis = useMemo(() => {
      const nTotals: Record<string, number> = {};
      filteredPlayers.forEach(p => {
          if (p.topKilledBy) {
              for (const [n, c] of Object.entries(p.topKilledBy)) {
                  nTotals[n] = (nTotals[n] || 0) + (c as number);
              }
          }
      });
      return Object.entries(nTotals)
        .map(([n, c]) => ({ name: n, count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
  }, [filteredPlayers]);

  const awards = useMemo(() => {
      // Need at least 1 hour of playtime to be eligible for efficiency awards
      const eligiblePlayers = filteredPlayers.filter(p => p.hoursPlayed >= 1);
      if (eligiblePlayers.length === 0) return null;
      
      const sortBy = (key: keyof (MonthlyPlayerStats & { totalScore: number; hoursPlayed: number; kdRatio: number; ofcScore: number; tankScore: number; artiScore: number; scorePerHour: number })) => 
        [...eligiblePlayers].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0))[0];

      return {
          mvp: sortBy('totalScore'),
          rendimento: sortBy('scorePerHour'),
          ceifador: sortBy('totalKills'),
          eficiente: sortBy('kdRatio'),
          cacador: sortBy('totalVehiclesDestroyed'),
          ataque: sortBy('totalOffense'),
          defesa: sortBy('totalDefense'),
          suporte: sortBy('totalSupport'),
          combate: sortBy('totalCombat'),
          oficial: sortBy('ofcScore'),
          tanqueiro: sortBy('tankScore'),
          artilheiro: sortBy('artiScore'),
          maiorElo: sortBy('elo'),
      };
  }, [filteredPlayers]);

  useEffect(() => {
      const ids = clanNemesis.map(n => n.name);
      if (ids.length > 0) {
          getPlayerNamesByIds(ids).then(names => setNemesisNames(names));
      }
  }, [clanNemesis]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
            <Brain className="text-accent h-6 w-6" />
            Central de Estatísticas
          </h2>
          <p className="text-muted-foreground text-sm">
            O peso do seu clã no front.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="custom">Mês Específico</SelectItem>
                        <SelectItem value="current">Mês Atual Rápido</SelectItem>
                        <SelectItem value="3months">Últimos 3 Meses</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {periodFilter === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString()).map(y => (
                              <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => ({
                                value: (i + 1).toString().padStart(2, '0'),
                                label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' })
                            })).map(m => (
                                <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
                <Select value={minHoursFilter.toString()} onValueChange={(val) => setMinHoursFilter(Number(val))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Filtro de Horas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">Todas Horas</SelectItem>
                        <SelectItem value="20">20+ horas</SelectItem>
                        <SelectItem value="50">50+ horas</SelectItem>
                        <SelectItem value="100">100+ horas</SelectItem>
                        <SelectItem value="200">200+ horas</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleFetch} disabled={isFetching} variant="outline" size="sm">
            <Activity className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
            Atualizar
            </Button>
        </div>
      </div>

      {!hasFetched && isFetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
      ) : players.length === 0 ? (
        <Card>
            <CardContent className="flex flex-col items-center py-16">
                <Brain className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <p>Nenhum dado encontrado para o período selecionado.</p>
            </CardContent>
        </Card>
      ) : (
        <>
          {/* PAINEL GLOBAL DO CLÃ */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Pontuação Total" value={globalStats.totalScore.toLocaleString()} icon={Trophy} highlightColor="text-yellow-400" />
              <StatCard title="K/D Ratio Global" value={globalStats.kdRatio} icon={Target} highlightColor="text-red-400" />
              <StatCard title="Total Kills" value={globalStats.totalKills.toLocaleString()} icon={Crosshair} />
              <StatCard title="Total Deaths" value={globalStats.totalDeaths.toLocaleString()} icon={Skull} />
              
              <StatCard title="Partidas Jogadas" value={globalStats.matchesPlayed.toLocaleString()} icon={Users} subtext="Ingressos por membros" />
              <StatCard title="Veículos Destruídos" value={globalStats.totalVehiclesDestroyed.toLocaleString()} icon={Truck} highlightColor="text-orange-500" />
              <StatCard title="Tempo de Presença" value={formatTime(globalStats.totalTimeSeconds)} icon={Clock} />
              <StatCard title="Team Kills Globais" value={globalStats.totalTeamkills.toLocaleString()} icon={UserX} highlightColor="text-red-500" />
          </div>

          {/* DESTAQUES DO CLÃ */}
          {awards && (
            <div className="pt-4 border-t border-border/50">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Medal className="text-accent"/> Condecorações e Destaques</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Trophy className="w-6 h-6 text-yellow-400 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">MVP</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.mvp?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{awards.mvp?.totalScore?.toLocaleString()} Pts</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Trophy className="w-6 h-6 text-blue-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Maior ELO</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.maiorElo?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{Math.round(awards.maiorElo?.elo || 0)} ELO</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Zap className="w-6 h-6 text-yellow-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Rendimento</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.rendimento?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{Math.round(awards.rendimento?.scorePerHour || 0).toLocaleString()} Pts/h</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Skull className="w-6 h-6 text-red-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Ceifador</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.ceifador?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{awards.ceifador?.totalKills?.toLocaleString()} Kills</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Target className="w-6 h-6 text-blue-400 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Eficiente</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.eficiente?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{(awards.eficiente?.kdRatio || 0).toFixed(2)} K/D</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Truck className="w-6 h-6 text-orange-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Destruidor</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.cacador?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{awards.cacador?.totalVehiclesDestroyed?.toLocaleString()} Veículos</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Sword className="w-6 h-6 text-red-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Ponta de Lança</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.ataque?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{awards.ataque?.totalOffense?.toLocaleString()} Ataque</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Shield className="w-6 h-6 text-yellow-600 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Muralha</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.defesa?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{awards.defesa?.totalDefense?.toLocaleString()} Defesa</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <HeartPulse className="w-6 h-6 text-green-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Altruísta</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.suporte?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{awards.suporte?.totalSupport?.toLocaleString()} Suporte</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Flame className="w-6 h-6 text-red-600 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Combatente</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.combate?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{awards.combate?.totalCombat?.toLocaleString()} Combate</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Star className="w-6 h-6 text-yellow-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Oficial Nato</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.oficial?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{formatTime(awards.oficial?.ofcScore || 0)} Liderança</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Truck className="w-6 h-6 text-orange-400 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Tanqueiro</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.tanqueiro?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{formatTime(awards.tanqueiro?.tankScore || 0)} Tanque</div>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col items-center text-center">
                        <Crosshair className="w-6 h-6 text-purple-500 mb-1"/>
                        <span className="font-bold text-xs uppercase tracking-wider">Artilheiro</span>
                        <div className="mt-2 font-bold text-sm truncate w-full">{awards.artilheiro?.playerName}</div>
                        <div className="text-accent text-xs font-mono">{formatTime(awards.artilheiro?.artiScore || 0)} Artilharia</div>
                    </div>
                </div>
            </div>
          )}

          {/* TOP PANELS: Weapons, Nemesis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="bg-card/50 backdrop-blur-sm border-accent/10">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Crosshair className="text-accent w-5 h-5"/> Arsenal do Clã</CardTitle>
                  <CardDescription>Armas mais utilizadas pelo grupo no período.</CardDescription>
               </CardHeader>
               <CardContent>
                  <ul className="space-y-3">
                     {clanWeapons.map((w, i) => (
                        <li key={i} className="flex justify-between items-center bg-background/50 p-2 rounded border border-border">
                           <span className="font-bold truncate pr-4">{w.name}</span>
                           <span className="text-accent font-mono">{w.count.toLocaleString()} Kills</span>
                        </li>
                     ))}
                     {clanWeapons.length === 0 && <p className="text-muted-foreground text-sm italic">Sem dados de armas.</p>}
                  </ul>
               </CardContent>
             </Card>

             <Card className="bg-card/50 backdrop-blur-sm border-red-500/10">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-red-500"><Skull className="w-5 h-5"/> Inimigos Públicos Nº 1</CardTitle>
                  <CardDescription>Jogadores adversários que mais abateram membros do clã.</CardDescription>
               </CardHeader>
               <CardContent>
                  <ul className="space-y-3">
                     {clanNemesis.map((n, i) => (
                        <li key={n.name} className="flex justify-between items-center bg-background/50 p-2 rounded border border-red-500/20">
                           <span className="font-bold text-red-400 truncate pr-4">{nemesisNames[n.name] || n.name}</span>
                           <span className="font-mono text-muted-foreground">{n.count.toLocaleString()} Mortes</span>
                        </li>
                     ))}
                     {clanNemesis.length === 0 && <p className="text-muted-foreground text-sm italic">Sem dados de nêmesis.</p>}
                  </ul>
               </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Meta do Clã - Pie Chart */}
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">O Meta do Clã</CardTitle>
                <CardDescription>Distribuição de classes baseada em horas jogadas.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                {clanMeta.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={clanMeta}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        >
                        {clanMeta.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip formatter={(val) => `${val}h`} />
                    </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-muted-foreground italic text-sm">Sem dados de classe.</p>
                )}
              </CardContent>
            </Card>

            {/* Gráfico Radar - Perfil Geral do Clã */}
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Foco de Ação</CardTitle>
                <CardDescription>Pontuação média por categoria em combate.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="currentColor" className="opacity-20" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                    <Radar
                      name="Média"
                      dataKey="A"
                      stroke="#d97706"
                      fill="#d97706"
                      fillOpacity={0.4}
                    />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>

          {/* Tabela de Membros */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <CardTitle className="text-lg">Relatório de Membros</CardTitle>
                  <CardDescription>
                    Lista completa de atuação dos membros do clã no período.
                  </CardDescription>
                </div>
                {!isPublic && (
                  <Button 
                    onClick={handleSyncMissingElos} 
                    disabled={isSyncingElos}
                    variant="outline"
                    size="sm"
                    className="mt-4 sm:mt-0"
                  >
                    {isSyncingElos ? "Sincronizando..." : "Sincronizar ELOs Faltantes"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-accent/10">
                <div className="w-full text-sm font-semibold mb-2">Composição de Divisões (Por Classe Principal):</div>
                {divisionCounts.map(([div, count]) => (
                  <div key={div} className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 bg-background">
                      {div}: <span className="font-bold ml-1">{count}</span>
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogador</TableHead>
                      <TableHead>Classe Principal</TableHead>
                      <TableHead>Divisão</TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('elo')} className="-mr-3 hover:bg-transparent font-bold">
                          ELO {sortConfig.key === 'elo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('hoursPlayed')} className="-mr-3 hover:bg-transparent font-bold">
                          Horas {sortConfig.key === 'hoursPlayed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('kdRatio')} className="-mr-3 hover:bg-transparent font-bold">
                          K/D {sortConfig.key === 'kdRatio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('totalKills')} className="-mr-3 hover:bg-transparent font-bold">
                          Kills {sortConfig.key === 'totalKills' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('totalVehiclesDestroyed')} className="-mr-3 hover:bg-transparent font-bold">
                          Veículos {sortConfig.key === 'totalVehiclesDestroyed' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('ofcScore')} className="-mr-3 hover:bg-transparent font-bold">
                          Oficial {sortConfig.key === 'ofcScore' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('tankScore')} className="-mr-3 hover:bg-transparent font-bold">
                          Tanque {sortConfig.key === 'tankScore' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('artiScore')} className="-mr-3 hover:bg-transparent font-bold">
                          Artilharia {sortConfig.key === 'artiScore' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('scorePerHour')} className="-mr-3 hover:bg-transparent font-bold">
                          Pts/h {sortConfig.key === 'scorePerHour' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => requestSort('totalScore')} className="-mr-3 hover:bg-transparent font-bold text-accent">
                          Pontuação {sortConfig.key === 'totalScore' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlayers.map(player => {
                      const MainRoleIcon = player.mainRole !== undefined && ROLE_MAPPING[player.mainRole] ? ROLE_MAPPING[player.mainRole].icon : null;
                      const mainRoleName = player.mainRole !== undefined && ROLE_MAPPING[player.mainRole] ? ROLE_MAPPING[player.mainRole].name : '-';
                      const division = getDivision(player.mainRole);
                      const DivIcon = division.icon;

                      return (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">
                            <Link href={`/player/${encodeURIComponent(player.playerId)}`} className="hover:underline hover:text-accent font-bold">
                              {player.playerName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {MainRoleIcon && (
                              <div className="flex items-center gap-2">
                                <MainRoleIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{mainRoleName}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2" title={division.name}>
                              <DivIcon className={cn("h-4 w-4", division.color)} />
                              <span className="text-sm font-semibold">{division.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-blue-500">
                             {player.elo ? Math.round(player.elo) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                             {Math.round(player.hoursPlayed)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {/* @ts-ignore */}
                            {player.kdRatio?.toFixed(2) || (player.totalKills || 0)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {player.totalKills?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-orange-400 font-mono text-sm">
                            {player.totalVehiclesDestroyed || 0}
                          </TableCell>
                          <TableCell className="text-right text-yellow-500 font-mono text-sm">
                            {Math.round((player.ofcScore || 0) / 3600)}h
                          </TableCell>
                          <TableCell className="text-right text-orange-500 font-mono text-sm">
                            {Math.round((player.tankScore || 0) / 3600)}h
                          </TableCell>
                          <TableCell className="text-right text-purple-500 font-mono text-sm">
                            {Math.round((player.artiScore || 0) / 3600)}h
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {Math.round(player.scorePerHour || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-accent font-bold">
                            {player.totalScore.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
}
