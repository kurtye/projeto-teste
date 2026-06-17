'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users, ChevronRight, Trophy, Swords, Shield, Target,
  HeartPulse, Clock, Award, Crown, Crosshair, Zap
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TacticalDNABar } from '@/components/TacticalDNA';
import { getClanRankingStats, type ClanStats, type ClanHighlight } from './actions';
import { AdBanner } from '@/components/AdBanner';

const formatHours = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  return `${hours.toLocaleString()}h`;
};

const getRankHighlightClasses = (rank: number): string => {
  switch (rank) {
    case 1: return "text-yellow-400";
    case 2: return "text-slate-400";
    case 3: return "text-orange-400";
    default: return "text-muted-foreground";
  }
};

const highlightCardStyles: Record<string, string> = {
  offense: 'bg-red-950/20 border-red-900/40',
  defense: 'bg-blue-950/20 border-blue-900/40',
  support: 'bg-green-950/20 border-green-900/40',
  kd: 'bg-amber-950/20 border-amber-900/40',
  time: 'bg-purple-950/20 border-purple-900/40',
};

const highlightValueStyles: Record<string, string> = {
  offense: 'text-red-500',
  defense: 'text-blue-500',
  support: 'text-green-500',
  kd: 'text-amber-500',
  time: 'text-purple-500',
};

