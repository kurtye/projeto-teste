'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { importServerData, getLastImportedMatchId } from './actions';
import { Progress } from '@/components/ui/progress';
import { Database, DownloadCloud, LinkIcon, History, ServerIcon } from 'lucide-react';

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

export default function AdminPage() {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [lastImportedId, setLastImportedId] = useState<number | null>(null);
  const [isFetchingLastId, startFetchingLastId] = useTransition();

  const { toast } = useToast();

  const selectedServer = useMemo(() => {
    return servers.find(s => s.id === selectedServerId) || null;
  }, [selectedServerId]);

  useEffect(() => {
    startFetchingLastId(async () => {
      setLastImportedId(null);
      const id = await getLastImportedMatchId();
      setLastImportedId(id);
    });
  }, []);


  const handleImport = async () => {
    if (!selectedServer) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, selecione um servidor para importar.',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(10);
    setProgressMessage(`Iniciando importação do servidor ${selectedServer.name}... Buscando total de partidas.`);

    try {
      const result = await importServerData(selectedServer.name, selectedServer.apiUrl);

      if (result.success) {
        const totalFound = result.totalFound || 0;
        
        setProgressMessage(`${totalFound} partidas encontradas na API. Foram processadas ${result.matchesProcessed} novas partidas.`);

        setImportProgress(100);
        toast({
          title: 'Importação Concluída!',
          description: `Total de ${result.matchesProcessed} novas partidas processadas do servidor ${selectedServer.name}.`,
        });

        // Atualiza o último ID importado na UI
        const newLastId = await getLastImportedMatchId();
        setLastImportedId(newLastId);

      } else {
        throw new Error(result.error || 'Ocorreu um erro desconhecido na importação.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Importação',
        description: error.message,
      });
      setProgressMessage(`Falha na importação: ${error.message}`);
      setImportProgress(0);
    } finally {
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setProgressMessage('');
      }, 8000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline md:text-2xl">
            <Database className="h-6 w-6 text-accent" />
            <span>Importar Dados de Partidas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="server" className="text-sm font-medium text-muted-foreground">
              Selecione o Servidor
            </label>
            <Select
              onValueChange={setSelectedServerId}
              disabled={isImporting}
            >
              <SelectTrigger id="server" className="w-full md:w-1/3">
                <SelectValue placeholder="Selecione um servidor..." />
              </SelectTrigger>
              <SelectContent>
                {servers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {selectedServer && (
              <Card className="bg-muted/30">
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <ServerIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Informações do Servidor</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      API URL (get_scoreboard_maps):
                    </p>
                    <code className="text-sm text-accent font-mono break-all">
                      {selectedServer.apiUrl}/get_scoreboard_maps
                    </code>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      API URL (get_map_scoreboard):
                    </p>
                    <code className="text-sm text-accent font-mono break-all">
                      {selectedServer.apiUrl}/get_map_scoreboard?map_id=1
                    </code>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-muted/30">
              <CardHeader className='pb-2'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span>Status da Importação Global</span>
                </CardTitle>
              </CardHeader>
               <CardContent className="pt-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Última partida processada (todos servidores):
                  </p>
                  {isFetchingLastId ? (
                     <p className="text-lg font-bold text-accent">Buscando...</p>
                  ): (
                    <p className="text-lg font-bold text-accent">
                      {lastImportedId !== null ? `ID #${lastImportedId}` : 'Nenhuma importação encontrada.'}
                    </p>
                  )}
               </CardContent>
            </Card>
          </div>

          <Button onClick={handleImport} disabled={isImporting || !selectedServer}>
            <DownloadCloud className={`mr-2 h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
            {isImporting ? 'Importando...' : 'Iniciar Importação'}
          </Button>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-muted-foreground">{progressMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
