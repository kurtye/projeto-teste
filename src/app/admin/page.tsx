'use client';

import { useState } from 'react';
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
import { Database, DownloadCloud } from 'lucide-react';

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
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const { toast } = useToast();

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
    setImportProgress(50); // Indica que o processo começou
    setProgressMessage('Iniciando importação... Isso pode levar vários minutos. Você será notificado ao final.');

    try {
        const server = servers.find(s => s.id === selectedServer);
        if (!server) throw new Error('Servidor não encontrado');

        const result = await importServerData(server.apiUrl);

      if (result.success) {
        toast({
          title: 'Importação Concluída!',
          description: `Total de ${result.matchesProcessed} partidas processadas do servidor ${selectedServer}.`,
        });
        setProgressMessage(`Importação concluída! ${result.matchesProcessed} partidas processadas.`);
        setImportProgress(100);
      } else {
        throw new Error(result.error || 'Ocorreu um erro desconhecido.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Importação',
        description: error.message,
      });
       setProgressMessage(`Falha na importação: ${error.message}`);
       setImportProgress(100); // Para indicar que terminou (com erro)
    } finally {
      // Delay to allow user to see the final message
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setProgressMessage('');
      }, 5000);
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
              onValueChange={setSelectedServer}
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
