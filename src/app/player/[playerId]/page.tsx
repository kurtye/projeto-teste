'use client';

import { useMemoFirebase, useDoc, useFirestore, useCollection } from '@/firebase';
import { notFound } from 'next/navigation';
import type { PlayerAggregates, PlayerInteraction } from '@/lib/types';
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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

const sortObjectByValue = (obj: { [key: string]: number } | undefined) => {
    if (!obj) return [];
    return Object.entries(obj).sort(([, a], [, b]) => b - a);
}

const InteractionList = ({ title, icon: Icon, data, isLoading }: { title: string, icon: React.ElementType, data: PlayerInteraction[] | null, isLoading: boolean }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Icon /> {title}</CardTitle>
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


export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const firestore = useFirestore();
  const playerId = decodeURIComponent(params.playerId);

  const playerDocRef = useMemoFirebase(() => {
    if (!firestore || !playerId) return null;
    return doc(firestore, 'playerAggregates', playerId);
  }, [firestore, playerId]);

  const { data: player, isLoading: isLoadingPlayer, error } = useDoc<PlayerAggregates>(playerDocRef);

  // Queries for subcollections
  const killedByQuery = useMemoFirebase(() => {
      if (!playerDocRef) return null;
      return query(collection(playerDocRef, 'killedBy'), orderBy('count', 'desc'), limit(5));
  }, [playerDocRef]);

  const killedPlayersQuery = useMemoFirebase(() => {
      if (!playerDocRef) return null;
      return query(collection(playerDocRef, 'killedPlayers'), orderBy('count', 'desc'), limit(5));
  }, [playerDocRef]);

  const { data: mostKilledBy, isLoading: isLoadingKilledBy } = useCollection<PlayerInteraction>(killedByQuery);
  const { data: mostKilledPlayers, isLoading: isLoadingKilledPlayers } = useCollection<PlayerInteraction>(killedPlayersQuery);

  const topWeapons = useMemoFirebase(() => {
    if (!player?.weaponUsage) return [];
    return sortObjectByValue(player.weaponUsage).slice(0, 5);
  }, [player?.weaponUsage]);

  if (isLoadingPlayer) {
    return (
        <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-10 w-48 mb-6" />
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-32 w-32 rounded-full" />
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-8 w-24" />
                </div>
                <div className="flex-1 w-full mt-8 md:mt-0 md:ml-8">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                    </div>
                     <div className="grid gap-6 mt-6 md:grid-cols-3">
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
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarFallback className="text-4xl">{player.latestPlayerName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-bold font-headline">{player.latestPlayerName}</h1>
          <Badge className="text-lg" variant="outline">
            <FileText className="mr-2 h-5 w-5 text-accent" /> ID: ...{player.id.slice(-6)}
          </Badge>
        </div>
        <div className="flex-1 w-full mt-8 md:mt-0 md:ml-8">
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

          <div className="grid gap-6 mt-6 md:grid-cols-3">
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Swords /> Top Weapons</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm">
                        {topWeapons.map(([name, count]) => (
                            <li key={name} className="flex justify-between">
                                <span className="truncate pr-4">{name}</span>
                                <span className="font-bold">{count.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
             </Card>
             <InteractionList title="Most Killed By" icon={Skull} data={mostKilledBy} isLoading={isLoadingKilledBy} />
             <InteractionList title="Top Victims" icon={Target} data={mostKilledPlayers} isLoading={isLoadingKilledPlayers} />
          </div>
        </div>
      </div>
    </div>
  );
}
