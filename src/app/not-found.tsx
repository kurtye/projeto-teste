
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchX, ChevronLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 rounded-full p-4 w-fit">
            <SearchX className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-3xl font-headline">Página Não Encontrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Oops! Não conseguimos encontrar a página ou o jogador que você está procurando.
            Pode ser que o link esteja quebrado ou o perfil não exista.
          </p>
          <Button asChild>
            <Link href="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para o Ranking
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
