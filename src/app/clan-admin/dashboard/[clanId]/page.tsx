'use client';

import { useClanAuth } from '../../layout';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Edit, Trash2, UserPlus, RefreshCw, CheckSquare, Square, List, Trophy, Shield, Star, Crown } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import type { PlayerAggregates, ClanMember } from '@/lib/types';
import { EditMemberDialog } from './_components/EditMemberDialog';
import { HierarchyView } from './_components/HierarchyView';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useState, use, useTransition, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { findPotentialMembersByTag, addMembersToClan } from '../../actions';
import { useToast } from '@/hooks/use-toast';
import { notFound as notFoundError } from 'next/navigation';

export default function ClanDashboardPage({ params }: { params: { clanId: string } }) {
  const resolvedParams = use(params);
  const clanId = resolvedParams.clanId;
  const { clan, user, logout } = useClanAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [memberToEdit, setMemberToEdit] = useState<ClanMember | null>(null);
  
  const [isSyncing, startSyncTransition] = useTransition();
  const [potentialMembers, setPotentialMembers] = useState<PlayerAggregates[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<Set<string>>(new Set());
  const [isAdding, startAddingTransition] = useTransition();

  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !clanId) return null;
    return collection(firestore, 'clans', clanId, 'members');
  }, [firestore, clanId]);

  const { data: members, isLoading: isLoadingMembers, error: membersError } = useCollection<ClanMember>(membersQuery);
  
  const memberIds = useMemo(() => {
      if (!members || members.length === 0) return null;
      return members.map(m => m.id);
  }, [members]);

  const memberAggregatesQuery = useMemoFirebase(() => {
    if (!firestore || !memberIds) return null;
    return query(collection(firestore, 'playerAggregates'), where(documentId(), 'in', memberIds));
  }, [firestore, memberIds]);

  const { data: memberAggregates, isLoading: isLoadingAggregates, error: aggregatesError } = useCollection<PlayerAggregates>(memberAggregatesQuery);
  
  const memberAggregatesMap = useMemo(() => {
    if (!memberAggregates) return new Map<string, PlayerAggregates>();
    return new Map(memberAggregates.map(agg => [agg.id, agg]));
  }, [memberAggregates]);
  
  if (!clan || clan.id !== clanId) {
    return notFoundError();
  }

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
  
  const handleToggleSelectAll = () => {
    if (selectedNewMembers.size === potentialMembers.length) {
        setSelectedNewMembers(new Set());
    } else {
        const allIds = new Set(potentialMembers.map(p => p.id));
        setSelectedNewMembers(allIds);
    }
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

  const isLoading = isLoadingMembers || isLoadingAggregates;

  const sortedMembers = useMemo(() => {
    if (!members) return [];
    const rankOrder = ['Líder', 'Comandante', 'Oficial', 'Veterano', 'Membro', 'Recruta'];
    return [...members].sort((a, b) => {
      const rankA = rankOrder.indexOf(a.rank);
      const rankB = rankOrder.indexOf(b.rank);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [members]);


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
              <CardFooter className="flex items-center gap-4">
                  <Button onClick={handleAddSelectedMembers} disabled={isAdding || selectedNewMembers.size === 0}>
                      {isAdding ? 'Adicionando...' : `Adicionar ${selectedNewMembers.size} Membros`}
                  </Button>
                   <Button variant="outline" onClick={handleToggleSelectAll} disabled={isAdding}>
                      {selectedNewMembers.size === potentialMembers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </Button>
              </CardFooter>
          </Card>
      )}
      
      <Tabs defaultValue="list">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <TabsList>
                <TabsTrigger value="list"><List className="mr-2 h-4 w-4"/>Lista de Membros</TabsTrigger>
                <TabsTrigger value="hierarchy"><Users className="mr-2 h-4 w-4"/>Hierarquia</TabsTrigger>
            </TabsList>
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

        <TabsContent value="list">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="h-5 w-5"/>
                        <span>Membros do Clã</span>
                    </CardTitle>
                    <CardDescription>Gerencie as patentes e status dos jogadores.</CardDescription>
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
                        ) : sortedMembers && sortedMembers.length > 0 ? (
                        sortedMembers.map((member) => {
                            const aggregateData = memberAggregatesMap.get(member.id);
                            return (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.playerName}</TableCell>
                                <TableCell>{member.rank}</TableCell>
                                <TableCell>
                                <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {aggregateData?.totalKills?.toLocaleString() ?? '-'}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {aggregateData?.totalTimeSeconds ? `${Math.floor(aggregateData.totalTimeSeconds / 3600)}h` : '-'}
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
        </TabsContent>
        <TabsContent value="hierarchy">
            {isLoadingMembers ? (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : (
                <HierarchyView members={members || []} />
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
