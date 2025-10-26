'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Users, Crosshair, Clock, ShieldAlert, Swords } from 'lucide-react';
import { getGlobalCommunityStats, type GlobalCommunityStats } from './actions';

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType; isLoading: boolean; }) => (
  <Card className="bg-card/50 backdrop-blur-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-base font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/5" />
      ) : (
        <div className="text-3xl font-bold text-accent">{value}</div>
      )}
    </CardContent>
  </Card>
);

export default function CasernaPage() {
  const [stats, setStats] = useState<GlobalCommunityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const communityStats = await getGlobalCommunityStats();
        setStats(communityStats);
      } catch (error) {
        console.error("Failed to fetch community stats:", error);
        setStats(null); // Define como nulo em caso de erro
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-accent" />
            Caserna
        </h1>
        <p className="text-muted-foreground mt-2">
            Um resumo das estatísticas globais e curiosidades da comunidade.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
            title="Soldados Registrados"
            value={isLoading || !stats ? '0' : stats.totalPlayers.toLocaleString()}
            icon={Users}
            isLoading={isLoading}
        />
        <StatCard 
            title="Total de Kills"
            value={isLoading || !stats ? '0' : stats.totalKills.toLocaleString()}
            icon={Swords}
            isLoading={isLoading}
        />
        <StatCard 
            title="Total de Horas de Guerra"
            value={isLoading || !stats ? '0' : `${stats.totalTimeHours.toLocaleString()}h`}
            icon={Clock}
            isLoading={isLoading}
        />
        <StatCard 
            title="Total de Team Kills"
            value={isLoading || !stats ? '0' : stats.totalTeamKills.toLocaleString()}
            icon={ShieldAlert}
            isLoading={isLoading}
        />
      </div>

       <Card className="mt-8">
        <CardHeader>
            <CardTitle className="text-lg">Mais estatísticas em breve...</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Esta área será expandida com gráficos e mais dados interessantes sobre a comunidade e os servidores. Fique de olho!
            </p>
        </CardContent>
       </Card>

    </div>
  );
}
