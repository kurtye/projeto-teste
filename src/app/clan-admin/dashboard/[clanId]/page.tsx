
'use client';

import { useClanAuth } from '../../layout';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';


export default function ClanDashboardPage({ params }: { params: { clanId: string } }) {
  const { clan, user, logout } = useClanAuth();

  // Basic authorization: ensure the user is viewing their own clan's dashboard
  if (!clan || clan.id !== params.clanId) {
    return notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-headline">
            Painel do Clã: {clan.name}
          </CardTitle>
           <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2" />
              Sair
            </Button>
        </CardHeader>
        <CardContent>
          <p>Bem-vindo, {user?.email}.</p>
          <p className="mt-4 text-muted-foreground">Em breve, aqui você poderá gerenciar os membros do seu clã, visualizar estatísticas e muito mais.</p>
        </CardContent>
      </Card>
    </div>
  );
}
