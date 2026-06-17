
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { runMatchAnalysisAction, publishToCasernaAction } from '../actions';
import { Sparkles, FileJson, Sword, Shield, Target, Trophy, Info, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type FactionFilter = 'all' | 'axis' | 'allies';

export default function MatchAnalyzerPage() {
  const [matchJson, setMatchJson] = useState('');
  const [factionFilter, setFactionFilter] = useState<FactionFilter>('all');
  const [report, setReport] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();
  const { toast } = useToast();

  const handleAnalyze = () => {
    if (!matchJson.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, cole o JSON da partida.' });
      return;
    }

    // Basic JSON validation
    try {
      JSON.parse(matchJson);
    } catch (e) {
      toast({ variant: 'destructive', title: 'JSON Inválido', description: 'O texto colado não é um JSON válido.' });
      return;
    }

    startTransition(async () => {
      setReport(null);
      const result = await runMatchAnalysisAction(matchJson, factionFilter);
      if (result.success && result.report) {
        setReport(result.report);
        toast({ title: 'Análise Concluída!', description: 'O relatório tático foi gerado com sucesso.' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na Análise',
          description: result.error || 'Ocorreu um erro desconhecido.',
        });
      }
    });
  };

  const handlePublish = () => {
    if (!report) return;

    startPublishTransition(async () => {
      // Tenta extrair um título do relatório ou usa um padrão
      const mapMatch = matchJson.match(/"map_name":\s*"(.*?)"/);
      const mapName = mapMatch ? mapMatch[1].replace(/_/g, ' ').toUpperCase() : 'Batalha Desconhecida';
      const title = `Relatório Tático: ${mapName}`;

      const result = await publishToCasernaAction(title, report);
      if (result.success) {
        toast({ title: 'Publicado!', description: 'O relatório foi enviado para a Caserna.' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao Publicar',
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-accent" />
          Analisador de Batalha (IA)
        </h1>
        <p className="text-muted-foreground mt-2">
          Cole o JSON bruto de uma partida para obter um relatório tático detalhado e insights estratégicos.
        </p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileJson className="h-5 w-5 text-muted-foreground" />
              Dados da Partida (JSON)
            </CardTitle>
            <CardDescription>
              Você pode obter esse JSON na API do servidor ou no console do administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder='Cole o conteúdo do campo "result" ou o JSON completo aqui...'
              value={matchJson}
              onChange={(e) => setMatchJson(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
              disabled={isPending}
            />
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-auto space-y-1">
                <Label htmlFor="faction-select">Analisar por Facção</Label>
                <Select value={factionFilter} onValueChange={(value) => setFactionFilter(value as FactionFilter)}>
                  <SelectTrigger id="faction-select" className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Facções</SelectItem>
                    <SelectItem value="axis">Apenas Eixo</SelectItem>
                    <SelectItem value="allies">Apenas Aliados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAnalyze} disabled={isPending || !matchJson.trim()} className="w-full sm:w-auto">
                <Sparkles className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                {isPending ? 'Processando Dados...' : 'Gerar Relatório Tático'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isPending && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-48" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {report && (
          <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
            <CardHeader className="border-b border-border/50 bg-accent/5 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl text-accent">
                <Trophy className="h-6 w-6" />
                Relatório de Operações
              </CardTitle>
              <Button onClick={handlePublish} disabled={isPublishing} variant="outline" size="sm">
                <Send className={`mr-2 h-4 w-4 ${isPublishing ? 'animate-spin' : ''}`} />
                {isPublishing ? 'Publicando...' : 'Publicar na Caserna'}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div 
                className="prose prose-invert max-w-none 
                  prose-headings:text-accent prose-headings:font-headline prose-headings:mt-6 prose-headings:mb-4
                  prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
                  prose-strong:text-accent prose-strong:font-bold
                  prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2"
                dangerouslySetInnerHTML={{ 
                  __html: report
                    .replace(/### (.*?)\n/g, '<h3 class="text-xl font-semibold border-b border-border/30 pb-2 mt-8">$1</h3>')
                    .replace(/\* \*\*(.*?)\*\*/g, '<p class="mt-2"><strong>$1</strong></p>')
                    .replace(/\n\n/g, '<br/>')
                }} 
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
