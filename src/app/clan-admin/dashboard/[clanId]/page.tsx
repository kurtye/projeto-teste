'use client';

import { useClanAuth } from '../../layout';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Edit, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, or } from 'firebase/firestore';
import type { PlayerAggregates, ClanMember } from '@/lib/types';
import { EditMemberDialog } from './_components/EditMemberDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, use } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClanDashboardPage({ params }: { params: Promise<{ clanId: string }> }) {
  const resolvedParams = use(params);
  const clanId = resolvedParams.clanId;
  const { clan, user, logout } = useClanAuth();
  const firestore = useFirestore();
  
  const [memberToEdit, setMemberToEdit] = useState<PlayerAggregates | null>(null);

  if (!clan || clan.id !== clanId) {
    return notFound();
  }

  // Query directly from playerAggregates based on the clan tag
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !clan) return null;
    const clanTag = clan.tag;
    // This query finds players whose names start with "TAG " or "[TAG]"
    return query(
      collection(firestore, 'playerAggregates'),
      or(
        where('latestPlayerName', '>=', `${clanTag} `),
        where('latestPlayerName', '<', `${clanTag }~`),
        where('latestPlayerName', '>=', `[${clanTag}]`),
        where('latestPlayerName', '<', `[${clanTag}]~`)
      )
    );
  }, [firestore, clan]);

  const { data: allPlayers, isLoading: isLoadingMembers } = useCollection<PlayerAggregates>(membersQuery);

  // Filter in the client to get exact matches for "startsWith"
  const members = allPlayers?.filter(p => 
      p.latestPlayerName.startsWith(`${clan.tag} `) || 
      p.latestPlayerName.startsWith(`[${clan.tag}]`)
  );

  // We need to fetch clan-specific data like rank and status separately if it exists
  const clanMembersSubCollectionQuery = useMemoFirebase(() => {
      if (!firestore || !clan) return null;
      return collection(firestore, 'clans', clan.id, 'members');
  }, [firestore, clan]);

  const { data: clanSpecificData } = useCollection<ClanMember>(clanMembersSubCollectionQuery);

  // Create a map for quick lookup of ranks and statuses
  const memberDetailsMap = useMemoFirebase(() => {
      if (!clanSpecificData) return new Map();
      return new Map(clanSpecificData.map(member => [member.id, { rank: member.rank, status: member.status }]));
  }, [clanSpecificData]);


  const getStatusVariant = (status: ClanMember['status'] | undefined) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'trial': return 'outline';
      default: return 'secondary';
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EditMemberDialog
        isOpen={!!memberToEdit}
        onOpenChange={(isOpen) => !isOpen && setMemberToEdit(null)}
        memberId={memberToEdit?.id || null}
        memberName={memberToEdit?.latestPlayerName || ''}
        initialRank={memberDetailsMap.get(memberToEdit?.id || '')?.rank || 'Recruta'}
        initialStatus={memberDetailsMap.get(memberToEdit?.id || '')?.status || 'trial'}
        clanId={clan.id}
      />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className='flex-1'>
          <h1 className="text-3xl font-bold font-headline">Painel do Clã: {clan.name}</h1>
          <p className="text-muted-foreground">Bem-vindo, {user?.email}.</p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2" />
          Sair
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users />
                <span>Membros do Clã</span>
              </CardTitle>
              <CardDescription>Gerencie as patentes e status dos jogadores.</CardDescription>
            </div>
            {!isLoadingMembers && members && (
               <div className="text-right">
                  <p className="text-3xl font-bold text-accent">{members.length}</p>
                  <p className="text-sm text-muted-foreground">Jogadores</p>
               </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogador</TableHead>
                  <TableHead>Patente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMembers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : members && members.length > 0 ? (
                  members.map((member) => {
                    const details = memberDetailsMap.get(member.id);
                    const rank = details?.rank || 'Recruta';
                    const status = details?.status || 'trial';

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.latestPlayerName}</TableCell>
                        <TableCell>{rank}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(status)}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" className="mr-2" onClick={() => setMemberToEdit(member)}>
                              <Edit className="h-4 w-4" />
                           </Button>
                           {/* A remoção agora é mais complexa, pois envolve remover a tag do nome do jogador. Desabilitado por enquanto. */}
                           <Button variant="ghost" size="icon" disabled>
                              <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Nenhum jogador com a tag [{clan.tag}] encontrado na base de dados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
