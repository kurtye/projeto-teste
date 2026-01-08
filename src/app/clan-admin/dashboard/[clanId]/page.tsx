
'use client';

import { useClanAuth } from '../../layout';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Users, PlusCircle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ClanMember } from '@/lib/types';
import { AddMemberDialog } from './_components/AddMemberDialog';
import { EditMemberDialog } from './_components/EditMemberDialog';
import { RemoveMemberDialog } from './_components/RemoveMemberDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { syncClanMembersByTag } from '../../actions';


export default function ClanDashboardPage({ params }: { params: { clanId: string } }) {
  const { clan, user, logout } = useClanAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<ClanMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ClanMember | null>(null);
  const [isSyncing, startSyncTransition] = useTransition();


  // Basic authorization: ensure the user is viewing their own clan's dashboard
  if (!clan || clan.id !== params.clanId) {
    return notFound();
  }

  const membersQuery = useMemoFirebase(() => {
      if (!firestore || !clan) return null;
      return collection(firestore, 'clans', clan.id, 'members');
  }, [firestore, clan]);

  const { data: members, isLoading: isLoadingMembers } = useCollection<ClanMember>(membersQuery);

  const handleSyncMembers = () => {
    startSyncTransition(async () => {
      toast({
        title: 'Sincronização iniciada...',
        description: `Buscando jogadores com a tag [${clan.tag}]...`
      });
      const result = await syncClanMembersByTag(clan.id, clan.tag);
      if (result.success) {
        toast({
          title: 'Sincronização Concluída!',
          description: `${result.addedCount} novos membros foram adicionados. A lista será atualizada.`,
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

  const getStatusVariant = (status: ClanMember['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'trial': return 'outline';
      default: return 'secondary';
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
       <AddMemberDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        clan={clan}
      />
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
          <LogOut className="mr-2" />
          Sair
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users />
              <span>Membros do Clã</span>
            </CardTitle>
            <CardDescription>Gerencie os jogadores e suas patentes.</CardDescription>
          </div>
          <div className='flex gap-2'>
            <Button onClick={handleSyncMembers} variant="outline" disabled={isSyncing}>
              <RefreshCw className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Membros'}
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2" />
              Adicionar Membro
            </Button>
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
                      <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : members && members.length > 0 ? (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.playerName}</TableCell>
                      <TableCell>{member.rank}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" className="mr-2" onClick={() => setMemberToEdit(member)}>
                            <Edit className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => setMemberToRemove(member)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Nenhum membro encontrado. Use a sincronização ou adicione manualmente.
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
