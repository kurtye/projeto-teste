'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { PlayerAggregates } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Users, Sword, Shield, Crosshair, HeartPulse, Trophy, Activity, Loader2 } from 'lucide-react';
import { Archetype, getArchetype } from './ClanIntelligenceDashboard';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getClanMemberAggregates } from '../../../actions';

import { saveLineup } from '../../../actions';
import { useToast } from '@/hooks/use-toast';
import { Copy, Save, Share2, ExternalLink } from 'lucide-react';

export interface LineupBuilderProps {
  members?: any[];
  isLoading?: boolean;
  clanId: string;
}

export type SquadType = 'B1' | 'B2' | 'B3' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'FE' | 'FD' | 'DC' | 'DR' | 'T1' | 'T2' | 'Comando' | 'Artilharia' | 'Unassigned';

export interface ClanMember {
  id: string; 
  playerName: string;
  category: string;
  isCustom: boolean; 
  totalScore: number;
  hoursPlayed: number;
  primaryRole: Archetype; 
  playstyle: ReturnType<typeof getArchetype>;
  atkScoreHr: number;
  defScoreHr: number;
  totScoreHr: number;
  squad: SquadType;
  isOfficer: boolean;
}

const SQUAD_NAMES: Record<SquadType, string> = {
  Comando: 'Comando',
  Artilharia: 'Artilharia',
  T1: 'Tanque 1 (T1)',
  T2: 'Tanque 2 (T2)',
  B1: 'Batedores (B1)',
  B2: 'Batedores (B2)',
  B3: 'Batedores (B3)',
  FE: 'Flanco Esq (FE)',
  FD: 'Flanco Dir (FD)',
  L1: 'Linha 1 (L1)',
  L2: 'Linha 2 (L2)',
  L3: 'Linha 3 (L3)',
  L4: 'Linha 4 (L4)',
  L5: 'Linha 5 (L5)',
  DC: 'Defesa Central (DC)',
  DR: 'Defesa Retaguarda (DR)',
  Unassigned: 'Reservas'
};

