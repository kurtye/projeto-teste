
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getHallOfFameStats } from './actions';
import type { PlayerAggregates } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Trophy,
  Swords,
  Shield,
  Target,
  HeartPulse,
  Award,
  Clock,
  Timer,
  User,
  ShieldAlert,
  Zap,
  TrendingUp,
  Flame,
  Star,
  Crosshair
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { AdBanner } from '@/components/AdBanner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface HallOfFameData {
  records: Record<string, PlayerAggregates | undefined>;
  efficiency: Record<string, (PlayerAggregates & { efficiencyValue: number }) | undefined>;
}

const statCategories = [
  { key: 'totalKills', title: 'Mais Kills', icon: Swords, formatter: (val: number) => val.toLocaleString() },
  { key: 'totalCombat', title: 'Maior Pontuação de Combate', icon: Award, formatter: (val: number) => val.toLocaleString() },
  { key: 'totalOffense', title: 'Maior Pontuação de Ataque', icon: Target, formatter: (val: number) => val.toLocaleString() },
  { key: 'totalDefense', title: 'Maior Pontuação de Defesa', icon: Shield, formatter: (val: number) => val.toLocaleString() },
  { key: 'totalSupport', title: 'Maior Pontuação de Suporte', icon: HeartPulse, formatter: (val: number) => val.toLocaleString() },
  { key: 'loneWolf', title: 'Lobo Solitário', icon: User, formatter: (val: number) => `${val.toLocaleString()} Kills` },
  { key: 'totalTimeSeconds', title: 'Mais Tempo Jogado', icon: Clock, formatter: (val: number) => `${Math.floor(val / 3600)}h` },
  { key: 'longestLifeSecs', title: 'Vida Mais Longa', icon: Timer, formatter: (val: number) => `${Math.floor(val / 60)}m` },
];

const efficiencyCategories = [
  { key: 'totalKills', title: 'Letalidade Técnica', icon: Crosshair, color: 'text-orange-500', suffix: 'Kills/H' },
  { key: 'totalOffense', title: 'Eficiência Ofensiva', icon: Flame, color: 'text-red-500', suffix: 'PPH' },
  { key: 'totalDefense', title: 'Eficiência Defensiva', icon: Shield, color: 'text-blue-500', suffix: 'PPH' },
  { key: 'totalSupport', title: 'Eficiência de Suporte', icon: Zap, color: 'text-green-500', suffix: 'PPH' },
  { key: 'totalCombat', title: 'Eficiência de Combate', icon: Star, color: 'text-amber-500', suffix: 'PPH' },
];

