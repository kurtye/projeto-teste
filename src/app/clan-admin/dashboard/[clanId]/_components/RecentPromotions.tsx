
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PromotionLog } from '@/lib/types';
import { Medal, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentPromotionsProps {
  promotions: PromotionLog[];
}

function toDate(timestamp: any): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  }
  return new Date(); // Fallback
}


export function RecentPromotions({ promotions }: RecentPromotionsProps) {
  if (!promotions || promotions.length === 0) {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-accent" />
                Promoções Recentes
            </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Medal className="h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Nenhuma promoção registrada</h2>
            <p className="mt-2 text-muted-foreground">Quando um membro for promovido, aparecerá aqui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-accent" />
            Promoções Recentes
        </CardTitle>
        <CardDescription>
            Últimas promoções de patente no clã.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {promotions.map((log) => (
            <li key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                    <Link href={`/player/${encodeURIComponent(log.playerId)}`} className="font-semibold hover:underline flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {log.playerName}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{log.oldRank}</span>
                        <ArrowRight className="h-4 w-4 text-green-500"/>
                        <span className="font-medium text-foreground">{log.newRank}</span>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground text-left sm:text-right">
                    {formatDistanceToNow(toDate(log.promotionDate), { addSuffix: true, locale: ptBR })}
                </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
