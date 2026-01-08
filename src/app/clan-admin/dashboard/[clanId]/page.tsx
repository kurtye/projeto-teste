
'use client';

import { useClanAuth } from '../../layout';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Edit, Trash2, UserPlus, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
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
import { useState, use, useTransition, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { findPotentialMembersByTag, addMembersToClan } from '../../actions';
import { useToast } from '@/hooks/use-toast';

export default function ClanDashboardPage({ params }: { params: Promise<{ clanId: string }> }) {
  const resolvedParams = use(params);
  const clanId = resolvedParams.clanId;
  const { clan, user, logout } = useClanAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [memberToEdit, setMemberToEdit] = useState<ClanMember | null>(null);
  
  // State for the sync feature
  const [isSyncing, startSyncTransition] = useTransition();
  const [potentialMembers, setPotentialMembers] = useState<PlayerAggregates[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<Set<string>>(new Set());
  const [isAdding, startAddingTransition] = useTransition();

  if (!clan || clan.id !== clanId) {
    return notFound();
  }

  // --- Data Fetching ---
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !clanId) return null;
    return collection(firestore, 'clans', clanId, 'members');
  }, [firestore, clanId]);

  const { data: members, isLoading: isLoadingMembers, error: membersError } = useCollection<ClanMember>(membersQuery);

  // We still need to fetch the full aggregate data for the members we have
  const memberIds = useMemo(() => {
      if (!members || members.length === 0) return [];
      return members.map(m => m.id)
  }, [members]);

  const aggregatesQuery = useMemoFirebase(() => {
      if (!firestore || memberIds.length === 0) return null;
      // Use documentId() which is equivalent to __name__
      return query(collection(firestore, 'playerAggregates'), where(documentId(), 'in', memberIds));
  }, [firestore, memberIds]);

  const { data: memberAggregates, isLoading: isLoadingAggregates } = useCollection<PlayerAggregates>(aggregatesQuery);
  
  const memberAggregatesMap = useMemo(() => {
    if (!memberAggregates) return new Map<string, PlayerAggregates>();
    return new Map(memberAggregates.map(agg => [agg.id, agg]));
  }, [memberAggregates]);

  const getStatusVariant = (status: ClanMember['status'] | undefined) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'trial': return 'outline';
      default: return 'secondary';
    }
  }

  const handleSync = () => {
    startSyncTransition(async () => {
      setPotentialMembers([]);
      setSelectedNewMembers(new Set());
      const result = await findPotentialMembersByTag(clan.id, clan.tag);
      if (result.success && result.players) {
        setPotentialMembers(result.players);
        toast({
          title: 'Sincronização Concluída',
          description: `Encontrados ${result.players.length} novos jogadores com a tag [${clan.tag}].`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na Sincronização',
          description: result.error || 'Ocorreu um erro desconhecido.',
        });
      }
    });
  };
  
  const handleToggleSelectNewMember = (playerId: string) => {
    setSelectedNewMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleAddSelectedMembers = () => {
    startAddingTransition(async () => {
        const playersToAdd = potentialMembers.filter(p => selectedNewMembers.has(p.id));
        if (playersToAdd.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum jogador selecionado.' });
            return;
        }
        const result = await addMembersToClan(clan.id, playersToAdd);
        if (result.success) {
            toast({ title: 'Membros adicionados com sucesso!' });
            setPotentialMembers([]);
            setSelectedNewMembers(new Set());
        } else {
            toast({ variant: 'destructive', title: 'Falha ao adicionar membros', description: result.error });
        }
    });
  };

  const isLoading = isLoadingMembers || (memberIds.length > 0 && isLoadingAggregates);


  return (
    <div className="container mx-auto px-4 py-8">
      <EditMemberDialog
        isOpen={!!memberToEdit}
        onOpenChange={(isOpen) => !isOpen && setMemberToEdit(null)}
        member={memberToEdit}
        clanId={clan.id}
      />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className='flex-1'>
          <h1 className="text-3xl font-bold font-headline">Painel do Clã: {clan.name}</h1>
          <p className="text-muted-foreground">Bem-vindo, {user?.email}.</p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>

      {potentialMembers.length > 0 && (
          <Card className="mb-6">
              <CardHeader>
                  <CardTitle>Membros Sugeridos</CardTitle>
                  <CardDescription>Estes jogadores usam a tag do seu clã mas ainda não estão na lista oficial. Selecione quem deseja adicionar.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                      {potentialMembers.map(player => (
                          <div key={player.id} onClick={() => handleToggleSelectNewMember(player.id)} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                              {selectedNewMembers.has(player.id) ? <CheckSquare className="h-5 w-5 text-accent" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                              <span>{player.latestPlayerName}</span>
                          </div>
                      ))}
                  </div>
              </CardContent>
              <CardFooter>
                  <Button onClick={handleAddSelectedMembers} disabled={isAdding || selectedNewMembers.size === 0}>
                      {isAdding ? 'Adicionando...' : `Adicionar ${selectedNewMembers.size} Membros`}
                  </Button>
              </CardFooter>
          </Card>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5"/>
                <span>Membros do Clã</span>
              </CardTitle>
              <CardDescription>Gerencie as patentes e status dos jogadores.</CardDescription>
            </div>
            <div className='flex items-center gap-4'>
                 <Button onClick={handleSync} disabled={isSyncing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Buscando...' : 'Sincronizar por Tag'}
                 </Button>
                <div className="text-right">
                   {isLoading ? (
                      <Skeleton className="h-7 w-12" />
                   ) : (
                      <p className="text-3xl font-bold text-accent">{members?.length || 0}</p>
                   )}
                   <p className="text-sm text-muted-foreground">Membros</p>
                </div>
            </div>
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
                  <TableHead className="hidden md:table-cell">Kills</TableHead>
                  <TableHead className="hidden md:table-cell">Tempo Jogado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : members && members.length > 0 ? (
                  members.map((member) => {
                    const aggregateData = memberAggregatesMap.get(member.id);
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.playerName}</TableCell>
                        <TableCell>{member.rank}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {aggregateData?.totalKills?.toLocaleString() || 'N/A'}
                        </TableCell>
                         <TableCell className="hidden md:table-cell">
                          {aggregateData?.totalTimeSeconds ? `${Math.floor(aggregateData.totalTimeSeconds / 3600)}h` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" className="mr-2" onClick={() => setMemberToEdit(member)}>
                              <Edit className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" disabled>
                              <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum membro encontrado. Use a "Sincronização por Tag" para encontrar e adicionar jogadores.
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
