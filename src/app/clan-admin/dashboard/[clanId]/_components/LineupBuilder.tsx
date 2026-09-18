'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { PlayerAggregates } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Users, Sword, Shield, Crosshair, HeartPulse, Loader2, Copy, Save, Share2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClanMonthlyAggregates, saveLineup } from '../../../actions';
import { format, subMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Archetype = 'Ceifador' | 'Ponta de Lança' | 'Muralha' | 'Altruísta' | 'Generalista' | 'Desconhecido';

export function getArchetype(p: PlayerAggregates, averages: { c: number, o: number, d: number, s: number }): { name: Archetype; icon: any; color: string; desc: string } {
  const combat = p.totalCombat || 0;
  const offense = p.totalOffense || 0;
  const defense = p.totalDefense || 0;
  const support = p.totalSupport || 0;
  const total = combat + offense + defense + support;

  if (total === 0) return { name: 'Desconhecido', icon: Users, color: 'text-gray-500', desc: 'Sem dados suficientes' };

  const avgC = averages.c || 1;
  const avgO = averages.o || 1;
  const avgD = averages.d || 1;
  const avgS = averages.s || 1;

  const relC = combat / avgC;
  const relO = offense / avgO;
  const relD = defense / avgD;
  const relS = support / avgS;

  const maxRel = Math.max(relC, relO, relD, relS);

  if (maxRel < 1.15) return { name: 'Generalista', icon: Users, color: 'text-blue-400', desc: 'Equilibrado com a média do clã' };
  
  if (relO === maxRel) return { name: 'Ponta de Lança', icon: Sword, color: 'text-red-500', desc: 'Acima da média em Ataque' };
  if (relC === maxRel) return { name: 'Ceifador', icon: Crosshair, color: 'text-purple-500', desc: 'Acima da média em Combate' };
  if (relS === maxRel) return { name: 'Altruísta', icon: HeartPulse, color: 'text-green-500', desc: 'Acima da média em Suporte' };
  return { name: 'Muralha', icon: Shield, color: 'text-yellow-500', desc: 'Acima da média em Defesa' };
}

export type StrategyType = 'Equilibrado' | 'Defesa' | 'Ataque' | 'Flancos';
export type SquadIntent = 'Ataque' | 'Defesa' | 'Flanco' | 'Equilibrado' | 'Tanque' | 'Artilharia' | 'Comando' | 'Reserva';

export interface SquadDefinition {
  id: string;
  name: string;
  maxSlots: number;
  intent: SquadIntent;
}

export interface ClanMember {
  id: string; 
  playerName: string;
  category: string;
  isCustom: boolean; 
  totalScore: number;
  hoursPlayed: number;
  primaryRole: Archetype; 
  playstyle: ReturnType<typeof getArchetype>;
  elo: number;
  atkScore: number;
  defScore: number;
  totScore: number;
  ofcScore: number;
  tankScore: number;
  artiScore: number;
  squad: string;
  isOfficer: boolean;
}

export interface LineupBuilderProps {
  clanId: string;
}

export function LineupBuilder({ clanId }: LineupBuilderProps) {
  // Settings State
  const [matchSize, setMatchSize] = useState<number>(35);
  const [artillerySize, setArtillerySize] = useState<number>(3);
  const [tankSquadsCount, setTankSquadsCount] = useState<number>(2);
  const [tankSquadSize, setTankSquadSize] = useState<number>(3);
  const [infantrySquadSize, setInfantrySquadSize] = useState<number>(6);
  const [strategy, setStrategy] = useState<StrategyType>('Equilibrado');
  const [period, setPeriod] = useState<'current' | '3months'>('3months');

  const [inputText, setInputText] = useState('');
  const [squads, setSquads] = useState<SquadDefinition[]>([]);
  const [squadMembers, setSquadMembers] = useState<ClanMember[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const { toast } = useToast();

  const [players, setPlayers] = useState<any[]>([]);
  const [isFetching, startFetching] = useTransition();

  useEffect(() => {
    startFetching(async () => {
      const now = new Date();
      const currentMonthStr = format(now, 'yyyy-MM');
      
      const periodsToFetch = [`month_${currentMonthStr}`];
      
      if (period === '3months') {
        const lastMonthStr = format(subMonths(now, 1), 'yyyy-MM');
        const twoMonthsAgoStr = format(subMonths(now, 2), 'yyyy-MM');
        periodsToFetch.push(`month_${lastMonthStr}`, `month_${twoMonthsAgoStr}`);
      }

      const result = await getClanMonthlyAggregates(clanId, periodsToFetch);
      if (result.success && result.players) {
        const enhanced = result.players.map(p => {
          const totalScore = (p.totalCombat || 0) + (p.totalOffense || 0) + (p.totalDefense || 0) + (p.totalSupport || 0);
          return {
            ...p,
            latestPlayerName: p.playerName, // getClanMonthlyAggregates uses playerName instead of latestPlayerName
            totalScore,
            hoursPlayed: (p.totalTimeSeconds || 0) / 3600,
          };
        });
        setPlayers(enhanced);
      }
    });
  }, [clanId, period]);

  const averages = useMemo(() => {
    if (!players.length) return { c: 1, o: 1, d: 1, s: 1, elo: 0 };
    return {
      c: players.reduce((sum, p) => sum + (p.totalCombat || 0), 0) / players.length,
      o: players.reduce((sum, p) => sum + (p.totalOffense || 0), 0) / players.length,
      d: players.reduce((sum, p) => sum + (p.totalDefense || 0), 0) / players.length,
      s: players.reduce((sum, p) => sum + (p.totalSupport || 0), 0) / players.length,
      elo: players.reduce((sum, p) => sum + (p.elo || 0), 0) / players.length,
    };
  }, [players]);

    const handleParseAndGenerate = () => {
    const lines = inputText.split('\n');
    let currentCategory = 'Soldados';
    const parsedMembersMap = new Map<string, ClanMember>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.toLowerCase().includes('soldados')) { currentCategory = 'Soldados'; continue; }
      if (trimmed.toLowerCase().includes('blindados') || trimmed.toLowerCase().includes('tanques')) { currentCategory = 'Blindados'; continue; }
      if (trimmed.toLowerCase().includes('oficiais')) { currentCategory = 'Oficiais'; continue; }
      if (trimmed.toLowerCase().includes('comando')) { currentCategory = 'Comando'; continue; }
      if (trimmed.toLowerCase().includes('artilharia')) { currentCategory = 'Artilharia'; continue; }

      let rawName = trimmed.replace(/ocl\s*-\s*/i, '').replace(/ocl\s*/i, '').trim();
      let isExplicitOfficer = false;
      if (rawName.toLowerCase().includes('(ofc)')) {
          isExplicitOfficer = true;
          rawName = rawName.replace(/\(ofc\)/i, '').trim();
      }

      if (!rawName) continue;

      const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedRaw = normalizeName(rawName);

      // Deduplication check
      if (parsedMembersMap.has(normalizedRaw)) {
          // If already in list, just upgrade to officer if needed, or keep first occurrence category
          const existing = parsedMembersMap.get(normalizedRaw)!;
          if (isExplicitOfficer || currentCategory === 'Oficiais' || currentCategory === 'Comando') {
              existing.isOfficer = true;
          }
          if (currentCategory !== 'Soldados') {
              existing.category = currentCategory;
          }
          continue;
      }

      // Match robusto ignorando _, -, espaços, etc.
      const found = players.find(p => {
          const normalizedDb = normalizeName(p.latestPlayerName);
          
          // Remove a tag HRB para comparar só o nick se ambos tiverem
          const rawNick = normalizedRaw.replace(/^hrb/, '');
          const dbNick = normalizedDb.replace(/^hrb/, '');
          
          if (rawNick && dbNick) {
             return dbNick === rawNick;
          }
          
          return normalizedDb === normalizedRaw;
      });
      const playstyle = found ? getArchetype(found, averages) : { name: 'Desconhecido' as Archetype, icon: Users, color: 'text-gray-500', desc: '' };
      
      const hrs = found && found.hoursPlayed > 0 ? found.hoursPlayed : 1;
      const elo = found?.elo || averages.elo || 0;
      
      // Calculate specific scores per hour
      const defScoreHr = found ? ((found.totalDefense || 0) * 1.5 + (found.totalSupport || 0) * 1.2) / hrs : 0;
      const atkScoreHr = found ? ((found.totalOffense || 0) * 1.5 + (found.totalCombat || 0) * 0.8) / hrs : 0;
      const totScoreHr = found ? ((found.totalScore || 0) / hrs) : 0;
      
      // officer score based on time played as Officer (0) and Commander (13)
      const ofcTime = found ? ((found as any).timePlayedByRole?.[0] || 0) + ((found as any).timePlayedByRole?.[13] || 0) : 0;
      const tankTime = found ? ((found as any).timePlayedByRole?.[11] || 0) + ((found as any).timePlayedByRole?.[12] || 0) : 0; // TankCommander(11), Crewman(12)
      const artiTime = found ? ((found as any).timePlayedByRole?.[14] || 0) + ((found as any).timePlayedByRole?.[15] || 0) : 0;

      parsedMembersMap.set(normalizedRaw, {
        id: found ? found.id : `custom-${rawName}-${Math.random()}`,
        playerName: found ? found.latestPlayerName : rawName,
        category: currentCategory,
        isCustom: !found,
        totalScore: found ? found.totalScore : 0,
        hoursPlayed: found ? found.hoursPlayed : 0,
        primaryRole: playstyle.name,
        playstyle,
        elo,
        atkScore: atkScoreHr + (elo * 0.1),
        defScore: defScoreHr + (elo * 0.1),
        totScore: totScoreHr + (elo * 0.1),
        ofcScore: ofcTime,
        tankScore: tankTime,
        artiScore: artiTime,
        squad: 'Reservas',
        isOfficer: isExplicitOfficer || currentCategory === 'Oficiais' || currentCategory === 'Comando'
      });
    }

    const parsedMembers = Array.from(parsedMembersMap.values());

    // Generate Squads Structure
    const newSquads: SquadDefinition[] = [];
    newSquads.push({ id: 'Comando', name: 'Comando', maxSlots: 1, intent: 'Comando' });
    
    if (artillerySize > 0) {
      newSquads.push({ id: 'Artilharia', name: 'Artilharia', maxSlots: artillerySize, intent: 'Artilharia' });
    }

    for (let i = 1; i <= tankSquadsCount; i++) {
      newSquads.push({ id: `T${i}`, name: `Tanque ${i} (T${i})`, maxSlots: tankSquadSize, intent: 'Tanque' });
    }

    const tanksTotal = tankSquadsCount * tankSquadSize;
    const remainingSlots = matchSize - 1 - artillerySize - tanksTotal;
    const numInfantrySquads = Math.max(1, Math.ceil(remainingSlots / infantrySquadSize));

    for (let i = 1; i <= numInfantrySquads; i++) {
        let intent: SquadIntent = 'Equilibrado';
        
        if (strategy === 'Defesa') {
            if (i <= Math.ceil(numInfantrySquads * 0.4)) intent = 'Defesa';
            else if (i <= Math.ceil(numInfantrySquads * 0.7)) intent = 'Ataque';
            else intent = 'Flanco';
        } else if (strategy === 'Ataque') {
            if (i <= Math.ceil(numInfantrySquads * 0.5)) intent = 'Ataque';
            else if (i <= Math.ceil(numInfantrySquads * 0.8)) intent = 'Defesa';
            else intent = 'Flanco';
        } else if (strategy === 'Flancos') {
            if (i <= Math.ceil(numInfantrySquads * 0.4)) intent = 'Flanco';
            else if (i <= Math.ceil(numInfantrySquads * 0.7)) intent = 'Ataque';
            else intent = 'Defesa';
        }
        
        const prefix = intent === 'Defesa' ? 'DC' : intent === 'Ataque' ? 'ATK' : intent === 'Flanco' ? 'FLK' : 'INF';
        newSquads.push({ id: `${prefix}-${i}`, name: `${intent} ${i}`, maxSlots: infantrySquadSize, intent });
    }
    newSquads.push({ id: 'Reservas', name: 'Reservas', maxSlots: 999, intent: 'Reserva' });
    setSquads(newSquads);

    // Distribution
    const members = [...parsedMembers];
    
    const assignToSquad = (member: ClanMember, squadId: string, asOfficer: boolean = false) => {
        member.squad = squadId;
        if (asOfficer) member.isOfficer = true;
    };

    const getAvailable = () => members.filter(m => m.squad === 'Reservas');

    // 1. Comando
    const cmdCandidates = getAvailable().filter(m => m.category === 'Comando');
    if (cmdCandidates.length > 0) {
        assignToSquad(cmdCandidates[0], 'Comando', true);
    } else {
        const bestCmd = [...getAvailable()].sort((a,b) => b.ofcScore - a.ofcScore)[0];
        if (bestCmd) assignToSquad(bestCmd, 'Comando', true);
    }

    // 2. Artilharia
    const artSquad = newSquads.find(s => s.id === 'Artilharia');
    if (artSquad) {
        let pool = getAvailable().filter(m => m.category === 'Artilharia');
        if (pool.length < artSquad.maxSlots) {
             const others = getAvailable().filter(m => m.category !== 'Artilharia').sort((a,b) => b.artiScore - a.artiScore);
             pool = [...pool, ...others];
        }
        for (let i = 0; i < Math.min(pool.length, artSquad.maxSlots); i++) {
            assignToSquad(pool[i], 'Artilharia');
        }
    }

    // 3. Tanques
    const tankSquads = newSquads.filter(s => s.id.startsWith('T'));
    if (tankSquads.length > 0) {
        const totalTankSlots = tankSquads.reduce((sum, s) => sum + s.maxSlots, 0);
        
        let tankPool = getAvailable().filter(m => m.category === 'Blindados');
        if (tankPool.length < totalTankSlots) {
             const others = getAvailable().filter(m => m.category !== 'Blindados').sort((a,b) => b.tankScore - a.tankScore);
             tankPool = [...tankPool, ...others.slice(0, totalTankSlots - tankPool.length)];
        } else {
             tankPool = tankPool.slice(0, totalTankSlots); // Trim if there are too many explicit tankers
        }
        
        // Sort all selected tank players by tankScore descending to ensure best tankers are officers and squads are balanced
        tankPool.sort((a,b) => b.tankScore - a.tankScore);
        
        let currentTankIdx = 0;
        let tankDirection = 1;
        
        for (let i = 0; i < tankPool.length; i++) {
            const squad = tankSquads[currentTankIdx];
            const isOfficer = i < tankSquads.length; // The first person placed in each squad is the officer
            
            assignToSquad(tankPool[i], squad.id, isOfficer);
            
            currentTankIdx += tankDirection;
            if (currentTankIdx >= tankSquads.length) {
                currentTankIdx = tankSquads.length - 1;
                tankDirection = -1;
            } else if (currentTankIdx < 0) {
                currentTankIdx = 0;
                tankDirection = 1;
            }
        }
    }

    // 4. Infantry Officers
    const infSquads = newSquads.filter(s => s.intent !== 'Comando' && s.intent !== 'Tanque' && s.intent !== 'Artilharia' && s.intent !== 'Reserva');
    infSquads.forEach(sq => {
        let pool = getAvailable();
        const designatedOfc = pool.find(m => m.category === 'Oficiais' || m.isOfficer);
        if (designatedOfc) {
            assignToSquad(designatedOfc, sq.id, true);
        } else {
            const fallback = [...pool].sort((a,b) => b.ofcScore - a.ofcScore)[0];
            if (fallback) assignToSquad(fallback, sq.id, true);
        }
    });

    // 5. Fill Infantry Squads
    infSquads.forEach(sq => {
        const currMembers = members.filter(m => m.squad === sq.id);
        const needed = sq.maxSlots - currMembers.length;
        if (needed <= 0) return;

        let pool = getAvailable();
        if (sq.intent === 'Defesa') pool.sort((a,b) => b.defScore - a.defScore);
        else if (sq.intent === 'Ataque') pool.sort((a,b) => b.atkScore - a.atkScore);
        else pool.sort((a,b) => b.totScore - a.totScore);

        for (let j = 0; j < Math.min(needed, pool.length); j++) {
            assignToSquad(pool[j], sq.id, false);
        }
    });

    setSquadMembers(members);
    setIsGenerated(true);
  };

  const handleCopyToWhatsApp = () => {
    let text = `📋 *Escalação Oficial*\n\n`;

    squads.forEach(sq => {
      if (sq.intent === 'Reserva') return;
      const members = squadMembers.filter(m => m.squad === sq.id);
      if (members.length === 0) return;

      members.sort((a, b) => (a.isOfficer === b.isOfficer) ? 0 : a.isOfficer ? -1 : 1);
      
      text += `*${sq.name}*\n`;
      members.forEach(m => {
        const ofcTag = m.isOfficer ? ' (OFC)' : '';
        text += `${m.playerName}${ofcTag}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copiado!", description: "Escalação copiada para a área de transferência." });
    });
  };

  const handleSaveLineup = async () => {
    setIsSaving(true);
    const squadsData: any = {};
    squads.forEach(sq => {
      const members = squadMembers.filter(m => m.squad === sq.id);
      if (members.length > 0) {
        members.sort((a, b) => (a.isOfficer === b.isOfficer) ? 0 : a.isOfficer ? -1 : 1);
        squadsData[sq.id] = members.map(m => ({
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
      toast({ title: "Escalação Salva!", description: "O link público foi gerado com sucesso." });
    } else {
      toast({ title: "Erro", description: "Não foi possível salvar a escalação.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    setDraggedMemberId(memberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquad: string) => {
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

  const renderSquad = (sq: SquadDefinition) => {
    const members = squadMembers.filter(m => m.squad === sq.id);
    members.sort((a, b) => (a.isOfficer === b.isOfficer) ? 0 : a.isOfficer ? -1 : 1);

    const totSquadScore = members.reduce((sum, m) => sum + (m.totScore * (m.hoursPlayed || 1)), 0);

    let IntentIcon = Users;
    if (sq.intent === 'Defesa') IntentIcon = Shield;
    if (sq.intent === 'Ataque') IntentIcon = Sword;
    if (sq.intent === 'Flanco') IntentIcon = Crosshair;
    
    return (
      <Card 
        key={sq.id}
        className={cn("bg-card/50 transition-colors flex flex-col", draggedMemberId && "border-accent/50 border-dashed")}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, sq.id)}
      >
        <CardHeader className="py-2 px-3 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-sm flex justify-between items-center">
            <div className="flex items-center gap-2">
              <IntentIcon className={cn("w-4 h-4", sq.intent === 'Defesa' ? "text-yellow-500" : sq.intent === 'Ataque' ? "text-red-500" : "text-blue-500")} />
              <span>{sq.name}</span>
            </div>
            <span className={cn("text-xs font-mono", members.length > sq.maxSlots ? "text-red-500 font-bold" : "text-muted-foreground")}>
              {members.length}/{sq.maxSlots}
            </span>
          </CardTitle>
          {sq.intent !== 'Reserva' && (
             <div className="text-[10px] text-muted-foreground text-right mt-1">Poder Total: {Math.round(totSquadScore).toLocaleString()}</div>
          )}
        </CardHeader>
        <CardContent className="p-2 space-y-1 min-h-[60px] flex-grow">
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
              <div className="text-[10px] text-muted-foreground font-mono">
                {Math.round(m.elo)} ELO
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
          Gerador Inteligente de Escalação
        </h2>
        <p className="text-muted-foreground text-sm">
          Configure a partida e cole a lista de presenças. A IA usará ELO, Ataque e Defesa para montar os esquadrões baseados na estratégia.
        </p>
      </div>

      {!isGenerated ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 bg-card/50">
            <CardHeader className="py-4">
              <CardTitle className="text-md flex items-center gap-2"><Settings className="w-4 h-4"/> Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tamanho da Partida</Label>
                <Select value={String(matchSize)} onValueChange={v => setMatchSize(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="35">35 v 35</SelectItem>
                    <SelectItem value="40">40 v 40</SelectItem>
                    <SelectItem value="45">45 v 45</SelectItem>
                    <SelectItem value="50">50 v 50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qtd. de Tanques</Label>
                <Select value={String(tankSquadsCount)} onValueChange={v => setTankSquadsCount(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem Tanques</SelectItem>
                    <SelectItem value="1">1 Equipe</SelectItem>
                    <SelectItem value="2">2 Equipes</SelectItem>
                    <SelectItem value="3">3 Equipes</SelectItem>
                    <SelectItem value="4">4 Equipes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vagas nos Tanques</Label>
                <Select value={String(tankSquadSize)} onValueChange={v => setTankSquadSize(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Jogadores</SelectItem>
                    <SelectItem value="3">3 Jogadores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vagas na Artilharia</Label>
                <Select value={String(artillerySize)} onValueChange={v => setArtillerySize(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem Artilharia</SelectItem>
                    <SelectItem value="1">1 Jogador</SelectItem>
                    <SelectItem value="2">2 Jogadores</SelectItem>
                    <SelectItem value="3">3 Jogadores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tamanho do Squad Inf.</Label>
                <Select value={String(infantrySquadSize)} onValueChange={v => setInfantrySquadSize(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Jogadores</SelectItem>
                    <SelectItem value="3">3 Jogadores</SelectItem>
                    <SelectItem value="4">4 Jogadores</SelectItem>
                    <SelectItem value="5">5 Jogadores</SelectItem>
                    <SelectItem value="6">6 Jogadores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estratégia Principal</Label>
                <Select value={strategy} onValueChange={(v: StrategyType) => setStrategy(v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equilibrado">Equilibrado</SelectItem>
                    <SelectItem value="Ataque">Foco em Ataque</SelectItem>
                    <SelectItem value="Defesa">Foco em Defesa</SelectItem>
                    <SelectItem value="Flancos">Foco em Flancos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período de Dados</Label>
                <Select value={period} onValueChange={(v: 'current'|'3months') => setPeriod(v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Somente Mês Atual</SelectItem>
                    <SelectItem value="3months">Últimos 3 Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-card/50">
            <CardContent className="pt-6 space-y-4">
              <Textarea 
                placeholder="Cole a lista de presenças aqui...&#10;&#10;Comando:&#10;HRB_Fleck&#10;&#10;Oficiais:&#10;HRB_Bradock&#10;&#10;Blindados:&#10;HRB_Jon&#10;&#10;Soldados:&#10;HRB_Saldanha" 
                className="min-h-[450px] font-mono text-sm"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Button onClick={handleParseAndGenerate} className="w-full" size="lg" disabled={!inputText.trim()}>
                <Brain className="mr-2 h-5 w-5" />
                Gerar Escalação Automática
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/30 p-4 rounded-lg border border-border gap-4">
            <div className="text-sm">
              <span className="font-bold text-accent">{squadMembers.length}</span> jogadores escalados (Max: {matchSize}). 
              <br className="sm:hidden" />
              Arraste e solte os jogadores para ajustar.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsGenerated(false)}>Voltar / Reconfigurar</Button>
              <Button variant="secondary" size="sm" onClick={handleCopyToWhatsApp}>
                <Copy className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button size="sm" onClick={handleSaveLineup} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" /> 
                {isSaving ? "Salvando..." : "Salvar Link Público"}
              </Button>
            </div>
          </div>

          {savedLink && (
            <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-accent flex items-center gap-2"><Share2 className="w-4 h-4"/> Escalação Salva!</span>
                <span className="text-xs text-muted-foreground break-all">{savedLink}</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={savedLink} target="_blank" rel="noopener noreferrer">Abrir</a>
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {squads.map(sq => renderSquad(sq))}
          </div>
        </div>
      )}
    </div>
  );
}
