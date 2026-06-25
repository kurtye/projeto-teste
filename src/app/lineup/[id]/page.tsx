import { getLineup } from '@/app/clan-admin/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Shield, Sword, Users, Target, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LineupPageProps {
  params: Promise<{ id: string }>;
}

const SQUAD_NAMES: Record<string, string> = {
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
};

function getIconForArch(arch: string) {
  switch (arch) {
    case 'Ponta de Lança': return <Sword className="h-4 w-4 text-red-500" />;
    case 'Ceifador': return <Target className="h-4 w-4 text-purple-500" />;
    case 'Altruísta': return <HeartPulse className="h-4 w-4 text-green-500" />;
    case 'Muralha': return <Shield className="h-4 w-4 text-yellow-500" />;
    case 'Generalista': return <Users className="h-4 w-4 text-blue-400" />;
    default: return <Users className="h-4 w-4 text-gray-500" />;
  }
}

import { HeartPulse } from 'lucide-react'; // Fix missing icon

export default async function LineupPage({ params }: LineupPageProps) {
  const { id } = await params;
  const result = await getLineup(id);

  if (!result.success || !result.lineup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <Card className="max-w-md w-full bg-card/50">
          <CardContent className="pt-6 text-center space-y-4">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <h1 className="text-xl font-bold text-red-500">Escalação não encontrada</h1>
            <p className="text-muted-foreground text-sm">O link pode ter expirado ou estar incorreto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { title, squads, createdAt } = result.lineup;
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : '';

  const renderSquadList = (keys: string[], groupColor: string) => {
    return keys.map(key => {
      const members = squads[key];
      if (!members || members.length === 0) return null;

      return (
        <Card key={key} className={cn("bg-card/50 border-border/50", groupColor)}>
          <CardHeader className="py-2 px-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs flex justify-between items-center font-bold">
              {SQUAD_NAMES[key] || key}
              <span className="text-xs text-muted-foreground">{members.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {members.map((m: any, idx: number) => (
              <div 
                key={idx} 
                className={cn(
                  "flex items-center justify-between p-2 rounded bg-background border text-xs",
                  m.isOfficer ? "border-accent/30 bg-accent/5" : "border-border/50"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {getIconForArch(m.arch)}
                  <span className={cn("truncate", m.isOfficer && "font-bold text-accent")}>
                    {m.playerName} {m.isCustom && <span className="text-[10px] text-red-500" title="Reserva / Visitante">(?)</span>}
                  </span>
                </div>
                {m.isOfficer && <span className="text-[10px] font-mono font-bold text-accent">OFC</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Brain className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="font-bold font-headline text-lg sm:text-xl truncate max-w-[250px] sm:max-w-md">{title}</h1>
              <p className="text-xs text-muted-foreground">Gerado em {dateStr}</p>
            </div>
          </div>
          <Link href="/">
            <div className="text-xs px-3 py-1.5 rounded-full bg-accent/20 text-accent font-bold hover:bg-accent/30 transition-colors">
              HLL Community
            </div>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          
          {/* Liderança e Suporte */}
          <div className="space-y-4">
            <h3 className="font-bold text-accent flex items-center gap-2 uppercase text-sm tracking-wider pb-2 border-b border-border/50">
              <Rocket className="h-4 w-4" /> Comando & Blindados
            </h3>
            {renderSquadList(['Comando', 'Artilharia', 'T1', 'T2'], 'border-accent/20')}
          </div>

          {/* Ataque */}
          <div className="space-y-4">
            <h3 className="font-bold text-red-500 flex items-center gap-2 uppercase text-sm tracking-wider pb-2 border-b border-border/50">
              <Sword className="h-4 w-4" /> Ataque (Batedor / Flanco)
            </h3>
            {renderSquadList(['B1', 'B2', 'B3', 'FE', 'FD'], 'border-red-500/20')}
          </div>

          {/* Linhas */}
          <div className="space-y-4">
            <h3 className="font-bold text-blue-400 flex items-center gap-2 uppercase text-sm tracking-wider pb-2 border-b border-border/50">
              <Users className="h-4 w-4" /> Linhas de Frente
            </h3>
            {renderSquadList(['L1', 'L2', 'L3', 'L4', 'L5'], 'border-blue-400/20')}
          </div>

          {/* Defesa */}
          <div className="space-y-4">
            <h3 className="font-bold text-yellow-500 flex items-center gap-2 uppercase text-sm tracking-wider pb-2 border-b border-border/50">
              <Shield className="h-4 w-4" /> Defesa de Ponto
            </h3>
            {renderSquadList(['DC', 'DR'], 'border-yellow-500/20')}
          </div>

        </div>

      </main>
    </div>
  );
}
