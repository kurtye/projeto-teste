'use client';

import { useState } from 'react';
import { clans } from '@/lib/clans';
import { LineupBuilder } from '@/app/clan-admin/dashboard/[clanId]/_components/LineupBuilder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function LineupGeneratorPage() {
  const [selectedClanId, setSelectedClanId] = useState<string>('ocl'); // Default para O Caba Lá

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header Público */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="font-bold font-headline text-lg sm:text-xl">Lineup Generator</h1>
              <p className="text-xs text-muted-foreground">Sistema de Escalação Automática HLL</p>
            </div>
          </div>
          <Link href="/">
            <div className="text-xs px-3 py-1.5 rounded-full bg-accent/20 text-accent font-bold hover:bg-accent/30 transition-colors cursor-pointer">
              Voltar ao Início
            </div>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Seletor de Clã */}
        <div className="max-w-xs space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Selecione seu Clã:</label>
          <Select value={selectedClanId} onValueChange={setSelectedClanId}>
            <SelectTrigger className="w-full bg-card/50">
              <SelectValue placeholder="Selecione um clã" />
            </SelectTrigger>
            <SelectContent>
              {clans.map(clan => (
                <SelectItem key={clan.id} value={clan.id}>
                  [{clan.tag}] {clan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Instância Isolada do LineupBuilder */}
        <div className="pt-4 border-t border-border/50">
          <LineupBuilder clanId={selectedClanId} />
        </div>

      </main>
    </div>
  );
}
