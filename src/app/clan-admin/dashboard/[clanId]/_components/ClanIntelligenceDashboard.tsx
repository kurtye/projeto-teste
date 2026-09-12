'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import type { MonthlyPlayerStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Trophy, Activity, Sword, Shield, HeartPulse, Crosshair, Users, Skull, Flame, Target, Truck, Zap, Star, UserX, Clock, Medal } from 'lucide-react';
import { getClanMonthlyAggregates } from '../../../actions';
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

export function ClanIntelligenceDashboard({ clanId }: ClanIntelligenceDashboardProps) {
  const [players, setPlayers] = useState<(MonthlyPlayerStats & { totalScore: number; hoursPlayed: number })[]>([]);
  const [isFetching, startFetching] = useTransition();
  const [hasFetched, setHasFetched] = useState(false);
  const [minHoursFilter, setMinHoursFilter] = useState<number>(0);
  const [periodFilter, setPeriodFilter] = useState<string>('current');
  const [sortConfig, setSortConfig] = useState<{ key: 'hoursPlayed' | 'totalKills' | 'totalScore' | 'kdRatio'; direction: 'asc' | 'desc' }>({ key: 'totalScore', direction: 'desc' });

  useEffect(() => {
    handleFetch();
  }, [periodFilter]);

  const handleFetch = () => {
    startFetching(async () => {
      const now = new Date();
      const currentMonthStr = format(now, 'yyyy-MM');
      const lastMonthStr = format(subMonths(now, 1), 'yyyy-MM');
      const twoMonthsAgoStr = format(subMonths(now, 2), 'yyyy-MM');

      let periodsToFetch = [`month_${currentMonthStr}`];
      if (periodFilter === '3months') {
        periodsToFetch = [`month_${currentMonthStr}`, `month_${lastMonthStr}`, `month_${twoMonthsAgoStr}`];
      }

      const result = await getClanMonthlyAggregates(clanId, periodsToFetch);
      if (result.success && result.players) {
        const enhanced = result.players.map(p => {
          const totalScore = (p.totalCombat || 0) + (p.totalOffense || 0) + (p.totalDefense || 0) + (p.totalSupport || 0);
          const kdRatio = p.totalDeaths ? (p.totalKills / p.totalDeaths) : (p.totalKills || 0);
          return {
            ...p,
            totalScore,
            kdRatio,
            hoursPlayed: (p.totalTimeSeconds || 0) / 3600,
          };
        });
        setPlayers(enhanced);
      }
      setHasFetched(true);
    });
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

  const requestSort = (key: 'hoursPlayed' | 'totalKills' | 'totalScore' | 'kdRatio') => {
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
      if (filteredPlayers.length === 0) return null;
      
      const topKills = [...filteredPlayers].sort((a, b) => (b.totalKills || 0) - (a.totalKills || 0))[0];
      const topVehicles = [...filteredPlayers].sort((a, b) => (b.totalVehiclesDestroyed || 0) - (a.totalVehiclesDestroyed || 0))[0];
      const topStreak = [...filteredPlayers].sort((a, b) => (b.maxKillsStreak || 0) - (a.maxKillsStreak || 0))[0];
      const topTK = [...filteredPlayers].sort((a, b) => (b.totalTeamkills || 0) - (a.totalTeamkills || 0))[0];
      const topLife = [...filteredPlayers].sort((a, b) => (b.longestLifeSecs || 0) - (a.longestLifeSecs || 0))[0];

      return {
          exterminador: topKills,
          cacador: topVehicles,
          streak: topStreak,
          tk: topTK,
          sobrevivente: topLife
      };
  }, [filteredPlayers]);

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
                        <SelectItem value="current">Mês Atual</SelectItem>
                        <SelectItem value="3months">Últimos 3 Meses</SelectItem>
                    </SelectContent>
                </Select>
            </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center text-center">
                        <Crosshair className="w-8 h-8 text-red-500 mb-2"/>
                        <span className="font-bold text-sm">O Exterminador</span>
                        <span className="text-xs text-muted-foreground">Mais Kills Totais</span>
                        <div className="mt-3 font-bold text-lg">{awards.exterminador.playerName}</div>
                        <div className="text-accent text-sm font-mono">{awards.exterminador.totalKills?.toLocaleString()} Kills</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center text-center">
                        <Truck className="w-8 h-8 text-orange-500 mb-2"/>
                        <span className="font-bold text-sm">Caçador de Aço</span>
                        <span className="text-xs text-muted-foreground">Mais Veículos Destruídos</span>
                        <div className="mt-3 font-bold text-lg">{awards.cacador.playerName}</div>
                        <div className="text-accent text-sm font-mono">{awards.cacador.totalVehiclesDestroyed?.toLocaleString()} Destruídos</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center text-center">
                        <Flame className="w-8 h-8 text-yellow-500 mb-2"/>
                        <span className="font-bold text-sm">Perigo Constante</span>
                        <span className="text-xs text-muted-foreground">Maior Kill Streak</span>
                        <div className="mt-3 font-bold text-lg">{awards.streak.playerName}</div>
                        <div className="text-accent text-sm font-mono">{awards.streak.maxKillsStreak?.toLocaleString()} Kills Seguidas</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center text-center">
                        <UserX className="w-8 h-8 text-red-700 mb-2"/>
                        <span className="font-bold text-sm">Inimigo do Estado</span>
                        <span className="text-xs text-muted-foreground">Mais Team Kills</span>
                        <div className="mt-3 font-bold text-lg">{awards.tk.playerName}</div>
                        <div className="text-red-500 text-sm font-mono">{awards.tk.totalTeamkills?.toLocaleString()} Aliados Abatidos</div>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center text-center">
                        <Shield className="w-8 h-8 text-green-500 mb-2"/>
                        <span className="font-bold text-sm">O Sobrevivente</span>
                        <span className="text-xs text-muted-foreground">Maior tempo de vida</span>
                        <div className="mt-3 font-bold text-lg">{awards.sobrevivente.playerName}</div>
                        <div className="text-accent text-sm font-mono">{formatTime(awards.sobrevivente.longestLifeSecs || 0)}</div>
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
                        <li key={i} className="flex justify-between items-center bg-background/50 p-2 rounded border border-red-500/20">
                           <span className="font-bold text-red-400 truncate pr-4">{n.name}</span>
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
              <CardTitle className="text-lg">Relatório de Membros</CardTitle>
              <CardDescription>
                Lista completa de atuação dos membros do clã no período.
              </CardDescription>
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
                        <Button variant="ghost" size="sm" onClick={() => requestSort('totalScore')} className="-mr-3 hover:bg-transparent font-bold">
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
