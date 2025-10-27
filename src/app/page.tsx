
'use client';

import { useState, useMemo, ReactNode, useEffect } from 'react';
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
import { getHallOfFameStats } from '@/app/hall-of-fame/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdBanner } from '@/components/AdBanner';


type ViewMode = 'card' | 'table';
type SortKey = 'totalScore' | 'totalKills' | 'totalDeaths' | 'kdRatio';
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
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


const CLANS = ['SMK', 'HRB', 'RZN', 'OCL', '3LPZ', 'WRT', 'SAP', 'BOLD', 'IDG', 'SOH'];

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
            <Skeleton className="h-12 w-12 rounded-full" />
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
  const [clanFilter, setClanFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'totalKills', direction: 'descending' });
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [hallOfFame, setHallOfFame] = useState<HallOfFameMap>({});
  const firestore = useFirestore();

  useEffect(() => {
    async function fetchHallOfFame() {
        const stats = await getHallOfFameStats();
        const fameMap: HallOfFameMap = {};
        for (const key in stats) {
            const player = stats[key as keyof typeof stats];
            if (player && player.id) {
                if (!fameMap[player.id]) {
                    fameMap[player.id] = [];
                }
                fameMap[player.id].push(STAT_CATEGORY_NAMES[key] || key);
            }
        }
        setHallOfFame(fameMap);
    }
    fetchHallOfFame();
  }, []);

  const playersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    // Testamos agora com um limite de 2000 jogadores.
    const queryLimit = 2000;
    
    return query(
      collection(firestore, 'playerAggregates'),
      orderBy('totalKills', 'desc'),
      limit(queryLimit)
    );
  }, [firestore]);


  const { data: rawPlayers, isLoading, error } = useCollection<PlayerAggregates>(playersQuery);

  const processedPlayers = useMemo(() => {
    if (!rawPlayers) return [];
    
    let filteredData = rawPlayers;
    
    // 1. Filtragem por clã ou busca geral (ocorre primeiro)
    if (searchQuery) {
        filteredData = rawPlayers.filter(player =>
            player.latestPlayerName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 2. Mapeamento para adicionar campos calculados
    return filteredData.map(player => {
        const totalKills = player.totalKills || 0;
        const totalDeaths = player.totalDeaths || 1; // Avoid division by zero
        const totalScore = (player.totalCombat || 0) + (player.totalDefense || 0) + (player.totalSupport || 0) + (player.totalOffense || 0);
        const kdRatio = totalKills / totalDeaths;
        
        return { ...player, id: player.id, totalKills, totalDeaths, totalScore, kdRatio };
    });
  }, [rawPlayers, searchQuery]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredPlayers = useMemo(() => {
    let sortablePlayers = [...processedPlayers];

    // 3. Ordenação final baseada no estado do sortConfig
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

    return sortablePlayers;

  }, [processedPlayers, sortConfig]);

  const handleClanFilterClick = (clan: string | null) => {
    setClanFilter(clan);
    setSearchQuery(clan || '');
  };
  
  const KingBadge = ({ playerId }: { playerId: string }) => {
    const titles = hallOfFame[playerId];
    if (!titles) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <Badge variant="outline" className="ml-2 border-yellow-400/50 bg-yellow-400/10 text-yellow-300">
                        <Trophy className="h-3 w-3" />
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-semibold">Recordista!</p>
                    <ul className="list-disc list-inside">
                        {titles.map(title => <li key={title}>{title}</li>)}
                    </ul>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const InFeedAd = () => (
  <AdBanner>
      <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-format="fluid"
          data-ad-layout-key="-fb+5w+4e-db+86"
          data-ad-client="ca-pub-1957003967974734"
          data-ad-slot="8617415710"
      ></ins>
  </AdBanner>
);


  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="space-y-8">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl font-headline md:text-2xl">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-accent" />
                <span>Player Rankings</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or clan tag..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (clanFilter && !e.target.value.toLowerCase().includes(clanFilter.toLowerCase())) {
                    setClanFilter(null);
                  }
                }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
                <Button 
                    size="sm"
                    variant={clanFilter === null ? 'default' : 'outline'} 
                    onClick={() => handleClanFilterClick(null)}
                >
                    Todos
                </Button>
                {CLANS.map(clan => (
                    <Button 
                        key={clan}
                        size="sm" 
                        variant={clanFilter === clan ? 'default' : 'outline'} 
                        onClick={() => handleClanFilterClick(clan)}
                    >
                        {clan}
                    </Button>
                ))}
            </div>
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

        <div className="flex justify-center md:justify-end gap-0 md:gap-2 rounded-md overflow-hidden md:rounded-lg">
            <Button 
                variant={viewMode === 'card' ? 'secondary' : 'ghost'} 
                onClick={() => setViewMode('card')} 
                aria-label="Visualização em grade"
                className="w-1/2 md:w-auto md:rounded-md rounded-none border-r md:border-none"
            >
                <LayoutGrid className="h-5 w-5" />
                <span className="ml-2 md:hidden">Cards</span>
            </Button>
            <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                onClick={() => setViewMode('table')} 
                aria-label="Visualização em lista"
                className="w-1/2 md:w-auto md:rounded-md rounded-none"
            >
                <List className="h-5 w-5" />
                <span className="ml-2 md:hidden">Lista</span>
            </Button>
        </div>


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
                    <p className="mt-2 text-muted-foreground">An unexpected error occurred. Please try again later.</p>
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
                                                <Link href={`/player/${encodeURIComponent(player.id)}`} className="flex items-center gap-3 group">
                                                    <div className="w-6 text-center">
                                                        <RankIndicator rank={rank} />
                                                    </div>
                                                    <Avatar>
                                                    <AvatarFallback>{player.latestPlayerName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex items-center">
                                                        <span className="font-medium group-hover:text-accent transition-colors truncate">{player.latestPlayerName}</span>
                                                        <KingBadge playerId={player.id} />
                                                    </div>
                                                    {player.status === 'retired' && <Badge variant="secondary">Retired</Badge>}
                                                </Link>
                                                </TableCell>
                                                <TableCell className="hidden text-center font-semibold md:table-cell">{(player.totalScore || 0).toLocaleString()}</TableCell>
                                                <TableCell className="text-center">{(player.totalKills || 0).toLocaleString()}</TableCell>
                                                <TableCell className="hidden text-center md:table-cell">{(player.totalDeaths || 0).toLocaleString()}</TableCell>
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
                        {sortedAndFilteredPlayers.flatMap((player, index) => {
                            const rank = index + 1;
                            const cardHighlightClass = 
                                rank === 1 ? "border-yellow-400 shadow-yellow-400/20" :
                                rank === 2 ? "border-slate-400 shadow-slate-400/20" :
                                rank === 3 ? "border-orange-400 shadow-orange-400/20" :
                                "group-hover:border-accent group-hover:shadow-lg";

                            const playerCard = (
                                <Link key={player.id} href={`/player/${encodeURIComponent(player.id)}`} className="group">
                                    <Card className={cn("h-full transition-all duration-200", cardHighlightClass)}>
                                        <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                                            <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary">
                                                <AvatarFallback className="text-xl font-bold">{rank}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex items-center">
                                                    <p className="font-bold text-lg truncate" title={player.latestPlayerName}>{player.latestPlayerName}</p>
                                                    <KingBadge playerId={player.id} />
                                                </div>
                                                <CardRankIndicator rank={rank} />
                                            </div>
                                             {player.status === 'retired' && <Badge variant="secondary" className="absolute top-2 right-2">Retired</Badge>}
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div>
                                                    <p className="font-bold text-lg">{player.kdRatio?.toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">K/D Ratio</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg">{(player.totalKills || 0).toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">Kills</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg">{(player.totalScore || 0).toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">Score</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );

                            // Adicionar anúncio a cada 30 cards
                            if ((index + 1) % 30 === 0) {
                                return [playerCard, <InFeedAd key={`ad-${index}`} />];
                            }
                            
                            return [playerCard];
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
