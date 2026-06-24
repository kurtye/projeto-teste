'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import type { PlayerAggregates } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Trophy, Activity, Sword, Shield, HeartPulse, Crosshair, Users, Info } from 'lucide-react';
import { getClanMemberAggregates } from '../../../actions';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis
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

interface ClanIntelligenceDashboardProps {
  clanId: string;
}

type Archetype = 'Ceifador' | 'Ponta de Lança' | 'Muralha' | 'Altruísta' | 'Generalista' | 'Desconhecido';

function getArchetype(p: PlayerAggregates, averages: { c: number, o: number, d: number, s: number }): { name: Archetype; icon: any; color: string; desc: string } {
  const combat = p.totalCombat || 0;
  const offense = p.totalOffense || 0;
  const defense = p.totalDefense || 0;
  const support = p.totalSupport || 0;
  const total = combat + offense + defense + support;

  if (total === 0) return { name: 'Desconhecido', icon: Info, color: 'text-gray-500', desc: 'Sem dados suficientes' };

  // Evita divisão por zero
  const avgC = averages.c || 1;
  const avgO = averages.o || 1;
  const avgD = averages.d || 1;
  const avgS = averages.s || 1;

  // Calculamos quantas vezes o jogador é maior que a média do clã naquele status
  const relC = combat / avgC;
  const relO = offense / avgO;
  const relD = defense / avgD;
  const relS = support / avgS;

  const maxRel = Math.max(relC, relO, relD, relS);

  // Se o maior pico de habilidade do jogador for menor que 1.15x a média (15% acima da média), 
  // significa que ele é bem equilibrado. Reduzimos de 1.3 para 1.15 para destacar mais os especialistas.
  if (maxRel < 1.15) return { name: 'Generalista', icon: Users, color: 'text-blue-400', desc: 'Equilibrado com a média do clã' };
  
  if (relO === maxRel) return { name: 'Ponta de Lança', icon: Sword, color: 'text-red-500', desc: 'Acima da média em Ataque' };
  if (relC === maxRel) return { name: 'Ceifador', icon: Crosshair, color: 'text-purple-500', desc: 'Acima da média em Combate' };
  if (relS === maxRel) return { name: 'Altruísta', icon: HeartPulse, color: 'text-green-500', desc: 'Acima da média em Suporte' };
  return { name: 'Muralha', icon: Shield, color: 'text-yellow-500', desc: 'Acima da média em Defesa' };
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ClanIntelligenceDashboard({ clanId }: ClanIntelligenceDashboardProps) {
  const [players, setPlayers] = useState<(PlayerAggregates & { totalScore: number; hoursPlayed: number })[]>([]);
  const [isFetching, startFetching] = useTransition();
  const [hasFetched, setHasFetched] = useState(false);
  const [minHoursFilter, setMinHoursFilter] = useState<number>(200);

  useEffect(() => {
    // Auto fetch on mount
    handleFetch();
  }, []);

  const handleFetch = () => {
    startFetching(async () => {
      const result = await getClanMemberAggregates(clanId);
      if (result.success && result.players) {
        const enhanced = result.players.map(p => {
          const totalScore = (p.totalCombat || 0) + (p.totalOffense || 0) + (p.totalDefense || 0) + (p.totalSupport || 0);
          return {
            ...p,
            totalScore,
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

  const scatterData = useMemo(() => {
    return filteredPlayers.map(p => ({
      x: Math.round(p.hoursPlayed),
      y: p.totalScore,
      z: 1, // point size
      name: p.latestPlayerName,
    }));
  }, [filteredPlayers]);

  const archetypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPlayers.forEach(p => {
      const arch = getArchetype(p, averages).name;
      counts[arch] = (counts[arch] || 0) + 1;
    });
    return counts;
  }, [filteredPlayers, averages]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-xl">
          <p className="font-bold text-accent">{data.name}</p>
          <p className="text-sm">Tempo Jogado: {data.x}h</p>
          <p className="text-sm">Pontuação: {data.y.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  const suggestedDuos = useMemo(() => {
    // 1. Calculate stats per hour
    const playersStats = filteredPlayers.map(p => ({
      ...p,
      arch: getArchetype(p, averages),
      atkScoreHr: p.hoursPlayed > 0 ? ((p.totalOffense || 0) + (p.totalCombat || 0)) / p.hoursPlayed : 0,
      defScoreHr: p.hoursPlayed > 0 ? ((p.totalDefense || 0) + (p.totalSupport || 0)) / p.hoursPlayed : 0,
      totScoreHr: p.hoursPlayed > 0 ? p.totalScore / p.hoursPlayed : 0,
    }));

    // 2. Attack Duos (Top 20 players in Attack)
    const sortedAtk = [...playersStats].sort((a, b) => b.atkScoreHr - a.atkScoreHr);
    const attackDuos = [];
    for (let i = 0; i < 20 && i + 1 < sortedAtk.length; i += 2) {
      attackDuos.push([sortedAtk[i], sortedAtk[i+1]]);
    }

    // 3. Defense Duos (Top 20 players in Defense)
    const sortedDef = [...playersStats].sort((a, b) => b.defScoreHr - a.defScoreHr);
    const defenseDuos = [];
    for (let i = 0; i < 20 && i + 1 < sortedDef.length; i += 2) {
      defenseDuos.push([sortedDef[i], sortedDef[i+1]]);
    }

    // 4. Efficiency Duos (Top 20 overall)
    const sortedTot = [...playersStats].sort((a, b) => b.totScoreHr - a.totScoreHr);
    const effDuos = [];
    for (let i = 0; i < 20 && i + 1 < sortedTot.length; i += 2) {
      effDuos.push([sortedTot[i], sortedTot[i+1]]);
    }

    return { attackDuos, defenseDuos, effDuos };
  }, [filteredPlayers, averages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
            <Brain className="text-accent h-6 w-6" />
            Inteligência do Clã
          </h2>
          <p className="text-muted-foreground text-sm">
            Análise comportamental e estatística dos seus membros.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Mínimo de Horas:</span>
                <Select value={minHoursFilter.toString()} onValueChange={(val) => setMinHoursFilter(Number(val))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Filtro" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">0 horas</SelectItem>
                        <SelectItem value="50">50+ horas</SelectItem>
                        <SelectItem value="100">100+ horas</SelectItem>
                        <SelectItem value="200">200+ horas</SelectItem>
                        <SelectItem value="500">500+ horas</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleFetch} disabled={isFetching} variant="outline" size="sm">
            <Activity className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
            Atualizar Dados
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
                <p>Nenhum dado encontrado ou membros sem estatísticas registradas.</p>
            </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gráfico Radar - Perfil Geral do Clã */}
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Identidade do Clã</CardTitle>
                <CardDescription>Média de pontuação por categoria de todos os membros.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="currentColor" className="opacity-20" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                    <Radar
                      name="Média do Clã"
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

            {/* Scatter Plot - Eficiência vs Dedicação */}
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Eficiência vs Dedicação</CardTitle>
                <CardDescription>Comparação de Tempo Jogado x Pontuação Total dos membros.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Horas" 
                        unit="h" 
                        stroke="currentColor" 
                        tick={{ fill: 'currentColor' }} 
                        label={{ value: 'Horas Jogadas', position: 'insideBottom', offset: -10, fill: 'currentColor' }}
                    />
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Pontuação" 
                        stroke="currentColor" 
                        tick={{ fill: 'currentColor' }}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <ZAxis type="number" range={[50, 50]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Scatter name="Jogadores" data={scatterData} fill="#d97706" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Arquétipos e Tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise Individual e Arquétipos</CardTitle>
              <CardDescription>
                A inteligência artificial classificou os membros com base no comportamento em jogo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary Badges */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-accent/10">
                <div className="w-full text-sm font-semibold mb-2">Composição de Especialistas:</div>
                {Object.entries(archetypeCounts).map(([arch, count]) => (
                  <div key={arch} className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 bg-background">
                      {arch}: <span className="font-bold ml-1">{count}</span>
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Tabela de Inteligência */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogador</TableHead>
                      <TableHead>Arquétipo</TableHead>
                      <TableHead className="text-right">Eficiência (Pts/Hora)</TableHead>
                      <TableHead className="text-right">K/D Geral</TableHead>
                      <TableHead className="text-right">Kills</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map(player => {
                      const arch = getArchetype(player, averages);
                      const Icon = arch.icon;
                      const efficiency = player.hoursPlayed > 0 ? Math.round(player.totalScore / player.hoursPlayed) : 0;
                      const kd = player.totalDeaths ? (player.totalKills / player.totalDeaths).toFixed(2) : player.totalKills;
                      
                      return (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">
                            <Link href={`/player/${encodeURIComponent(player.id)}`} className="hover:underline hover:text-accent">
                              {player.latestPlayerName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2" title={arch.desc}>
                              <Icon className={cn("h-4 w-4", arch.color)} />
                              <span className="text-sm">{arch.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {efficiency.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {kd}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {player.totalKills?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* DUO MATCHMAKER */}
          <div className="space-y-4 pt-6 border-t border-border/50">
            <div>
              <h3 className="text-2xl font-bold font-headline flex items-center gap-2 text-accent">
                <Users className="h-6 w-6" />
                Matchmaking de Duplas
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sugestões automáticas de Esquadrões de 2 Homens (Oficial + Soldado) cruzando a eficiência por hora.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Spearhead */}
              <Card className="bg-red-500/5 border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                    <Sword className="h-5 w-5" />
                    Ponta de Lança (Ataque)
                  </CardTitle>
                  <CardDescription>Top pontuadores em Infiltração e Combate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestedDuos.attackDuos.map((duo, i) => {
                    const Icon0 = duo[0].arch.icon;
                    const Icon1 = duo[1].arch.icon;
                    return (
                    <div key={i} className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon0 className={cn("h-3 w-3", duo[0].arch.color)} />
                          <span className="font-bold text-sm">{duo[0].latestPlayerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon1 className={cn("h-3 w-3", duo[1].arch.color)} />
                          <span className="font-bold text-sm">{duo[1].latestPlayerName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Pts/Hr</div>
                        <div className="font-bold text-red-500">
                          {Math.round(duo[0].atkScoreHr + duo[1].atkScoreHr).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Iron Wall */}
              <Card className="bg-yellow-500/5 border-yellow-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-yellow-500">
                    <Shield className="h-5 w-5" />
                    Muralha (Defesa)
                  </CardTitle>
                  <CardDescription>Top pontuadores em Contenção e Suporte</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestedDuos.defenseDuos.map((duo, i) => {
                    const Icon0 = duo[0].arch.icon;
                    const Icon1 = duo[1].arch.icon;
                    return (
                    <div key={i} className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon0 className={cn("h-3 w-3", duo[0].arch.color)} />
                          <span className="font-bold text-sm">{duo[0].latestPlayerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon1 className={cn("h-3 w-3", duo[1].arch.color)} />
                          <span className="font-bold text-sm">{duo[1].latestPlayerName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Pts/Hr</div>
                        <div className="font-bold text-yellow-500">
                          {Math.round(duo[0].defScoreHr + duo[1].defScoreHr).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Tryhards */}
              <Card className="bg-accent/5 border-accent/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-accent">
                    <Trophy className="h-5 w-5" />
                    Esquadrão Tryhard
                  </CardTitle>
                  <CardDescription>Pura eficiência (Melhor pontuação geral)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestedDuos.effDuos.map((duo, i) => {
                    const Icon0 = duo[0].arch.icon;
                    const Icon1 = duo[1].arch.icon;
                    return (
                    <div key={i} className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon0 className={cn("h-3 w-3", duo[0].arch.color)} />
                          <span className="font-bold text-sm">{duo[0].latestPlayerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon1 className={cn("h-3 w-3", duo[1].arch.color)} />
                          <span className="font-bold text-sm">{duo[1].latestPlayerName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Pts/Hr</div>
                        <div className="font-bold text-accent">
                          {Math.round(duo[0].totScoreHr + duo[1].totScoreHr).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </CardContent>
              </Card>

            </div>
          </div>

        </>
      )}
    </div>
  );
}
