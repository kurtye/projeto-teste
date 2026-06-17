'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ClanMember } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Swords,
  ShieldCheck,
  Zap,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Users,
  Target,
  BookOpen,
  BarChart3,
  Star,
} from 'lucide-react';

interface Props {
  members: ClanMember[];
  isLoading: boolean;
}

const PLAYSTYLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  Ataque: { label: 'Ataque', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/20', icon: Swords },
  Defesa: { label: 'Defesa', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/20', icon: ShieldCheck },
  Ambos:  { label: 'Ambos',  color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/20', icon: Zap },
};

function PlaystyleBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-[11px] text-muted-foreground italic">—</span>;
  const cfg = PLAYSTYLE_CONFIG[value] ?? { label: value, color: 'text-muted-foreground', bg: 'bg-muted/30 border-border', icon: HelpCircle };
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role, variant = 'primary' }: { role?: string; variant?: 'primary' | 'secondary' }) {
  if (!role || role === 'Nenhuma') return <span className="text-[11px] text-muted-foreground italic">—</span>;
  return (
    <span className={cn(
      'inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none truncate max-w-[110px]',
      variant === 'primary'
        ? 'bg-accent/20 text-accent border-accent/30'
        : 'bg-muted/40 text-muted-foreground border-border'
    )}>
      {role}
    </span>
  );
}

