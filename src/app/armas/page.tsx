'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAvailableWeapons, getWeaponLeaderboard } from './actions';
import type { WeaponLeaderboardEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Crosshair, Trophy, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdBanner } from '@/components/AdBanner';
import Link from 'next/link';

type AvailableWeapon = {
  name: string;
};

const getRankHighlightClasses = (rank: number): string => {
    switch (rank) {
        case 1: return "text-yellow-400";
        case 2: return "text-slate-400";
        case 3: return "text-orange-400";
        default: return "text-muted-foreground";
    }
}

export default function ArmasPage() {
  const [availableWeapons, setAvailableWeapons] = useState<AvailableWeapon[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<WeaponLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWeaponsLoading, setIsWeaponsLoading] = useState(true);

  useEffect(() => {
    async function fetchWeapons() {
      setIsWeaponsLoading(true);
      const weapons = await getAvailableWeapons();
      setAvailableWeapons(weapons);
      setIsWeaponsLoading(false);
    }
    fetchWeapons();
  }, []);

  const handleWeaponChange = async (weaponName: string) => {
    if (!weaponName) return;
    setSelectedWeapon(weaponName);
    setIsLoading(true);
    setLeaderboard([]);
    const data = await getWeaponLeaderboard(weaponName);
    setLeaderboard(data);
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <Crosshair className="h-8 w-8 text-accent" />
          Arsenal da Comunidade
        </h1>
        <p className="text-muted-foreground mt-2">
          Placar de líderes para cada arma. Descubra quem são os melhores com sua arma favorita.
        </p>
      </div>

       <AdBanner className="my-8">
          <ins className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-1957003967974734"
              data-ad-slot="1512951312"
              data-ad-format="auto"
              data-full-width-responsive="true"></ins>
       </AdBanner>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de Jogadores por Arma</CardTitle>
          <CardDescription>
            {isWeaponsLoading 
                ? <Skeleton className="h-5 w-48" /> 
                : "Selecione uma arma para ver os jogadores com mais abates."}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="max-w-sm mb-6">
                {isWeaponsLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select onValueChange={handleWeaponChange} value={selectedWeapon} disabled={isLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione uma arma..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableWeapons.map((weapon) => (
                                <SelectItem key={weapon.name} value={weapon.name}>
                                    {weapon.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {isLoading ? (
                 <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                 </div>
            ) : leaderboard.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Rank</TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead className="text-right">Total de Kills</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaderboard.map((player, index) => {
                            const rank = index + 1;
                            return (
                                <TableRow key={player.playerId}>
                                    <TableCell className={cn("font-bold text-lg", getRankHighlightClasses(rank))}>
                                        <div className="flex items-center gap-2">
                                            {rank <= 3 ? <Trophy className="h-5 w-5" /> : <span className="w-5 text-center">{rank}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={`/player/${encodeURIComponent(player.playerId)}`} className="font-medium hover:underline">
                                        {player.playerName}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-accent">
                                        {player.kills.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            ) : selectedWeapon ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Search className="h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Nenhum dado encontrado</h2>
                    <p className="mt-2 text-muted-foreground">Ainda não há estatísticas para esta arma.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Crosshair className="h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Selecione uma arma</h2>
                    <p className="mt-2 text-muted-foreground">Escolha uma arma na lista acima para ver o placar de líderes.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
