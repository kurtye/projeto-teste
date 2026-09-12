'use client';

import { useMemoFirebase, useDoc, useFirestore } from '@/firebase';
import { notFound } from 'next/navigation';
import type { MonthlyPlayerStats } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Swords,
  Shield,
  Clock,
  Timer,
  ShieldAlert,
  UserCheck,
  UserX,
  FileText,
  Trophy,
  Target,
  LineChart,
  Crosshair,
  Award,
  HeartPulse,
  Truck,
  ListOrdered,
  Calendar,
  Skull,
  Flame,
  UserRoundCog,
  UserRound
} from 'lucide-react';
import { ROLE_MAPPING } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';
import { use, useMemo, useState, useEffect } from 'react';
import {
  PolarGrid,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { getMonthlyHallOfFame } from '@/app/hall-of-fame/actions';
import { AdBanner } from '@/components/AdBanner';
import { getClanFromPlayerName } from '@/lib/clans';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TacticalDNABar } from '@/components/TacticalDNA';

interface PlayerProfilePageProps {
  params: {
    playerId: string;
  };
}

const StatCard = ({ title, value, icon: Icon, subtext }: { title: string; value: string | number; icon: React.ElementType; subtext?: string; }) => (
  <Card className="bg-muted/30">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </CardContent>
  </Card>
);

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0h';
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
}

const formatMinutes = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0m';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
}

const InteractionList = ({ title, icon: Icon, data, isLoading }: { title: string, icon: React.ElementType, data: {id: string, name: string, count: number}[] | null, isLoading: boolean }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Icon className="w-5 h-5"/> {title}</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
            ) : (
                <ul className="space-y-2 text-sm">
                    {data && data.length > 0 ? (
                      data.map((item) => (
                          <li key={item.id} className="flex justify-between">
                              <span className="truncate pr-4">{item.name}</span>
                              <span className="font-bold">{item.count.toLocaleString()}</span>
                          </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">Nenhum dado registrado este mês.</li>
                    )}
                </ul>
            )}
        </CardContent>
    </Card>
);


