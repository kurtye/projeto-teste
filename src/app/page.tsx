'use client';

import { useState, useTransition, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Filter, Search, RefreshCw, Trophy, Swords, Shield, Target } from 'lucide-react';

import type { Player } from '@/lib/types';
import { players as initialPlayers } from '@/lib/data';
import { cleanLeaderboardAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>(initialPlayers);
  const [serverFilter, setServerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    let result = players;

    if (serverFilter !== 'all') {
      result = result.filter((player) => player.server === serverFilter);
    }

    if (searchQuery) {
      result = result.filter((player) =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPlayers(result);
  }, [players, serverFilter, searchQuery]);

  const handleCleanLeaderboard = () => {
    startTransition(async () => {
      const result = await cleanLeaderboardAction(players);
      if (result.success && result.data) {
        setPlayers(result.data);
        toast({
          title: 'Leaderboard Cleaned',
          description: 'Suspected cheaters have been removed.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to clean leaderboard.',
        });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-headline md:text-2xl">
              <Filter className="h-6 w-6 text-accent" />
              <span>Filter Rankings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="search" className="text-sm font-medium text-muted-foreground">
                  Player Search
                </label>
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
              </div>
              <div className="space-y-2">
                <label htmlFor="server" className="text-sm font-medium text-muted-foreground">
                  Server
                </label>
                <Select value={serverFilter} onValueChange={setServerFilter}>
                  <SelectTrigger id="server">
                    <SelectValue placeholder="Select a server" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Servers</SelectItem>
                    <SelectItem value="US East">US East</SelectItem>
                    <SelectItem value="EU Central">EU Central</SelectItem>
                    <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:self-end">
                <Button onClick={handleCleanLeaderboard} disabled={isPending} className="w-full bg-primary hover:bg-primary/90">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                  {isPending ? 'Cleaning...' : 'Refresh & Clean Leaderboard'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-3xl">Global Player Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">
                      <Trophy className="h-5 w-5 inline-block" /> Rank
                    </TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">
                      <Swords className="h-5 w-5 inline-block" /> Kills
                    </TableHead>
                    <TableHead className="text-center">
                      <Shield className="h-5 w-5 inline-block" /> Deaths
                    </TableHead>
                    <TableHead className="text-center">
                      <Target className="h-5 w-5 inline-block" /> K/D Ratio
                    </TableHead>
                    <TableHead className="text-right">Server</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-bold text-lg text-center">{player.rank}</TableCell>
                        <TableCell>
                          <Link href={`/player/${encodeURIComponent(player.name)}`} className="flex items-center gap-3 group">
                            <Avatar>
                              <AvatarImage src={player.avatarUrl} alt={player.name} />
                              <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium group-hover:text-accent transition-colors">{player.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">{player.kills}</TableCell>
                        <TableCell className="text-center">{player.deaths}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={player.kdRatio > 2.0 ? 'destructive' : player.kdRatio > 1.0 ? 'default' : 'secondary'} className="bg-accent/20 text-accent-foreground border-accent/30">
                            {player.kdRatio.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{player.server}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No players found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
