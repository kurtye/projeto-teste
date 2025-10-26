
'use client';

import { useMemoFirebase, useDoc, useFirestore, useCollection } from '@/firebase';
import { notFound } from 'next/navigation';
import type { PlayerAggregates, PlayerInteraction, WeaponUsage, GlobalStats } from '@/lib/types';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
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
  Skull,
  ShieldAlert,
  UserCheck,
  UserX,
  FileText,
  Trophy,
  Target,
  LineChart,
  Crosshair,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { use, useMemo, useState, useEffect } from 'react';
import {
  PolarGrid,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { getHallOfFameStats } from '@/app/hall-of-fame/actions';

interface PlayerProfilePageProps {
  params: {
    playerId: string;
  };
}

interface HallOfFameMap {
  [playerId: string]: string[];
}

const STAT_CATEGORY_NAMES: Record<string, string> = {
  totalKills: 'Rei dos Kills',
  totalCombat: 'Rei do Combate',
  totalOffense: 'Rei do Ataque',
  totalDefense: 'Rei da Defesa',
  totalSupport: 'Rei do Suporte',
  totalTimeSeconds: 'Mais Tempo Jogado',
  longestLifeSecs: 'Vida Mais Longa',
  loneWolf: 'O Lobo Solitário',
};


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
                      <li className="text-muted-foreground">Nenhum dado.</li>
                    )}
                </ul>
            )}
        </CardContent>
    </Card>
);

const PlayerTrophies = ({ titles }: { titles: string[] }) => {
    if (!titles || titles.length === 0) return null;

    return (
        <div className="mt-4 flex flex-col items-center gap-1">
            {titles.map(title => (
                <div key={title} className="flex items-center gap-2 text-yellow-400">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold text-sm">{title}</span>
                </div>
            ))}
        </div>
    );
};


