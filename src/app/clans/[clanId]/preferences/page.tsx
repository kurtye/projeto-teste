'use client';

import { clans } from '@/lib/clans';
import { use, useEffect, useState } from 'react';
import { PlayerPreferencesForm } from '../_components/PlayerPreferencesForm';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { Clan, ClanMember } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function ClanPreferencesPage({ params }: { params: Promise<{ clanId: string }> }) {
  const { clanId } = use(params);
  const firestore = useFirestore();
  const clan = clans.find(c => c.id === clanId);

  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !clanId) return null;
    return query(collection(firestore, 'clans', clanId, 'members'), orderBy('playerName'));
  }, [firestore, clanId]);
  
  const { data: members, isLoading: isLoadingMembers } = useCollection<ClanMember>(membersQuery);

  if (isLoadingMembers) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Skeleton className="h-12 w-3/4 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!clan) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-destructive">Clã não encontrado</h1>
        <p className="text-muted-foreground mt-2">O link pode estar quebrado ou o clã não existe.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
             <Shield className="h-10 w-10 text-accent" />
             <h1 className="text-4xl font-bold font-headline tracking-tight uppercase">
               Perfil do Jogador: {clan.name}
             </h1>
          </div>
          <p className="text-muted-foreground text-lg italic max-w-2xl mx-auto">
            "Para vencer seu inimigo, você deve conhecer a si mesmo." - Sun Tzu
          </p>
        </div>

        <Card className="border-accent/20 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 pb-6">
            <CardTitle className="text-2xl font-bold">Informações e Preferências</CardTitle>
            <CardDescription>
              Ajude o comando a entender melhor suas preferências de jogo para organizar as melhores estratégias.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <PlayerPreferencesForm members={members || []} clanId={clanId} />
          </CardContent>
        </Card>

        <footer className="mt-12 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Hell Let Loose Community - {clan.tag} {clan.name}</p>
        </footer>
      </div>
    </div>
  );
}
