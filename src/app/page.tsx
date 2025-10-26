'use client';

import { useState, useMemo } from 'react';
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
import { Search, Trophy, Skull, Crosshair, BarChart2, ShieldAlert, Target, Award, ChevronsUpDown } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { PlayerAggregates } from '@/lib/types';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SortKey = 'totalScore' | 'totalKills' | 'totalDeaths' | 'kdRatio';
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

function PlayerRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="p-2 md:p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className='flex-1'>
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-center md:table-cell"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
      <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
      <TableCell className="hidden text-center md:table-cell"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
      <TableCell className="text-center">
        <Skeleton className="h-6 w-16 mx-auto rounded-full" />
      </TableCell>
    </TableRow>
  )
}

const SortableHeader = ({
  children,
  sortKey,
  sortConfig,
  requestSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  sortConfig: SortConfig;
  requestSort: (key: SortKey) => void;
  className?: string;
}) => {
  const isActive = sortConfig.key === sortKey;
  const directionIcon = sortConfig.direction === 'ascending' ? '▲' : '▼';

  return (
    <TableHead className={cn("text-center", className)}>
      <Button variant="ghost" onClick={() => requestSort(sortKey)} className="group h-auto p-2">
        {children}
        <span className={cn(
          "ml-2 transition-opacity",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
        )}>
          {directionIcon}
        </span>
      </Button>
    </TableHead>
  );
};


export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'totalKills', direction: 'descending' });
  const firestore = useFirestore();

  const playersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Default sort by totalKills on the backend
    return query(
        collection(firestore, 'playerAggregates'),
        orderBy('totalKills', 'desc'),
        limit(200)
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
        
        return { ...player, id: player.id, totalKills, totalDeaths, totalScore, kdRatio };
    });
  }, [rawPlayers]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredPlayers = useMemoFirebase(() => {
    let sortablePlayers = [...processedPlayers];

    // Only apply client-side sorting if it's different from the default Firestore sort
    if (sortConfig.key !== 'totalKills' || sortConfig.direction !== 'descending') {
        sortablePlayers.sort((a, b) => {
            const valA = a[sortConfig.key] || 0;
            const valB = b[sortConfig.key] || 0;

            if (valA < valB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    if (!searchQuery) {
      return sortablePlayers;
    }
    return sortablePlayers.filter((player) =>
      player.latestPlayerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [processedPlayers, searchQuery, sortConfig]);


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
                    <TableHead>Player</TableHead>
                    <SortableHeader sortKey="totalScore" sortConfig={sortConfig} requestSort={requestSort} className="hidden md:table-cell">
                       <Award className="h-5 w-5 inline-block" /> <span className="hidden md:inline">Score</span>
                    </SortableHeader>
                    <SortableHeader sortKey="totalKills" sortConfig={sortConfig} requestSort={requestSort}>
                      <Crosshair className="h-5 w-5 inline-block" /> <span className="hidden md:inline">Kills</span>
                    </SortableHeader>
                     <SortableHeader sortKey="totalDeaths" sortConfig={sortConfig} requestSort={requestSort} className="hidden md:table-cell">
                      <Skull className="h-5 w-5 inline-block" /> <span className="hidden md:inline">Deaths</span>
                    </SortableHeader>
                    <SortableHeader sortKey="kdRatio" sortConfig={sortConfig} requestSort={requestSort}>
                      <Target className="h-5 w-5 inline-block" /> <span className="hidden md:inline">K/D Ratio</span>
                    </SortableHeader>
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
                  ) : sortedAndFilteredPlayers.length > 0 ? (
                    sortedAndFilteredPlayers.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell className="p-2 md:p-4">
                           <Link href={`/player/${player.id}`} className="flex items-center gap-3 group">
                            <span className="font-bold text-sm w-6 text-center text-muted-foreground">{index + 1}</span>
                            <Avatar>
                              <AvatarFallback>{player.latestPlayerName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium group-hover:text-accent transition-colors truncate">{player.latestPlayerName}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden text-center font-semibold md:table-cell">{player.totalScore?.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{player.totalKills?.toLocaleString()}</TableCell>
                        <TableCell className="hidden text-center md:table-cell">{player.totalDeaths?.toLocaleString()}</TableCell>
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