export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const firestore = useFirestore();
  const resolvedParams = use(params);
  const playerId = decodeURIComponent(resolvedParams.playerId);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameMap>({});

  // Fetch player data
  const playerDocRef = useMemoFirebase(() => {
    if (!firestore || !playerId) return null;
    return doc(firestore, 'playerAggregates', playerId);
  }, [firestore, playerId]);
  const { data: player, isLoading: isLoadingPlayer, error } = useDoc<PlayerAggregates>(playerDocRef);

  // Fetch global stats
  const globalStatsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'globalStats', 'summary');
  }, [firestore]);
  const { data: globalStats, isLoading: isLoadingGlobalStats } = useDoc<GlobalStats>(globalStatsDocRef);

  // Fetch Hall of Fame data
    useEffect(() => {
        async function fetchHallOfFame() {
            const stats = await getHallOfFameStats();
            const fameMap: HallOfFameMap = {};
            for (const key in stats) {
                const recordHolder = stats[key as keyof typeof stats];
                if (recordHolder && recordHolder.id) {
                    if (!fameMap[recordHolder.id]) {
                        fameMap[recordHolder.id] = [];
                    }
                    fameMap[recordHolder.id].push(STAT_CATEGORY_NAMES[key] || key);
                }
            }
            setHallOfFame(fameMap);
        }
        fetchHallOfFame();
    }, []);

  // Queries for subcollections
  const killedByQuery = useMemoFirebase(() => {
      if (!playerDocRef) return null;
      return query(collection(playerDocRef, 'killedBy'), orderBy('count', 'desc'), limit(5));
  }, [playerDocRef]);
  const { data: mostKilledBy, isLoading: isLoadingKilledBy } = useCollection<PlayerInteraction>(killedByQuery);

  const killedPlayersQuery = useMemoFirebase(() => {
      if (!playerDocRef) return null;
      return query(collection(playerDocRef, 'killedPlayers'), orderBy('count', 'desc'), limit(5));
  }, [playerDocRef]);
  const { data: mostKilledPlayers, isLoading: isLoadingKilledPlayers } = useCollection<PlayerInteraction>(killedPlayersQuery);
  
  const weaponUsageQuery = useMemoFirebase(() => {
    if (!playerDocRef) return null;
    return query(collection(playerDocRef, 'weaponUsage'), orderBy('count', 'desc'), limit(5));
  }, [playerDocRef]);
  const { data: topWeapons, isLoading: isLoadingTopWeapons } = useCollection<WeaponUsage>(weaponUsageQuery);

  const chartData = useMemo(() => {
      if (!player || !globalStats) return [];
      
      const getPercentage = (value: number | undefined, max: number | undefined) => {
        if (!value || !max || max === 0) return 0;
        return Math.round((value / max) * 100);
      };

      return [
        { stat: 'Kills', value: getPercentage(player.totalKills, globalStats.maxTotalKills), full: player.totalKills || 0 },
        { stat: 'Combat', value: getPercentage(player.totalCombat, globalStats.maxTotalCombat), full: player.totalCombat || 0 },
        { stat: 'Offense', value: getPercentage(player.totalOffense, globalStats.maxTotalOffense), full: player.totalOffense || 0 },
        { stat: 'Defense', value: getPercentage(player.totalDefense, globalStats.maxTotalDefense), full: player.totalDefense || 0 },
        { stat: 'Support', value: getPercentage(player.totalSupport, globalStats.maxTotalSupport), full: player.totalSupport || 0 },
      ];
  }, [player, globalStats]);

  const chartConfig = {
      value: { label: 'Performance (%)' },
      full: { label: 'Raw Value' },
  };

  if (isLoadingPlayer || isLoadingGlobalStats) {
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
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                    </div>
                     <div className="grid gap-6 mt-6 md:grid-cols-1 lg:grid-cols-3">
                         <Skeleton className="h-80 w-full" />
                         <Skeleton className="h-80 w-full" />
                         <Skeleton className="h-80 w-full" />
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
            <h1 className="text-2xl font-bold">Error Loading Player</h1>
            <p>Could not load data for this player. Please try again later.</p>
             <Button asChild variant="outline" className="mt-6">
                <Link href="/">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Leaderboard
                </Link>
            </Button>
        </div>
    )
  }

  if (!player) {
    notFound();
  }
  
  const kdRatio = player.totalDeaths ? (player.totalKills || 0) / player.totalDeaths : 0;
  
  const totalScore = (player.totalCombat || 0) + (player.totalDefense || 0) + (player.totalSupport || 0) + (player.totalOffense || 0);

  const playerTrophies = hallOfFame[playerId] || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button asChild variant="outline">
            <Link href="/">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Leaderboard
            </Link>
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarFallback className="text-4xl">{player.latestPlayerName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <h1 className="text-4xl font-bold font-headline">{player.latestPlayerName}</h1>
            {player.status === 'retired' && <Badge variant="default" className="text-base bg-slate-700 text-slate-100">Retired</Badge>}
          </div>
          <Badge className="text-base" variant="outline">
            <FileText className="mr-2 h-5 w-5 text-accent" /> ID: ...{player.id.slice(-6)}
          </Badge>
          <PlayerTrophies titles={playerTrophies} />
        </div>

        <div className="flex-1 w-full space-y-6">
          <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <LineChart className="w-5 h-5"/> 
                    Player Style (vs. Global Max)
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
                                    <span className="text-xs text-muted-foreground">{`(${value}% of record)`}</span>
                                </div>
                            )}
                        />} 
                    />
                        <PolarAngleAxis dataKey="stat" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <PolarGrid />
                        <Radar
                            name="Player Stats"
                            dataKey="value"
                            stroke="hsl(var(--accent))"
                            fill="hsl(var(--accent))"
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Score" value={totalScore.toLocaleString()} icon={Trophy} />
            <StatCard title="K/D Ratio" value={kdRatio.toFixed(2)} icon={Target} />
            <StatCard title="Total Kills" value={(player.totalKills || 0).toLocaleString()} icon={Swords} />
            <StatCard title="Total Deaths" value={(player.totalDeaths || 0).toLocaleString()} icon={Shield} />
            <StatCard title="Time Played" value={formatTime(player.totalTimeSeconds || 0)} icon={Clock} />
            <StatCard title="Longest Life" value={formatMinutes(player.longestLifeSecs || 0)} icon={Timer} />
            <StatCard title="Team Kills" value={(player.totalTeamKills || 0).toLocaleString()} icon={UserX} />
            <StatCard title="Deaths by TK" value={(player.totalDeathsByTK || 0).toLocaleString()} icon={UserCheck} />
          </div>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
             <InteractionList title="Top Weapons" icon={Crosshair} data={topWeapons} isLoading={isLoadingTopWeapons} />
             <InteractionList title="Most Killed By" icon={Skull} data={mostKilledBy} isLoading={isLoadingKilledBy} />
             <InteractionList title="Top Victims" icon={Target} data={mostKilledPlayers} isLoading={isLoadingKilledPlayers} />
          </div>
        </div>
      </div>
    </div>
  );
}


    