'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Sword, 
  Shield, 
  Crosshair, 
  Binoculars, 
  Plus, 
  X, 
  UserPlus,
  Trash2,
  Settings2,
  ChevronRight,
  UserCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import type { ClanMember } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Squad {
  id: string;
  name: string;
  type: 'infantry' | 'armor' | 'artillery' | 'recon';
  members: string[]; // member IDs
}

interface LineupBuilderProps {
  members: ClanMember[];
  isLoading: boolean;
}

const SQUAD_TYPES = {
  infantry: { label: 'Infantaria', icon: Sword, max: 6, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  armor: { label: 'Blindado', icon: Shield, max: 3, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  artillery: { label: 'Artilharia', icon: Crosshair, max: 2, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  recon: { label: 'Reconhecimento', icon: Binoculars, max: 2, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

export function LineupBuilder({ members, isLoading }: LineupBuilderProps) {
  const [matchName, setMatchName] = useState('Partida de Treino');
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedMemberIds, setSelectedNewMemberIds] = useState<Set<string>>(new Set());
  
  // Track which squad a member is assigned to
  const memberAssignmentMap = useMemo(() => {
    const map = new Map<string, string>();
    squads.forEach(s => {
      s.members.forEach(mId => map.set(mId, s.id));
    });
    return map;
  }, [squads]);

  const unassignedMembers = useMemo(() => {
    return members.filter(m => selectedMemberIds.has(m.id) && !memberAssignmentMap.has(m.id));
  }, [members, selectedMemberIds, memberAssignmentMap]);

  const addSquad = (type: keyof typeof SQUAD_TYPES) => {
    const newSquad: Squad = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${SQUAD_TYPES[type].label} ${squads.filter(s => s.type === type).length + 1}`,
      type,
      members: [],
    };
    setSquads([...squads, newSquad]);
  };

  const removeSquad = (squadId: string) => {
    setSquads(squads.filter(s => s.id !== squadId));
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedNewMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
        // Also remove from any squad if currently assigned
        setSquads(currentSquads => 
          currentSquads.map(s => ({
            ...s,
            members: s.members.filter(id => id !== memberId)
          }))
        );
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const assignMemberToSquad = (memberId: string, squadId: string) => {
    setSquads(currentSquads => 
      currentSquads.map(s => {
        if (s.id === squadId) {
          if (s.members.length >= SQUAD_TYPES[s.type].max) return s;
          return { ...s, members: [...s.members, memberId] };
        }
        return s;
      })
    );
  };

  const removeMemberFromSquad = (memberId: string, squadId: string) => {
    setSquads(currentSquads => 
      currentSquads.map(s => {
        if (s.id === squadId) {
          return { ...s, members: s.members.filter(id => id !== memberId) };
        }
        return s;
      })
    );
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.playerName || 'Desconhecido';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Disponíveis
              </CardTitle>
              <CardDescription>Selecione os jogadores para a partida.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px] px-4">
                <div className="space-y-1 py-2">
                  {members.map(member => {
                    const isSelected = selectedMemberIds.has(member.id);
                    const isAssigned = memberAssignmentMap.has(member.id);
                    return (
                      <div 
                        key={member.id}
                        onClick={() => toggleMemberSelection(member.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-sm",
                          isSelected ? "bg-accent/10 border border-accent/20" : "hover:bg-muted border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-accent flex-shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                          <span className={cn("truncate", isAssigned && "text-muted-foreground line-through")}>
                            {member.playerName}
                          </span>
                        </div>
                        {isAssigned && <Badge variant="outline" className="text-[10px] py-0 px-1">Escalado</Badge>}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center/Right: Builder */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Header Controls */}
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <Label htmlFor="match-name">Nome da Operação / Evento</Label>
                  <Input 
                    id="match-name" 
                    value={matchName} 
                    onChange={e => setMatchName(e.target.value)} 
                    placeholder="Ex: Treino de Sábado"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => addSquad('infantry')}>
                    <Plus className="mr-1 h-4 w-4" /> Infantaria
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addSquad('armor')}>
                    <Plus className="mr-1 h-4 w-4" /> Blindado
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addSquad('recon')}>
                    <Plus className="mr-1 h-4 w-4" /> Recon
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addSquad('artillery')}>
                    <Plus className="mr-1 h-4 w-4" /> Artilharia
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> 
                  <span>{selectedMemberIds.size} Selecionados</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4" /> 
                  <span>{memberAssignmentMap.size} Escalados</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unassigned Pool */}
          {unassignedMembers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Jogadores sem Pelotão</h3>
              <div className="flex flex-wrap gap-2">
                {unassignedMembers.map(m => (
                  <Badge key={m.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-2">
                    {m.playerName}
                    <div className="flex gap-1 border-l pl-1 ml-1">
                      {squads.map(s => {
                        const Icon = SQUAD_TYPES[s.type].icon;
                        return (
                          <button 
                            key={s.id} 
                            onClick={() => assignMemberToSquad(m.id, s.id)}
                            title={`Mover para ${s.name}`}
                            className="hover:text-accent transition-colors"
                          >
                            <Icon className="h-3 w-3" />
                          </button>
                        );
                      })}
                    </div>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Squad Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {squads.length === 0 ? (
              <div className="col-span-full h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                <Settings2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Clique nos botões acima para criar seus pelotões.</p>
              </div>
            ) : (
              squads.map(squad => {
                const config = SQUAD_TYPES[squad.type];
                const Icon = config.icon;
                return (
                  <Card key={squad.id} className="overflow-hidden border-accent/10 transition-all hover:border-accent/30">
                    <CardHeader className={cn("p-3 flex flex-row items-center justify-between border-b", config.color)}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <CardTitle className="text-sm truncate">{squad.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">{squad.members.length}/{config.max}</span>
                        <button onClick={() => removeSquad(squad.id)} className="hover:text-foreground opacity-70 hover:opacity-100">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1 min-h-[100px]">
                      {squad.members.map(mId => (
                        <div key={mId} className="flex items-center justify-between p-1.5 rounded bg-muted/30 text-xs">
                          <span className="truncate pr-2 font-medium">{getMemberName(mId)}</span>
                          <button onClick={() => removeMemberFromSquad(mId, squad.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {squad.members.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground italic">
                          Vazio
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}