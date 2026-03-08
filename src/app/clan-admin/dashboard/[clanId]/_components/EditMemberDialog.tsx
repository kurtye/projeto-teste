
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    'Terceiro-Sargento',
    'Segundo-Sargento',
    'Primeiro-Sargento',
    'Subtenente',
    'Aspirante',
    'Segundo-Tenente',
    'Primeiro-Tenente',
    'Capitao',
    'Major',
    'Tenente-Coronel',
    'Coronel',
    'General-de-Brigada',
    'General-de-Divisao',
    'General-de-Exercito',
    'Marechal',
    'Subcomandante',
    'Comandante'
];

const HLL_CLASSES = [
  'Comandante',
  'Oficial',
  'Fuzileiro',
  'Assalto',
  'Atirador Automático',
  'Médico',
  'Suporte',
  'Metralhador',
  'Anti-Tanque',
  'Engenheiro',
  'Cmt de Tanque',
  'Tripulante',
  'Observador',
  'Atirador de Elite'
];

const statuses: ClanMember['status'][] = ['active', 'inactive', 'trial'];

export function EditMemberDialog({ isOpen, onOpenChange, member, clanId }: EditMemberDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [rank, setRank] = useState('');
  const [status, setStatus] = useState<ClanMember['status']>('trial');
  const [preferredClasses, setPreferredClasses] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && member) {
      setRank(member.rank || 'Recruta');
      setStatus(member.status || 'trial');
      setPreferredClasses(member.preferredClasses || []);
    }
  }, [isOpen, member]);

  if (!member) return null;

  const handleToggleClass = (className: string) => {
    setPreferredClasses(prev => {
      if (prev.includes(className)) {
        return prev.filter(c => c !== className);
      }
      if (prev.length >= 3) {
        toast({
          variant: 'destructive',
          title: 'Limite atingido',
          description: 'Selecione no máximo 3 classes preferidas.'
        });
        return prev;
      }
      return [...prev, className];
    });
  };

  const handleUpdate = () => {
    startTransition(async () => {
      const result = await updateClanMember(clanId, member.id, { 
        rank, 
        status,
        preferredClasses 
      } as any);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Membro: {member.playerName}</DialogTitle>
          <DialogDescription>
            Atualize a patente, o status e as especialidades do jogador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rank">Patente</Label>
               <Select value={rank} onValueChange={setRank}>
                  <SelectTrigger id="rank">
                      <SelectValue placeholder="Selecione a patente" />
                  </SelectTrigger>
                  <SelectContent>
                      {ranks.map(r => <SelectItem key={r} value={r}>{r.replace(/-/g, ' ').replace('Capitao', 'Capitão')}</SelectItem>)}
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

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Classes Preferidas ({preferredClasses.length}/3)</Label>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Max 3</span>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-4 bg-muted/20">
              <div className="grid grid-cols-1 gap-3">
                {HLL_CLASSES.map((cls) => (
                  <div key={cls} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`class-${cls}`} 
                      checked={preferredClasses.includes(cls)}
                      onCheckedChange={() => handleToggleClass(cls)}
                    />
                    <label
                      htmlFor={`class-${cls}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {cls}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
