
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { importServerData, getServerSyncStatus, getPlayerCount, importSpecificMatches, importMatchRange, updateGlobalStats } from '../actions';
import { Progress } from '@/components/ui/progress';
import { Database, DownloadCloud, History, ServerIcon, Users, Edit, RefreshCw, BarChart, BetweenHorizontalStart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const servers = [
  {
    id: '3LPZ',
    name: '3LPZ',
    apiUrl: 'https://3lpz-stats.hlladmin.com/api',
  },
  {
    id: 'HRB',
    name: 'HRB',
    apiUrl: 'https://hrb-stats.hlladmin.com/api',
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

interface ServerSyncStatus {
    processed: number;
    total: number;
}

export default function AdminDashboardPage() {
  const [importStates, setImportStates] = useState<Record<string, ServerImportState>>(
    servers.reduce((acc, server) => {
      acc[server.id] = { isImporting: false, progress: 0, message: '' };
      return acc;
    }, {} as Record<string, ServerImportState>)
  );
  
  const [serverStatus, setServerStatus] = useState<Record<string, ServerSyncStatus> | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [isFetchingStats, startFetchingStats] = useTransition();
  const [isUpdatingGlobalStats, startUpdatingGlobalStats] = useTransition();
  
  const [manualImportIds, setManualImportIds] = useState('');
  const [manualImportServer, setManualImportServer] = useState<string>('');
  const [isManualImporting, setIsManualImporting] = useState(false);

  const [rangeImportServer, setRangeImportServer] = useState<string>('');
  const [rangeStartId, setRangeStartId] = useState('');
  const [rangeEndId, setRangeEndId] = useState('');
  const [isRangeImporting, setIsRangeImporting] = useState(false);

  const { toast } = useToast();

  const fetchStats = () => {
    startFetchingStats(async () => {
      setServerStatus(null);
      setPlayerCount(null);
      const [statuses, count] = await Promise.all([
        getServerSyncStatus(),
        getPlayerCount(),
      ]);
      setServerStatus(statuses);
      setPlayerCount(count);
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);
  
  const anyImportInProgress = Object.values(importStates).some(s => s.isImporting) || isManualImporting || isUpdatingGlobalStats || isRangeImporting;

  const handleUpdateGlobalStats = () => {
    startUpdatingGlobalStats(async () => {
        toast({ title: 'Iniciando cálculo de recordes globais...', description: 'Isso pode levar alguns instantes.' });
        const result = await updateGlobalStats();
        if (result.success) {
            toast({
                title: 'Recordes Globais Atualizados!',
                description: 'O gráfico de perfil dos jogadores agora usará os novos valores máximos.',
            });
            console.log("Max stats updated:", result.maxStats);
        } else {
            toast({
                variant: 'destructive',
                title: 'Falha ao Atualizar Recordes',
                description: result.error || 'Ocorreu um erro desconhecido.',
            });
        }
    });
  };

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
          message: `${result.matchesProcessed} novas partidas processadas de ${result.totalFound}.`,
        });
        toast({
          title: 'Importação Concluída!',
          description: `Total de ${result.matchesProcessed} novas partidas processadas do servidor ${server.name}.`,
        });
        fetchStats(); // Refresh stats after import
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
  
  const handleManualImport = async () => {
    if (!manualImportServer || !manualImportIds) {
      toast({
        variant: 'destructive',
        title: 'Dados Incompletos',
        description: 'Por favor, selecione um servidor e insira os IDs das partidas.',
      });
      return;
    }

    setIsManualImporting(true);
    const server = servers.find(s => s.id === manualImportServer);
    if (!server) {
        setIsManualImporting(false);
        toast({ variant: 'destructive', title: 'Erro', description: 'Servidor selecionado não encontrado.' });
        return;
    }

    toast({ title: 'Iniciando Importação Manual', description: `Processando partidas para ${server.name}...` });

    try {
      const result = await importSpecificMatches(server.name, server.apiUrl, manualImportIds);
      if (result.success) {
        toast({
          title: 'Importação Manual Concluída',
          description: `${result.matchesProcessed} de ${result.totalToProcess} partidas foram processadas com sucesso.`,
        });
        setManualImportIds('');
        setManualImportServer('');
        fetchStats();
      } else {
        throw new Error(result.error || 'Ocorreu um erro desconhecido.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha na Importação Manual', description: error.message });
    } finally {
      setIsManualImporting(false);
    }
  };

    const handleRangeImport = async () => {
    const startId = parseInt(rangeStartId, 10);
    const endId = parseInt(rangeEndId, 10);
    
    if (!rangeImportServer || !startId || !endId || startId <= 0 || endId < startId) {
      toast({
        variant: 'destructive',
        title: 'Dados Incompletos ou Inválidos',
        description: 'Selecione um servidor e insira um intervalo de IDs válido.',
      });
      return;
    }

    setIsRangeImporting(true);
    const server = servers.find(s => s.id === rangeImportServer);
    if (!server) {
        setIsRangeImporting(false);
        toast({ variant: 'destructive', title: 'Erro', description: 'Servidor selecionado não encontrado.' });
        return;
    }

    toast({ title: 'Iniciando Importação por Intervalo', description: `De ${startId} a ${endId} para ${server.name}...` });

    try {
      const result = await importMatchRange(server.name, server.apiUrl, startId, endId);
      if (result.success) {
        toast({
          title: 'Importação por Intervalo Concluída',
          description: `${result.matchesProcessed} de ${result.totalToProcess} partidas foram processadas.`,
        });
        setRangeStartId('');
        setRangeEndId('');
        setRangeImportServer('');
        fetchStats();
      } else {
        throw new Error(result.error || 'Ocorreu um erro desconhecido.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha na Importação por Intervalo', description: error.message });
    } finally {
      setIsRangeImporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline md:text-2xl">
            <Database className="h-6 w-6 text-accent" />
            <span>Painel de Administração</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
           <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
             <Card className="bg-muted/30 md:col-span-2">
                <CardHeader className='pb-2'>
                    <CardTitle className='text-base flex items-center gap-2'>
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span>Status de Sincronização de Partidas</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
                    {isFetchingStats ? (
                        <div className="space-y-4">
                           {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                    ) : serverStatus ? (
                        Object.entries(serverStatus).map(([server, status]) => (
                            <div key={server}>
                                {status ? (
                                  <>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold">{server}</span>
                                        <span className="font-mono text-muted-foreground">
                                            {status.processed.toLocaleString()} / {status.total.toLocaleString()}
                                        </span>
                                    </div>
                                    <Progress value={status.total > 0 ? (status.processed / status.total) * 100 : 0} />
                                  </>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    <span className="font-semibold">{server}:</span> Falha ao carregar status.
                                  </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhum status encontrado.</p>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-muted/30">
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Jogadores na Base</span>
                  </CardTitle>
                </CardHeader>
                 <CardContent className="pt-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Total de jogadores únicos:
                    </p>
                    {isFetchingStats ? (
                       <Skeleton className="h-7 w-24" />
                    ): (
                      <p className="text-2xl font-bold text-accent">
                        {playerCount !== null ? playerCount.toLocaleString() : 'N/A'}
                      </p>
                    )}
                 </CardContent>
              </Card>
               <Card className="bg-card">
                  <CardHeader className='pb-2'>
                      <CardTitle className="flex items-center gap-2 text-base">
                          <BarChart className="h-4 w-4 text-muted-foreground" />
                          Recordes Globais
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Calcule os valores máximos para as estatísticas usadas no gráfico de perfil do jogador.
                      </p>
                      <Button onClick={handleUpdateGlobalStats} disabled={anyImportInProgress}>
                          <RefreshCw className={`mr-2 h-4 w-4 ${isUpdatingGlobalStats ? 'animate-spin' : ''}`} />
                          {isUpdatingGlobalStats ? 'Calculando...' : 'Atualizar Recordes'}
                      </Button>
                  </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold font-headline mb-4">Importação em Massa por Servidor</h3>
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
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Edit className="h-5 w-5 text-accent" />
                        Importação Manual de Partidas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="manual-ids">IDs das Partidas</Label>
                        <Textarea
                            id="manual-ids"
                            placeholder="Cole os IDs aqui, separados por vírgula, espaço ou nova linha"
                            value={manualImportIds}
                            onChange={(e) => setManualImportIds(e.target.value)}
                            disabled={anyImportInProgress}
                            rows={4}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manual-server">Servidor</Label>
                        <Select
                          value={manualImportServer}
                          onValueChange={setManualImportServer}
                          disabled={anyImportInProgress}
                        >
                            <SelectTrigger id="manual-server">
                                <SelectValue placeholder="Selecione um servidor" />
                            </SelectTrigger>
                            <SelectContent>
                                {servers.map(server => (
                                    <SelectItem key={server.id} value={server.id}>
                                        {server.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleManualImport} disabled={anyImportInProgress}>
                        <DownloadCloud className={`mr-2 h-4 w-4 ${isManualImporting ? 'animate-spin' : ''}`} />
                        {isManualImporting ? 'Importando...' : 'Importar Partidas Específicas'}
                    </Button>
                </CardContent>
            </Card>

             <Card className="bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BetweenHorizontalStart className="h-5 w-5 text-accent" />
                        Importação por Intervalo de IDs
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="range-start-id">De (ID)</Label>
                            <Input
                                id="range-start-id"
                                type="number"
                                placeholder="Ex: 1000"
                                value={rangeStartId}
                                onChange={(e) => setRangeStartId(e.target.value)}
                                disabled={anyImportInProgress}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="range-end-id">Até (ID)</Label>
                            <Input
                                id="range-end-id"
                                type="number"
                                placeholder="Ex: 1050"
                                value={rangeEndId}
                                onChange={(e) => setRangeEndId(e.target.value)}
                                disabled={anyImportInProgress}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="range-server">Servidor</Label>
                        <Select
                          value={rangeImportServer}
                          onValueChange={setRangeImportServer}
                          disabled={anyImportInProgress}
                        >
                            <SelectTrigger id="range-server">
                                <SelectValue placeholder="Selecione um servidor" />
                            </SelectTrigger>
                            <SelectContent>
                                {servers.map(server => (
                                    <SelectItem key={server.id} value={server.id}>
                                        {server.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleRangeImport} disabled={anyImportInProgress}>
                        <DownloadCloud className={`mr-2 h-4 w-4 ${isRangeImporting ? 'animate-spin' : ''}`} />
                        {isRangeImporting ? 'Importando Intervalo...' : 'Importar Intervalo'}
                    </Button>
                </CardContent>
            </Card>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

    

    