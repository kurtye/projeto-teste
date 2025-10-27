
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getHallOfFameStats } from './actions';
import type { PlayerAggregates } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { AdBanner } from '@/components/AdBanner';

interface HallOfFameData {
  totalKills?: PlayerAggregates;
  totalCombat?: PlayerAggregates;
  totalOffense?: PlayerAggregates;
  totalDefense?: PlayerAggregates;
  totalSupport?: PlayerAggregates;
  totalTimeSeconds?: PlayerAggregates;
  longestLifeSecs?: PlayerAggregates;
  loneWolf?: PlayerAggregates;
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

const StatRecordCard = ({ title, icon: Icon, player, value }: { title: string, icon: React.ElementType, player?: PlayerAggregates, value?: string | number }) => (
    <Card className="bg-card/50 backdrop-blur-sm transition-all hover:border-accent hover:shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg font-headline">
                <Icon className="h-6 w-6 text-accent" />
                <span>{title}</span>
            </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
            {player ? (
                <>
                    <Avatar className="h-12 w-12">
                        <AvatarFallback>{player.latestPlayerName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <Link href={`/player/${player.id}`} className="font-bold text-base truncate hover:underline">{player.latestPlayerName}</Link>
                        <p className="text-2xl font-semibold text-accent">{value}</p>
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

const TributePlayerCardSkeleton = () => (
    <Card className="w-full">
        <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>
        </CardHeader>
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

  const { data: tributePlayers, isLoading: isLoadingTribute, error: tributeError } = useCollection<PlayerAggregates>(tributePlayersQuery);


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const stats = await getHallOfFameStats();
        setData(stats);
      } catch (error) {
        console.error("Failed to fetch hall of fame stats:", error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
       <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-400" />
                Hall da Fama
            </h1>
            <p className="text-muted-foreground mt-2">
                Os jogadores que definiram recordes nos servidores da comunidade.
            </p>
        </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
            statCategories.map(category => <StatRecordSkeleton key={category.key} />)
        ) : (
            statCategories.map(category => {
                const player = data?.[category.key as keyof HallOfFameData];
                
                // For loneWolf, the value to display is totalKills
                const valueKey = category.key === 'loneWolf' ? 'totalKills' : (category.key as keyof PlayerAggregates);
                const value = player?.[valueKey as keyof PlayerAggregates] as number | undefined;

                return (
                    <StatRecordCard 
                        key={category.key}
                        title={category.title}
                        icon={category.icon}
                        player={player}
                        value={value !== undefined ? category.formatter(value) : 'N/A'}
                    />
                );
            })
        )}
      </div>

       <div className="my-8">
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
              {Array.from({ length: 3 }).map((_, i) => <TributePlayerCardSkeleton key={i} />)}
          </div>
      ) : tributeError ? (
           <Card className="flex flex-col items-center justify-center p-8 text-center">
              <ShieldAlert className="h-12 w-12 text-destructive" />
              <h2 className="mt-4 text-xl font-semibold">Falha ao carregar homenagens</h2>
              <p className="mt-2 text-muted-foreground">Ocorreu um erro. Por favor, tente novamente mais tarde.</p>
          </Card>
      ) : tributePlayers && tributePlayers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tributePlayers.map((player) => (
                   <Link key={player.id} href={`/player/${encodeURIComponent(player.id)}`} className="group">
                      <Card className="h-full transition-all duration-200 border-transparent hover:border-accent hover:shadow-lg">
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
          <Card className="flex flex-col items-center justify-center p-8 text-center">
              <Award className="h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Nenhum jogador em homenagem</h2>
              <p className="mt-2 text-muted-foreground">Ainda não há jogadores marcados com o status de homenagem.</p>
          </Card>
      )}

    </div>
  );
}