export function LineupBuilder({ clanId }: LineupBuilderProps) {
  const [inputText, setInputText] = useState('');
  const [squadMembers, setSquadMembers] = useState<ClanMember[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyToWhatsApp = () => {
    let text = `📋 *Escalação Oficial*\n\n`;

    const orderedSquads: SquadType[] = [
      'Comando', 'Artilharia', 'T1', 'T2', 'B1', 'B2', 'B3', 
      'FE', 'FD', 'L1', 'L2', 'L3', 'L4', 'L5', 'DC', 'DR'
    ];

    orderedSquads.forEach(sq => {
      const members = squadMembers.filter(m => m.squad === sq);
      if (members.length === 0) return;

      members.sort((a, b) => (a.isOfficer === b.isOfficer) ? 0 : a.isOfficer ? -1 : 1);
      
      text += `*${SQUAD_NAMES[sq]}*\n`;
      members.forEach(m => {
        const ofcTag = m.isOfficer ? ' (OFC)' : '';
        text += `${m.playerName}${ofcTag}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiado!",
        description: "Escalação copiada para a área de transferência. Agora é só colar no WhatsApp.",
      });
    });
  };

  const handleSaveLineup = async () => {
    setIsSaving(true);
    
    // Format data to save
    const orderedSquads: SquadType[] = [
      'Comando', 'Artilharia', 'T1', 'T2', 'B1', 'B2', 'B3', 
      'FE', 'FD', 'L1', 'L2', 'L3', 'L4', 'L5', 'DC', 'DR'
    ];
    
    const squadsData: any = {};
    orderedSquads.forEach(sq => {
      const members = squadMembers.filter(m => m.squad === sq);
      if (members.length > 0) {
        members.sort((a, b) => (a.isOfficer === b.isOfficer) ? 0 : a.isOfficer ? -1 : 1);
        squadsData[sq] = members.map(m => ({
          playerName: m.playerName,
          isOfficer: m.isOfficer,
          arch: m.primaryRole,
          isCustom: m.isCustom
        }));
      }
    });

    const result = await saveLineup(clanId, `Escalação ${new Date().toLocaleDateString()}`, squadsData);
    if (result.success && result.id) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/lineup/${result.id}`;
      setSavedLink(link);
      toast({
        title: "Escalação Salva!",
        description: "O link público foi gerado com sucesso.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a escalação.",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  // Intelligence Data
  const [players, setPlayers] = useState<(PlayerAggregates & { totalScore: number; hoursPlayed: number })[]>([]);
  const [isFetching, startFetching] = useTransition();

  useEffect(() => {
    startFetching(async () => {
      const result = await getClanMemberAggregates(clanId);
      if (result.success && result.players) {
        const enhanced = result.players.map(p => {
          const totalScore = (p.totalCombat || 0) + (p.totalOffense || 0) + (p.totalDefense || 0) + (p.totalSupport || 0);
          return {
            ...p,
            totalScore,
            hoursPlayed: (p.totalTimeSeconds || 0) / 3600,
          };
        });
        setPlayers(enhanced);
      }
    });
  }, [clanId]);

  const averages = useMemo(() => {
    if (!players.length) return { c: 1, o: 1, d: 1, s: 1 };
    return {
      c: players.reduce((sum, p) => sum + (p.totalCombat || 0), 0) / players.length,
      o: players.reduce((sum, p) => sum + (p.totalOffense || 0), 0) / players.length,
      d: players.reduce((sum, p) => sum + (p.totalDefense || 0), 0) / players.length,
      s: players.reduce((sum, p) => sum + (p.totalSupport || 0), 0) / players.length,
    };
  }, [players]);

  const handleParseAndGenerate = () => {
    const lines = inputText.split('\n');
    let currentCategory = 'Soldados';
    const parsedMembers: ClanMember[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.toLowerCase().includes('soldados')) { currentCategory = 'Soldados'; continue; }
      if (trimmed.toLowerCase().includes('blindados')) { currentCategory = 'Blindados'; continue; }
      if (trimmed.toLowerCase().includes('oficiais')) { currentCategory = 'Oficiais'; continue; }
      if (trimmed.toLowerCase().includes('comando')) { currentCategory = 'Comando'; continue; }
      if (trimmed.toLowerCase().includes('artilharia')) { currentCategory = 'Artilharia'; continue; }

      let rawName = trimmed.replace(/ocl\s*-\s*/i, '').replace(/ocl\s*/i, '').trim();
      if (!rawName) continue;

      const found = players.find(p => p.latestPlayerName.toLowerCase().includes(rawName.toLowerCase()));
      const playstyle = found ? getArchetype(found, averages) : { name: 'Desconhecido' as Archetype, icon: Users, color: 'text-gray-500', desc: '' };
      
      parsedMembers.push({
        id: found ? found.id : `custom-${rawName}-${Math.random()}`,
        playerName: found ? found.latestPlayerName : rawName,
        category: currentCategory,
        isCustom: !found,
        totalScore: found ? found.totalScore : 0,
        hoursPlayed: found ? found.hoursPlayed : 0,
        primaryRole: playstyle.name,
        playstyle,
        atkScoreHr: found && found.hoursPlayed > 0 ? ((found.totalOffense || 0) + (found.totalCombat || 0)) / found.hoursPlayed : 0,
        defScoreHr: found && found.hoursPlayed > 0 ? ((found.totalDefense || 0) + (found.totalSupport || 0)) / found.hoursPlayed : 0,
        totScoreHr: found && found.hoursPlayed > 0 ? found.totalScore / found.hoursPlayed : 0,
        squad: 'Unassigned',
        isOfficer: currentCategory === 'Oficiais' || currentCategory === 'Comando'
      });
    }

    // Auto-fill Algorithm
    const newMembers = [...parsedMembers];

    const getBest = (pool: ClanMember[], sortBy: 'atkScoreHr' | 'defScoreHr' | 'totScoreHr', count: number) => {
      return [...pool].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, count);
    };

    // 1. Comando e Artilharia
    const comandoTarget = newMembers.find(m => m.category === 'Comando');
    if (comandoTarget) comandoTarget.squad = 'Comando';

    const artiTarget = newMembers.find(m => m.category === 'Artilharia');
    if (artiTarget) artiTarget.squad = 'Artilharia';

    // 2. Tanques
    const blindados = newMembers.filter(m => m.category === 'Blindados' && m.squad === 'Unassigned');
    const bestTanks = getBest(blindados, 'totScoreHr', 6);
    bestTanks.forEach((m, idx) => { m.squad = idx < 3 ? 'T1' : 'T2'; });

    // --- PRIORIDADE MÁXIMA: ESPECIALISTAS DE DEFESA E ATAQUE --- //

    // 3. Oficiais: Distribuir os Oficiais de forma inteligente
    const oficiais = newMembers.filter(m => m.category === 'Oficiais' && m.squad === 'Unassigned');
    
    // 3.1 Oficiais de Defesa (DC, DR)
    ['DC', 'DR'].forEach(sq => {
      const pool = oficiais.filter(m => m.squad === 'Unassigned');
      const bestOFC = getBest(pool, 'defScoreHr', 1)[0];
      if (bestOFC) bestOFC.squad = sq as SquadType;
    });

    // 3.2 Oficiais Batedores (B1, B2, B3)
    ['B1', 'B2', 'B3'].forEach(sq => {
      const pool = oficiais.filter(m => m.squad === 'Unassigned');
      const bestOFC = getBest(pool, 'atkScoreHr', 1)[0];
      if (bestOFC) bestOFC.squad = sq as SquadType;
    });

    // 3.3 Oficiais Restantes para Linhas e Flancos
    const remainingInfSquads: SquadType[] = ['FE', 'FD', 'L1', 'L2', 'L3', 'L4', 'L5'];
    oficiais.filter(m => m.squad === 'Unassigned').forEach((ofc, idx) => {
      if (idx < remainingInfSquads.length) {
        ofc.squad = remainingInfSquads[idx];
      }
    });

    // 4. Soldados Especialistas (Defesa e Ataque)
    // 4.1 Soldados Defesa (DC, DR)
    ['DC', 'DR'].forEach(sq => {
      const bestDef = getBest(newMembers.filter(m => m.squad === 'Unassigned' && !m.isOfficer && m.category !== 'Blindados'), 'defScoreHr', 1)[0];
      if (bestDef) bestDef.squad = sq as SquadType;
    });

    // 4.2 Soldados Batedores (B1, B2, B3)
    ['B1', 'B2', 'B3'].forEach(sq => {
      const bestAtk = getBest(newMembers.filter(m => m.squad === 'Unassigned' && !m.isOfficer && m.category !== 'Blindados'), 'atkScoreHr', 1)[0];
      if (bestAtk) bestAtk.squad = sq as SquadType;
    });

    // 5. Promoção de Soldados (Se faltou Oficial em algum squad, promovemos os melhores soldados globais)
    const allInfSquads: SquadType[] = ['DC', 'DR', 'B1', 'B2', 'B3', 'FE', 'FD', 'L1', 'L2', 'L3', 'L4', 'L5'];
    const squadsWithoutOfficer = allInfSquads.filter(sq => !newMembers.some(m => m.squad === sq && m.isOfficer));
    
    squadsWithoutOfficer.forEach(sq => {
      const pool = newMembers.filter(m => m.squad === 'Unassigned' && m.category !== 'Comando' && m.category !== 'Artilharia' && m.category !== 'Blindados');
      const promoSoldier = getBest(pool, 'totScoreHr', 1)[0];
      if (promoSoldier) {
        promoSoldier.squad = sq;
        promoSoldier.isOfficer = true;
      }
    });

    // 6. Preencher Restante (Flancos e Linhas)
    ['FE', 'FD'].forEach(sq => {
      const bestFlex = getBest(newMembers.filter(m => m.squad === 'Unassigned' && !m.isOfficer), 'totScoreHr', 1)[0];
      if (bestFlex) bestFlex.squad = sq as SquadType;
    });

    ['L1', 'L5'].forEach(sq => {
      const sol = getBest(newMembers.filter(m => m.squad === 'Unassigned' && !m.isOfficer), 'totScoreHr', 1)[0];
      if (sol) sol.squad = sq as SquadType;
    });

    ['L2', 'L3', 'L4'].forEach(sq => {
      const sols = getBest(newMembers.filter(m => m.squad === 'Unassigned' && !m.isOfficer), 'totScoreHr', 2);
      sols.forEach(sol => { sol.squad = sq as SquadType; });
    });

    setSquadMembers(newMembers);
    setIsGenerated(true);
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    setDraggedMemberId(memberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquad: SquadType) => {
    e.preventDefault();
    if (!draggedMemberId) return;

    setSquadMembers(prev => prev.map(m => {
      if (m.id === draggedMemberId) {
        return { ...m, squad: targetSquad };
      }
      return m;
    }));
    setDraggedMemberId(null);
  };

  const renderSquad = (title: string, squadId: SquadType, maxSlots: number) => {
    const members = squadMembers.filter(m => m.squad === squadId);
    members.sort((a, b) => (a.isOfficer === b.isOfficer) ? 0 : a.isOfficer ? -1 : 1);

    return (
      <Card 
        className={cn("bg-card/50 transition-colors", draggedMemberId && "border-accent/50 border-dashed")}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, squadId)}
      >
        <CardHeader className="py-2 px-3 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xs flex justify-between items-center">
            <span>{title}</span>
            <span className={cn("text-xs font-mono", members.length > maxSlots ? "text-red-500 font-bold" : "text-muted-foreground")}>
              {members.length}/{maxSlots}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1 min-h-[60px]">
          {members.map(m => (
            <div 
              key={m.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, m.id)}
              className={cn(
                "flex items-center justify-between p-1.5 rounded bg-background border text-xs cursor-grab active:cursor-grabbing hover:border-accent/50",
                m.isOfficer ? "border-accent/30" : "border-border/50"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <m.playstyle.icon className={cn("h-3 w-3 shrink-0", m.playstyle.color)} />
                <span className={cn("truncate", m.isOfficer && "font-bold text-accent")}>
                  {m.playerName} {m.isCustom && <span className="text-[10px] text-red-500" title="Sem dados">(?)</span>}
                </span>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-2 italic opacity-50">Vazio</div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isFetching && !players.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
        <p className="text-muted-foreground">Carregando banco de inteligência...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
          <Brain className="text-accent h-6 w-6" />
          Gerador de Escalação (Lineup Builder)
        </h2>
        <p className="text-muted-foreground text-sm">
          Cole a lista de confirmados. A inteligência artificial usará os dados de combate para montar a escalação sugerida.
        </p>
      </div>

      {!isGenerated ? (
        <Card className="bg-card/50">
          <CardContent className="pt-6 space-y-4">
            <Textarea 
              placeholder="Cole a lista de presenças aqui (ex: Soldados: \n OCL - Nome...)" 
              className="min-h-[300px] font-mono text-sm"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <Button onClick={handleParseAndGenerate} className="w-full" size="lg" disabled={!inputText.trim()}>
              <Brain className="mr-2 h-5 w-5" />
              Analisar Eficiência e Gerar Escalação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/30 p-4 rounded-lg border border-border gap-4">
            <div className="text-sm">
              <span className="font-bold text-accent">{squadMembers.length}</span> jogadores processados. 
              <br className="sm:hidden" />
              Arraste e solte os cards para ajustar os esquadrões.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsGenerated(false)}>Nova Lista</Button>
              <Button variant="secondary" size="sm" onClick={handleCopyToWhatsApp}>
                <Copy className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button size="sm" onClick={handleSaveLineup} disabled={isSaving}>
                {isSaving ? <Activity className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Escalação
              </Button>
            </div>
          </div>

          {savedLink && (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-green-500">Escalação Salva com Sucesso!</span>
                <span className="text-xs text-muted-foreground">Compartilhe este link com seu clã:</span>
                <a href={savedLink} target="_blank" rel="noreferrer" className="text-sm font-mono text-accent hover:underline flex items-center gap-1 mt-1">
                  {savedLink} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(savedLink)}>
                <Share2 className="h-4 w-4 mr-2" /> Copiar Link
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
            
            {/* LEFT PANE: Reservas */}
            <div className="xl:col-span-1 space-y-4">
              <h3 className="font-bold text-muted-foreground flex items-center gap-2 uppercase text-sm tracking-wider">
                <Users className="h-4 w-4" /> Não Alocados
              </h3>
              {renderSquad('Disponíveis', 'Unassigned', 50)}
            </div>

            {/* RIGHT PANE: BOARD */}
            <div className="xl:col-span-3 space-y-6">
              
              {/* Liderança */}
              <div>
                <h3 className="font-bold text-accent mb-3 uppercase text-sm tracking-wider">Comando & Suporte</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {renderSquad('Comandante', 'Comando', 1)}
                  {renderSquad('Artilharia', 'Artilharia', 1)}
                  {renderSquad('Tanque 1 (T1)', 'T1', 3)}
                  {renderSquad('Tanque 2 (T2)', 'T2', 3)}
                </div>
              </div>

              {/* Tropa de Choque */}
              <div>
                <h3 className="font-bold text-red-500 mb-3 uppercase text-sm tracking-wider">Batedores & Flancos</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {renderSquad('Batedor 1 (B1)', 'B1', 2)}
                  {renderSquad('Batedor 2 (B2)', 'B2', 2)}
                  {renderSquad('Batedor 3 (B3)', 'B3', 2)}
                  {renderSquad('Flanco Esq (FE)', 'FE', 2)}
                  {renderSquad('Flanco Dir (FD)', 'FD', 2)}
                </div>
              </div>

              {/* Linhas */}
              <div>
                <h3 className="font-bold text-blue-400 mb-3 uppercase text-sm tracking-wider">Linhas de Frente</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {renderSquad('Linha 1 (L1)', 'L1', 2)}
                  {renderSquad('Linha 2 (L2)', 'L2', 3)}
                  {renderSquad('Linha 3 (L3)', 'L3', 3)}
                  {renderSquad('Linha 4 (L4)', 'L4', 3)}
                  {renderSquad('Linha 5 (L5)', 'L5', 2)}
                </div>
              </div>

              {/* Defesa */}
              <div>
                <h3 className="font-bold text-yellow-500 mb-3 uppercase text-sm tracking-wider">Defesa de Ponto</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {renderSquad('Defesa Central (DC)', 'DC', 2)}
                  {renderSquad('Retaguarda (DR)', 'DR', 2)}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
