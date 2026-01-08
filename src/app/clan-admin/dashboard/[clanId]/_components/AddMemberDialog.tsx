
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { searchPlayersByName, addClanMember } from '../../../actions';
import type { PlayerAggregates, Clan } from '@/lib/types';
import { debounce } from 'lodash';

interface AddMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  clan: Clan;
}

export function AddMemberDialog({ isOpen, onOpenChange, clan }: AddMemberDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerAggregates[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAggregates | null>(null);
  const { toast } = useToast();

  const handleSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 3) {
        setSearchResults([]);
        return;
      }
      const results = await searchPlayersByName(term);
      setSearchResults(results);
    }, 300),
    []
  );

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);

  const handleAddMember = () => {
    if (!selectedPlayer) {
      toast({
        variant: 'destructive',
        title: 'Nenhum jogador selecionado',
      });
      return;
    }

    startTransition(async () => {
      const result = await addClanMember(clan.id, clan.tag, selectedPlayer);
      if (result.success) {
        toast({ title: 'Membro adicionado com sucesso!' });
        setSearchTerm('');
        setSelectedPlayer(null);
        setSearchResults([]);
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha ao adicionar membro',
          description: result.error,
        });
      }
    });
  };

  const resetState = () => {
    setSearchTerm('');
    setSelectedPlayer(null);
    setSearchResults([]);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetState();
        onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Membro ao Clã</DialogTitle>
          <DialogDescription>
            Busque pelo nome do jogador para adicioná-lo ao clã {clan.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-player">Nome do Jogador</Label>
            <Input
              id="search-player"
              placeholder="Digite para buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedPlayer(null);
              }}
              disabled={isPending}
            />
          </div>
          {searchResults.length > 0 && !selectedPlayer && (
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {searchResults.map((player) => (
                <div
                  key={player.id}
                  className="cursor-pointer p-2 hover:bg-muted"
                  onClick={() => {
                    setSelectedPlayer(player);
                    setSearchTerm(player.latestPlayerName);
                  }}
                >
                  <p className="font-medium">{player.latestPlayerName}</p>
                  {player.clanTag && <p className="text-xs text-muted-foreground">Já está no clã: {player.clanTag}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAddMember} disabled={!selectedPlayer || isPending}>
            {isPending ? 'Adicionando...' : 'Adicionar Membro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
