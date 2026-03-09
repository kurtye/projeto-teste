
'use client';

import { useState, useMemo, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { Search, Trophy, Skull, Crosshair, BarChart2, ShieldAlert, Target, Award, LayoutGrid, List, Zap } from 'lucide-react';
import type { PlayerAggregates, ClanMemberInfo } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdBanner } from '@/components/AdBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type ViewMode = 'card' | 'table';
type SortKey = 'totalScore' | 'totalKills' | 'totalDeaths' | 'kdRatio';
type SortDirection = 'ascending' | 'descending';
type Period = 'geral' | 'mensal' | 'semanal' | 'pph';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface HallOfFameMap {
  [playerId: string]: string[];
}

interface RankingsData {
  geral: PlayerAggregates[];
  mensal: PlayerAggregates[];
  semanal: PlayerAggregates[];
}

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

const TacticalDNABar = ({ player }: { player: any }) => {
    // Calculamos o total específico dos 4 pilares para a proporção de 100%
    const off = player.totalOffense || 0;
    const def = player.totalDefense || 0;
    const sup = player.totalSupport || 0;
    const com = player.totalCombat || 0;
    const total = off + def + sup + com || 1;

    const items = [
        { label: 'Ataque', value: (off / total) * 100, color: 'bg-red-500', textColor: 'text-red-500' },
        { label: 'Defesa', value: (def / total) * 100, color: 'bg-blue-500', textColor: 'text-blue-500' },
        { label: 'Suporte', value: (sup / total) * 100, color: 'bg-green-500', textColor: 'text-green-500' },
        { label: 'Combate', value: (com / total) * 100, color: 'bg-amber-500', textColor: 'text-amber-500' },
    ].sort((a, b) => b.value - a.value); // Ordena do maior para o menor

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-muted mt-2 cursor-help border border-border/20 shadow-inner">
                        {items.map((item, idx) => (
                            <div 
                                key={idx}
                                className={cn(item.color, "h-full transition-all duration-500 ease-in-out")} 
                                style={{ width: `${item.value}%` }} 
                            />
                        ))}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="p-4 space-y-2 bg-popover/98 backdrop-blur-xl border-accent/20 shadow-2xl min-w-[180px]">
                    <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-accent mb-1 border-b border-border/50 pb-1">DNA ESTRATÉGICO</p>
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full shadow-sm", item.color)} /> 
                                    <span className="font-medium text-foreground/90">{item.label}</span>
                                </div>
                                <span className={cn("font-bold tabular-nums", item.textColor)}>
                                    {Math.round(item.value)}%
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-1 mt-1 border-t border-border/30">
                        <p className="text-[9px] text-muted-foreground italic">Distribuição proporcional da pontuação</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const RankingDisplay = ({ 
    players, 
    viewMode, 
    hallOfFame,
    sortConfig,
    requestSort,
    clanMembers,
    isPPH = false
}: { 
    players: (PlayerAggregates & { totalScore: number, kdRatio: number })[], 
    viewMode: ViewMode,
    hallOfFame: HallOfFameMap,
    sortConfig: SortConfig,
    requestSort: (key: SortKey) => void,
    clanMembers: Record<string, ClanMemberInfo>,
    isPPH?: boolean
}) => {

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
                        <ul className="list-disc list-inside text-xs">
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

    const formatVal = (val: number) => {
        if (isPPH) {
            return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '/h';
        }
        return val.toLocaleString();
    };

    if (players.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center mt-4">
                <Search className="h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Nenhum jogador encontrado</h2>
                <p className="mt-2 text-muted-foreground">Tente refinar sua busca ou verifique este ranking mais tarde.</p>
            </Card>
        )
    }

    return viewMode === 'table' ? (
        <Card className="mt-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="p-2 md:p-4">Jogador</TableHead>
                        <SortableHeader sortKey="totalScore" sortConfig={sortConfig} requestSort={requestSort} className="hidden md:table-cell">
                            <Award className="h-5 w-5 inline-block" /> <span className="hidden md:inline">{isPPH ? 'Score/h' : 'Score'}</span>
                        </SortableHeader>
                        <SortableHeader sortKey="totalKills" sortConfig={sortConfig} requestSort={requestSort}>
                          <Crosshair className="h-5 w-5 inline-block" /> <span className="hidden md:inline">{isPPH ? 'Kills/h' : 'Kills'}</span>
                        </SortableHeader>
                        <SortableHeader sortKey="totalDeaths" sortConfig={sortConfig} requestSort={requestSort} className="hidden md:table-cell">
                          <Skull className="h-5 w-5 inline-block" /> <span className="hidden md:inline">{isPPH ? 'Mortes/h' : 'Mortes'}</span>
                        </SortableHeader>
                        <SortableHeader sortKey="kdRatio" sortConfig={sortConfig} requestSort={requestSort}>
                          <Target className="h-5 w-5 inline-block" /> <span className="hidden md:inline">K/D Ratio</span>
                        </SortableHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {players.map((player, index) => {
                            const rank = index + 1;
                            const clanInfo = clanMembers[player.id];
                            return (
                                <TableRow key={player.id}>
                                    <TableCell className="p-2 md:p-4">
                                    <Link href={`/player/${encodeURIComponent(player.id)}`} className="flex items-center gap-3 group">
                                        <div className="w-6 text-center">
                                            <RankIndicator rank={rank} />
                                        </div>
                                        <Avatar>
                                            {clanInfo && clanInfo.clanLogoUrl ? (
                                                <Image src={clanInfo.clanLogoUrl} alt={clanInfo.clanName} fill className="object-cover" />
                                            ) : (
                                                <AvatarFallback>{player.latestPlayerName.charAt(0)}</AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden">
                                            <div className="flex items-center">
                                                <span className="font-medium group-hover:text-accent transition-colors truncate">{player.latestPlayerName}</span>
                                                <KingBadge playerId={player.id} />
                                                {clanInfo && clanInfo.rank !== 'Recruta' && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Image 
                                                                    src={`/patentes/${clanInfo.rank === 'Comandante' || clanInfo.rank === 'Subcomandante' ? 'Marechal' : clanInfo.rank}.jpeg`} 
                                                                    alt={clanInfo.rank} 
                                                                    width={20} 
                                                                    height={20} 
                                                                    className="ml-2 h-5 w-5 object-contain"
                                                                />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{clanInfo.rank.replace(/-/g, ' ').replace('Capitao', 'Capitão')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                {player.status === 'retired' && <Badge variant="secondary" className='ml-2 text-[10px] h-4 py-0'>Aposentado</Badge>}
                                            </div>
                                            <TacticalDNABar player={player} />
                                        </div>
                                    </Link>
                                    </TableCell>
                                    <TableCell className="hidden text-center font-semibold md:table-cell">{formatVal(player.totalScore || 0)}</TableCell>
                                    <TableCell className="text-center">{formatVal(player.totalKills || 0)}</TableCell>
                                    <TableCell className="hidden text-center md:table-cell">{formatVal(player.totalDeaths || 0)}</TableCell>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {players.flatMap((player, index) => {
                const rank = index + 1;
                const clanInfo = clanMembers[player.id];
                const cardHighlightClass = 
                    rank === 1 ? "border-yellow-400 shadow-yellow-400/20" :
                    rank === 2 ? "border-slate-400 shadow-slate-400/20" :
                    rank === 3 ? "border-orange-400 shadow-orange-400/20" :
                    "group-hover:border-accent group-hover:shadow-lg";

                const playerCard = (
                    <Link key={player.id} href={`/player/${encodeURIComponent(player.id)}`} className="group">
                        <Card className={cn("h-full transition-all duration-200 relative", cardHighlightClass)}>
                            <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                                <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary">
                                    {clanInfo && clanInfo.clanLogoUrl ? (
                                        <Image src={clanInfo.clanLogoUrl} alt={clanInfo.clanName} fill className="object-cover" />
                                    ) : (
                                        <AvatarFallback className="text-xl font-bold bg-green-500/20 text-green-400 border-green-500/30">{rank}</AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center">
                                        <p className="font-bold text-lg truncate" title={player.latestPlayerName}>{player.latestPlayerName}</p>
                                        <KingBadge playerId={player.id} />
                                    </div>
                                    <CardRankIndicator rank={rank} />
                                    <TacticalDNABar player={player} />
                                </div>
                            </CardHeader>
                             <CardContent className="p-4 pt-0">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <p className="font-bold text-lg">{player.kdRatio?.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">K/D Ratio</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{formatVal(player.totalKills || 0)}</p>
                                        <p className="text-xs text-muted-foreground">{isPPH ? 'Kills/h' : 'Kills'}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{formatVal(player.totalScore || 0)}</p>
                                        <p className="text-xs text-muted-foreground">{isPPH ? 'Score/h' : 'Score'}</p>
                                    </div>
                                </div>
                            </CardContent>
                             {clanInfo && clanInfo.rank !== 'Recruta' && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger className="absolute top-2 right-2">
                                            <Image 
                                                src={`/patentes/${clanInfo.rank === 'Comandante' || clanInfo.rank === 'Subcomandante' ? 'Marechal' : clanInfo.rank}.jpeg`} 
                                                alt={clanInfo.rank} 
                                                width={28} 
                                                height={28}
                                                className="h-7 w-7 object-contain"
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{clanInfo.rank.replace(/-/g, ' ').replace('Capitao', 'Capitão')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {player.status === 'retired' && <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">Aposentado</Badge>}
                        </Card>
                    </Link>
                );

                if ((index + 1) % 30 === 0) {
                    return [<div key={`ad-wrapper-${index}`} className="sm:col-span-2 md:col-span-3 lg:col-span-4"><InFeedAd key={`ad-${index}`} /></div>, playerCard ];
                }
                
                return [playerCard];
            })}
        </div>
    );
};


export function Ranking({ 
    initialRankings, 
    initialHallOfFame,
    initialClanMembers
}: { 
    initialRankings: RankingsData, 
    initialHallOfFame: HallOfFameMap,
    initialClanMembers: Record<string, ClanMemberInfo>
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clanFilter, setClanFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'totalScore', direction: 'descending' });
  const [viewMode, setViewMode] = useState('card' as ViewMode);
  const [activeTab, setActiveTab] = useState<Period>('semanal');
  
  const processedPlayers = useMemo(() => {
    let playersToProcess = initialRankings[activeTab === 'pph' ? 'geral' : activeTab] || [];
    
    // Filtro de elite para ranking de eficiência (mínimo 10 horas)
    if (activeTab === 'pph') {
        playersToProcess = playersToProcess.filter(p => (p.totalTimeSeconds || 0) >= 36000);
    }

    let filteredData = playersToProcess;
    
    if (searchQuery) {
        filteredData = playersToProcess.filter(player =>
            player.latestPlayerName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    return filteredData.map(player => {
        const hours = (player.totalTimeSeconds || 0) / 3600 || 1;
        
        let totalKills = player.totalKills || 0;
        let totalDeaths = player.totalDeaths || 1; 
        let totalScore = (player.totalCombat || 0) + (player.totalDefense || 0) + (player.totalSupport || 0) + (player.totalOffense || 0);
        
        if (activeTab === 'pph') {
            totalKills = totalKills / hours;
            totalDeaths = totalDeaths / hours;
            totalScore = totalScore / hours;
        }

        const kdRatio = (player.totalKills || 0) / (player.totalDeaths || 1);
        
        return { ...player, id: player.id, totalKills, totalDeaths, totalScore, kdRatio };
    });
  }, [initialRankings, searchQuery, activeTab]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredPlayers = useMemo(() => {
    let sortablePlayers = [...processedPlayers];

    sortablePlayers.sort((a, b) => {
        const valA = a[sortConfig.key] || 0;
        const valB = b[sortConfig.key] || 0;

        if (valA < valB) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        // As a tie-breaker, sort by total score
        if (sortConfig.key !== 'totalScore') {
             return (b.totalScore || 0) - (a.totalScore || 0);
        }
        return 0;
    });

    return sortablePlayers;

  }, [processedPlayers, sortConfig]);

  const handleClanFilterClick = (clan: string | null) => {
    setClanFilter(clan);
    setSearchQuery(clan || '');
  };

  return (
    <>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl font-headline md:text-2xl">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-accent" />
                <span>Ranking de Jogadores</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Buscar por nome ou clã..."
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
             <div className="flex flex-wrap gap-2 mb-4">
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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Period)} className="w-full">
            <div className="flex items-center justify-between">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="semanal" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Semanal</TabsTrigger>
                    <TabsTrigger value="mensal" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Mensal</TabsTrigger>
                    <TabsTrigger value="geral" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Geral</TabsTrigger>
                    <TabsTrigger value="pph" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white gap-2">
                        <Zap className="h-3 w-3" /> Eficiência
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Ordenar por:</span>
                    <Button 
                        size="sm"
                        variant={sortConfig.key === 'totalScore' ? 'default' : 'outline'}
                        onClick={() => requestSort('totalScore')}
                    >
                        <Award className="mr-2 h-4 w-4" />
                        Score
                    </Button>
                    <Button 
                        size="sm"
                        variant={sortConfig.key === 'totalKills' ? 'default' : 'outline'}
                        onClick={() => requestSort('totalKills')}
                    >
                        <Crosshair className="mr-2 h-4 w-4" />
                        Kills
                    </Button>
                </div>
                 <div className="hidden md:flex justify-center md:justify-end gap-0 md:gap-2 rounded-md overflow-hidden md:rounded-lg">
                    <Button
                        onClick={() => setViewMode('card')}
                        aria-label="Visualização em grade"
                        className={cn(
                            "h-9 w-9 p-0",
                            viewMode === 'card'
                                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                                : 'bg-muted/50 hover:bg-muted'
                        )}
                    >
                        <LayoutGrid className="h-5 w-5" />
                    </Button>
                    <Button
                        onClick={() => setViewMode('table')}
                        aria-label="Visualização em lista"
                         className={cn(
                            "h-9 w-9 p-0",
                            viewMode === 'table'
                                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                                : 'bg-muted/50 hover:bg-muted'
                        )}
                    >
                        <List className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {activeTab === 'pph' && (
                <div className="mt-2 text-xs text-muted-foreground bg-amber-500/10 p-2 rounded border border-amber-500/20 flex items-center gap-2">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>O ranking de eficiência requer um mínimo de 10 horas de combate jogadas. Valores expressos em Pontos por Hora (PPH).</span>
                </div>
            )}

            <TabsContent value="geral">
                <RankingDisplay players={sortedAndFilteredPlayers} viewMode={viewMode} hallOfFame={initialHallOfFame} sortConfig={sortConfig} requestSort={requestSort} clanMembers={initialClanMembers}/>
            </TabsContent>
            <TabsContent value="mensal">
                <RankingDisplay players={sortedAndFilteredPlayers} viewMode={viewMode} hallOfFame={initialHallOfFame} sortConfig={sortConfig} requestSort={requestSort} clanMembers={initialClanMembers}/>
            </TabsContent>
            <TabsContent value="semanal">
                <RankingDisplay players={sortedAndFilteredPlayers} viewMode={viewMode} hallOfFame={initialHallOfFame} sortConfig={sortConfig} requestSort={requestSort} clanMembers={initialClanMembers}/>
            </TabsContent>
            <TabsContent value="pph">
                <RankingDisplay isPPH players={sortedAndFilteredPlayers} viewMode={viewMode} hallOfFame={initialHallOfFame} sortConfig={sortConfig} requestSort={requestSort} clanMembers={initialClanMembers}/>
            </TabsContent>
        </Tabs>
    </>
  );
}
