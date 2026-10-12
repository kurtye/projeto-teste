'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';
import { clans } from '@/lib/clans';
import { ClanIntelligenceDashboard } from '@/app/clan-admin/dashboard/[clanId]/_components/ClanIntelligenceDashboard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface StatsPageProps {
  params: Promise<{
    clanId: string;
  }>;
}

export default function PublicStatsPage({ params }: StatsPageProps) {
  const resolvedParams = use(params);
  const { clanId } = resolvedParams;

  const clan = clans.find(c => c.id === clanId);

  if (!clan) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary bg-background">
              {clan.logoUrl ? (
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image src={clan.logoUrl} alt={`${clan.name} logo`} fill className="object-cover" />
                </div>
              ) : (
                <AvatarFallback className="text-4xl">{clan.tag}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-headline">Inteligência: {clan.name}</h1>
              <p className="text-xl text-muted-foreground">Estatísticas Mensais da Temporada</p>
            </div>
        </div>
        <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10 font-bold">
          <Link href={`/clans/${clanId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Clã
          </Link>
        </Button>
      </div>
      
      <div className="bg-card border rounded-lg p-2 sm:p-6 shadow-xl">
          <ClanIntelligenceDashboard clanId={clanId} isPublic={true} />
      </div>
    </div>
  );
}
