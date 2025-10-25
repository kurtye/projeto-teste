'use client';

import { useState, useMemo } from 'react';
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
import { importServerData } from './actions';
import { Progress } from '@/components/ui/progress';
import { Database, DownloadCloud, LinkIcon } from 'lucide-react';

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
  const { toast } = useToast();

  const selectedServer = useMemo(() => {
    return servers.find(s => s.id === selectedServerId) || null;
  }, [selectedServerId]);

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
      const result = await importServerData(selectedServer.apiUrl);

      if (result.success) {
        const totalFound = result.totalFound || 0;
        const totalToProcess = Math.min(totalFound, 10);
        
        setProgressMessage(`${totalFound} partidas encontradas. Processando as primeiras ${totalToProcess}... (Buscando partida ${result.matchesProcessed || 0} de ${totalToProcess})`);

        setTimeout(() => {
            setImportProgress(100);
            toast({
              title: 'Importação Concluída!',
              description: `Total de ${result.matchesProcessed} partidas processadas de ${totalFound} encontradas no servidor ${selectedServer.name}. (Limitado a 10 para teste)`,
            });
            setProgressMessage(`Importação concluída! ${result.matchesProcessed} partidas processadas.`);
        }, 1500); 

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

          {selectedServer && (
            <Card className="bg-muted/30">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    API URL a ser chamada para obter o total:
                  </p>
                  <code className="text-sm text-accent font-mono break-all">
                    {selectedServer.apiUrl}/get_scoreboard_maps
                  </code>
                </div>
                <div>
                   <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    API URL a ser chamada para obter detalhes da partida (ex: ID 1):
                  </p>
                  <code className="text-sm text-accent font-mono break-all">
                    {selectedServer.apiUrl}/get_map_scoreboard?map_id=1
                  </code>
                </div>
              </CardContent>
            </Card>
          )}

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
