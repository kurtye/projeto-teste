'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Trophy, Swords, Shield, Target, Award, ShieldAlert, Skull, Crosshair, BarChart2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { PlayerAggregates } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

function PlayerRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="font-bold text-lg text-center"><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </TableCell>
      <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
      <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
      <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
    </TableRow>
  )
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const firestore = useFirestore();

  const playersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'playerAggregates'),
        orderBy('totalScore', 'desc'),
        limit(100)
    );
  }, [firestore]);

  const { data: rawPlayers, isLoading, error } = useCollection<PlayerAggregates>(playersQuery);

  const processedPlayers = useMemoFirebase(() => {
    if (!rawPlayers) return [];
    
    return rawPlayers.map(player => {
        const totalKills = player.totalKills || 0;
        const totalDeaths = player.totalDeaths || 1; // Avoid division by zero
        const totalScore = (player.totalCombat || 0) + (player.totalDefense || 0) + (player.totalSupport || 0) + (player.totalOffense || 0);
        const kdRatio = totalKills / totalDeaths;
        
        return {
            ...player,
            id: player.id,
            totalKills,
            totalScore,
            kdRatio
        };
    }).sort((a, b) => b.totalScore - a.totalScore); // Re-sort just in case, though query should handle it.
  }, [rawPlayers]);

  const filteredPlayers = useMemoFirebase(() => {
     if (!searchQuery) {
      return processedPlayers;
    }
    return processedPlayers.filter((player) =>
      player.latestPlayerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [processedPlayers, searchQuery]);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline md:text-2xl">
              <BarChart2 className="h-6 w-6 text-accent" />
              <span>Player Rankings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium text-muted-foreground">
                  Player Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-3xl">Global Player Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-center">
                      <Trophy className="h-5 w-5 inline-block" /> Rank
                    </TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">
                      <Award className="h-5 w-5 inline-block" /> Score
                    </TableHead>
                    <TableHead className="text-center">
                      <Crosshair className="h-5 w-5 inline-block" /> Kills
                    </TableHead>
                    <TableHead className="text-center">
                      <Skull className="h-5 w-5 inline-block" /> Deaths
                    </TableHead>
                    <TableHead className="text-center">
                      <Target className="h-5 w-5 inline-block" /> K/D Ratio
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     Array.from({ length: 10 }).map((_, i) => <PlayerRowSkeleton key={i} />)
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-destructive">
                        <ShieldAlert className="h-6 w-6 mx-auto mb-2" />
                        Failed to load player data. Please check console for errors.
                      </TableCell>
                    </TableRow>
                  ) : filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-bold text-lg text-center">{index + 1}</TableCell>
                        <TableCell>
                          <Link href={`/player/${player.id}`} className="flex items-center gap-3 group">
                            <Avatar>
                              <AvatarFallback>{player.latestPlayerName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium group-hover:text-accent transition-colors">{player.latestPlayerName}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{player.totalScore?.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{player.totalKills?.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{player.totalDeaths?.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={player.kdRatio && player.kdRatio > 2.0 ? 'destructive' : player.kdRatio && player.kdRatio > 1.0 ? 'default' : 'secondary'} className="bg-accent/20 text-accent-foreground border-accent/30">
                            {player.kdRatio?.toFixed(2)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No players found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
