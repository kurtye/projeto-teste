
'use client';

import { notFound } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';
import { clans } from '@/lib/clans';
import type { ClanMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, List, Shield, Settings } from 'lucide-react';
import { HierarchyView } from '@/app/clan-admin/dashboard/[clanId]/_components/HierarchyView';
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


interface ClanPageProps {
  params: {
    clanId: string;
  };
}

const ranksInOrder = [
    'Marechal', 'General de Exército', 'General de Divisão', 'General de Brigada', 'Coronel', 
    'Tenente-Coronel', 'Major', 'Capitão', 'Primeiro-Tenente', 'Segundo-Tenente', 
    'Aspirante', 'Subtenente', 'Primeiro-Sargento', 'Segundo-Sargento', 'Terceiro-Sargento', 
    'Cabo', 'Soldado', 'Recruta'
];

export default function ClanPage({ params }: ClanPageProps) {
  const { clanId } = params;
  const firestore = useFirestore();

  const clan = clans.find(c => c.id === clanId);

  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !clanId) return null;
    return query(collection(firestore, 'clans', clanId, 'members'), orderBy('playerName'));
  }, [firestore, clanId]);

  const { data: members, isLoading: isLoadingMembers } = useCollection<ClanMember>(membersQuery);

  const sortedMembers = useMemo(() => {
    if (!members) return [];
    return [...members].sort((a, b) => {
      const rankA = ranksInOrder.indexOf(a.rank);
      const rankB = ranksInOrder.indexOf(b.rank);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [members]);

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
            <Avatar className="h-24 w-24 border-4 border-primary">
              <AvatarFallback className="text-4xl">{clan.tag}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-headline">{clan.name}</h1>
              <p className="text-xl text-muted-foreground">Tag: [{clan.tag}]</p>
            </div>
        </div>
         <Button asChild>
            <Link href={`/clan-admin/dashboard/${clanId}`}>
                <Settings className="mr-2 h-4 w-4" />
                Painel do Admin
            </Link>
        </Button>
      </div>
      
       <Tabs defaultValue="list">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list"><List className="mr-2 h-4 w-4"/>Lista de Membros</TabsTrigger>
                <TabsTrigger value="hierarchy"><Users className="mr-2 h-4 w-4"/>Hierarquia</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users />Membros</CardTitle>
                        <CardDescription>Lista de todos os jogadores do clã.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Jogador</TableHead>
                                <TableHead>Patente</TableHead>
                                <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingMembers ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : sortedMembers && sortedMembers.length > 0 ? (
                                    sortedMembers.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">{member.playerName}</TableCell>
                                            <TableCell>{member.rank}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            Nenhum membro encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="hierarchy">
                {isLoadingMembers ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                ) : (
                    <HierarchyView members={members || []} />
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
}
