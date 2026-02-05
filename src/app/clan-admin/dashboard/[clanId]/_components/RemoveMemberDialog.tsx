
'use client';

import { useTransition } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ClanMember } from '@/lib/types';
import { removeClanMember } from '../../../actions';

interface RemoveMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  member: ClanMember | null;
  clanId: string;
}

export function RemoveMemberDialog({ isOpen, onOpenChange, member, clanId }: RemoveMemberDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  if (!member) return null;

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeClanMember(clanId, member.id);
      if (result.success) {
        toast({ title: 'Membro removido com sucesso!' });
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha ao remover membro',
          description: result.error,
        });
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso removerá permanentemente{' '}
            <span className="font-bold">{member.playerName}</span> do clã.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemove} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
    