export function MemberPreferencesDashboard({ members, isLoading }: Props) {
  const activeMembers = useMemo(() => members.filter(m => m.status === 'active'), [members]);

  const filled = useMemo(() => activeMembers.filter(m => !!m.primaryRole), [activeMembers]);
  const pending = useMemo(() => activeMembers.filter(m => !m.primaryRole), [activeMembers]);

  const completionPct = activeMembers.length > 0
    ? Math.round((filled.length / activeMembers.length) * 100)
    : 0;

  // Playstyle distribution
  const playstyleCount = useMemo(() => {
    const counts: Record<string, number> = { Ataque: 0, Defesa: 0, Ambos: 0 };
    filled.forEach(m => { if (m.playstyle && counts[m.playstyle] !== undefined) counts[m.playstyle]++; });
    return counts;
  }, [filled]);

  // Top roles
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filled.forEach(m => {
      if (m.primaryRole) counts[m.primaryRole] = (counts[m.primaryRole] ?? 0) + 1;
      if (m.secondaryRole && m.secondaryRole !== 'Nenhuma') counts[m.secondaryRole] = (counts[m.secondaryRole] ?? 0) + 0.5;
      if (m.secondaryRole2 && m.secondaryRole2 !== 'Nenhuma') counts[m.secondaryRole2] = (counts[m.secondaryRole2] ?? 0) + 0.5;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filled]);

  // Role to learn distribution
  const learnCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filled.forEach(m => { if (m.roleToLearn) counts[m.roleToLearn] = (counts[m.roleToLearn] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [filled]);

  if (isLoading) {
    return (
      <div className="grid gap-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Completion */}
        <Card className="col-span-2 md:col-span-1 border-accent/10 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Preenchimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{completionPct}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">{filled.length} / {activeMembers.length} membros ativos</p>
            <Progress value={completionPct} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        {/* Playstyle cards */}
        {Object.entries(PLAYSTYLE_CONFIG).map(([key, cfg]) => {
          const count = playstyleCount[key] ?? 0;
          const pct = filled.length > 0 ? Math.round((count / filled.length) * 100) : 0;
          const Icon = cfg.icon;
          return (
            <Card key={key} className={cn('border bg-card/60', cfg.bg)}>
              <CardHeader className="pb-2">
                <CardTitle className={cn('text-sm flex items-center gap-2', cfg.color)}>
                  <Icon className="h-4 w-4" /> {cfg.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn('text-3xl font-bold', cfg.color)}>{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pct}% dos respondentes</p>
                <Progress value={pct} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Top Roles chart ── */}
        <Card className="border-accent/10 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-accent" /> Classes mais Populares
            </CardTitle>
            <CardDescription className="text-[11px]">Por popularidade (primária = 1pt, secundária = 0.5pt)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleCounts.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Ainda sem dados suficientes.</p>}
            {roleCounts.map(([role, score]) => {
              const max = roleCounts[0]?.[1] ?? 1;
              return (
                <div key={role} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium truncate pr-2">{role}</span>
                    <span className="text-muted-foreground tabular-nums flex-shrink-0">{score}</span>
                  </div>
                  <Progress value={(score / max) * 100} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Wants to Learn ── */}
        <Card className="border-accent/10 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" /> Querem Aprender
            </CardTitle>
            <CardDescription className="text-[11px]">Classes que membros desejam desenvolver</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {learnCounts.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Ainda sem dados suficientes.</p>}
            {learnCounts.map(([role, count]) => {
              const max = learnCounts[0]?.[1] ?? 1;
              return (
                <div key={role} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium truncate pr-2">{role}</span>
                    <span className="text-muted-foreground tabular-nums flex-shrink-0">{count} membro{count > 1 ? 's' : ''}</span>
                  </div>
                  <Progress value={(count / max) * 100} className="h-1.5 [&>div]:bg-blue-500" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Pending list ── */}
        <Card className="border-accent/10 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" /> Sem Resposta
            </CardTitle>
            <CardDescription className="text-[11px]">{pending.length} membro{pending.length !== 1 ? 's' : ''} ainda não preencheram</CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0
              ? <p className="text-xs text-green-400 font-medium text-center py-4">✓ Todos preencheram!</p>
              : (
                <ScrollArea className="h-44 pr-2">
                  <div className="space-y-1">
                    {pending.map(m => (
                      <div key={m.id} className="flex items-center gap-2 py-1 text-sm border-b border-border/30 last:border-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                        <span className="truncate text-muted-foreground">{m.playerName}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )
            }
          </CardContent>
        </Card>
      </div>

      {/* ── Member cards ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold font-headline">Perfis Individuais</h2>
          <Badge variant="outline" className="ml-2">{activeMembers.length} ativos</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeMembers.map(member => {
            const hasPref = !!member.primaryRole;
            return (
              <Card
                key={member.id}
                className={cn(
                  'border transition-all duration-200',
                  hasPref
                    ? 'border-accent/15 bg-card/60 hover:border-accent/30'
                    : 'border-dashed border-muted-foreground/20 bg-muted/10 opacity-60'
                )}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold leading-tight">{member.playerName}</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {member.rank.replace(/-/g, ' ')}
                      </p>
                    </div>
                    {hasPref
                      ? <PlaystyleBadge value={member.playstyle} />
                      : <span className="text-[10px] text-muted-foreground italic flex items-center gap-1"><XCircle className="h-3 w-3" />Pendente</span>
                    }
                  </div>
                </CardHeader>
                {hasPref && (
                  <CardContent className="px-4 pb-4 space-y-2.5">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Classes</p>
                      <div className="flex flex-wrap gap-1">
                        <RoleBadge role={member.primaryRole} variant="primary" />
                        {member.secondaryRole && member.secondaryRole !== 'Nenhuma' && (
                          <RoleBadge role={member.secondaryRole} variant="secondary" />
                        )}
                        {member.secondaryRole2 && member.secondaryRole2 !== 'Nenhuma' && (
                          <RoleBadge role={member.secondaryRole2} variant="secondary" />
                        )}
                      </div>
                    </div>
                    {member.roleToLearn && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Quer Aprender</p>
                        <span className="text-[10px] text-blue-400 font-medium">{member.roleToLearn}</span>
                      </div>
                    )}
                    {member.notes && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Observações</p>
                        <p className="text-[11px] text-muted-foreground italic leading-snug line-clamp-2">{member.notes}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
