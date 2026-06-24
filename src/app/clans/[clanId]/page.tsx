'use client';

import { notFound } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo, use } from 'react';
import { clans } from '@/lib/clans';
import type { ClanMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Users, List, Settings } from 'lucide-react';
import { ClanRanking } from '@/app/clan-admin/dashboard/[clanId]/_components/ClanRanking';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';


interface ClanPageProps {
  params: Promise<{
    clanId: string;
  }>;
}

const ranksInOrder = [
    'Comandante',
    'Subcomandante',
    'Marechal',
    'General-de-Exercito',
    'General-de-Divisao',
    'General-de-Brigada',
    'Coronel',
    'Tenente-Coronel',
    'Major',
    'Capitao',
    'Primeiro-Tenente',
    'Segundo-Tenente',
    'Aspirante',
    'Subtenente',
    'Primeiro-Sargento',
    'Segundo-Sargento',
    'Terceiro-Sargento',
    'Cabo',
    'Soldado',
    'Recruta'
];

export default function ClanPage({ params }: ClanPageProps) {
  const resolvedParams = use(params);
  const { clanId } = resolvedParams;
  const firestore = useFirestore();

  const clan = clans.find(c => c.id === clanId);

  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !clanId) return null;
    return query(collection(firestore, 'clans', clanId, 'members'), orderBy('playerName'));
  }, [firestore, clanId]);

  const { data: members, isLoading: isLoadingMembers } = useCollection<ClanMember>(membersQuery);

  // Filter out 'trial' members for the public view
  const publicMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(member => member.status !== 'trial');
  }, [members]);

  const sortedMembers = useMemo(() => {
    if (!publicMembers) return [];
    return [...publicMembers].sort((a, b) => {
      const rankA = ranksInOrder.indexOf(a.rank);
      const rankB = ranksInOrder.indexOf(b.rank);
      if (rankA !== rankB) {
        return rankA - rankB; 
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [publicMembers]);

  const getStatusVariant = (status: ClanMember['status'] | undefined) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'trial': return 'outline';
      default: return 'secondary';
    }
  }

  if (!clan) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary bg-background">
              {clan.logoUrl ? (
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image src={clan.logoUrl} alt={`${clan.name} logo`} fill className="object-cover" />
                </div>
              ) : (
                <AvatarFallback className="text-4xl">{clan.tag}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-headline">{clan.name}</h1>
              <p className="text-xl text-muted-foreground">Tag: [{clan.tag}]</p>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10 font-bold">
              <Link href={`/clans/${clanId}/preferences`}>
                  <Users className="mr-2 h-4 w-4" />
                  Cadastrar Minhas Preferências
              </Link>
          </Button>
          <Button asChild>
              <Link href={`/clan-admin/dashboard/${clanId}`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Painel do Admin
              </Link>
          </Button>
        </div>
      </div>
      
       <Tabs defaultValue="ranking">
            <TabsList className="grid w-full grid-cols-1 max-w-sm">
                <TabsTrigger value="ranking"><Trophy className="mr-2 h-4 w-4"/>Ranking do Clã</TabsTrigger>
            </TabsList>

             <TabsContent value="ranking">
                <ClanRanking clanId={clan.id} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
    
