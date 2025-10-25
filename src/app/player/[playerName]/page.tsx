import { notFound } from 'next/navigation';
import Image from 'next/image';
import { players } from '@/lib/data';
import type { Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUp, ArrowDown, Swords, Shield, HeartPulse, Users, Trophy, Percent } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface PlayerProfilePageProps {
  params: {
    playerName: string;
  };
}

const getPlayerByName = (name: string): Player | undefined => {
  return players.find((p) => p.name === name);
};

const chartConfig = {
  kills: {
    label: 'Kills',
    color: 'hsl(var(--accent))',
  },
  deaths: {
    label: 'Deaths',
    color: 'hsl(var(--muted-foreground))',
  },
} satisfies ChartConfig;

const StatCard = ({ title, value, icon: Icon, change, changeType }: { title: string; value: string | number; icon: React.ElementType, change?: string, changeType?: 'increase' | 'decrease' }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className="text-xs text-muted-foreground flex items-center">
          {changeType === 'increase' ? <ArrowUp className="h-4 w-4 mr-1 text-green-500"/> : <ArrowDown className="h-4 w-4 mr-1 text-red-500"/>}
          {change} vs last month
        </p>
      )}
    </CardContent>
  </Card>
);

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const playerName = decodeURIComponent(params.playerName);
  const player = getPlayerByName(playerName);

  if (!player) {
    notFound();
  }
  
  const lastMonth = player.performanceHistory[player.performanceHistory.length - 1];
  const secondLastMonth = player.performanceHistory[player.performanceHistory.length - 2];
  
  const killsChange = lastMonth.kills - secondLastMonth.kills;
  const deathsChange = lastMonth.deaths - secondLastMonth.deaths;


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button asChild variant="outline">
            <Link href="/">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Leaderboard
            </Link>
        </Button>
      </div>
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarImage src={player.avatarUrl} alt={player.name} />
            <AvatarFallback className="text-4xl">{player.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-bold font-headline">{player.name}</h1>
          <Badge className="text-lg" variant="outline">
            <Trophy className="mr-2 h-5 w-5 text-accent" /> Rank #{player.rank}
          </Badge>
          <Badge className="bg-primary/20 text-primary-foreground">{player.server}</Badge>
        </div>
        <div className="flex-1 w-full mt-8 md:mt-0 md:ml-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="K/D Ratio" value={player.kdRatio.toFixed(2)} icon={Target} />
            <StatCard title="Win Rate" value={`${player.winRate}%`} icon={Percent} />
            <StatCard title="Kills" value={player.kills.toLocaleString()} icon={Swords} change={`${Math.abs(killsChange)}`} changeType={killsChange >= 0 ? 'increase' : 'decrease'}/>
            <StatCard title="Deaths" value={player.deaths.toLocaleString()} icon={Shield} change={`${Math.abs(deathsChange)}`} changeType={deathsChange >= 0 ? 'increase' : 'decrease'}/>
            <StatCard title="Assists" value={player.assists.toLocaleString()} icon={Users} />
            <StatCard title="Revives" value={player.revives.toLocaleString()} icon={HeartPulse} />
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-headline">Performance History (Last 5 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={player.performanceHistory} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="kills" fill="var(--color-kills)" radius={4} />
                  <Bar dataKey="deaths" fill="var(--color-deaths)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
