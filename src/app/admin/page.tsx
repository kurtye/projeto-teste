'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { importServerData, getServerImportStatus, getPlayerCount } from './actions';
import { Progress } from '@/components/ui/progress';
import { Database, DownloadCloud, History, ServerIcon, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const servers = [
  {
    id: '3LPZ',
    name: '3LPZ',
    apiUrl: 'https://3lpz-stats.hlladmin.com/api',
  },
  {
    id: 'HRB',
    name: 'HRB',
    apiUrl: 'https://stats.hrb-hll.com.br/api',
  },
  {
    id: 'RZN',
    name: 'RZN',
    apiUrl: 'https://rzn-stats.crcon.cc/api',
  },
  {
    id: 'GOAT',
    name: 'GOAT',
    apiUrl: 'https://goat-stats.hlladmin.com/api',
  },
  {
    id: 'OCL',
    name: 'OCL',
    apiUrl: 'https://ocabala-stats.hlladmin.com/api',
  },
];

type Server = (typeof servers)[0];

interface ServerImportState {
  isImporting: boolean;
  progress: number;
  message: string;
}

export default function AdminPage() {
  const [importStates, setImportStates] = useState<Record<string, ServerImportState>>(
    servers.reduce((acc, server) => {
      acc[server.id] = { isImporting: false, progress: 0, message: '' };
      return acc;
    }, {} as Record<string, ServerImportState>)
  );
  
  const [serverStatus, setServerStatus] = useState<Record<string, number> | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [isFetchingStats, startFetchingStats] = useTransition();

  const { toast } = useToast();

  const fetchStats = () => {
    startFetchingStats(async () => {
      setServerStatus(null);
      setPlayerCount(null);
      const [statuses, count] = await Promise.all([
        getServerImportStatus(),
        getPlayerCount(),
      ]);
      setServerStatus(statuses);
      setPlayerCount(count);
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);
  
  const anyImportInProgress = Object.values(importStates).some(s => s.isImporting);

  const handleImport = async (server: Server) => {
    if (!server) return;

    const setServerState = (update: Partial<ServerImportState>) => {
      setImportStates(prev => ({
        ...prev,
        [server.id]: { ...prev[server.id], ...update },
      }));
    };

    setServerState({
      isImporting: true,
      progress: 10,
      message: `Iniciando importação de ${server.name}...`,
    });

    try {
      const result = await importServerData(server.name, server.apiUrl);

      if (result.success) {
        setServerState({
          progress: 100,
          message: `${result.matchesProcessed} novas partidas processadas.`,
        });
        toast({
          title: 'Importação Concluída!',
          description: `Total de ${result.matchesProcessed} novas partidas processadas do servidor ${server.name}.`,
        });
        fetchStats();
      } else {
        throw new Error(result.error || 'Ocorreu um erro desconhecido na importação.');
      }
    } catch (error: any) {
      setServerState({
        progress: 0,
        message: `Falha: ${error.message}`,
      });
      toast({
        variant: 'destructive',
        title: 'Falha na Importação',
        description: error.message,
      });
    } finally {
      setTimeout(() => {
        setServerState({ isImporting: false, progress: 0, message: '' });
      }, 8000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline md:text-2xl">
            <Database className="h-6 w-6 text-accent" />
            <span>Painel de Importação</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
           <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
             <Card className="bg-muted/30">
              <CardHeader className='pb-2'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span>Status da Importação</span>
                </CardTitle>
              </CardHeader>
               <CardContent className="pt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Última partida processada por servidor:
                  </p>
                  {isFetchingStats ? (
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                     </div>
                  ): serverStatus ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {Object.entries(serverStatus).map(([server, id]) => (
                        <div key={server} className="flex justify-between">
                          <span className="font-semibold">{server}:</span>
                          <span className="font-mono text-accent">ID #{id}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum status encontrado.</p>
                  )}
               </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader className='pb-2'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Jogadores na Base</span>
                </CardTitle>
              </CardHeader>
               <CardContent className="pt-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total de jogadores únicos:
                  </p>
                  {isFetchingStats ? (
                     <p className="text-lg font-bold text-accent">Buscando...</p>
                  ): (
                    <p className="text-lg font-bold text-accent">
                      {playerCount !== null ? playerCount.toLocaleString() : 'N/A'}
                    </p>
                  )}
               </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold font-headline mb-4">Servidores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map(server => {
                const state = importStates[server.id];
                return (
                  <Card key={server.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ServerIcon className="h-5 w-5 text-muted-foreground" />
                        <span>{server.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                       <Button 
                         onClick={() => handleImport(server)} 
                         disabled={state.isImporting || anyImportInProgress}
                         className="w-full"
                       >
                        <DownloadCloud className={`mr-2 h-4 w-4 ${state.isImporting ? 'animate-spin' : ''}`} />
                        {state.isImporting ? 'Importando...' : 'Iniciar Importação'}
                      </Button>
                      {state.isImporting && (
                        <div className="space-y-2">
                          <Progress value={state.progress} />
                          <p className="text-sm text-muted-foreground text-center">{state.message}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
