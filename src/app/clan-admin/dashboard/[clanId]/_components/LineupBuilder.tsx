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
  Trash2,
  Settings2,
  UserCheck,
  CheckSquare,
  Square,
  Grab
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
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  
  // Only bring active members for the lineup selection
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  // Track which squad a member is assigned to
  const memberAssignmentMap = useMemo(() => {
    const map = new Map<string, string>();
    squads.forEach(s => {
      s.members.forEach(mId => map.set(mId, s.id));
    });
    return map;
  }, [squads]);

  const unassignedMembers = useMemo(() => {
    return activeMembers.filter(m => selectedMemberIds.has(m.id) && !memberAssignmentMap.has(m.id));
  }, [activeMembers, selectedMemberIds, memberAssignmentMap]);

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
    // If not selected, select first
    if (!selectedMemberIds.has(memberId)) {
      setSelectedNewMemberIds(prev => new Set(prev).add(memberId));
    }

    setSquads(currentSquads => {
      // Remove from any previous squad first
      const cleanedSquads = currentSquads.map(s => ({
        ...s,
        members: s.members.filter(id => id !== memberId)
      }));

      // Add to new squad
      return cleanedSquads.map(s => {
        if (s.id === squadId) {
          if (s.members.length >= SQUAD_TYPES[s.type].max) return s;
          return { ...s, members: [...s.members, memberId] };
        }
        return s;
      });
    });
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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData('memberId', memberId);
    setDraggedMemberId(memberId);
  };

  const handleDragOver = (e: React.DragEvent, squadId: string) => {
    e.preventDefault();
    setActiveDropZone(squadId);
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  const handleDrop = (e: React.DragEvent, squadId: string) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    if (memberId) {
      assignMemberToSquad(memberId, squadId);
    }
    setDraggedMemberId(null);
    setActiveDropZone(null);
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
                Membros Ativos
              </CardTitle>
              <CardDescription>Arraste para escalar ou marque o checkbox.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px] px-4">
                <div className="space-y-1 py-2">
                  {activeMembers.length === 0 && !isLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-8 italic">Nenhum membro ativo encontrado.</p>
                  ) : activeMembers.map(member => {
                    const isSelected = selectedMemberIds.has(member.id);
                    const isAssigned = memberAssignmentMap.has(member.id);
                    const isBeingDragged = draggedMemberId === member.id;

                    return (
                      <div 
                        key={member.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md cursor-grab transition-all text-sm group",
                          isSelected ? "bg-accent/10 border border-accent/20" : "hover:bg-muted border border-transparent",
                          isBeingDragged && "opacity-40 grayscale scale-95"
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleMemberSelection(member.id); }}
                            className="hover:scale-110 transition-transform"
                          >
                            {isSelected ? <CheckSquare className="h-4 w-4 text-accent flex-shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                          </button>
                          <span className={cn("truncate font-medium", isAssigned && "text-muted-foreground line-through")}>
                            {member.playerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAssigned && <Badge variant="outline" className="text-[10px] py-0 px-1 opacity-70">Escalado</Badge>}
                          <Grab className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Jogadores em Espera (Arraste-os!)</h3>
              <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-muted/20 border border-dashed">
                {unassignedMembers.map(m => (
                  <Badge 
                    key={m.id} 
                    variant="secondary" 
                    draggable
                    onDragStart={(e) => handleDragStart(e, m.id)}
                    className="pl-2 pr-2 py-1 cursor-grab active:cursor-grabbing hover:bg-secondary/80 flex items-center gap-2"
                  >
                    <Grab className="h-3 w-3 text-muted-foreground" />
                    {m.playerName}
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
                <p className="text-muted-foreground">Adicione pelotões acima para começar a escalação.</p>
              </div>
            ) : (
              squads.map(squad => {
                const config = SQUAD_TYPES[squad.type];
                const Icon = config.icon;
                const isOver = activeDropZone === squad.id;
                const isFull = squad.members.length >= config.max;

                return (
                  <Card 
                    key={squad.id} 
                    onDragOver={(e) => !isFull && handleDragOver(e, squad.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, squad.id)}
                    className={cn(
                      "overflow-hidden transition-all duration-200 border-accent/10",
                      isOver && "ring-2 ring-accent scale-[1.02] shadow-lg",
                      isFull && "opacity-80"
                    )}
                  >
                    <CardHeader className={cn("p-3 flex flex-row items-center justify-between border-b", config.color)}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <CardTitle className="text-sm truncate">{squad.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-mono px-1 rounded", isFull ? "bg-destructive text-destructive-foreground" : "bg-background/20")}>
                          {squad.members.length}/{config.max}
                        </span>
                        <button onClick={() => removeSquad(squad.id)} className="hover:text-foreground opacity-70 hover:opacity-100">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1 min-h-[120px] bg-card/30">
                      {squad.members.map(mId => (
                        <div key={mId} className="flex items-center justify-between p-1.5 rounded bg-muted/50 text-xs">
                          <span className="truncate pr-2 font-medium">{getMemberName(mId)}</span>
                          <button onClick={() => removeMemberFromSquad(mId, squad.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {squad.members.length === 0 && !isOver && (
                        <div className="h-20 flex flex-col items-center justify-center text-[10px] text-muted-foreground/50 italic border border-dashed border-muted-foreground/20 rounded">
                          Solte um jogador aqui
                        </div>
                      )}
                      {isOver && (
                        <div className="h-8 animate-pulse bg-accent/20 border border-accent border-dashed rounded flex items-center justify-center text-[10px] text-accent font-bold">
                          ESCALAR JOGADOR
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
