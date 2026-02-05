
'use client';

import { useClanAuth } from '../../layout';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Edit, UserPlus, RefreshCw, CheckSquare, Square, List, Trophy, Shield, Star, Crown, ArrowUp, Diamond, Award, Medal, Search, CalendarDays, Trash2, Sparkles } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { PlayerAggregates, ClanMember, PromotionLog, PlayerPeriodStats } from '@/lib/types';
import { EditMemberDialog } from './_components/EditMemberDialog';
import { RemoveMemberDialog } from './_components/RemoveMemberDialog';
import { HierarchyView } from './_components/HierarchyView';
import { RecentPromotions } from './_components/RecentPromotions';
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
import { useState, useTransition, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { findPotentialMembersByTag, addMembersToClan, promoteClanMember, getClanMonthlyStats, findUnclaimedPlayers, generateMonthlyReportAction } from '../../actions';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type MonthlySortKey = keyof Pick<PlayerPeriodStats, 'totalTimeSeconds' | 'totalKills' | 'totalCombat' | 'totalOffense' | 'totalDefense' | 'totalSupport'>;

const MonthlySortableHeader = ({
  children,
  sortKey,
  sortConfig,
  requestSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: MonthlySortKey;
  sortConfig: { key: MonthlySortKey; direction: string };
  requestSort: (key: MonthlySortKey) => void;
  className?: string;
}) => {
  const isActive = sortConfig.key === sortKey;
  const directionIcon = sortConfig.direction === 'ascending' ? '▲' : '▼';

  return (
    <TableHead className={cn("text-right", className)}>
      <Button variant="ghost" onClick={() => requestSort(sortKey)} className="group h-auto p-2 justify-end w-full">
        {children}
        <span className={cn(
          "ml-2 transition-opacity text-xs",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
        )}>
          {directionIcon}
        </span>
      </Button>
    </TableHead>
  );
};


export default function ClanDashboardPage({ params }: { params: { clanId: string } }) {
  const { clanId } = params;
  const { clan, user, logout } = useClanAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [memberToEdit, setMemberToEdit] = useState<ClanMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ClanMember | null>(null);
  
  const [isSyncing, startSyncTransition] = useTransition();
  const [potentialMembers, setPotentialMembers] = useState<PlayerAggregates[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<Set<string>>(new Set());
  const [isAdding, startAddingTransition] = useTransition();
  const [isPromoting, startPromotingTransition] = useTransition();
  
  const [monthlyStats, setMonthlyStats] = useState<(PlayerPeriodStats & { playerName: string })[]>([]);
  const [isFetchingMonthlyStats, startFetchingMonthlyStats] = useTransition();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  
  const [monthlySortConfig, setMonthlySortConfig] = useState<{ key: MonthlySortKey, direction: 'ascending' | 'descending' }>({
    key: 'totalKills',
    direction: 'descending',
  });

  // State for recruitment tab
  const [isFindingTalents, startFindingTalents] = useTransition();
  const [unclaimedPlayers, setUnclaimedPlayers] = useState<PlayerPeriodStats[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<Set<string>>(new Set());
  const [isAddingTalents, startAddingTalents] = useTransition();
  
  // State for AI Report
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, startGeneratingReport] = useTransition();

  // This effect ensures that if a user lands on the wrong clan dashboard, they are redirected.
  useEffect(() => {
    if (clan && clan.id !== clanId) {
      router.replace(`/clan-admin/dashboard/${clan.id}`);
    }
  }, [clan, clanId, router]);
  
  // Query for clan members
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !clanId) return null;
    return query(collection(firestore, 'clans', clanId, 'members'), orderBy('playerName'));
  }, [firestore, clanId]);
  const { data: members, isLoading: isLoadingMembers, error: membersError } = useCollection<ClanMember>(membersQuery);
  
  // Query for promotion logs
  const promotionsQuery = useMemoFirebase(() => {
      if (!firestore || !clanId) return null;
      return query(collection(firestore, 'clans', clanId, 'promotionLog'));
  }, [firestore, clanId]);
  const { data: promotions, isLoading: isLoadingPromotions } = useCollection<PromotionLog>(promotionsQuery);

  // Client-side sorting for promotions
  const sortedPromotions = useMemo(() => {
    if (!promotions) return [];
    return [...promotions].sort((a, b) => {
        const dateA = a.promotionDate as any;
        const dateB = b.promotionDate as any;
        const timeA = dateA?.seconds ? dateA.seconds * 1000 : new Date(dateA).getTime();
        const timeB = dateB?.seconds ? dateB.seconds * 1000 : new Date(dateB).getTime();
        return timeB - timeA;
    });
  }, [promotions]);

  // If clan data is not yet available or doesn't match the URL, show a loading state.
  if (!clan || clan.id !== clanId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }
  
  const ranksInOrder = [
    'Recruta', 'Soldado', 'Cabo', 'Terceiro-Sargento', 'Segundo-Sargento', 'Primeiro-Sargento',
    'Subtenente', 'Aspirante', 'Segundo-Tenente', 'Primeiro-Tenente', 'Capitao', 'Major',
    'Tenente-Coronel', 'Coronel', 'General-de-Brigada', 'General-de-Divisao', 'General-de-Exercito',
    'Marechal', 'Subcomandante', 'Comandante'
  ];
  
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString().padStart(2, '0'),
      label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' })
  }));

  const getStatusVariant = (status: ClanMember['status'] | undefined) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'trial': return 'outline';
      default: return 'secondary';
    }
  }
  
  const getRankImage = (rank: string) => {
    const imageName = (rank === 'Comandante' || rank === 'Subcomandante') ? 'Marechal.jpeg' : `${rank}.jpeg`;
    return (
        <Image 
            src={`/patentes/${imageName}`} 
            alt={rank} 
            width={20} 
            height={20} 
            className="w-5 h-5 object-contain"
        />
    );
  };

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

  const handlePromote = (member: ClanMember) => {
    startPromotingTransition(async () => {
        const result = await promoteClanMember(clan.id, member.id, member.rank);
        if (result.success) {
            toast({ title: 'Promoção bem-sucedida!', description: `${member.playerName} foi promovido.` });
        } else {
            toast({ variant: 'destructive', title: 'Falha na Promoção', description: result.error });
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
        setSelectedNewMembers(new Set(potentialMembers.map(p => p.id)));
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

    const handleFetchMonthlyStats = () => {
        startFetchingMonthlyStats(async () => {
            const periodId = `month_${selectedYear}-${selectedMonth}`;
            setMonthlyStats([]);
            setAiReport(null);
            const result = await getClanMonthlyStats(clan.id, periodId);
            if (result.success && result.stats) {
                setMonthlyStats(result.stats);
                if (result.stats.length > 0) {
                    toast({
                        title: 'Estatísticas Carregadas',
                        description: `Exibindo dados para ${selectedMonth}/${selectedYear}.`,
                    });
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Falha ao buscar estatísticas',
                    description: result.error,
                });
            }
        });
    };

  const handleFindTalents = () => {
    startFindingTalents(async () => {
      setUnclaimedPlayers([]);
      setSelectedTalents(new Set());
      const result = await findUnclaimedPlayers();
      if (result.success && result.players) {
        setUnclaimedPlayers(result.players);
        toast({
          title: 'Busca Concluída',
          description: `Encontrados ${result.players.length} jogadores promissores este mês.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na Busca',
          description: result.error || 'Ocorreu um erro desconhecido.',
        });
      }
    });
  };

  const handleToggleSelectTalent = (playerId: string) => {
    setSelectedTalents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAllTalents = () => {
    if (selectedTalents.size === unclaimedPlayers.length) {
        setSelectedTalents(new Set());
    } else {
        setSelectedTalents(new Set(unclaimedPlayers.map(p => p.playerId)));
    }
  };

  const handleAddSelectedTalents = () => {
    startAddingTalents(async () => {
        const playersToAdd: PlayerAggregates[] = unclaimedPlayers
            .filter(p => selectedTalents.has(p.playerId))
            .map(p => ({
                id: p.playerId,
                playerId: p.playerId,
                latestPlayerName: p.latestPlayerName,
            }));

        if (playersToAdd.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum jogador selecionado.' });
            return;
        }
        
        const result = await addMembersToClan(clan.id, playersToAdd);
        if (result.success) {
            toast({ title: 'Membros adicionados com sucesso!' });
            handleFindTalents();
        } else {
            toast({ variant: 'destructive', title: 'Falha ao adicionar membros', description: result.error });
        }
    });
  };
  
    const handleGenerateReport = () => {
        startGeneratingReport(async () => {
            setAiReport(null);
            const result = await generateMonthlyReportAction(monthlyStats);
            if (result.success && result.report) {
                setAiReport(result.report);
                 toast({
                    title: 'Relatório Gerado!',
                    description: 'A análise de desempenho mensal está pronta.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Falha na Análise',
                    description: result.error,
                });
            }
        });
    };

  const sortedMembers = useMemo(() => {
    if (!members) return [];
    return [...members].sort((a, b) => {
      const rankA = ranksInOrder.indexOf(a.rank);
      const rankB = ranksInOrder.indexOf(b.rank);
      if (rankA !== rankB) {
        return rankB - rankA; // Sort descending by rank index
      }
      return a.playerName.localeCompare(b.playerName);
    });
  }, [members]);

  const handleRequestMonthlySort = (key: MonthlySortKey) => {
    let direction: 'ascending' | 'descending' = 'descending';
    if (monthlySortConfig.key === key && monthlySortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setMonthlySortConfig({ key, direction });
  };
  
  const sortedMonthlyStats = useMemo(() => {
    const sortableStats = [...monthlyStats];
    sortableStats.sort((a, b) => {
      const valA = a[monthlySortConfig.key] || 0;
      const valB = b[monthlySortConfig.key] || 0;

      if (valA < valB) {
        return monthlySortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valA > valB) {
        return monthlySortConfig.direction === 'ascending' ? 1 : -1;
      }
      if (monthlySortConfig.key !== 'totalKills') {
         return (b.totalKills || 0) - (a.totalKills || 0);
      }
      return 0;
    });
    return sortableStats;
  }, [monthlyStats, monthlySortConfig]);


  return (
    <div className="container mx-auto px-4 py-8">
      <EditMemberDialog
        isOpen={!!memberToEdit}
        onOpenChange={(isOpen) => !isOpen && setMemberToEdit(null)}
        member={memberToEdit}
        clanId={clan.id}
      />
      
      <RemoveMemberDialog
        isOpen={!!memberToRemove}
        onOpenChange={(isOpen) => !isOpen && setMemberToRemove(null)}
        member={memberToRemove}
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

      <Tabs defaultValue="list">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="list"><List className="mr-2 h-4 w-4"/>Lista</TabsTrigger>
                <TabsTrigger value="hierarchy"><Users className="mr-2 h-4 w-4"/>Hierarquia</TabsTrigger>
                <TabsTrigger value="promotions"><Medal className="mr-2 h-4 w-4"/>Promoções</TabsTrigger>
                <TabsTrigger value="recruitment"><UserPlus className="mr-2 h-4 w-4"/>Recrutar</TabsTrigger>
                <TabsTrigger value="monthly-stats"><CalendarDays className="mr-2 h-4 w-4"/>Stats Mensais</TabsTrigger>
            </TabsList>
            <div className='flex items-center gap-4'>
                <div className="text-right">
                   {isLoadingMembers ? (
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
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Users className="h-5 w-5"/>
                                <span>Membros do Clã</span>
                            </CardTitle>
                            <CardDescription>Gerencie as patentes e status dos jogadores.</CardDescription>
                        </div>
                         <Button onClick={handleSync} disabled={isSyncing || isPromoting}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Buscando...' : 'Sincronizar por Tag'}
                         </Button>
                    </div>
                </CardHeader>
                <CardContent>
                 {potentialMembers.length > 0 && (
                      <Card className="mb-6 bg-muted/30">
                          <CardHeader>
                              <CardTitle>Membros Sugeridos (por Tag)</CardTitle>
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
                                  {isAdding ? 'Adicionando...' : `Adicionar ${selectedNewMembers.size} Selecionados`}
                              </Button>
                               <Button variant="outline" onClick={handleToggleSelectAll} disabled={isAdding}>
                                  {selectedNewMembers.size === potentialMembers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                              </Button>
                          </CardFooter>
                      </Card>
                  )}
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
                            <TableCell className="text-right space-x-2">
                                <Skeleton className="h-8 w-8 ml-auto inline-block" />
                                <Skeleton className="h-8 w-8 ml-auto inline-block" />
                            </TableCell>
                            </TableRow>
                        ))
                        ) : sortedMembers && sortedMembers.length > 0 ? (
                        sortedMembers.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.playerName}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                    {getRankImage(member.rank)}
                                    {member.rank.replace(/-/g, ' ').replace('Capitao', 'Capitão')}
                                </TableCell>
                                <TableCell>
                                <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handlePromote(member)}
                                        disabled={isPromoting || member.rank === 'Comandante'}
                                        title="Promover"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setMemberToEdit(member)} title="Editar">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setMemberToRemove(member)}
                                        title="Remover"
                                        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            )
                        )
                        ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
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
        <TabsContent value="promotions">
             {isLoadingPromotions ? (
                 <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                </div>
             ) : (
                <RecentPromotions promotions={sortedPromotions || []} />
             )}
        </TabsContent>
        <TabsContent value="recruitment">
            <Card>
                <CardHeader>
                    <CardTitle>Recrutamento de Talentos</CardTitle>
                    <CardDescription>Encontre jogadores ativos e sem clã com base no desempenho do mês atual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleFindTalents} disabled={isFindingTalents || isAddingTalents}>
                        <Search className={`mr-2 h-4 w-4 ${isFindingTalents ? 'animate-spin' : ''}`} />
                        {isFindingTalents ? 'Buscando...' : 'Buscar Talentos do Mês'}
                    </Button>

                    {unclaimedPlayers.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2">Jogadores Encontrados ({unclaimedPlayers.length})</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto border p-2 rounded-md bg-muted/30">
                                {unclaimedPlayers.map(player => (
                                    <div key={player.playerId} onClick={() => handleToggleSelectTalent(player.playerId)} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                                        {selectedTalents.has(player.playerId) ? <CheckSquare className="h-5 w-5 text-accent" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                                        <div className="flex-1">
                                            <span className="font-semibold">{player.latestPlayerName}</span>
                                            <p className="text-xs text-muted-foreground">Kills no mês: {(player.totalKills || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-4">
                                <Button onClick={handleAddSelectedTalents} disabled={isAddingTalents || selectedTalents.size === 0}>
                                    <UserPlus className={`mr-2 h-4 w-4 ${isAddingTalents ? 'animate-spin' : ''}`} />
                                    {isAddingTalents ? 'Adicionando...' : `Adicionar ${selectedTalents.size} Selecionados`}
                                </Button>
                                <Button variant="outline" onClick={handleToggleSelectAllTalents} disabled={isAddingTalents || isFindingTalents}>
                                    {selectedTalents.size === unclaimedPlayers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="monthly-stats">
            <Card>
                <CardHeader>
                    <CardTitle>Estatísticas Mensais do Clã</CardTitle>
                    <CardDescription>Veja o desempenho dos membros em um mês específico.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-muted/30">
                        <div className="flex-1 grid grid-cols-2 gap-4 w-full sm:w-auto">
                            <div className="space-y-1">
                                <Label htmlFor="year-select">Ano</Label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger id="year-select"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="month-select">Mês</Label>
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger id="month-select"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-end">
                            <Button onClick={handleFetchMonthlyStats} disabled={isFetchingMonthlyStats || isGeneratingReport} className="w-full sm:w-auto">
                                <Search className={`mr-2 h-4 w-4 ${isFetchingMonthlyStats ? 'animate-spin' : ''}`} />
                                {isFetchingMonthlyStats ? 'Buscando...' : 'Buscar'}
                            </Button>
                            <Button onClick={handleGenerateReport} disabled={isFetchingMonthlyStats || monthlyStats.length === 0 || isGeneratingReport} className="w-full sm:w-auto">
                                <Sparkles className={`mr-2 h-4 w-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                                {isGeneratingReport ? 'Analisando...' : 'Analisar com IA'}
                            </Button>
                        </div>
                    </div>
                    
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Jogador</TableHead>
                                <MonthlySortableHeader sortKey="totalTimeSeconds" sortConfig={monthlySortConfig} requestSort={handleRequestMonthlySort}>Horas</MonthlySortableHeader>
                                <MonthlySortableHeader sortKey="totalKills" sortConfig={monthlySortConfig} requestSort={handleRequestMonthlySort}>Kills</MonthlySortableHeader>
                                <MonthlySortableHeader sortKey="totalCombat" sortConfig={monthlySortConfig} requestSort={handleRequestMonthlySort}>Combate</MonthlySortableHeader>
                                <MonthlySortableHeader sortKey="totalOffense" sortConfig={monthlySortConfig} requestSort={handleRequestMonthlySort}>Ataque</MonthlySortableHeader>
                                <MonthlySortableHeader sortKey="totalDefense" sortConfig={monthlySortConfig} requestSort={handleRequestMonthlySort}>Defesa</MonthlySortableHeader>
                                <MonthlySortableHeader sortKey="totalSupport" sortConfig={monthlySortConfig} requestSort={handleRequestMonthlySort}>Suporte</MonthlySortableHeader>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isFetchingMonthlyStats ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : sortedMonthlyStats.length > 0 ? (
                                sortedMonthlyStats.map(stat => (
                                    <TableRow key={stat.playerId}>
                                        <TableCell className="font-medium">
                                            <Link href={`/player/${encodeURIComponent(stat.playerId)}`} className="hover:underline">
                                                {stat.playerName}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right">{~~((stat.totalTimeSeconds || 0) / 3600)}h</TableCell>
                                        <TableCell className="text-right font-semibold text-accent">{(stat.totalKills || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{(stat.totalCombat || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{(stat.totalOffense || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{(stat.totalDefense || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{(stat.totalSupport || 0).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum dado encontrado para este período. Clique em "Buscar".</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {isGeneratingReport && (
                        <div className="space-y-4 mt-6 p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-6 w-48" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    )}
                    {aiReport && (
                        <Card className="mt-6 bg-card/80">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Sparkles className="h-5 w-5 text-accent" />
                                    Análise de Desempenho (IA)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: aiReport.replace(/### (.*?)\n/g, '<h3 class="text-lg font-semibold mt-4 mb-2 font-headline text-accent">$1</h3>').replace(/\* \*\*(.*?)\*\*/g, '<p class="font-bold mt-2">$1</p>') }} />
                            </CardContent>
                        </Card>
                    )}

                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