const StatRecordCard = ({ title, icon: Icon, player, value, subtitle, highlightColor }: { title: string, icon: React.ElementType, player?: PlayerAggregates, value?: string | number, subtitle?: string, highlightColor?: string }) => (
    <Card className="bg-card/50 backdrop-blur-sm transition-all hover:border-accent hover:shadow-lg overflow-hidden border-accent/10">
        <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-lg font-headline">
                <Icon className={cn("h-6 w-6", highlightColor || "text-accent")} />
                <span className="truncate">{title}</span>
            </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
            {player ? (
                <>
                    <Avatar className="h-14 w-14 border-2 border-accent/20">
                        <AvatarFallback>{player.latestPlayerName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <Link href={`/player/${player.id}`} className="font-bold text-lg truncate hover:underline block leading-tight">{player.latestPlayerName}</Link>
                        <p className={cn("text-2xl font-black tracking-tighter", highlightColor || "text-accent")}>{value}</p>
                        {subtitle && <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{subtitle}</p>}
                    </div>
                </>
            ) : (
                 <p className="text-muted-foreground text-sm">Nenhum recordista encontrado.</p>
            )}
        </CardContent>
    </Card>
);

const StatRecordSkeleton = () => (
     <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg font-headline">
                <Skeleton className="h-6 w-6 rounded-sm" />
                <Skeleton className="h-5 w-3/5" />
            </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
             <Skeleton className="h-12 w-12 rounded-full" />
             <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-6 w-3/5" />
             </div>
        </CardContent>
    </Card>
);

export default function HallOfFamePage() {
  const [data, setData] = useState<HallOfFameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firestore = useFirestore();

  const tributePlayersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'playerAggregates'), where('status', '==', 'retired'));
  }, [firestore]);

  const { data: tributePlayers, isLoading: isLoadingTribute } = useCollection<PlayerAggregates>(tributePlayersQuery);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const stats = await getHallOfFameStats();
        setData(stats);
      } catch (error) {
        console.error("Failed to fetch hall of fame stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
       <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black font-headline flex items-center gap-4 tracking-tighter">
                <Trophy className="h-10 w-10 text-yellow-400" />
                HALL DA FAMA
            </h1>
            <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
                Reconhecendo as lendas da nossa comunidade. Dos recordistas históricos aos prodígios de máxima eficiência.
            </p>
        </div>

        {/* Efficiency Section */}
        <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
                <Zap className="h-6 w-6 text-yellow-400" />
                <h2 className="text-2xl font-bold font-headline uppercase tracking-tight">Titãs da Eficiência (PPH / KPH)</h2>
                <Badge variant="outline" className="ml-2 border-yellow-400/30 text-yellow-400">Normalizado</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {isLoading ? (
                    Array.from({length: 5}).map((_, i) => <StatRecordSkeleton key={i} />)
                ) : (
                    efficiencyCategories.map(cat => {
                        const player = data?.efficiency[cat.key];
                        return (
                            <StatRecordCard 
                                key={cat.key}
                                title={cat.title}
                                icon={cat.icon}
                                player={player}
                                value={player ? `${player.efficiencyValue.toLocaleString()}` : 'N/A'}
                                subtitle={cat.suffix}
                                highlightColor={cat.color}
                            />
                        );
                    })
                )}
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">
                * Calculado dividindo o total pelas horas de combate. Requer no mínimo 10 horas de ação para validação de consistência.
            </p>
        </section>

        <Separator className="my-12 opacity-20" />
      
        {/* Raw Records Section */}
        <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="h-6 w-6 text-accent" />
                <h2 className="text-2xl font-bold font-headline uppercase tracking-tight">Recordes Históricos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    statCategories.map(category => <StatRecordSkeleton key={category.key} />)
                ) : (
                    statCategories.map(category => {
                        const player = data?.records[category.key];
                        const valueKey = category.key === 'loneWolf' ? 'totalKills' : (category.key as keyof PlayerAggregates);
                        const value = player?.[valueKey as keyof PlayerAggregates] as number | undefined;

                        return (
                            <StatRecordCard 
                                key={category.key}
                                title={category.title}
                                icon={category.icon}
                                player={player}
                                value={value !== undefined ? category.formatter(value) : 'N/A'}
                                subtitle="Acumulado Histórico"
                            />
                        );
                    })
                )}
            </div>
        </section>

       <div className="my-12">
          <AdBanner>
              <ins className="adsbygoogle"
                  style={{ display: 'block' }}
                  data-ad-client="ca-pub-1957003967974734"
                  data-ad-slot="1512951312"
                  data-ad-format="auto"
                  data-full-width-responsive="true"></ins>
          </AdBanner>
      </div>

      <Separator className="my-12" />

      <div className="mb-8">
          <h2 className="text-3xl font-bold font-headline flex items-center gap-3">
              <Award className="h-8 w-8 text-yellow-400" />
              Sempre Lembrados
          </h2>
          <p className="text-muted-foreground mt-2">
              Em memória dos membros da nossa comunidade que nos deixaram.
          </p>
      </div>
      
      {isLoadingTribute ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
      ) : tributePlayers && tributePlayers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tributePlayers.map((player) => (
                   <Link key={player.id} href={`/player/${encodeURIComponent(player.id)}`} className="group">
                      <Card className="h-full transition-all duration-200 border-transparent hover:border-accent hover:shadow-lg bg-card/30">
                          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                              <Avatar className="h-16 w-16 border-2 border-primary">
                                  <AvatarFallback className="text-2xl">{player.latestPlayerName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 overflow-hidden">
                                  <p className="font-bold text-xl truncate" title={player.latestPlayerName}>{player.latestPlayerName}</p>
                                  <p className="text-sm text-muted-foreground">Em nossa memória</p>
                              </div>
                          </CardHeader>
                      </Card>
                  </Link>
              ))}
          </div>
      ) : (
          <Card className="flex flex-col items-center justify-center p-8 text-center bg-muted/10 border-dashed">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">Nenhum registro</h2>
              <p className="text-muted-foreground">Homenagens aparecerão aqui quando registradas.</p>
          </Card>
      )}

    </div>
  );
}
