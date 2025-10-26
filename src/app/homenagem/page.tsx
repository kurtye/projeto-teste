'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { PlayerAggregates } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Award, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PlayerCardSkeleton = () => (
    <Card className="w-full">
        <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>
        </CardHeader>
    </Card>
);

export default function HomenagemPage() {
    const firestore = useFirestore();

    const tributePlayersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'playerAggregates'), where('status', '==', 'retired'));
    }, [firestore]);

    const { data: players, isLoading, error } = useCollection<PlayerAggregates>(tributePlayersQuery);

    return (
        <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
                    <Award className="h-8 w-8 text-yellow-400" />
                    Homenagem
                </h1>
                <p className="text-muted-foreground mt-2">
                    Em memória dos membros da nossa comunidade que nos deixaram. Sempre lembrados.
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => <PlayerCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                 <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                    <h2 className="mt-4 text-xl font-semibold">Falha ao carregar dados</h2>
                    <p className="mt-2 text-muted-foreground">Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.</p>
                </Card>
            ) : players && players.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {players.map((player) => (
                         <Link key={player.id} href={`/player/${encodeURIComponent(player.id)}`} className="group">
                            <Card className="h-full transition-all duration-200 border-transparent hover:border-accent hover:shadow-lg">
                                <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                                    <Avatar className="h-16 w-16 border-2 border-primary">
                                        <AvatarFallback className="text-2xl">{player.latestPlayerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-xl truncate" title={player.latestPlayerName}>{player.latestPlayerName}</p>
                                        <p className="text-sm text-muted-foreground">Em nossa memória</p>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <Award className="h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Nenhum jogador em homenagem</h2>
                    <p className="mt-2 text-muted-foreground">Ainda não há jogadores marcados com o status de homenagem.</p>
                </Card>
            )}
        </div>
    );
}
