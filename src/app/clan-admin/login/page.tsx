
'use client';

import { useState, useEffect } from 'react';
import { useClanAuth } from '../layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, LogIn, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClanAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, clan } = useClanAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Efeito para redirecionar se o usuário já estiver logado e acessar esta página
  useEffect(() => {
    if (isAuthenticated && clan) {
      router.replace(`/clan-admin/dashboard/${clan.id}`);
    }
  }, [isAuthenticated, clan, router]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
       toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando para o painel...',
      });
      // A mudança de estado no layout vai disparar o useEffect acima e redirecionar.
      // O layout já lida com o redirecionamento principal, mas o useEffect aqui garante que aconteça
      // mesmo que o usuário aterrisse na página de login já autenticado.
    } else {
       toast({
        variant: 'destructive',
        title: 'Falha no Login',
        description: result.error,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline flex items-center justify-center gap-2">
            <Users className="h-6 w-6" />
            <span>Painel do Clã</span>
          </CardTitle>
          <CardDescription>
            Área restrita para administradores de clãs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-2">
              <Label htmlFor="email">Email de Acesso</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="admin@seuclan.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="********"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              <LogIn className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Verificando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
