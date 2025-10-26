'use client';

import { useState, useMemo, ReactNode } from 'react';
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
import { Search, Trophy, Skull, Crosshair, BarChart2, ShieldAlert, Target, Award, LayoutGrid, List } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { PlayerAggregates } from '@/lib/types';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'card';
type SortKey = 'totalScore' | 'totalKills' | 'totalDeaths' | 'kdRatio';
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const getRankHighlightClasses = (rank: number): string => {
    switch (rank) {
        case 1: return "text-yellow-400";
        case 2: return "text-slate-400";
        case 3: return "text-orange-400";
        default: return "text-muted-foreground";
    }
}

const RankIndicator = ({ rank }: { rank: number }) => {
    if (rank <= 3) {
        return <Trophy className={cn("h-5 w-5 inline-block", getRankHighlightClasses(rank))} />;
    }
    return <span className="font-bold text-sm w-6 text-center text-muted-foreground">{rank}</span>;
}

const CardRankIndicator = ({ rank }: { rank: number }) => {
    const highlightClass = getRankHighlightClasses(rank);
    if (rank <= 3) {
        return (
            <div className={cn("flex items-center gap-1", highlightClass)}>
                <Trophy className="h-4 w-4" />
                <span className="font-bold">#{rank}</span>
            </div>
        );
    }
    return <p className="text-sm text-muted-foreground">Rank #{rank}</p>;
};

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

const PlayerCardSkeleton = () => (
    <Card className="w-full">
        <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <Skeleton className="h-5 w-12 mx-auto mb-1" />
                    <Skeleton className="h-3 w-8 mx-auto" />
                </div>
                <div>
                    <Skeleton className="h-5 w-12 mx-auto mb-1" />
                    <Skeleton className="h-3 w-8 mx-auto" />
                </div>
                <div>
                   <Skeleton className="h-5 w-12 mx-auto mb-1" />
                   <Skeleton className="h-3 w-8 mx-auto" />
                </div>
            </div>
        </CardContent>
    </Card>
);

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
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const firestore = useFirestore();

  const playersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
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
            <CardTitle className="flex items-center justify-between text-xl font-headline md:text-2xl">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-accent" />
                <span>Player Rankings</span>
              </div>
               <div className="flex items-center gap-2">
                    <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('table')}>
                        <List className="h-5 w-5" />
                    </Button>
                    <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('card')}>
                        <LayoutGrid className="h-5 w-5" />
                    </Button>
                </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <div>
            {isLoading ? (
                viewMode === 'table' ? (
                     <Card>
                        <Table>
                            <TableBody>
                                {Array.from({ length: 10 }).map((_, i) => <PlayerRowSkeleton key={i} />)}
                            </TableBody>
                        </Table>
                     </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => <PlayerCardSkeleton key={i} />)}
                    </div>
                )
            ) : error ? (
                <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                    <h2 className="mt-4 text-xl font-semibold">Failed to load player data</h2>
                    <p className="mt-2 text-muted-foreground">Please check console for errors or try again later.</p>
                </Card>
            ) : sortedAndFilteredPlayers.length > 0 ? (
                viewMode === 'table' ? (
                    <Card>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="p-2 md:p-4">Player</TableHead>
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
                                    {sortedAndFilteredPlayers.map((player, index) => {
                                        const rank = index + 1;
                                        return (
                                            <TableRow key={player.id}>
                                                <TableCell className="p-2 md:p-4">
                                                <Link href={`/player/${player.id}`} className="flex items-center gap-3 group">
                                                    <div className="w-6 text-center">
                                                        <RankIndicator rank={rank} />
                                                    </div>
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
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sortedAndFilteredPlayers.map((player, index) => {
                            const rank = index + 1;
                            const cardHighlightClass = 
                                rank === 1 ? "border-yellow-400 shadow-yellow-400/20" :
                                rank === 2 ? "border-slate-400 shadow-slate-400/20" :
                                rank === 3 ? "border-orange-400 shadow-orange-400/20" :
                                "group-hover:border-accent group-hover:shadow-lg";

                            return (
                                <Link key={player.id} href={`/player/${player.id}`} className="group">
                                    <Card className={cn("h-full transition-all duration-200", cardHighlightClass)}>
                                        <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                                            <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary">
                                                <AvatarFallback className="text-xl">{player.latestPlayerName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="font-bold text-lg truncate" title={player.latestPlayerName}>{player.latestPlayerName}</p>
                                                <CardRankIndicator rank={rank} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                <div>
                                                    <p className="font-bold text-lg">{player.kdRatio?.toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">K/D Ratio</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg">{player.totalKills?.toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">Kills</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg">{player.totalScore?.toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">Score</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                )
            ) : (
                 <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <Search className="h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">No Players Found</h2>
                    <p className="mt-2 text-muted-foreground">Try refining your search query.</p>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
