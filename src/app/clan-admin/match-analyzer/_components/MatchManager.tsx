'use client';

import React, { useState, useEffect } from 'react';
import { MatchConfig, MATCH_PRESETS } from '../_data/matches';
import { MatchReplay } from './MatchReplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FolderOpen, 
  ExternalLink, 
  UploadCloud, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  FileJson,
  Layers,
  Sparkles
} from 'lucide-react';

interface MatchManagerProps {
  initialMatchId?: string;
  initialTelemetry?: any;
  initialScoreboard?: any;
}

export function MatchManager({
  initialMatchId = '1600',
  initialTelemetry,
  initialScoreboard,
}: MatchManagerProps) {
  const [matches, setMatches] = useState<MatchConfig[]>(MATCH_PRESETS);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatchId);
  const [telemetryCache, setTelemetryCache] = useState<Record<string, any>>(() => {
    const cache: Record<string, any> = {};
    if (initialTelemetry) {
      cache[initialMatchId] = initialTelemetry;
    }
    return cache;
  });
  const [scoreboardCache, setScoreboardCache] = useState<Record<string, any>>(() => {
    const cache: Record<string, any> = {};
    if (initialScoreboard) {
      cache[initialMatchId] = initialScoreboard;
    }
    return cache;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputGameId, setInputGameId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [selectedMapImage, setSelectedMapImage] = useState('/maps/utah.jpg');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedUploadedData, setParsedUploadedData] = useState<any | null>(null);
  const [fileParsingError, setFileParsingError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const activeMatch = matches.find(m => m.id === selectedMatchId) || matches[0];

  // Helper to extract numeric ID from strings or URLs
  const extractId = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/').filter(Boolean);
      return parts[parts.length - 1];
    }
    return trimmed;
  };

  // Switch or fetch match data
  const handleSelectMatch = async (matchId: string) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    setSelectedMatchId(matchId);
    setLoadError(null);

    const hasTelemetry = !!telemetryCache[matchId];
    const hasScoreboard = !!scoreboardCache[matchId];

    if (hasTelemetry && hasScoreboard) {
      return; // Already in memory
    }

    setIsLoading(true);
    setLoadingMessage(`Carregando dados da ${targetMatch.shortTitle}...`);

    try {
      // 1. Fetch telemetry if needed
      let telemetry = telemetryCache[matchId];
      if (!telemetry && targetMatch.telemetryUrl) {
        const res = await fetch(targetMatch.telemetryUrl);
        if (!res.ok) throw new Error(`Falha ao baixar telemetria: status ${res.status}`);
        telemetry = await res.json();
        setTelemetryCache(prev => ({ ...prev, [matchId]: telemetry }));
      }

      // 2. Fetch scoreboard if needed
      let scoreboard = scoreboardCache[matchId];
      if (!scoreboard && targetMatch.gameId) {
        const res = await fetch(`/api/match-scoreboard?map_id=${targetMatch.gameId}`);
        if (!res.ok) throw new Error(`Falha ao buscar placar da partida: status ${res.status}`);
        const data = await res.json();
        scoreboard = data.result || data;
        setScoreboardCache(prev => ({ ...prev, [matchId]: scoreboard }));
      }
    } catch (err: any) {
      console.error('Error switching match:', err);
      setLoadError(err.message || 'Erro ao carregar partida');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle file drop/upload in modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setFileParsingError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.players_list || !Array.isArray(parsed.players_list)) {
          throw new Error('O arquivo JSON não possui o formato esperado ("players_list").');
        }

        setParsedUploadedData(parsed);

        // Auto-fill title or map if empty
        if (!customTitle && parsed.map) {
          setCustomTitle(parsed.map);
        }
      } catch (err: any) {
        setFileParsingError(err.message || 'Erro ao processar JSON');
        setParsedUploadedData(null);
      }
    };
    reader.onerror = () => {
      setFileParsingError('Erro ao ler arquivo do computador.');
      setParsedUploadedData(null);
    };
    reader.readAsText(file);
  };

  // Submit modal to create/load custom match
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const gameId = extractId(inputGameId);

    if (!gameId) {
      setFileParsingError('Por favor informe o ID da partida ou o link do HRB Stats.');
      return;
    }

    if (!parsedUploadedData) {
      setFileParsingError('Por favor selecione um arquivo JSON de posições válido.');
      return;
    }

    setModalSubmitting(true);
    setFileParsingError(null);

    try {
      // Fetch scoreboard for this ID
      const res = await fetch(`/api/match-scoreboard?map_id=${gameId}`);
      if (!res.ok) {
        throw new Error(`Não foi possível buscar a partida ID ${gameId} no HRB Stats.`);
      }
      const data = await res.json();
      const scoreboard = data.result || data;

      const newMatchId = `custom-${gameId}-${Date.now()}`;
      const newMatchConfig: MatchConfig = {
        id: newMatchId,
        gameId: gameId,
        title: customTitle || `Partida #${gameId} • ${parsedUploadedData.map || 'Personalizada'}`,
        shortTitle: `Partida #${gameId}`,
        subtitle: `${new Date().toLocaleDateString('pt-BR')} • Customizada`,
        date: new Date().toLocaleDateString('pt-BR'),
        duration: 'Replay Carregado',
        mapName: parsedUploadedData.map || 'Utah Beach',
        mapImage: selectedMapImage,
        telemetryUrl: '',
        gameUrl: `https://hrb-stats.hlladmin.com/games/${gameId}`,
        isNew: true,
      };

      // Add to caches
      setTelemetryCache(prev => ({ ...prev, [newMatchId]: parsedUploadedData }));
      setScoreboardCache(prev => ({ ...prev, [newMatchId]: scoreboard }));
      setMatches(prev => [newMatchConfig, ...prev]);
      setSelectedMatchId(newMatchId);

      // Reset modal
      setIsModalOpen(false);
      setInputGameId('');
      setCustomTitle('');
      setUploadedFile(null);
      setParsedUploadedData(null);
    } catch (err: any) {
      setFileParsingError(err.message || 'Erro ao carregar partida.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const currentTelemetry = telemetryCache[selectedMatchId];
  const currentScoreboard = scoreboardCache[selectedMatchId];

  return (
    <div className="space-y-6">
      {/* Top Match Control Header */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Match Selector & Information */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary" /> Partida Ativa:
          </span>

          <div className="flex flex-wrap gap-2">
            {matches.map(m => {
              const isSelected = m.id === selectedMatchId;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMatch(m.id)}
                  disabled={isLoading}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20'
                      : 'bg-muted/40 hover:bg-muted text-foreground border-border hover:border-accent'
                  }`}
                >
                  <span>{m.shortTitle}</span>
                  {m.isNew && (
                    <Badge variant={isSelected ? "secondary" : "default"} className="text-[9px] px-1.5 py-0 h-4">
                      {m.id === '1600' ? 'NOVA' : 'RECÉM ADICIONADA'}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: HRB link & Load Custom */}
        <div className="flex items-center gap-2 shrink-0">
          {activeMatch.gameUrl && (
            <a
              href={activeMatch.gameUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Ver no HRB Stats #{activeMatch.gameId}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <Button
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            className="text-xs flex items-center gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary shadow-sm"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Carregar Outra Partida</span>
          </Button>
        </div>
      </div>

      {/* Loading Overlay or Error Alert */}
      {isLoading && (
        <div className="w-full py-16 bg-card border rounded-xl flex flex-col items-center justify-center gap-3 shadow-inner">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">{loadingMessage}</p>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar partida</p>
            <p className="text-xs opacity-90">{loadError}</p>
          </div>
        </div>
      )}

      {/* Active Match Replay */}
      {!isLoading && currentTelemetry && (
        <MatchReplay
          key={selectedMatchId}
          matchData={currentTelemetry}
          capFlips={currentScoreboard?.cap_flips || []}
          playerStats={currentScoreboard?.player_stats || []}
          mapImageUrl={activeMatch.mapImage || '/maps/utah.jpg'}
          matchTitle={activeMatch.title}
        />
      )}

      {/* Custom Match Upload Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" /> Carregar Partida no Analisador
            </DialogTitle>
            <DialogDescription>
              Informe o ID ou link da partida no HRB Stats e selecione o arquivo JSON de telemetria das posições.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {/* Game ID or URL input */}
            <div className="space-y-1.5">
              <Label htmlFor="gameIdInput" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ID da Partida ou Link HRB Stats <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gameIdInput"
                placeholder="Ex: 1600 ou https://hrb-stats.hlladmin.com/games/1600"
                value={inputGameId}
                onChange={(e) => setInputGameId(e.target.value)}
                required
                className="bg-background text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                O sistema buscará automaticamente o placar, times e lista de oficiais pelo ID.
              </p>
            </div>

            {/* File Upload Dropzone */}
            <div className="space-y-1.5">
              <Label htmlFor="jsonFileInput" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Arquivo JSON de Posições (Telemetria) <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-4 bg-muted/20 flex flex-col items-center justify-center text-center cursor-pointer relative">
                <input
                  id="jsonFileInput"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-xs font-medium text-foreground">
                  {uploadedFile ? uploadedFile.name : 'Clique para selecionar ou arraste o arquivo positions.json'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Suporta arquivos de telemetria exportados pelo HLL Admin (.json)
                </p>
              </div>

              {/* Parsing status badge */}
              {parsedUploadedData && (
                <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs mt-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Validado com sucesso: <strong>{parsedUploadedData.players_list?.length || 0} jogadores</strong> detectados ({parsedUploadedData.map || 'Mapa'})
                  </span>
                </div>
              )}

              {fileParsingError && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileParsingError}</span>
                </div>
              )}
            </div>

            {/* Custom Title (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="customTitleInput" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Título / Rótulo da Partida (Opcional)
              </Label>
              <Input
                id="customTitleInput"
                placeholder="Ex: Partida #1600 • Treino HRB vs WRT"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="bg-background text-sm"
              />
            </div>

            {/* Map Background Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="mapSelect" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mapa Tático de Fundo
              </Label>
              <Select value={selectedMapImage} onValueChange={setSelectedMapImage}>
                <SelectTrigger id="mapSelect" className="bg-background text-sm">
                  <SelectValue placeholder="Selecione o mapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/maps/utah.jpg">Utah Beach (Padrão)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={modalSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={modalSubmitting || !parsedUploadedData || !inputGameId.trim()}
                className="flex items-center gap-2"
              >
                {modalSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Carregando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Carregar e Analisar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
