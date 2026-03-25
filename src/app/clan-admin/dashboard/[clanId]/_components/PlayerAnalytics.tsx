'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { PlayerPreference } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Shield, Sword, Users, GraduationCap, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PlayerAnalyticsProps {
  clanId: string;
}

const COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#4ade80', '#fb7185', '#6366f1'
];

export function PlayerAnalytics({ clanId }: PlayerAnalyticsProps) {
  const firestore = useFirestore();

  const preferencesQuery = useMemoFirebase(() => {
    if (!firestore || !clanId) return null;
    return query(collection(firestore, 'clans', clanId, 'playerPreferences'));
  }, [firestore, clanId]);

  const { data: rawPreferences, isLoading } = useCollection<PlayerPreference>(preferencesQuery);

  // Group by playerName and take latest
  const preferences = useMemo(() => {
    if (!rawPreferences) return [];
    const map = new Map<string, PlayerPreference>();
    rawPreferences.forEach(p => {
      const existing = map.get(p.playerName);
      if (!existing || (p.updatedAt?.seconds > (existing.updatedAt?.seconds || 0))) {
        map.set(p.playerName, p);
      }
    });
    return Array.from(map.values());
  }, [rawPreferences]);

  const stats = useMemo(() => {
    if (preferences.length === 0) return null;

    const primaryRoles: Record<string, number> = {};
    const playstyles: Record<string, number> = { 'Ataque': 0, 'Defesa': 0, 'Ambos': 0 };
    const rolesToLearn: Record<string, number> = {};

    preferences.forEach(p => {
      primaryRoles[p.primaryRole] = (primaryRoles[p.primaryRole] || 0) + 1;
      playstyles[p.playstyle] = (playstyles[p.playstyle] || 0) + 1;
      if (p.roleToLearn) {
        rolesToLearn[p.roleToLearn] = (rolesToLearn[p.roleToLearn] || 0) + 1;
      }
    });

    const primaryRoleData = Object.entries(primaryRoles)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const playstyleData = Object.entries(playstyles)
      .map(([name, value]) => ({ name, value }));

    const rolesToLearnData = Object.entries(rolesToLearn)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { primaryRoleData, playstyleData, rolesToLearnData };
  }, [preferences]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados analíticos...</div>;
  }

  if (preferences.length === 0) {
    return (
      <Card className="bg-muted/10 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Info className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground italic text-center">
            Nenhum dado de preferência coletado ainda.<br />
            Compartilhe o link do formulário com seu clã.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> Total de Respostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{preferences.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Perfis coletados</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sword className="h-4 w-4 text-red-500" /> Foco em Ataque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round((stats?.playstyleData.find(d => d.name === 'Ataque')?.value || 0) / preferences.length * 100)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dos jogadores preferem atacar</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" /> Foco em Defesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round((stats?.playstyleData.find(d => d.name === 'Defesa')?.value || 0) / preferences.length * 100)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dos jogadores preferem defender</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Funções Primárias</CardTitle>
            <CardDescription>Qual classe os jogadores mais gostam de jogar</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.primaryRoleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.primaryRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estilo de Jogo</CardTitle>
            <CardDescription>Equilíbrio tático do clã</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.playstyleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                   contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }}
                />
                <Bar dataKey="value" name="Jogadores">
                   {stats?.playstyleData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Ataque' ? '#ef4444' : entry.name === 'Defesa' ? '#3b82f6' : '#f59e0b'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            Vontade de Aprender
          </CardTitle>
          <CardDescription>Classes que os membros mais gostariam de aprender</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {stats?.rolesToLearnData.map((item, idx) => (
               <div key={idx} className="space-y-1">
                 <div className="flex justify-between text-sm">
                   <span className="font-medium">{item.name}</span>
                   <span className="text-muted-foreground">{item.value} jogadores</span>
                 </div>
                 <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-accent transition-all" 
                      style={{ width: `${(item.value / preferences.length) * 100}%` }}
                   />
                 </div>
               </div>
             ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listagem Completa de Perfis</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Soldado</TableHead>
                  <TableHead>Primária</TableHead>
                  <TableHead>Secundárias</TableHead>
                  <TableHead>Estilo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preferences.sort((a, b) => a.playerName.localeCompare(b.playerName)).map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold">{p.playerName}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-accent/20 text-accent border-accent/30">{p.primaryRole}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.secondaryRole1}, {p.secondaryRole2}
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className={cn(
                         "text-[10px] font-bold uppercase",
                         p.playstyle === 'Ataque' ? "text-red-400 border-red-400/20" : 
                         p.playstyle === 'Defesa' ? "text-blue-400 border-blue-400/20" : "text-amber-400 border-amber-400/20"
                       )}>
                         {p.playstyle}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
