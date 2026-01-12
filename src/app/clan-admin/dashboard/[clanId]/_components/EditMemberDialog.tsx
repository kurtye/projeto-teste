
'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { ClanMember } from '@/lib/types';
import { updateClanMember } from '../../../actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  member: ClanMember | null;
  clanId: string;
}

const ranks = [
    'Recruta',
    'Soldado',
    'Cabo',
    '3-sargento',
    '2-sargento',
    '1-sargento',
    'Subtenente',
    'Aspirante',
    '2-tenente',
    '1-tenente',
    'Capitão',
    'Major',
    'Tenente-Coronel',
    'Coronel',
    'General-de-Brigada',
    'General-de-Divisao',
    'General-de-Exercito',
    'Marechal'
];

const statuses: ClanMember['status'][] = ['active', 'inactive', 'trial'];

export function EditMemberDialog({ isOpen, onOpenChange, member, clanId }: EditMemberDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [rank, setRank] = useState('');
  const [status, setStatus] = useState<ClanMember['status']>('trial');

  useEffect(() => {
    if (isOpen && member) {
      setRank(member.rank || 'Recruta');
      setStatus(member.status || 'trial');
    }
  }, [isOpen, member]);

  if (!member) return null;

  const handleUpdate = () => {
    startTransition(async () => {
      const result = await updateClanMember(clanId, member.id, { rank, status });
      if (result.success) {
        toast({ title: 'Membro atualizado com sucesso!' });
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha ao atualizar membro',
          description: result.error,
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Membro: {member.playerName}</DialogTitle>
          <DialogDescription>
            Atualize a patente e o status do jogador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rank">Patente</Label>
             <Select value={rank} onValueChange={setRank}>
                <SelectTrigger id="rank">
                    <SelectValue placeholder="Selecione a patente" />
                </SelectTrigger>
                <SelectContent>
                    {ranks.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ClanMember['status'])}>
                <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                     {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleUpdate} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