export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const firestore = useFirestore();
  const resolvedParams = use(params);
  const playerId = decodeURIComponent(resolvedParams.playerId);
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  // Fetch new monthly player data
  const playerDocRef = useMemoFirebase(() => {
    if (!firestore || !playerId) return null;
    return doc(firestore, 'monthly_player_stats', `month_${currentMonth}_${playerId}`);
  }, [firestore, playerId, currentMonth]);
  
  const { data: player, isLoading: isLoadingPlayer, error } = useDoc<MonthlyPlayerStats>(playerDocRef);

  // Fetch hall of fame (global stats equivalent) for the chart
  const [hofStats, setHofStats] = useState<any>(null);
  const [isLoadingHof, setIsLoadingHof] = useState(true);
  
  useEffect(() => {
      async function fetchHof() {
          setIsLoadingHof(true);
          try {
             const stats = await getMonthlyHallOfFame(currentMonth);
             setHofStats(stats);
          } catch(e) {
             console.error("Error loading HoF stats", e);
          } finally {
             setIsLoadingHof(false);
          }
      }
      fetchHof();
  }, [currentMonth]);

  // Derived Interactions Data
  const topWeapons = useMemo(() => {
    if (!player || !player.topWeapons) return [];
    return Object.entries(player.topWeapons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ id: name, name, count }));
  }, [player]);

  const topVictims = useMemo(() => {
    if (!player || !player.topVictims) return [];
    return Object.entries(player.topVictims)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ id: name, name, count }));
  }, [player]);

  const topKilledBy = useMemo(() => {
    if (!player || !player.topKilledBy) return [];
    return Object.entries(player.topKilledBy)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ id: name, name, count }));
  }, [player]);

  const timePlayedByRole = useMemo(() => {
    if (!player || !player.timePlayedByRole) return [];
    return Object.entries(player.timePlayedByRole)
        .map(([roleIdStr, seconds]) => {
           const roleId = parseInt(roleIdStr, 10);
           const role = ROLE_MAPPING[roleId];
           return {
               id: roleId,
               name: role ? role.name : 'Desconhecido',
               icon: role ? role.icon : UserRound,
               seconds: seconds as number
           };
        })
        .sort((a, b) => b.seconds - a.seconds);
  }, [player]);

  const chartData = useMemo(() => {
      if (!player || !hofStats || !hofStats.records) return [];
      
      const getPercentage = (value: number | undefined, maxObj: MonthlyPlayerStats | undefined, maxKey: keyof MonthlyPlayerStats) => {
        const maxValue = (maxObj?.[maxKey] as number) || 0;
        if (!value || maxValue === 0) return 0;
        return Math.round((value / maxValue) * 100);
      };

      return [
        { stat: 'Kills', value: getPercentage(player.totalKills, hofStats.records.totalKills, 'totalKills'), full: player.totalKills || 0 },
        { stat: 'Combate', value: getPercentage(player.totalCombat, hofStats.records.totalCombat, 'totalCombat'), full: player.totalCombat || 0 },
        { stat: 'Suporte', value: getPercentage(player.totalSupport, hofStats.records.totalSupport, 'totalSupport'), full: player.totalSupport || 0 },
        { stat: 'Defesa', value: getPercentage(player.totalDefense, hofStats.records.totalDefense, 'totalDefense'), full: player.totalDefense || 0 },
        { stat: 'Ofensiva', value: getPercentage(player.totalOffense, hofStats.records.totalOffense, 'totalOffense'), full: player.totalOffense || 0 },
      ];
  }, [player, hofStats]);

  const chartConfig = {
      value: { label: 'Performance (%)' },
      full: { label: 'Valor Bruto' },
  };

  if (isLoadingPlayer || isLoadingHof) {
    return (
        <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-10 w-48 mb-6" />
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-32 w-32 rounded-full" />
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-8 w-24" />
                </div>
                <div className="flex-1 w-full">
                     <Skeleton className="h-80 w-full mb-6" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                    </div>
                </div>
            </div>
        </div>
    );
  }
  
  if (error) {
    return (
        <div className="container mx-auto px-4 py-8 text-center text-destructive">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Erro ao Carregar Jogador</h1>
            <p>Não foi possível carregar os dados deste jogador. Tente novamente mais tarde.</p>
             <Button asChild variant="outline" className="mt-6">
                <Link href="/">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Voltar ao Ranking
                </Link>
            </Button>
        </div>
    )
  }

  if (!player) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Sem Dados Neste Mês</h1>
            <p className="text-muted-foreground mt-2">O jogador ID <strong>{playerId}</strong> ainda não tem partidas processadas no servidor durante o mês atual ({monthLabel}).</p>
             <Button asChild variant="outline" className="mt-6">
                <Link href="/">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Voltar ao Ranking
                </Link>
            </Button>
        </div>
    )
  }
  
  const kdRatio = player.totalDeaths ? (player.totalKills || 0) / player.totalDeaths : (player.totalKills || 0);
  const totalScore = (player.totalCombat || 0) + (player.totalOffense || 0) + (player.totalDefense || 0) + (player.totalSupport || 0);
  const mainRoleInfo = player.mainRole !== undefined ? ROLE_MAPPING[player.mainRole] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Button asChild variant="outline">
            <Link href="/">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar ao Ranking
            </Link>
        </Button>
        <Badge variant="secondary" className="capitalize text-sm px-4 py-1">
            Mês: {monthLabel}
        </Badge>
      </div>

      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar className="h-32 w-32 border-4 border-primary">
            {(() => {
                const detectedClan = getClanFromPlayerName(player.playerName);
                return detectedClan?.logoUrl ? (
                    <Image src={detectedClan.logoUrl} alt={detectedClan.name} fill className="object-cover" />
                ) : (
                    <AvatarFallback className="text-4xl">{player.playerName.slice(0, 2)}</AvatarFallback>
                )
            })()}
          </Avatar>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <h1 className="text-4xl font-bold font-headline">{player.playerName}</h1>
          </div>
          <Badge className="text-base" variant="outline">
            <FileText className="mr-2 h-5 w-5 text-accent" /> ID: ...{player.playerId.slice(-6)}
          </Badge>
          
          <div className="mt-4 w-full flex justify-center pb-4">
             {/* TacticalDNABar assumes a player object with totalCombat, totalDefense, etc. which matches MonthlyPlayerStats */}
            <TacticalDNABar player={player as any} showLegend={true} className="max-w-[250px] h-3" />
          </div>
        </div>

        <div className="flex-1 w-full space-y-6">
          <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <LineChart className="w-5 h-5"/> 
                    Estilo do Jogador no Mês (vs. Melhor do Mês)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="mx-auto w-full max-w-sm h-64">
                    <RadarChart data={chartData}>
                    <ChartTooltip 
                        cursor={false} 
                        content={<ChartTooltipContent 
                            formatter={(value, name, item) => (
                                <div className="flex flex-col">
                                    <span className="font-bold">{`${item.payload.stat}: ${item.payload.full.toLocaleString()}`}</span>
                                    <span className="text-xs text-muted-foreground">{`(${value}% do líder mensal)`}</span>
                                </div>
                            )}
                        />} 
                    />
                        <PolarAngleAxis dataKey="stat" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <PolarGrid />
                        <Radar
                            name="Estatísticas"
                            dataKey="value"
                            stroke="hsl(var(--accent))"
                            fill="hsl(var(--accent))"
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
          </Card>

          <AdBanner>
              <ins className="adsbygoogle"
                  style={{ display: 'block' }}
                  data-ad-client="ca-pub-1957003967974734"
                  data-ad-slot="1512951312"
                  data-ad-format="auto"
                  data-full-width-responsive="true"></ins>
          </AdBanner>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Pontuação Total" value={totalScore.toLocaleString()} icon={Trophy} />
            <StatCard title="K/D Ratio" value={kdRatio.toFixed(2)} icon={Target} />
            <StatCard title="Total Kills" value={(player.totalKills || 0).toLocaleString()} icon={Swords} />
            <StatCard title="Total Deaths" value={(player.totalDeaths || 0).toLocaleString()} icon={Shield} />
            
            <StatCard title="Partidas Jogadas" value={(player.matchesPlayed || 0).toLocaleString()} icon={FileText} subtext="Neste mês" />
            <StatCard title="Maior Kill Streak" value={(player.maxKillsStreak || 0).toLocaleString()} icon={ListOrdered} subtext="Abates sem morrer" />
            <StatCard title="Veículos Destruídos" value={(player.totalVehiclesDestroyed || 0).toLocaleString()} icon={Truck} />
            <StatCard title="Tempo Jogado" value={formatTime(player.totalTimeSeconds || 0)} icon={Clock} />

            {mainRoleInfo && (
               <StatCard title="Classe Principal" value={mainRoleInfo.name} icon={mainRoleInfo.icon} subtext="Mais jogada no mês" />
            )}

            <StatCard title="Team Kills" value={(player.totalTeamkills || 0).toLocaleString()} icon={UserX} subtext="Aliados abatidos" />
            <StatCard title="Fogo Amigo Sofrido" value={(player.deathsByTk || 0).toLocaleString()} icon={UserCheck} subtext="Morto por aliados" />
            <StatCard title="Combate" value={(player.totalCombat || 0).toLocaleString()} icon={Award} />
            <StatCard title="Suporte" value={(player.totalSupport || 0).toLocaleString()} icon={HeartPulse} />
          </div>

          <div className="grid gap-6 mt-6 md:grid-cols-2">
              <Card className="bg-red-950/20 border-red-900/50">
                  <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                          <Skull className="w-5 h-5"/> Maior Algoz no Mês (Nêmesis)
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      {topKilledBy && topKilledBy.length > 0 ? (
                          <div className="flex justify-between items-center bg-background/50 p-4 rounded-lg border border-red-900/30">
                              <span className="text-xl font-bold font-headline truncate pr-4 text-foreground/90">{topKilledBy[0].name}</span>
                              <div className="flex flex-col items-end">
                                  <span className="text-3xl font-black text-red-500">{topKilledBy[0].count}</span>
                                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Mortes</span>
                              </div>
                          </div>
                      ) : (
                          <p className="text-muted-foreground italic h-16 flex items-center px-4">Nenhum registro no mês.</p>
                      )}
                  </CardContent>
              </Card>

              <Card className="bg-green-950/20 border-green-900/50">
                  <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                          <Target className="w-5 h-5"/> Maior Vítima no Mês
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      {topVictims && topVictims.length > 0 ? (
                          <div className="flex justify-between items-center bg-background/50 p-4 rounded-lg border border-green-900/30">
                              <span className="text-xl font-bold font-headline truncate pr-4 text-foreground/90">{topVictims[0].name}</span>
                              <div className="flex flex-col items-end">
                                  <span className="text-3xl font-black text-green-500">{topVictims[0].count}</span>
                                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Abates</span>
                              </div>
                          </div>
                      ) : (
                          <p className="text-muted-foreground italic h-16 flex items-center px-4">Nenhum registro no mês.</p>
                      )}
                  </CardContent>
              </Card>
          </div>

          <div className="mt-6">
              <Card className="bg-card/50 backdrop-blur-sm border-accent/10">
                  <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                          <UserRoundCog className="w-5 h-5 text-accent"/> Tempo Jogado por Classe
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      {timePlayedByRole.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-2">
                              {timePlayedByRole.map((role) => (
                                  <div key={role.id} className="flex flex-col items-center justify-center p-4 rounded-lg bg-background/50 border border-border/50 hover:border-accent/50 transition-colors">
                                      <role.icon className="h-8 w-8 text-muted-foreground mb-2" />
                                      <span className="text-sm font-bold text-center mb-1">{role.name}</span>
                                      <span className="text-xs text-muted-foreground font-medium bg-accent/10 px-2 py-1 rounded text-accent">{formatTime(role.seconds)}</span>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-muted-foreground italic px-4 pb-4">Nenhum registro de classe neste mês.</p>
                      )}
                  </CardContent>
              </Card>
          </div>

          <div className="mt-6">
             <InteractionList title="Armas Mais Usadas do Mês" icon={Crosshair} data={topWeapons} isLoading={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
