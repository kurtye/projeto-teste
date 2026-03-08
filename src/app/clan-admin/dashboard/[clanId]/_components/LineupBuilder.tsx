
'use client';

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
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
  Grab,
  Hammer,
  Wrench,
  Crown,
  Download,
  Copy,
  Share2,
  Star
} from 'lucide-react';
import type { ClanMember } from '@/lib/types';
import { cn } from '@/lib/utils';

type SquadRole = 'Ataque' | 'Defesa' | 'Centro' | 'Flanco Esquerdo' | 'Flanco Direito';

interface Squad {
  id: string;
  name: string;
  type: 'commander' | 'infantry' | 'armor' | 'artillery' | 'recon';
  members: string[]; // member IDs
  role?: SquadRole;
  buildNodes?: boolean;
}

interface LineupBuilderProps {
  members: ClanMember[];
  isLoading: boolean;
}

const SQUAD_TYPES = {
  commander: { label: 'Comando', icon: Crown, max: 1, color: 'bg-primary/20 text-primary border-primary/30' },
  infantry: { label: 'Infantaria', icon: Sword, max: 6, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  armor: { label: 'Blindado', icon: Shield, max: 3, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  artillery: { label: 'Artilharia', icon: Crosshair, max: 2, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  recon: { label: 'Reconhecimento', icon: Binoculars, max: 2, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const ROLES: SquadRole[] = ['Ataque', 'Defesa', 'Centro', 'Flanco Esquerdo', 'Flanco Direito'];

export function LineupBuilder({ members, isLoading }: LineupBuilderProps) {
  const [matchName, setMatchName] = useState('Operação Sem Nome');
  const [squads, setSquads] = useState<Squad[]>([]);
  const [selectedMemberIds, setSelectedNewMemberIds] = useState<Set<string>>(new Set());
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const lineupRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

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

  const sortedSquads = useMemo(() => {
    const order = { commander: 0, infantry: 1, armor: 2, recon: 3, artillery: 4 };
    return [...squads].sort((a, b) => order[a.type] - order[b.type]);
  }, [squads]);

  const addSquad = (type: keyof typeof SQUAD_TYPES) => {
    if (type === 'commander' && squads.some(s => s.type === 'commander')) {
      return;
    }

    const newSquad: Squad = {
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'commander' ? 'Comandante da Equipe' : `${SQUAD_TYPES[type].label} ${squads.filter(s => s.type === type).length + 1}`,
      type,
      members: [],
      role: type === 'infantry' ? 'Ataque' : undefined,
      buildNodes: false
    };
    setSquads([...squads, newSquad]);
  };

  const removeSquad = (squadId: string) => {
    setSquads(squads.filter(s => s.id !== squadId));
  };

  const updateSquadRole = (squadId: string, role: SquadRole) => {
    setSquads(squads.map(s => s.id === squadId ? { ...s, role } : s));
  };

  const toggleSquadNodes = (squadId: string) => {
    setSquads(squads.map(s => {
      if (s.id === squadId) {
        return { ...s, buildNodes: !s.buildNodes };
      }
      return s;
    }));
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedNewMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
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
    if (!selectedMemberIds.has(memberId)) {
      setSelectedNewMemberIds(prev => new Set(prev).add(memberId));
    }

    setSquads(currentSquads => {
      const cleanedSquads = currentSquads.map(s => ({
        ...s,
        members: s.members.filter(id => id !== memberId)
      }));

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

  const getMemberData = (id: string) => members.find(m => m.id === id);
  const getMemberName = (id: string) => getMemberData(id)?.playerName || 'Desconhecido';

  const ClassBadges = ({ memberId, compact = false }: { memberId: string, compact?: boolean }) => {
    const member = getMemberData(memberId);
    if (!member?.preferredClasses || member.preferredClasses.length === 0) return null;

    return (
      <div className={cn("flex flex-wrap gap-1 mt-0.5", compact ? "scale-90 origin-left" : "")}>
        {member.preferredClasses.map(cls => {
          const shortName = cls
            .replace('Comandante', 'CMD')
            .replace('Oficial', 'SL')
            .replace('Atirador Automático', 'AR')
            .replace('Anti-Tanque', 'AT')
            .replace('Atirador de Elite', 'SNI')
            .replace('Cmt de Tanque', 'TCM')
            .replace('Tripulante', 'TRI')
            .replace('Engenheiro', 'ENG')
            .replace('Metralhador', 'MG')
            .replace('Fuzileiro', 'FUZ')
            .replace('Médico', 'MED')
            .replace('Suporte', 'SUP')
            .replace('Assalto', 'ASL')
            .replace('Observador', 'OBS')
            .substring(0, 3).toUpperCase();
          return (
            <span key={cls} className="text-[8px] font-bold px-1 py-px bg-accent/20 text-accent rounded border border-accent/20 leading-none">
              {shortName}
            </span>
          );
        })}
      </div>
    );
  };

  const handleExportImage = async () => {
    if (!lineupRef.current) return;
    
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 600));

    try {
      const exportWidth = 1200;
      
      const dataUrl = await toPng(lineupRef.current, {
        cacheBust: true,
        backgroundColor: '#0a0a0a',
        width: exportWidth,
        style: {
          padding: '40px',
          margin: '0',
          width: `${exportWidth}px`,
          maxWidth: 'none',
          minWidth: `${exportWidth}px`,
        }
      });
      
      const link = document.createElement('a');
      link.download = `${matchName.replace(/\s+/g, '_')}_Lineup.png`;
      link.href = dataUrl;
      link.click();
      
      toast({ title: 'Imagem Gerada!', description: 'A escalação foi baixada com sucesso.' });
    } catch (err) {
      console.error('Export error:', err);
      toast({ variant: 'destructive', title: 'Erro ao Exportar', description: 'Não foi possível gerar a imagem da escalação.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    let text = `📋 *ESCALAÇÃO: ${matchName.toUpperCase()}*\n\n`;
    
    sortedSquads.forEach(s => {
      text += `*${s.name.toUpperCase()}*`;
      if (s.role) text += ` (${s.role})`;
      if (s.buildNodes) text += ` ⚒️`;
      text += `\n`;
      
      if (s.members.length === 0) {
        text += `- (Vazio)\n`;
      } else {
        s.members.forEach(mId => {
          const m = getMemberData(mId);
          text += `- ${m?.playerName}`;
          if (m?.preferredClasses?.length) text += ` [${m.preferredClasses.join(', ')}]`;
          text += `\n`;
        });
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copiado!', description: 'Escalação em texto copiada para a área de transferência.' });
    });
  };

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
              <CardDescription>Arraste para escalar. Estrelas indicam especialidades.</CardDescription>
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
                          <div className="flex flex-col overflow-hidden">
                            <span className={cn("truncate font-medium", isAssigned && "text-muted-foreground line-through")}>
                              {member.playerName}
                            </span>
                            <ClassBadges memberId={member.id} compact />
                          </div>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addSquad('commander')}
                    disabled={squads.some(s => s.type === 'commander')}
                    className={cn(squads.some(s => s.type === 'commander') && "opacity-50 border-primary/50 text-primary")}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Comando
                  </Button>
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
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> 
                    <span>{selectedMemberIds.size} Selecionados</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-4 w-4" /> 
                    <span>{memberAssignmentMap.size} Escalados</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wrench className="h-4 w-4 text-blue-400" /> 
                    <span className="text-blue-400">{squads.filter(s => s.buildNodes).length}/3 Equipes de Nodos</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopyText}>
                    <Copy className="mr-2 h-4 w-4" /> Copiar Texto
                  </Button>
                  <Button variant="default" size="sm" onClick={handleExportImage} disabled={isExporting}>
                    {isExporting ? <Share2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Exportar Imagem
                  </Button>
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
                    <div className="flex items-center gap-2">
                      {m.playerName}
                      <ClassBadges memberId={m.id} compact />
                    </div>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Squad Grid - Wrapper for Export */}
          <div ref={lineupRef} className="bg-background">
            {isExporting && (
              <div className="mb-8 border-b-4 border-accent/50 pb-6 px-4">
                <h2 className="text-5xl font-bold font-headline text-accent uppercase tracking-tighter">
                  ORDEM DE BATALHA: {matchName}
                </h2>
                <p className="text-lg text-muted-foreground mt-2 font-medium">Gerado via Hell Let Loose BR em {new Date().toLocaleDateString()}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-2">
              {sortedSquads.length === 0 ? (
                <div className="col-span-full h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                  <Settings2 className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Adicione pelotões acima para começar a escalação.</p>
                </div>
              ) : (
                sortedSquads.map(squad => {
                  const config = SQUAD_TYPES[squad.type];
                  const Icon = config.icon;
                  const isOver = activeDropZone === squad.id;
                  const isFull = squad.members.length >= config.max;
                  const isCommander = squad.type === 'commander';

                  return (
                    <Card 
                      key={squad.id} 
                      onDragOver={(e) => !isFull && handleDragOver(e, squad.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, squad.id)}
                      className={cn(
                        "overflow-hidden transition-all duration-200 border-accent/10 flex flex-col shadow-sm",
                        isOver && "ring-2 ring-accent scale-[1.02] shadow-lg",
                        isFull && "opacity-90",
                        isCommander && "border-primary/50 shadow-md shadow-primary/5 border-2"
                      )}
                    >
                      <CardHeader className={cn("p-4 flex flex-row items-center justify-between border-b", config.color)}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Icon className={cn("flex-shrink-0", isCommander ? "h-6 w-6" : "h-5 w-5")} />
                          <CardTitle className={cn("truncate font-headline tracking-wider uppercase", isCommander ? "text-lg" : "text-sm")}>{squad.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isCommander && (
                            <span className={cn("text-xs font-mono px-2 py-0.5 rounded font-bold", isFull ? "bg-destructive text-white" : "bg-black/20")}>
                              {squad.members.length}/{config.max}
                            </span>
                          )}
                          {!isExporting && (
                            <button onClick={() => removeSquad(squad.id)} className="hover:text-foreground opacity-70 hover:opacity-100">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 min-h-[140px] bg-card/30 flex-grow">
                        
                        {/* Infantry Specific Controls - Hide on Export */}
                        {squad.type === 'infantry' && !isExporting && (
                          <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                            <div className="flex-1">
                              <Select 
                                value={squad.role} 
                                onValueChange={(val) => updateSquadRole(squad.id, val as SquadRole)}
                              >
                                <SelectTrigger className="h-8 text-[11px] bg-background/50">
                                  <SelectValue placeholder="Missão" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map(role => (
                                    <SelectItem key={role} value={role} className="text-[11px]">{role}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              variant={squad.buildNodes ? "default" : "outline"} 
                              size="sm" 
                              className={cn(
                                "h-8 px-2 text-[11px] gap-1",
                                squad.buildNodes && "bg-blue-600 hover:bg-blue-700"
                              )}
                              onClick={() => toggleSquadNodes(squad.id)}
                              title="Equipe de Nodos"
                            >
                              <Hammer className="h-3 w-3" />
                              {squad.buildNodes && <span>NODOS</span>}
                            </Button>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {squad.members.map(mId => (
                            <div key={mId} className={cn(
                              "flex items-center justify-between p-2 rounded text-sm transition-colors",
                              isCommander ? "bg-primary/10 border border-primary/20 text-primary-foreground font-bold text-base" : "bg-muted/50"
                            )}>
                              <div className="flex flex-col overflow-hidden flex-1">
                                <span className="truncate font-medium">{getMemberName(mId)}</span>
                                <ClassBadges memberId={mId} />
                              </div>
                              {!isExporting && (
                                <button onClick={() => removeMemberFromSquad(mId, squad.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-2">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          {squad.members.length === 0 && !isOver && (
                            <div className="h-20 flex flex-col items-center justify-center text-[11px] text-muted-foreground/50 italic border border-dashed border-muted-foreground/20 rounded">
                              {isCommander ? "Arraste o Comandante aqui" : "Arraste um jogador aqui"}
                            </div>
                          )}
                          {isOver && (
                            <div className="h-10 animate-pulse bg-accent/20 border border-accent border-dashed rounded flex items-center justify-center text-[11px] text-accent font-bold">
                              SOLTE PARA ESCALAR
                            </div>
                          )}
                        </div>
                      </CardContent>
                      
                      {/* Squad Footer with metadata - Always visible on export */}
                      {(squad.role || squad.buildNodes || isCommander) && (
                        <div className={cn(
                          "px-4 py-2 border-t border-border/30 flex justify-between items-center",
                          isCommander ? "bg-primary/15 border-primary/20" : "bg-muted/40"
                        )}>
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            isCommander ? "text-primary flex-1 text-center" : "text-foreground"
                          )}>
                            {isCommander ? "★ LIDERANÇA SUPREMA ★" : squad.role}
                          </span>
                          {!isCommander && squad.buildNodes && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-blue-400">NODOS</span>
                              <Wrench className="h-4 w-4 text-blue-400" />
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