function HighlightCard({ highlight }: { highlight: ClanHighlight }) {
  const cardStyle = highlightCardStyles[highlight.category] || '';
  const valueStyle = highlightValueStyles[highlight.category] || 'text-accent';

  return (
    <Card className={cn("transition-all hover:scale-[1.02]", cardStyle)}>
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
            {highlight.emoji} {highlight.label}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border/50">
            {highlight.clan.logoUrl ? (
              <div className="relative w-full h-full rounded-full overflow-hidden">
                <Image src={highlight.clan.logoUrl} alt={highlight.clan.name} fill className="object-cover" />
              </div>
            ) : (
              <AvatarFallback className="text-sm font-bold">{highlight.clan.tag}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold font-headline text-base truncate">{highlight.clan.name}</p>
            <p className="text-xs text-muted-foreground">[{highlight.clan.tag}] · {highlight.clan.memberCount} membros</p>
          </div>
          <div className="text-right">
            <p className={cn("text-2xl font-black tabular-nums", valueStyle)}>
              {highlight.category === 'kd'
                ? highlight.value.toFixed(2)
                : highlight.category === 'time'
                  ? `${highlight.value}h`
                  : highlight.value.toLocaleString()
              }
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {highlight.category === 'kd' ? 'A/M Média' : highlight.category === 'time' ? 'Média/Membro' : 'Média/Membro'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClanRankingTable({ rankings }: { rankings: ClanStats[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Crown className="h-5 w-5 text-accent" />
          Ranking Geral dos Clãs
        </CardTitle>
        <CardDescription>
          Classificação baseada na pontuação total agregada de todos os membros identificados pela tag.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Clã</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Membros</TableHead>
                <TableHead className="text-center hidden md:table-cell">
                  <div className="flex items-center justify-center gap-1"><Crosshair className="h-4 w-4" /> Kills</div>
                </TableHead>
                <TableHead className="text-center hidden md:table-cell">
                  <div className="flex items-center justify-center gap-1"><Target className="h-4 w-4" /> K/D</div>
                </TableHead>
                <TableHead className="text-center hidden lg:table-cell">
                  <div className="flex items-center justify-center gap-1"><Clock className="h-4 w-4" /> Horas</div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1"><Award className="h-4 w-4" /> Pontuação</div>
                </TableHead>
                <TableHead className="text-center hidden xl:table-cell">DNA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((clan, index) => {
                const rank = index + 1;
                // Build a "pseudo player" for the TacticalDNABar
                const clanAsPlayer = {
                  totalOffense: clan.totalOffense,
                  totalDefense: clan.totalDefense,
                  totalSupport: clan.totalSupport,
                  totalCombat: clan.totalCombat,
                };
                return (
                  <TableRow key={clan.id} className="group">
                    <TableCell className={cn("font-bold text-lg", getRankHighlightClasses(rank))}>
                      {rank <= 3 ? <Trophy className="h-5 w-5" /> : <span>{rank}</span>}
                    </TableCell>
                    <TableCell>
                      <Link href={`/clans/${clan.id}`} className="flex items-center gap-3 group-hover:text-accent transition-colors">
                        <Avatar className="h-8 w-8 border border-border/50">
                          {clan.logoUrl ? (
                            <div className="relative w-full h-full rounded-full overflow-hidden">
                              <Image src={clan.logoUrl} alt={clan.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <AvatarFallback className="text-xs">{clan.tag}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{clan.name}</p>
                          <p className="text-xs text-muted-foreground">[{clan.tag}]</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Badge variant="outline">{clan.memberCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell font-semibold tabular-nums">
                      {clan.totalKills.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell font-semibold tabular-nums">
                      {clan.avgKD.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell tabular-nums">
                      {formatHours(clan.totalTimeSeconds)}
                    </TableCell>
                    <TableCell className="text-center font-bold text-accent tabular-nums">
                      {clan.totalScore.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <TacticalDNABar player={clanAsPlayer} className="max-w-[120px] mx-auto" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ClanDetailCards({ rankings }: { rankings: ClanStats[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {rankings.map((clan, index) => {
        const rank = index + 1;
        const clanAsPlayer = {
          totalOffense: clan.totalOffense,
          totalDefense: clan.totalDefense,
          totalSupport: clan.totalSupport,
          totalCombat: clan.totalCombat,
        };
        return (
          <Card key={clan.id} className="group transition-all duration-200 hover:border-accent/50 hover:shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-primary bg-background">
                    {clan.logoUrl ? (
                      <div className="relative w-full h-full rounded-full overflow-hidden">
                        <Image src={clan.logoUrl} alt={clan.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <AvatarFallback className="text-lg font-bold">{clan.tag}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className={cn(
                    "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-background",
                    rank === 1 ? "bg-yellow-500 text-yellow-950" :
                    rank === 2 ? "bg-slate-400 text-slate-950" :
                    rank === 3 ? "bg-orange-500 text-orange-950" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {rank}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-headline group-hover:text-accent transition-colors truncate">{clan.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    [{clan.tag}] · <Users className="h-3 w-3" /> {clan.memberCount} membros
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* DNA Tático */}
              <TacticalDNABar player={clanAsPlayer} showLegend className="max-w-full h-2.5" />

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/30 rounded-md p-2">
                  <p className="text-xs text-muted-foreground">Kills</p>
                  <p className="font-bold tabular-nums">{clan.totalKills.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-md p-2">
                  <p className="text-xs text-muted-foreground">K/D</p>
                  <p className="font-bold tabular-nums">{clan.avgKD.toFixed(2)}</p>
                </div>
                <div className="bg-muted/30 rounded-md p-2">
                  <p className="text-xs text-muted-foreground">Horas</p>
                  <p className="font-bold tabular-nums">{formatHours(clan.totalTimeSeconds)}</p>
                </div>
              </div>

              {/* Top 3 Players */}
              {clan.topPlayers.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">
                    ⭐ Destaque do Clã
                  </p>
                  <div className="space-y-1">
                    {clan.topPlayers.map((player, i) => (
                      <Link key={player.id} href={`/player/${encodeURIComponent(player.id)}`}
                        className="flex items-center justify-between text-sm p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("font-bold text-xs w-4", getRankHighlightClasses(i + 1))}>{i + 1}</span>
                          <span className="truncate">{player.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                          {player.score.toLocaleString()} pts
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Link */}
              <Link href={`/clans/${clan.id}`}
                className="flex items-center justify-center gap-2 text-sm font-medium text-accent hover:underline pt-1"
              >
                Ver Perfil do Clã <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function ClansPage() {
  const [rankings, setRankings] = useState<ClanStats[]>([]);
  const [highlights, setHighlights] = useState<ClanHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getClanRankingStats();
      setRankings(data.rankings);
      setHighlights(data.highlights);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 mb-16 md:mb-0 space-y-8">
        <div>
          <Skeleton className="h-10 w-72 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <Users className="h-8 w-8 text-accent" />
          Clãs da Comunidade
        </h1>
        <p className="text-muted-foreground mt-2">
          Ranking, estatísticas e os melhores jogadores de cada clã brasileiro de Hell Let Loose.
        </p>
      </div>

      {/* Highlights: Best Clan in... */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {highlights.map((h) => (
            <HighlightCard key={h.category} highlight={h} />
          ))}
        </div>
      )}

      <AdBanner className="my-4">
        <ins className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-1957003967974734"
          data-ad-slot="1512951312"
          data-ad-format="auto"
          data-full-width-responsive="true"></ins>
      </AdBanner>

      {/* Ranking Table */}
      {rankings.length > 0 && <ClanRankingTable rankings={rankings} />}

      {/* Clan Detail Cards */}
      {rankings.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold font-headline flex items-center gap-2 mb-6">
            <Zap className="h-6 w-6 text-accent" />
            Visão Detalhada
          </h2>
          <ClanDetailCards rankings={rankings} />
        </div>
      )}

      {rankings.length === 0 && !isLoading && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum dado de clã encontrado</h2>
            <p>Verifique se os dados dos jogadores foram sincronizados com o servidor.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
