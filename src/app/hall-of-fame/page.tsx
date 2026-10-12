'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMonthlyHallOfFame } from './actions';
import type { MonthlyPlayerStats } from '@/lib/types';
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
  Zap,
  Flame,
  Star,
  Crosshair,
  Truck,
  ListOrdered
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AdBanner } from '@/components/AdBanner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyHallOfFameData {
  records: Record<string, MonthlyPlayerStats | undefined>;
  efficiency: Record<string, (MonthlyPlayerStats & { efficiencyValue: number }) | undefined>;
  roles: Record<number, MonthlyPlayerStats | undefined>;
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
  { key: 'totalVehicleKills', title: 'Destruidor de Veículos', icon: Truck, formatter: (val: number) => `${val.toLocaleString()} Veículos` },
  { key: 'maxKillsStreak', title: 'Maior Sequência de Kills', icon: ListOrdered, formatter: (val: number) => `${val.toLocaleString()} Kills seguidas` },
];

const efficiencyCategories = [
  { key: 'totalKills', title: 'Letalidade Técnica', icon: Crosshair, color: 'text-orange-500', suffix: 'Kills/H' },
  { key: 'totalOffense', title: 'Eficiência Ofensiva', icon: Flame, color: 'text-red-500', suffix: 'PPH' },
  { key: 'totalDefense', title: 'Eficiência Defensiva', icon: Shield, color: 'text-blue-500', suffix: 'PPH' },
  { key: 'totalSupport', title: 'Eficiência de Suporte', icon: Zap, color: 'text-green-500', suffix: 'PPH' },
  { key: 'totalCombat', title: 'Eficiência de Combate', icon: Star, color: 'text-amber-500', suffix: 'PPH' },
];

import { ROLE_MAPPING } from '@/lib/roles';

const StatRecordCard = ({ title, icon: Icon, player, value, subtitle, highlightColor }: { title: string, icon: React.ElementType, player?: MonthlyPlayerStats, value?: string | number, subtitle?: string, highlightColor?: string }) => (
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
                        <AvatarFallback>{player.playerName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <Link href={`/player/${player.playerId}`} className="font-bold text-lg truncate hover:underline block leading-tight">{player.playerName}</Link>
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
  const [data, setData] = useState<MonthlyHallOfFameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializa com o mês atual no formato YYYY-MM
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const stats = await getMonthlyHallOfFame(selectedMonth);
        setData(stats);
      } catch (error) {
        console.error("Failed to fetch monthly hall of fame stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  const monthLabel = format(new Date(`${selectedMonth}-01T00:00:00`), 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
       <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-headline flex items-center gap-4 tracking-tighter capitalize">
                  <Trophy className="h-10 w-10 text-yellow-400" />
                  RANKING MENSAL
              </h1>
              <p className="text-muted-foreground mt-3 text-lg max-w-2xl capitalize">
                  Os maiores destaques e prodígios do mês de {monthLabel}.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
                <Link href="/hall-of-fame-legacy" className="text-sm underline text-muted-foreground hover:text-primary">
                    Ver Recordes Históricos (Legacy)
                </Link>
            </div>
        </div>

        {/* Efficiency Section */}
        <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
                <Zap className="h-6 w-6 text-yellow-400" />
                <h2 className="text-2xl font-bold font-headline uppercase tracking-tight">Titãs da Eficiência do Mês (PPH / KPH)</h2>
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
                * Calculado dividindo o total pelas horas de combate. Requer no mínimo 2 horas de ação no mês para validação de consistência.
            </p>
        </section>

        <Separator className="my-12 opacity-20" />
      
        {/* Raw Records Section */}
        <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="h-6 w-6 text-accent" />
                <h2 className="text-2xl font-bold font-headline uppercase tracking-tight">Recordes do Mês</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    statCategories.map(category => <StatRecordSkeleton key={category.key} />)
                ) : (
                    statCategories.map(category => {
                        const player = data?.records[category.key];
                        const valueKey = category.key === 'loneWolf' ? 'totalKills' : (category.key as keyof MonthlyPlayerStats);
                        const value = player?.[valueKey as keyof MonthlyPlayerStats] as number | undefined;

                        return (
                            <StatRecordCard 
                                key={category.key}
                                title={category.title}
                                icon={category.icon}
                                player={player}
                                value={value !== undefined ? category.formatter(value) : 'N/A'}
                                subtitle="Acumulado do Mês"
                            />
                        );
                    })
                )}
            </div>
        </section>

        <Separator className="my-12 opacity-20" />

        {/* Roles Section */}
        <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
                <Star className="h-6 w-6 text-purple-400" />
                <h2 className="text-2xl font-bold font-headline uppercase tracking-tight">Melhores por Classe (Maior Pontuação de Combate)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    Array.from({length: 8}).map((_, i) => <StatRecordSkeleton key={i} />)
                ) : (
                    Object.entries(ROLE_MAPPING).map(([roleIdStr, roleInfo]) => {
                        const roleId = Number(roleIdStr);
                        const player = data?.roles[roleId];
                        // Só renderiza se tiver algum jogador registrado para não poluir
                        if (!player) return null;
                        
                        return (
                            <StatRecordCard 
                                key={`role-${roleId}`}
                                title={`Melhor ${roleInfo.name}`}
                                icon={roleInfo.icon}
                                player={player}
                                value={player.totalCombat?.toLocaleString() || '0'}
                                subtitle="Pontuação de Combate"
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

    </div>
  );
}
