'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { importServerDataByDate, getServerSyncStatus, getPlayerCount, updateGlobalStats, getServersConfig, addServerConfig, removeServerConfig, ServerConfig } from '../actions';
import { Progress } from '@/components/ui/progress';
import { Database, ServerIcon, Users, RefreshCw, BarChart, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [importStates, setImportStates] = useState<Record<string, ServerImportState>>({});
  const [serverStatus, setServerStatus] = useState<Record<string, ServerSyncStatus> | null>(null);
  
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [isFetchingStats, startFetchingStats] = useTransition();
  const [isUpdatingGlobalStats, startUpdatingGlobalStats] = useTransition();
  const [isManagingServers, startManagingServers] = useTransition();

  const [newServerName, setNewServerName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    loadServersAndStatus();
  }, []);

  const loadServersAndStatus = () => {
    startFetchingStats(async () => {
      const serverList = await getServersConfig();
      setServers(serverList);
      
      const initialStates: Record<string, ServerImportState> = {};
      serverList.forEach(s => {
          initialStates[s.name] = { isImporting: false, progress: 0, message: '' };
      });
      setImportStates(initialStates);

      const status = await getServerSyncStatus();
      setServerStatus(status);
      
      const pCount = await getPlayerCount();
      setPlayerCount(pCount);
    });
  };

  const handleAddServer = () => {
      if (!newServerName || !newServerUrl) {
          toast({ title: "Erro", description: "Preencha o nome e a URL.", variant: "destructive" });
          return;
      }
      startManagingServers(async () => {
          const res = await addServerConfig(newServerName, newServerUrl);
          if (res.success) {
              toast({ title: "Sucesso", description: "Servidor adicionado." });
              setNewServerName('');
              setNewServerUrl('');
              loadServersAndStatus();
          } else {
              toast({ title: "Erro", description: res.error, variant: "destructive" });
          }
      });
  };

  const handleRemoveServer = (id: string, name: string) => {
      if (!confirm(`Tem certeza que deseja remover o servidor ${name}?`)) return;
      startManagingServers(async () => {
          const res = await removeServerConfig(id);
          if (res.success) {
              toast({ title: "Sucesso", description: "Servidor removido." });
              loadServersAndStatus();
          } else {
              toast({ title: "Erro", description: res.error, variant: "destructive" });
          }
      });
  };

  const handleSyncServer = async (serverName: string, apiUrl: string) => {
    setImportStates(prev => ({
      ...prev,
      [serverName]: { isImporting: true, progress: 10, message: 'Buscando histórico dos últimos 3 meses...' }
    }));

    toast({
      title: "Sincronização Iniciada",
      description: `Buscando e processando partidas para ${serverName}. Isso pode levar um tempo.`,
    });

    try {
      const result = await importServerDataByDate(serverName, apiUrl, 3);
      
      if (result.success) {
        setImportStates(prev => ({
          ...prev,
          [serverName]: { isImporting: false, progress: 100, message: `Concluído! ${result.matchesProcessed} novas partidas importadas.` }
        }));
        
        toast({
          title: "Sincronização Concluída",
          description: `${result.matchesProcessed} novas partidas processadas para ${serverName}.`,
        });

        // Refresh status
        startFetchingStats(async () => {
            const status = await getServerSyncStatus();
            setServerStatus(status);
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      setImportStates(prev => ({
        ...prev,
        [serverName]: { isImporting: false, progress: 0, message: `Erro: ${error.message}` }
      }));
      
      toast({
        title: "Erro de Sincronização",
        description: `Falha ao sincronizar ${serverName}: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleUpdateGlobalStats = () => {
    startUpdatingGlobalStats(async () => {
      toast({
        title: "Atualizando Estatísticas...",
        description: "Calculando records globais. Aguarde.",
      });
      const result = await updateGlobalStats();
      if (result.success) {
        toast({
          title: "Estatísticas Atualizadas!",
          description: "Os records globais foram atualizados com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao atualizar estatísticas globais: " + result.error,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline mb-2 flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Administração do Sistema
        </h1>
        <p className="text-muted-foreground">
          Gerencie servidores, importe dados de partidas e atualize estatísticas globais.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Base de Jogadores
            </CardTitle>
            <CardDescription>Total de jogadores processados no banco de dados</CardDescription>
          </CardHeader>
          <CardContent>
            {isFetchingStats ? (
               <Skeleton className="h-10 w-32" />
            ) : (
               <div className="text-4xl font-bold">{playerCount?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              Estatísticas Globais
            </CardTitle>
            <CardDescription>
              Atualiza os records máximos para gráficos radiais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
                onClick={handleUpdateGlobalStats} 
                disabled={isUpdatingGlobalStats}
                className="w-full"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isUpdatingGlobalStats && "animate-spin")} />
              {isUpdatingGlobalStats ? 'Atualizando...' : 'Recalcular Records Globais'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* GERENCIADOR DE SERVIDORES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5 text-accent" />
            Gerenciador de Servidores
          </CardTitle>
          <CardDescription>
            Adicione ou remova servidores HLL. A sincronização busca partidas dos <strong>últimos 3 meses</strong> para cada servidor.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-muted/20 border border-border rounded-lg">
                <div className="flex-1 space-y-2">
                    <Label>Nome do Servidor (Sigla)</Label>
                    <Input placeholder="Ex: HRB" value={newServerName} onChange={e => setNewServerName(e.target.value)} />
                </div>
                <div className="flex-[2] space-y-2">
                    <Label>URL da API (HLL Admin)</Label>
                    <Input placeholder="Ex: https://hrb-stats.hlladmin.com/api" value={newServerUrl} onChange={e => setNewServerUrl(e.target.value)} />
                </div>
                <div className="flex items-end">
                    <Button onClick={handleAddServer} disabled={isManagingServers}>
                        <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {servers.map(server => {
                    const state = importStates[server.name] || { isImporting: false, progress: 0, message: '' };
                    const status = serverStatus?.[server.name];
                    const isImporting = state.isImporting;

                    return (
                        <div key={server.id} className="p-4 border rounded-lg bg-card/50">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div>
                                    <h3 className="text-xl font-bold font-headline">{server.name}</h3>
                                    <p className="text-sm text-muted-foreground font-mono">{server.apiUrl}</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {isFetchingStats ? (
                                        <Skeleton className="h-6 w-32" />
                                    ) : (
                                        <div className="text-sm text-right">
                                            <div className="text-muted-foreground">Último Sync:</div>
                                            <div className="font-mono font-bold text-accent">
                                                {status?.processed || 0} Partidas Salvas
                                            </div>
                                        </div>
                                    )}
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleSyncServer(server.name, server.apiUrl)}
                                        disabled={isImporting}
                                    >
                                        <RefreshCw className={cn("mr-2 h-4 w-4", isImporting && "animate-spin")} />
                                        {isImporting ? 'Buscando...' : 'Sincronizar (3 Meses)'}
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="icon"
                                        onClick={() => handleRemoveServer(server.id, server.name)}
                                        disabled={isManagingServers || isImporting}
                                        title="Remover Servidor"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {isImporting && (
                                <div className="space-y-2 mt-4 p-4 bg-muted/20 rounded-md">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{state.message}</span>
                                        <span className="font-bold">{state.progress}%</span>
                                    </div>
                                    <Progress value={state.progress} className="h-2" />
                                </div>
                            )}
                            
                            {!isImporting && state.message && (
                                <div className="mt-2 text-sm text-green-500 font-medium">
                                    {state.message}
                                </div>
                            )}
                        </div>
                    );
                })}

                {servers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhum servidor configurado. Adicione um servidor acima.
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
