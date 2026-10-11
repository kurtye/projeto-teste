'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, FastForward, SkipBack, ZoomIn, ZoomOut, Maximize, User, Shield, Skull, Crosshair, Truck, Activity, Trophy, Flag, Flame, Target, Rocket, Award, Crown, Wrench, Clapperboard, Sparkles, Video, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { ROLE_MAPPING } from '@/lib/roles';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

interface Position {
  time: number;
  x: number;
  y: number;
}

interface Player {
  id: string;
  name: string;
  team: string;
  position: Position[];
}

interface MatchData {
  id: number;
  map: string;
  started_at: string;
  players_list: Player[];
}

interface CapFlip {
  allied_score: number;
  axis_score: number;
  ts: number;
}

interface PlayerStatUnit {
  ts: number;
  squad: number;
  role: number;
}

interface PlayerStat {
  id?: number;
  player_id: string;
  player?: string;
  team?: { side: 'allies' | 'axis'; [key: string]: any } | any;
  kills?: number;
  deaths?: number;
  combat?: number;
  offense?: number;
  defense?: number;
  support?: number;
  kill_death_ratio?: number;
  vehicles_destroyed?: number;
  vehicle_kills?: number;
  kills_by_type?: Record<string, number>;
  weapons?: Record<string, number>;
  units?: PlayerStatUnit[];
  [key: string]: any;
}

export interface MatchReplayProps {
  matchData: MatchData;
  capFlips?: CapFlip[];
  playerStats?: PlayerStat[];
  mapImageUrl?: string;
  matchTitle?: string;
}

// Linear Interpolation (LERP) helper between telemetry positions
function getInterpolatedPosition(positions: Position[], t: number): Position | null {
  if (!positions || positions.length === 0) return null;
  if (t <= positions[0].time) return positions[0];
  const last = positions[positions.length - 1];
  if (t >= last.time) return last;

  let low = 0;
  let high = positions.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const midTime = positions[mid].time;
    if (midTime === t) return positions[mid];
    if (midTime < t) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const prev = positions[high];
  const next = positions[low];

  if (!prev) return next || null;
  if (!next) return prev;

  // Don't interpolate to or from death state (0, 0)
  if (prev.x === 0 && prev.y === 0) return prev;
  if (next.x === 0 && next.y === 0) return prev;

  const dt = next.time - prev.time;
  if (dt <= 0 || dt > 25) return prev;

  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const dist = Math.hypot(dx, dy);

  // If player respawned far away across the map (speed > 2500 units/s = 25m/s = 90km/h)
  if (dist / dt > 2500) {
    return prev;
  }

  const factor = (t - prev.time) / dt;
  return {
    time: t,
    x: prev.x + dx * factor,
    y: prev.y + dy * factor,
  };
}

export function MatchReplay({ 
  matchData, 
  capFlips = [], 
  playerStats = [],
  mapImageUrl = '/maps/utah.jpg',
  matchTitle,
}: MatchReplayProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(10);
  const [teamFilter, setTeamFilter] = useState<'all' | 'axis' | 'allies'>('all');
  const [showTrails, setShowTrails] = useState(false);
  const [heatmapType, setHeatmapType] = useState<'none' | 'presence' | 'deaths'>('none');
  const [showFrontline, setShowFrontline] = useState(true);
  const [showDeaths, setShowDeaths] = useState(true);
  const [showOfficers, setShowOfficers] = useState(true);
  const [showCohesionPercent, setShowCohesionPercent] = useState(false);
  const [smoothMovement, setSmoothMovement] = useState(true);
  const [honorsTeamFilter, setHonorsTeamFilter] = useState<'all' | 'axis' | 'allies'>('all');
  const [highlightedSquad, setHighlightedSquad] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [isCinematicMode, setIsCinematicMode] = useState<boolean>(false);
  const [showStoryDrawer, setShowStoryDrawer] = useState<boolean>(true);
  const activeCinematicEventRef = useRef<string | null>(null);
  const previousPlaybackSpeedRef = useRef<number>(10);

  // Reset replay on match change
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setHighlightedSquad(null);
  }, [matchData]);

  // Coordinate mapping (assume map bounds are -100k to +100k)
  const mapCoordToPercent = (coord: number) => {
    return ((coord + 100000) / 200000) * 100;
  };

  const maxTime = useMemo(() => {
    let max = 0;
    matchData.players_list.forEach(p => {
      p.position.forEach(pos => {
        if (pos.time > max) max = pos.time;
      });
    });
    return max;
  }, [matchData]);

  // Player active positions (with continuous LERP interpolation)
  const activePositions = useMemo(() => {
    return matchData.players_list.map(player => {
      let currentPos: Position | null = null;
      const trail: Position[] = [];
      const trailDuration = 60; // 60 seconds of history for trail

      if (smoothMovement) {
        currentPos = getInterpolatedPosition(player.position, currentTime);
      } else {
        // Discrete mode: last recorded position <= currentTime
        for (let i = 0; i < player.position.length; i++) {
          const pos = player.position[i];
          if (pos.time <= currentTime) {
            currentPos = pos;
          } else {
            break;
          }
        }
      }

      if (!currentPos && player.position.length > 0) {
        currentPos = player.position[0];
      }

      if (showTrails) {
        for (let i = 0; i < player.position.length; i++) {
          const pos = player.position[i];
          if (pos.time <= currentTime) {
            if (pos.time >= currentTime - trailDuration && pos.x !== 0 && pos.y !== 0) {
              trail.push(pos);
            }
          } else {
            break;
          }
        }
        if (currentPos && currentPos.x !== 0 && currentPos.y !== 0) {
          trail.push(currentPos);
        }
      }

      // Find role and squad at currentTime from playerStats
      let currentRole = null;
      let currentSquad = null;
      const pStat = playerStats.find(ps => ps.player_id === player.id);
      if (pStat && pStat.units) {
        let latestUnit = pStat.units[0];
        for (const u of pStat.units) {
          if (u.ts <= currentTime) {
            latestUnit = u;
          } else {
            break;
          }
        }
        if (latestUnit) {
          currentRole = latestUnit.role;
          currentSquad = latestUnit.squad;
        }
      }

      return {
        ...player,
        currentPos: currentPos as Position,
        trail,
        currentRole,
        currentSquad
      };
    }).filter(p => {
       if (teamFilter !== 'all' && p.team !== teamFilter) return false;
       return p.currentPos && p.currentPos.time > currentTime - 300;
    }); // Disappear if no update for 5 mins
  }, [matchData, currentTime, teamFilter, showTrails, playerStats, smoothMovement]);

  // Compute Recent Deaths (last 60 seconds)
  const recentDeaths = useMemo(() => {
    if (!showDeaths) return [];
    const deaths: { id: string, name: string, team: string, time: number, x: number, y: number }[] = [];
    
    matchData.players_list.forEach(p => {
      for (let i = 1; i < p.position.length; i++) {
         const curr = p.position[i];
         const prev = p.position[i-1];
         
         if (curr.time > currentTime) break; // Future
         
         // If this record falls within the last 60 seconds
         if (curr.time >= currentTime - 60 && curr.time <= currentTime) {
            // If transitioned to dead (0,0) from a valid position
            if (curr.x === 0 && curr.y === 0 && (prev.x !== 0 || prev.y !== 0)) {
               deaths.push({
                 id: `${p.id}-${curr.time}`,
                 name: p.name,
                 team: p.team,
                 time: curr.time,
                 x: prev.x,
                 y: prev.y
               });
            }
         }
      }
    });
    return deaths;
  }, [matchData, currentTime, showDeaths]);

  // Compute All Historical Deaths (up to current time, for heatmap)
  const historicalDeaths = useMemo(() => {
    if (heatmapType !== 'deaths') return [];
    const deaths: { team: string, time: number, x: number, y: number }[] = [];
    matchData.players_list.forEach(p => {
      for (let i = 1; i < p.position.length; i++) {
         const curr = p.position[i];
         const prev = p.position[i-1];
         if (curr.time > currentTime) break; // Future
         if (curr.x === 0 && curr.y === 0 && (prev.x !== 0 || prev.y !== 0)) {
             deaths.push({ team: p.team, time: curr.time, x: prev.x, y: prev.y });
         }
      }
    });
    return deaths;
  }, [matchData, currentTime, heatmapType]);

  // Compute active squads and their officers for Cohesion
  const activeSquads = useMemo(() => {
    const squads: Record<string, any> = {};

    activePositions.forEach(p => {
      if (!p.currentPos || p.currentSquad === null || p.currentSquad === 0 || (p.currentPos.x === 0 && p.currentPos.y === 0)) return;
      const key = `${p.team}-${p.currentSquad}`;
      if (!squads[key]) {
        squads[key] = { key, team: p.team, squadId: p.currentSquad, members: [], officer: null, isTank: false };
      }
      squads[key].members.push(p);
      // 9 = Officer, 4 = Spotter, 11 = Tank Commander
      if (p.currentRole === 9 || p.currentRole === 4 || p.currentRole === 11) {
        if (!p.name?.toLowerCase().includes('engshijima')) {
          squads[key].officer = p;
        }
      }
      // Check if tank squad
      if (p.currentRole === 11 || p.currentRole === 12) {
        squads[key].isTank = true;
      }
    });

    return Object.values(squads).sort((a, b) => a.squadId - b.squadId);
  }, [activePositions]);

  // Compute all historical squads with precise primary squad mapping & true officer recognition
  const allMatchSquads = useMemo(() => {
    if (!playerStats || playerStats.length === 0) return [];
    
    const maxTs = Math.max(...playerStats.flatMap((p: any) => (p.units || []).map((u: any) => u.ts)), 5400);

    const playerPrimarySquad: Record<string, { team: string; squadId: number; time: number }> = {};
    const squadOfficerTimes: Record<string, Record<string, number>> = {};
    const squadRoleSeconds: Record<string, Record<number, number>> = {};

    // 1. Calculate durations per squad, officer time, and role time
    playerStats.forEach((p: any) => {
      const team = typeof p.team === 'object' ? p.team?.side : p.team;
      if (!team || team === 'unknown' || !p.units) return;

      const squadDurations: Record<number, number> = {};

      for (let i = 0; i < p.units.length; i++) {
        const u = p.units[i];
        if (u.squad === null || u.squad === undefined || u.squad <= 0) continue;

        const start = u.ts;
        const end = (i + 1 < p.units.length) ? p.units[i + 1].ts : maxTs;
        const dur = Math.max(0, end - start);

        squadDurations[u.squad] = (squadDurations[u.squad] || 0) + dur;
        const key = `${team}-${u.squad}`;

        if (!squadRoleSeconds[key]) squadRoleSeconds[key] = {};
        squadRoleSeconds[key][u.role] = (squadRoleSeconds[key][u.role] || 0) + dur;

        // Track officer roles (9=Officer, 4=Spotter, 11=Tank Commander)
        if ([9, 4, 11].includes(u.role)) {
          if (!squadOfficerTimes[key]) squadOfficerTimes[key] = {};
          squadOfficerTimes[key][p.player] = (squadOfficerTimes[key][p.player] || 0) + dur;
        }
      }

      // Find player's primary squad (longest time spent)
      let bestSquad: number | null = null;
      let bestTime = -1;
      for (const [sq, dur] of Object.entries(squadDurations)) {
        if (dur > bestTime) {
          bestTime = dur;
          bestSquad = parseInt(sq);
        }
      }

      if (bestSquad) {
        playerPrimarySquad[p.player_id] = { team, squadId: bestSquad, time: bestTime };
      }
    });

    // 2. Build squads aggregated by primary squad membership
    const squads: Record<string, any> = {};

    playerStats.forEach((p: any) => {
      const info = playerPrimarySquad[p.player_id];
      if (!info) return;

      const key = `${info.team}-${info.squadId}`;
      if (!squads[key]) {
        // True officer is the one who spent the longest time as SL in this squad
        const officers = squadOfficerTimes[key] || {};
        let topOfficer: string | null = null;
        let topOffDur = -1;
        for (const [name, dur] of Object.entries(officers)) {
          if (!name.toLowerCase().includes('engshijima') && dur > topOffDur) {
            topOffDur = dur;
            topOfficer = name;
          }
        }

        // True tank squad if >35% of cumulative squad time was spent in tank roles (11, 12)
        const roles = squadRoleSeconds[key] || {};
        const tankSec = (roles[11] || 0) + (roles[12] || 0);
        const totSec = Object.values(roles).reduce((a, b) => a + b, 0);
        const isTank = totSec > 0 && tankSec / totSec > 0.35;

        squads[key] = {
          key,
          team: info.team,
          squadId: info.squadId,
          officerName: topOfficer,
          officerDuration: topOffDur,
          isTank,
          members: [],
          membersCount: 0,
          combatScore: 0,
          offenseScore: 0,
          defenseScore: 0,
          supportScore: 0,
          killsScore: 0,
          deathsScore: 0,
          vehiclesScore: 0,
          vehiclesList: []
        };
      }

      squads[key].members.push(p.player);
      squads[key].combatScore += (p.combat || 0);
      squads[key].offenseScore += (p.offense || 0);
      squads[key].defenseScore += (p.defense || 0);
      squads[key].supportScore += (p.support || 0);
      squads[key].killsScore += (p.kills || 0);
      squads[key].deathsScore += (p.deaths || 0);
      squads[key].vehiclesList.push(p.vehicles_destroyed || 0);
    });

    // 3. Calculate vehicle score and per-soldier averages
    Object.values(squads).forEach((s: any) => {
      s.membersCount = s.members?.length || 1;
      if (s.isTank) {
        s.vehiclesScore = Math.max(0, ...s.vehiclesList);
      } else {
        s.vehiclesScore = s.vehiclesList.reduce((a: number, b: number) => a + b, 0);
      }
      s.avgCombat = Math.round(s.combatScore / Math.max(1, s.membersCount));
      s.avgDefense = Math.round(s.defenseScore / Math.max(1, s.membersCount));
      s.avgOffense = Math.round(s.offenseScore / Math.max(1, s.membersCount));
      s.avgSupport = Math.round(s.supportScore / Math.max(1, s.membersCount));
      s.avgKills = Math.round(s.killsScore / Math.max(1, s.membersCount));
    });

    const result = Object.values(squads).filter((s: any) => 
      s.squadId > 0 &&
      s.officerName !== null && 
      !s.officerName.toLowerCase().includes('engshijima')
    );
    
    // Calculate Max/Min Combat for non-tank squads PER TEAM
    ['axis', 'allies'].forEach(teamStr => {
      const teamInfantry = result.filter((s: any) => !s.isTank && s.team === teamStr && s.combatScore >= 0);
      if (teamInfantry.length > 0) {
        const maxC = Math.max(...teamInfantry.map((s: any) => s.combatScore));
        const minC = Math.min(...teamInfantry.map((s: any) => s.combatScore));
        teamInfantry.forEach((s: any) => {
          if (s.combatScore === maxC) s.isMaxCombat = true;
          if (s.combatScore === minC) s.isMinCombat = true;
        });
      }
    });

    return result.sort((a: any, b: any) => {
       if (a.isTank && !b.isTank) return 1;
       if (!a.isTank && b.isTank) return -1;
       return a.squadId - b.squadId;
    });
  }, [playerStats]);

  // -------------------------------------------------------------
  // MODO CINEMATOGRÁFICO / DIRETOR TÁTICO (Clímax e Capítulos)
  // -------------------------------------------------------------

  // Zoom trigonométrico suave centralizado na coordenada do evento
  const zoomToCoords = (worldX: number, worldY: number, targetScale = 2.4, durationMs = 1200) => {
    if (!transformComponentRef.current) return;
    const wrapper = transformComponentRef.current.instance.wrapperComponent;
    const width = wrapper?.clientWidth || 1000;
    const height = wrapper?.clientHeight || 600;

    const pixelX = ((worldX + 100000) / 200000) * 2000;
    const pixelY = ((worldY + 100000) / 200000) * 2000;

    const newX = (width / 2) - (pixelX * targetScale);
    const newY = (height / 2) - (pixelY * targetScale);

    transformComponentRef.current.setTransform(newX, newY, targetScale, durationMs, "easeOut");
  };

  const resetCamera = (durationMs = 1000) => {
    transformComponentRef.current?.resetTransform(durationMs, "easeOut");
  };

  // Destaques e Momentos Épicos da Partida (Memoized)
  const cinematicHighlights = useMemo(() => {
    const allDeaths: { id: string; player: string; team: string; time: number; x: number; y: number }[] = [];
    matchData.players_list.forEach(p => {
      for (let i = 1; i < p.position.length; i++) {
        const curr = p.position[i];
        const prev = p.position[i - 1];
        if (curr.x === 0 && curr.y === 0 && (prev.x !== 0 || prev.y !== 0)) {
          allDeaths.push({
            id: `${p.id}-${curr.time}`,
            player: p.name,
            team: p.team,
            time: curr.time,
            x: prev.x,
            y: prev.y,
          });
        }
      }
    });

    if (allDeaths.length === 0) return [];

    const duration = maxTime;
    const candidates: {
      startTime: number;
      peakTime: number;
      endTime: number;
      coords: { x: number; y: number };
      alliesDeaths: number;
      axisDeaths: number;
      totalDeaths: number;
      score: number;
      nearbySquads: { team: string; squadId: number; officerName?: string }[];
    }[] = [];

    // Janela deslizante de 60s em passos de 15s
    for (let t = 0; t <= duration - 60; t += 15) {
      const windowDeaths = allDeaths.filter(d => d.time >= t && d.time <= t + 60);
      if (windowDeaths.length >= 12) {
        const avgX = windowDeaths.reduce((acc, d) => acc + d.x, 0) / windowDeaths.length;
        const avgY = windowDeaths.reduce((acc, d) => acc + d.y, 0) / windowDeaths.length;

        // Cluster check (raio de 600m)
        const inCluster = windowDeaths.filter(d => Math.hypot(d.x - avgX, d.y - avgY) <= 60000);
        if (inCluster.length >= 10) {
          const allies = inCluster.filter(d => d.team === 'allies').length;
          const axis = inCluster.filter(d => d.team === 'axis').length;

          // Esquadrões na zona de conflito
          const squadsInArea: Record<string, { team: string; squadId: number; officerName?: string }> = {};
          if (allMatchSquads && allMatchSquads.length > 0) {
            allMatchSquads.forEach((sq: any) => {
              squadsInArea[`${sq.team}-${sq.squadId}`] = {
                team: sq.team,
                squadId: sq.squadId,
                officerName: sq.officerName || undefined,
              };
            });
          }

          candidates.push({
            startTime: Math.max(0, t - 10),
            peakTime: t + 30,
            endTime: t + 70,
            coords: { x: Math.round(avgX), y: Math.round(avgY) },
            alliesDeaths: allies,
            axisDeaths: axis,
            totalDeaths: inCluster.length,
            score: inCluster.length * 2 + Math.min(allies, axis) * 3,
            nearbySquads: Object.values(squadsInArea).slice(0, 4),
          });
        }
      }
    }

    // Seleciona os melhores eventos espaçados por ao menos 180s (3 minutos)
    candidates.sort((a, b) => b.score - a.score);
    const selected: typeof candidates = [];
    for (const cand of candidates) {
      const overlap = selected.some(s => Math.abs(s.peakTime - cand.peakTime) < 180);
      if (!overlap) {
        selected.push(cand);
        if (selected.length >= 7) break;
      }
    }

    // Ordenação cronológica para criar uma narrativa cinematográfica completa
    selected.sort((a, b) => a.peakTime - b.peakTime);

    return selected.map((ev, index) => {
      let title = `Capítulo ${index + 1}: `;
      let subtitle = '';
      let description = '';
      let eventType: 'massacre' | 'breakthrough' | 'defense' | 'clash' = 'clash';

      if (ev.totalDeaths >= 35) {
        title += 'O Grande Massacre';
        subtitle = `${ev.totalDeaths} Baixas • Batalha Decisiva`;
        description = `O clímax mais violento da partida: ${ev.alliesDeaths} Aliados e ${ev.axisDeaths} combatentes do Eixo caíram no epicentro em 60 segundos.`;
        eventType = 'massacre';
      } else if (ev.axisDeaths > ev.alliesDeaths * 1.3) {
        title += 'Ruptura da Linha do Eixo';
        subtitle = `Pressão e Avanço Aliado • ${ev.axisDeaths} Mortes do Eixo`;
        description = `As forças aliadas romperam o bloqueio, empurrando as posições inimigas com forte suporte e fogo concentrado.`;
        eventType = 'breakthrough';
      } else if (ev.alliesDeaths > ev.axisDeaths * 1.3) {
        title += 'Emboscada e Queda Aliada';
        subtitle = `Contra-Ataque do Eixo • ${ev.alliesDeaths} Baixas Aliadas`;
        description = `O Eixo realizou um cerco mortal em fogo cruzado, contendo a investida aliada e infligindo duras baixas.`;
        eventType = 'defense';
      } else {
        title += 'Choque de Trincheiras';
        subtitle = `Fogo Cruzado • ${ev.totalDeaths} Baixas Registradas`;
        description = `Confronto encarniçado com pesada troca de supressão e artilharia entre ambas as facções.`;
        eventType = 'clash';
      }

      return {
        id: `highlight-${index + 1}`,
        chapterIndex: index + 1,
        type: eventType,
        startTime: ev.startTime,
        peakTime: ev.peakTime,
        endTime: ev.endTime,
        coords: ev.coords,
        title,
        subtitle,
        description,
        alliesDeaths: ev.alliesDeaths,
        axisDeaths: ev.axisDeaths,
        totalDeaths: ev.totalDeaths,
        nearbySquads: ev.nearbySquads,
      };
    });
  }, [matchData, maxTime, allMatchSquads]);

  // Clímax atual que intercepta o tempo de reprodução
  const currentHighlight = useMemo(() => {
    return cinematicHighlights.find(ev => currentTime >= ev.startTime && currentTime <= ev.endTime) || null;
  }, [cinematicHighlights, currentTime]);

  // Iniciar reprodução focada no capítulo selecionado
  const playHighlight = (highlight: (typeof cinematicHighlights)[0]) => {
    setCurrentTime(Math.max(0, highlight.startTime));
    setIsPlaying(true);
    setIsCinematicMode(true);
    activeCinematicEventRef.current = highlight.id;
    zoomToCoords(highlight.coords.x, highlight.coords.y, 2.4, 1200);
    if (playbackSpeed > 3) {
      previousPlaybackSpeedRef.current = playbackSpeed;
      setPlaybackSpeed(2);
    }
  };

  // Efeito do Diretor Cinematográfico durante o Play
  useEffect(() => {
    if (!isCinematicMode || !isPlaying) return;

    if (currentHighlight) {
      if (activeCinematicEventRef.current !== currentHighlight.id) {
        activeCinematicEventRef.current = currentHighlight.id;
        zoomToCoords(currentHighlight.coords.x, currentHighlight.coords.y, 2.4, 1400);
        if (playbackSpeed > 3) {
          previousPlaybackSpeedRef.current = playbackSpeed;
          setPlaybackSpeed(2);
        }
      }
    } else {
      if (activeCinematicEventRef.current !== null) {
        activeCinematicEventRef.current = null;
        resetCamera(1200);
        if (previousPlaybackSpeedRef.current && previousPlaybackSpeedRef.current !== playbackSpeed) {
          setPlaybackSpeed(previousPlaybackSpeedRef.current);
        }
      }
    }
  }, [currentHighlight, isCinematicMode, isPlaying]);

  // Precompute Cohesion over the entire match at 60-second intervals
  const precomputedCohesion = useMemo(() => {
    if (!playerStats || playerStats.length === 0) return [];
    
    let maxTime = 0;
    matchData.players_list.forEach(p => {
       const lastTime = p.position[p.position.length - 1]?.time || 0;
       if (lastTime > maxTime) maxTime = lastTime;
    });
    
    const timeline: { time: number, scores: Record<string, number> }[] = [];
    const statsMap: Record<string, any> = {};
    playerStats.forEach((s: any) => { statsMap[s.player_id] = s; });

    for (let t = 0; t <= maxTime; t += 60) {
      const positionsAtT = matchData.players_list.map(p => {
         let currentPos: Position | null = null;
         let minDiff = Infinity;
         p.position.forEach(pos => {
            const diff = Math.abs(pos.time - t);
            if (diff < 60 && pos.time <= t) { 
               minDiff = diff;
               currentPos = pos;
            }
         });
         
         let currentRole = null;
         let currentSquad = null;
         const stats = statsMap[p.id];
         if (stats?.units) {
             const unit = stats.units.reduce((prev: any, curr: any) => (curr.ts <= t ? curr : prev), stats.units[0]);
             if (unit) {
                currentRole = unit.role;
                currentSquad = unit.squad;
             }
         }
         return { id: p.id, team: p.team, currentPos, currentRole, currentSquad };
      });
      
      const squadsMap: Record<string, any> = {};
      positionsAtT.forEach((p: any) => {
        if (!p.currentPos || p.currentSquad === null || p.currentSquad === 0 || (p.currentPos.x === 0 && p.currentPos.y === 0)) return;
        const teamSide = typeof p.team === 'object' ? (p.team as any).side : p.team;
        const key = `${teamSide}-${p.currentSquad}`;
        if (!squadsMap[key]) squadsMap[key] = { members: [], officer: null, isTank: false };
        
        squadsMap[key].members.push(p);
        if (p.currentRole === 9 || p.currentRole === 4 || p.currentRole === 11) squadsMap[key].officer = p;
        if (p.currentRole === 11 || p.currentRole === 12) squadsMap[key].isTank = true;
      });
      
      const scoresAtT: Record<string, number> = {};
      Object.entries(squadsMap).forEach(([key, s]) => {
         if (s.members.length < 2 || s.isTank || !s.officer) return;
         let totalDistance = 0;
         let count = 0;
         s.members.forEach((m: any) => {
            if (m.id !== s.officer.id) {
               const dx = m.currentPos.x - s.officer.currentPos.x;
               const dy = m.currentPos.y - s.officer.currentPos.y;
               const dist = Math.sqrt(dx * dx + dy * dy);
               totalDistance += dist;
               count++;
            }
         });
         if (count > 0) {
            let score = 100 - ((totalDistance / count) / 100);
            if (score < 0) score = 0;
            if (score > 100) score = 100;
            scoresAtT[key] = score;
         }
      });
      
      timeline.push({ time: t, scores: scoresAtT });
    }
    return timeline;
  }, [matchData, playerStats]);

  // Accumulate Cohesion up to current time
  const accumulatedCohesion = useMemo(() => {
     if (!showCohesionPercent) return {};
     const sums: Record<string, { total: number, count: number }> = {};
     
     for (const tick of precomputedCohesion) {
        if (tick.time > currentTime) break;
        Object.entries(tick.scores).forEach(([key, score]) => {
           if (!sums[key]) sums[key] = { total: 0, count: 0 };
           sums[key].total += score;
           sums[key].count += 1;
        });
     }
     
     const result: Record<string, number> = {};
     Object.entries(sums).forEach(([key, val]) => {
        result[key] = Math.round(val.total / val.count);
     });
     return result;
  }, [precomputedCohesion, currentTime, showCohesionPercent]);

  // Calculate dynamic Squad Cohesion for the bottom panel
  const squadCohesion = useMemo(() => {
    const metrics = activeSquads.map(s => {
      // Tank squads are trivially cohesive, ignore them in this metric
      if (s.members.length < 2 || s.isTank) return null;
      
      let totalDistance = 0;
      let count = 0;
      // Measure against officer if present, else against the squad centroid
      // If no officer, we just use the first member as anchor for simplicity, or we could calculate centroid.
      const anchor = s.officer ? s.officer.currentPos : s.members[0].currentPos; 

      s.members.forEach((m: any) => {
         if (m.id === (s.officer ? s.officer.id : s.members[0].id)) return;
         const dx = m.currentPos.x - anchor.x;
         const dy = m.currentPos.y - anchor.y;
         const distanceUnits = Math.sqrt(dx*dx + dy*dy);
         totalDistance += distanceUnits;
         count++;
      });

      const avgDistanceUnits = count > 0 ? totalDistance / count : 0;
      const avgDistanceMeters = avgDistanceUnits / 100; // 100 UE units = 1 meter (standard HLL)
      
      // Cohesion formula: 0 to 50m is good. Drops to 0% at 200m.
      let score = 100 - (avgDistanceMeters / 2); 
      if (score < 0) score = 0;
      if (score > 100) score = 100;

      let status = 'Crítica';
      if (score > 80) status = 'Alta (Excelente)';
      else if (score > 50) status = 'Média (Disperso)';
      else if (score > 30) status = 'Baixa (Rambo)';

      return { ...s, score, avgDistanceMeters, status };
    }).filter(Boolean);

    // Sort by score descending
    metrics.sort((a, b) => b!.score - a!.score);
    
    if (metrics.length > 0) {
      metrics[0]!.isMaxCohesion = true;
      metrics[metrics.length - 1]!.isMinCohesion = true;
    }

    return metrics;
  }, [activeSquads]);

  // Overall match cohesion for all squads
  const totalSquadCohesion = useMemo(() => {
    const sums: Record<string, { total: number, count: number }> = {};
    for (const tick of precomputedCohesion) {
      Object.entries(tick.scores).forEach(([key, score]) => {
        if (!sums[key]) sums[key] = { total: 0, count: 0 };
        sums[key].total += score;
        sums[key].count += 1;
      });
    }
    const result: Record<string, number> = {};
    Object.entries(sums).forEach(([key, val]) => {
      result[key] = Math.round(val.total / val.count);
    });
    return result;
  }, [precomputedCohesion]);

  // Squad Honors
  const squadHonors = useMemo(() => {
    if (!allMatchSquads || allMatchSquads.length === 0) return null;

    let validSquads = allMatchSquads.filter((s: any) => s.officerName);
    if (honorsTeamFilter !== 'all') {
      validSquads = validSquads.filter((s: any) => s.team === honorsTeamFilter);
    }
    if (validSquads.length === 0) return null;

    // Separate combat infantry and armor squads with quorum filter (>= 3 for infantry, >= 2 for armor)
    const qualifiedInfantry = validSquads.filter((s: any) => !s.isTank && s.membersCount >= 3);
    const finalInfantry = qualifiedInfantry.length > 0 
      ? qualifiedInfantry 
      : validSquads.filter((s: any) => !s.isTank);

    const qualifiedTanks = validSquads.filter((s: any) => s.isTank && s.membersCount >= 2);
    const finalTanks = qualifiedTanks.length > 0 
      ? qualifiedTanks 
      : validSquads.filter((s: any) => s.isTank);

    // 1. Top Defesa (Infantaria qualificada >= 3 membros)
    const topDefense = [...finalInfantry].sort((a: any, b: any) => (b.defenseScore || 0) - (a.defenseScore || 0))[0];

    // 2. Top Combate (Infantaria qualificada >= 3 membros)
    const topCombat = [...finalInfantry].sort((a: any, b: any) => (b.combatScore || 0) - (a.combatScore || 0))[0];

    // 3. Top Ofensivo (Infantaria qualificada >= 3 membros)
    const topOffense = [...finalInfantry].sort((a: any, b: any) => (b.offenseScore || 0) - (a.offenseScore || 0))[0];

    // 4. Top Suporte & Logística (Construção, nós de recursos, suprimentos - qualificada >= 3 membros)
    const topSupport = [...finalInfantry].sort((a: any, b: any) => (b.supportScore || 0) - (a.supportScore || 0))[0];

    // 5. Esquadrão Mais Kills (Infantaria qualificada >= 3 membros)
    const topKills = [...finalInfantry].sort((a: any, b: any) => (b.killsScore || 0) - (a.killsScore || 0))[0];

    // 6. Esquadrão com Mais Coesão Total (Infantaria qualificada >= 3 membros)
    const infantryWithCohesion = finalInfantry
      .filter((s: any) => totalSquadCohesion[s.key] !== undefined)
      .map((s: any) => ({ ...s, cohesionPercent: totalSquadCohesion[s.key] }));
    const topCohesion = [...infantryWithCohesion].sort((a: any, b: any) => b.cohesionPercent - a.cohesionPercent)[0];

    // 7. Esquadrão com Mais Abate em Tank (Prioridade para squads de blindados/tank)
    const topTankSquad = [...(finalTanks.length > 0 ? finalTanks : validSquads)].sort((a: any, b: any) => (b.vehiclesScore || 0) - (a.vehiclesScore || 0))[0];

    return {
      topDefense,
      topCombat,
      topOffense,
      topSupport,
      topKills,
      topCohesion,
      topTankSquad,
    };
  }, [allMatchSquads, totalSquadCohesion, honorsTeamFilter]);

  // Individual Honors (Oficiais, Soldados e Especialistas)
  const individualHonors = useMemo(() => {
    if (!playerStats || playerStats.length === 0) return null;

    let nonCasters = playerStats.filter((p: any) => !p.player?.toLowerCase().includes('shijima'));
    if (honorsTeamFilter !== 'all') {
      nonCasters = nonCasters.filter((p: any) => {
        const teamSide = typeof p.team === 'object' ? p.team?.side : p.team;
        return teamSide === honorsTeamFilter;
      });
    }
    if (nonCasters.length === 0) return null;

    const maxTs = Math.max(...playerStats.flatMap((p: any) => (p.units || []).map((u: any) => u.ts)), 5400);

    const tankGunners: any[] = [];
    const officers: any[] = [];
    const soldiers: any[] = [];
    const pureInfantry: any[] = [];

    nonCasters.forEach((p: any) => {
      const units = p.units || [];
      let offSec = 0;
      let tankSec = 0;
      let cmdSec = 0;
      let totSec = 0;

      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const start = u.ts;
        const end = (i + 1 < units.length) ? units[i + 1].ts : maxTs;
        const dur = Math.max(0, end - start);
        totSec += dur;
        if ([9, 4].includes(u.role)) offSec += dur;
        if ([11, 12].includes(u.role)) tankSec += dur;
        if (u.role === 13) cmdSec += dur;
      }

      const isOfficer = offSec >= 1200 || (totSec > 0 && offSec / totSec >= 0.35);
      const isTank = tankSec >= 600 || (totSec > 0 && tankSec / totSec >= 0.35);
      const isCmd = cmdSec >= 600 || (totSec > 0 && cmdSec / totSec >= 0.35);

      if (isTank) tankGunners.push(p);
      if (!isTank) pureInfantry.push(p);

      if (isOfficer) {
        officers.push(p);
      } else if (!isTank && !isCmd) {
        soldiers.push(p);
      }
    });

    // 1. Atirador de Tanque (Blindados): tripulante de blindado com mais veículos destruídos
    const topTankGunner = [...tankGunners].sort((a: any, b: any) => 
      (b.vehicles_destroyed || 0) - (a.vehicles_destroyed || 0) || (b.kills || 0) - (a.kills || 0)
    )[0];

    // 2. Oficiais (SLs)
    const validOfficers = officers.length > 0 ? officers : nonCasters;
    const topOfficerKills = [...validOfficers].sort((a: any, b: any) => (b.kills || 0) - (a.kills || 0))[0];
    const topOfficerDefense = [...validOfficers].sort((a: any, b: any) => (b.defense || 0) - (a.defense || 0))[0];
    const topOfficerSupport = [...validOfficers].sort((a: any, b: any) => (b.support || 0) - (a.support || 0))[0];
    const topOfficerCombat = [...validOfficers].sort((a: any, b: any) => (b.combat || 0) - (a.combat || 0))[0];
    const topOfficerOffense = [...validOfficers].sort((a: any, b: any) => (b.offense || 0) - (a.offense || 0))[0];

    // 3. Soldados (Não-Oficiais)
    const validSoldiers = soldiers.length > 0 ? soldiers : nonCasters;
    const topSoldierKills = [...validSoldiers].sort((a: any, b: any) => (b.kills || 0) - (a.kills || 0))[0];
    const topSoldierDefense = [...validSoldiers].sort((a: any, b: any) => (b.defense || 0) - (a.defense || 0))[0];
    const topSoldierSupport = [...validSoldiers].sort((a: any, b: any) => (b.support || 0) - (a.support || 0))[0];
    const topSoldierCombat = [...validSoldiers].sort((a: any, b: any) => (b.combat || 0) - (a.combat || 0))[0];
    const topSoldierOffense = [...validSoldiers].sort((a: any, b: any) => (b.offense || 0) - (a.offense || 0))[0];

    // 4. Infantaria Caçadora de Tanques
    const topInfantryTankHunter = [...pureInfantry].sort((a: any, b: any) => 
      (b.vehicles_destroyed || 0) - (a.vehicles_destroyed || 0) || (b.kills || 0) - (a.kills || 0)
    )[0];

    return {
      topTankGunner,
      // Oficiais
      topOfficerKills,
      topOfficerDefense,
      topOfficerSupport,
      topOfficerCombat,
      topOfficerOffense,
      // Soldados
      topSoldierKills,
      topSoldierDefense,
      topSoldierSupport,
      topSoldierCombat,
      topSoldierOffense,
      topInfantryTankHunter,
    };
  }, [playerStats, honorsTeamFilter]);

  // Frontline Calculation
  const frontlineData = useMemo(() => {
    if (!showFrontline) return null;
    const axis = activePositions.filter(p => p.team === 'axis' && p.currentPos.x !== 0);
    const allies = activePositions.filter(p => p.team === 'allies' && p.currentPos.x !== 0);
    if (axis.length === 0 || allies.length === 0) return null;

    const avgAxisX = axis.reduce((acc, p) => acc + p.currentPos.x, 0) / axis.length;
    const avgAxisY = axis.reduce((acc, p) => acc + p.currentPos.y, 0) / axis.length;
    const avgAlliesX = allies.reduce((acc, p) => acc + p.currentPos.x, 0) / allies.length;
    const avgAlliesY = allies.reduce((acc, p) => acc + p.currentPos.y, 0) / allies.length;

    const diffX = Math.abs(avgAxisX - avgAlliesX);
    const diffY = Math.abs(avgAxisY - avgAlliesY);
    const isHorizontal = diffX > diffY;

    const numBins = 20;
    const minCoord = -100000;
    const maxCoord = 100000;
    const binSize = (maxCoord - minCoord) / numBins;

    const points: { x: number, y: number }[] = [];
    const overallFrontX = (avgAxisX + avgAlliesX) / 2;
    const overallFrontY = (avgAxisY + avgAlliesY) / 2;

    let axisIsLeft = true;
    let axisIsTop = true;

    if (isHorizontal) {
      axisIsLeft = avgAxisX < avgAlliesX;
      for (let i = 0; i <= numBins; i++) {
        const binCenterY = minCoord + i * binSize;
        const axisInBin = axis.filter(p => Math.abs(p.currentPos.y - binCenterY) < binSize);
        const alliesInBin = allies.filter(p => Math.abs(p.currentPos.y - binCenterY) < binSize);

        let frontX = overallFrontX;
        if (axisInBin.length > 0 && alliesInBin.length > 0) {
          const axisFront = axisIsLeft ? Math.max(...axisInBin.map(p => p.currentPos.x)) : Math.min(...axisInBin.map(p => p.currentPos.x));
          const alliesFront = axisIsLeft ? Math.min(...alliesInBin.map(p => p.currentPos.x)) : Math.max(...alliesInBin.map(p => p.currentPos.x));
          frontX = (axisFront + alliesFront) / 2;
        } else if (axisInBin.length > 0) {
          frontX = axisIsLeft ? Math.max(...axisInBin.map(p => p.currentPos.x)) + 5000 : Math.min(...axisInBin.map(p => p.currentPos.x)) - 5000;
        } else if (alliesInBin.length > 0) {
          frontX = axisIsLeft ? Math.min(...alliesInBin.map(p => p.currentPos.x)) - 5000 : Math.max(...alliesInBin.map(p => p.currentPos.x)) + 5000;
        }
        points.push({ x: frontX, y: binCenterY });
      }
    } else {
      axisIsTop = avgAxisY < avgAlliesY;
      for (let i = 0; i <= numBins; i++) {
        const binCenterX = minCoord + i * binSize;
        const axisInBin = axis.filter(p => Math.abs(p.currentPos.x - binCenterX) < binSize);
        const alliesInBin = allies.filter(p => Math.abs(p.currentPos.x - binCenterX) < binSize);

        let frontY = overallFrontY;
        if (axisInBin.length > 0 && alliesInBin.length > 0) {
          const axisFront = axisIsTop ? Math.max(...axisInBin.map(p => p.currentPos.y)) : Math.min(...axisInBin.map(p => p.currentPos.y));
          const alliesFront = axisIsTop ? Math.min(...alliesInBin.map(p => p.currentPos.y)) : Math.max(...alliesInBin.map(p => p.currentPos.y));
          frontY = (axisFront + alliesFront) / 2;
        } else if (axisInBin.length > 0) {
          frontY = axisIsTop ? Math.max(...axisInBin.map(p => p.currentPos.y)) + 5000 : Math.min(...axisInBin.map(p => p.currentPos.y)) - 5000;
        } else if (alliesInBin.length > 0) {
          frontY = axisIsTop ? Math.min(...alliesInBin.map(p => p.currentPos.y)) - 5000 : Math.max(...alliesInBin.map(p => p.currentPos.y)) + 5000;
        }
        points.push({ x: binCenterX, y: frontY });
      }
    }

    // Apply simple smoothing
    for (let j = 0; j < 3; j++) {
      for (let i = 1; i < points.length - 1; i++) {
        if (isHorizontal) {
          points[i].x = (points[i-1].x + points[i].x + points[i+1].x) / 3;
        } else {
          points[i].y = (points[i-1].y + points[i].y + points[i+1].y) / 3;
        }
      }
    }

    const curvePoints = points.map(p => `${mapCoordToPercent(p.x)},${mapCoordToPercent(p.y)}`).join(' ');

    // Polygons for shading territories
    let axisPolygon = '';
    let alliesPolygon = '';

    if (isHorizontal) {
       axisPolygon = axisIsLeft 
          ? `0,0 ${curvePoints} 0,100` 
          : `100,0 ${curvePoints} 100,100`;
       alliesPolygon = axisIsLeft
          ? `100,0 ${curvePoints} 100,100`
          : `0,0 ${curvePoints} 0,100`;
    } else {
       axisPolygon = axisIsTop
          ? `0,0 ${curvePoints} 100,0`
          : `0,100 ${curvePoints} 100,100`;
       alliesPolygon = axisIsTop
          ? `0,100 ${curvePoints} 100,100`
          : `0,0 ${curvePoints} 100,0`;
    }

    return { curvePoints, axisPolygon, alliesPolygon };
  }, [activePositions, showFrontline]);

  // Heatmap rendering
  useEffect(() => {
    if (heatmapType === 'none' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    ctx.clearRect(0, 0, width, height);

    if (heatmapType === 'presence') {
      matchData.players_list.forEach(player => {
          if (teamFilter !== 'all' && player.team !== teamFilter) return;
          
          const color = player.team === 'axis' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(59, 130, 246, 0.05)';
          ctx.fillStyle = color;

          for (let i = 0; i < player.position.length; i++) {
              const pos = player.position[i];
              if (pos.time > currentTime) break;
              if (pos.x === 0 && pos.y === 0) continue;

              const px = ((pos.x + 100000) / 200000) * width;
              const py = ((pos.y + 100000) / 200000) * height;

              ctx.beginPath();
              ctx.arc(px, py, 4, 0, Math.PI * 2);
              ctx.fill();
          }
      });
    } else if (heatmapType === 'deaths') {
      historicalDeaths.forEach(d => {
        if (teamFilter !== 'all' && d.team !== teamFilter) return;

        const x = ((d.x + 100000) / 200000) * width;
        const y = ((d.y + 100000) / 200000) * height;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
        const isAxis = d.team === 'axis';
        // Blood red for axis deaths, blue for allied deaths
        const color = isAxis ? '220, 38, 38' : '37, 99, 235'; 
        
        gradient.addColorStop(0, `rgba(${color}, 0.8)`);
        gradient.addColorStop(0.5, `rgba(${color}, 0.2)`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillRect(x - 30, y - 30, 60, 60);
        ctx.globalCompositeOperation = 'source-over';
      });
    }
  }, [heatmapType, currentTime, matchData, teamFilter, historicalDeaths]);

  // Determine current score based on timeline
  const currentScore = useMemo(() => {
    let latest = capFlips.length > 0 ? capFlips[0] : { allied_score: 2, axis_score: 3 }; // standard start or whatever first event says
    // Actually, at ts=0, the score is usually 2-3, 3-2, or 2-2 depending on the map type.
    for (const flip of capFlips) {
      if (flip.ts <= currentTime) {
        latest = flip;
      } else {
        break;
      }
    }
    return latest;
  }, [capFlips, currentTime]);

  useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      const tick = (now: number) => {
        const delta = (now - lastTime) / 1000; // in seconds
        lastTime = now;
        setCurrentTime(prev => {
          const next = prev + (delta * playbackSpeed);
          if (next >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return next;
        });
        animationRef.current = requestAnimationFrame(tick);
      };
      animationRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playbackSpeed, maxTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card shadow-2xl border-accent/20">
        <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline flex items-center gap-2">
              Replay Interativo: {matchTitle || matchData.map}
            </CardTitle>
            <CardDescription>Análise tática de movimentação da partida</CardDescription>
          </div>
          
          <div className="flex items-center gap-4 bg-background px-4 py-2 rounded-lg border shadow-sm">
             <div className="flex flex-col items-center">
               <span className="text-[10px] uppercase font-bold text-muted-foreground">Eixo</span>
               <span className="text-2xl font-black text-red-500">{currentScore.axis_score}</span>
             </div>
             <div className="text-xl font-bold text-muted-foreground">-</div>
             <div className="flex flex-col items-center">
               <span className="text-[10px] uppercase font-bold text-muted-foreground">Aliados</span>
               <span className="text-2xl font-black text-blue-500">{currentScore.allied_score}</span>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative">
          <div className="relative w-full h-[70vh] min-h-[500px] bg-black/10 border-2 border-border rounded-xl overflow-hidden shadow-inner flex items-center justify-center bg-stone-900 cursor-grab active:cursor-grabbing">
            <TransformWrapper
               ref={transformComponentRef}
               initialScale={1}
               minScale={0.5}
               maxScale={4}
               centerOnInit={true}
            >
              {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
                <>
                  {/* Director Camera Active Badge */}
                  {isCinematicMode && (
                    <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-stone-950/85 border border-amber-500/50 text-amber-300 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md">
                      <Clapperboard className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold tracking-wider uppercase">Câmera Diretor Ativa</span>
                    </div>
                  )}

                  {/* Cinematic Broadcast HUD on Map */}
                  {currentHighlight && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-xl w-[92%] transition-all animate-in fade-in slide-in-from-bottom-5 duration-500">
                      <div className="bg-stone-950/90 border border-amber-500/60 backdrop-blur-md rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.85)] text-white">
                        <div className="flex items-center justify-between gap-3 mb-2 border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5" /> Transmissão Tática • {currentHighlight.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono bg-black/40 border border-white/10 px-2 py-0.5 rounded text-muted-foreground">
                            {formatTime(currentTime)} / {formatTime(currentHighlight.endTime)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-headline font-black text-sm sm:text-base text-foreground truncate">
                              {currentHighlight.subtitle}
                            </div>
                            <p className="text-xs text-stone-300 mt-0.5 line-clamp-1">
                              {currentHighlight.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl font-mono text-xs">
                            <div className="text-blue-400 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                              {currentHighlight.alliesDeaths}
                            </div>
                            <span className="text-stone-500">vs</span>
                            <div className="text-red-400 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                              {currentHighlight.axisDeaths}
                            </div>
                          </div>
                        </div>

                        {currentHighlight.nearbySquads.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-bold uppercase tracking-wider text-stone-400">Esquadrões na Ação:</span>
                            {currentHighlight.nearbySquads.map((sq, i) => (
                              <span key={i} className={`px-1.5 py-0.5 rounded border ${
                                sq.team === 'allies' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
                              }`}>
                                {sq.officerName ? `${sq.officerName} (Sq ${sq.squadId})` : `Squad ${sq.squadId}`}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-background/80 p-2 rounded-lg border shadow-lg backdrop-blur">
                    <Button variant="secondary" size="icon" onClick={() => zoomIn()}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => zoomOut()}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => resetTransform()}>
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Quick Access Sidebars */}
                  {showOfficers && (() => {
                    const infantrySquads = allMatchSquads.filter(s => !s.isTank);
                    let maxAccCohesion = -1;
                    let minAccCohesion = 101;
                    if (showCohesionPercent) {
                      infantrySquads.forEach(sq => {
                         const score = accumulatedCohesion[sq.key];
                         if (score !== undefined) {
                            if (score > maxAccCohesion) maxAccCohesion = score;
                            if (score < minAccCohesion) minAccCohesion = score;
                         }
                      });
                    }

                    return (
                    <>
                      <div className="absolute left-2 top-2 bottom-2 w-64 bg-black/60 backdrop-blur-md border border-red-500/30 rounded-lg p-2 z-50 overflow-y-auto hidden lg:flex flex-col gap-1 shadow-2xl">
                        <h4 className="text-red-500 font-bold text-[10px] mb-2 uppercase tracking-widest border-b border-red-500/20 pb-1">Oficiais Eixo</h4>
                        {allMatchSquads.filter(s => s.team === 'axis').map(sq => {
                          const isSelected = highlightedSquad === sq.key;
                          const accScore = accumulatedCohesion[sq.key];
                          const isMaxAcc = accScore !== undefined && accScore === maxAccCohesion && maxAccCohesion > 0;
                          const isMinAcc = accScore !== undefined && accScore === minAccCohesion && minAccCohesion < 101;
                          
                          return (
                            <div 
                              key={sq.key} 
                              onClick={() => setHighlightedSquad(isSelected ? null : sq.key)}
                              className={`text-xs p-1.5 rounded cursor-pointer transition-colors flex items-center justify-between gap-1 ${isSelected ? 'bg-red-500 text-white font-bold shadow-lg' : 'text-red-100 hover:bg-red-500/20'}`}
                            >
                               <div className="flex items-center gap-2 truncate">
                                 {sq.isTank ? <Truck className="w-3 h-3 text-orange-400 shrink-0" /> : <Shield className="w-3 h-3 text-red-400 shrink-0" />}
                                 <span className="truncate">{sq.officerName ? sq.officerName : `Squad ${sq.squadId}`}</span>
                               </div>
                               {showCohesionPercent && !sq.isTank && (
                                 <div className="flex items-center gap-1 shrink-0">
                                   {sq.isMaxCombat && <span title="Maior Combate" className="bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">⚔️+</span>}
                                   {sq.isMinCombat && <span title="Menor Combate" className="bg-gray-700 text-gray-300 text-[8px] font-bold px-1 rounded">⚔️-</span>}
                                   {accScore !== undefined && (
                                     <span className={`text-[9px] font-bold px-1 rounded ${isMaxAcc ? 'bg-green-500 text-black' : isMinAcc ? 'bg-red-800 text-white' : 'bg-white/20'}`}>
                                        {accScore}% {isMaxAcc ? '🏆' : isMinAcc ? '⚠️' : ''}
                                     </span>
                                   )}
                                 </div>
                               )}
                            </div>
                          )
                        })}
                      </div>

                      <div className="absolute right-16 top-2 bottom-2 w-64 bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-lg p-2 z-50 overflow-y-auto hidden lg:flex flex-col gap-1 shadow-2xl">
                        <h4 className="text-blue-500 font-bold text-[10px] mb-2 uppercase tracking-widest border-b border-blue-500/20 pb-1">Oficiais Aliados</h4>
                        {allMatchSquads.filter(s => s.team === 'allies').map(sq => {
                          const isSelected = highlightedSquad === sq.key;
                          const accScore = accumulatedCohesion[sq.key];
                          const isMaxAcc = accScore !== undefined && accScore === maxAccCohesion && maxAccCohesion > 0;
                          const isMinAcc = accScore !== undefined && accScore === minAccCohesion && minAccCohesion < 101;

                          return (
                            <div 
                              key={sq.key} 
                              onClick={() => setHighlightedSquad(isSelected ? null : sq.key)}
                              className={`text-xs p-1.5 rounded cursor-pointer transition-colors flex items-center justify-between gap-1 ${isSelected ? 'bg-blue-500 text-white font-bold shadow-lg' : 'text-blue-100 hover:bg-blue-500/20'}`}
                            >
                               <div className="flex items-center gap-2 truncate">
                                 {sq.isTank ? <Truck className="w-3 h-3 text-orange-400 shrink-0" /> : <Shield className="w-3 h-3 text-blue-400 shrink-0" />}
                                 <span className="truncate">{sq.officerName ? sq.officerName : `Squad ${sq.squadId}`}</span>
                               </div>
                               {showCohesionPercent && !sq.isTank && (
                                 <div className="flex items-center gap-1 shrink-0">
                                   {sq.isMaxCombat && <span title="Maior Combate" className="bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">⚔️+</span>}
                                   {sq.isMinCombat && <span title="Menor Combate" className="bg-gray-700 text-gray-300 text-[8px] font-bold px-1 rounded">⚔️-</span>}
                                   {accScore !== undefined && (
                                     <span className={`text-[9px] font-bold px-1 rounded ${isMaxAcc ? 'bg-green-500 text-black' : isMinAcc ? 'bg-red-800 text-white' : 'bg-white/20'}`}>
                                        {accScore}% {isMaxAcc ? '🏆' : isMinAcc ? '⚠️' : ''}
                                     </span>
                                   )}
                                 </div>
                               )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                    );
                  })()}

                  <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                    <div className="relative w-[2000px] h-[2000px] origin-center">
                       {/* Map Background */}
                       <Image 
                          src={mapImageUrl || "/maps/utah.jpg"} 
                          alt="Tactical Map" 
                          fill 
                          className="object-cover"
                          priority
                          unoptimized
                       />

                       {/* Heatmap Layer */}
                       {heatmapType !== 'none' && (
                         <canvas 
                           ref={canvasRef}
                           width={2000} 
                           height={2000} 
                           className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                         />
                       )}

                       {/* Frontline Overlay */}
                       {showFrontline && frontlineData && (
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-40">
                             {/* Territories */}
                             <polygon points={frontlineData.axisPolygon} fill="rgba(239, 68, 68, 0.2)" />
                             <polygon points={frontlineData.alliesPolygon} fill="rgba(59, 130, 246, 0.2)" />
                             
                             {/* The thick border line */}
                             <polyline 
                               points={frontlineData.curvePoints} 
                               fill="none" 
                               stroke="white" 
                               strokeWidth="0.3" 
                               strokeLinecap="round" 
                               strokeLinejoin="round" 
                               className="drop-shadow-[0_0_2px_rgba(255,255,255,1)]"
                             />
                          </svg>
                       )}

                       {/* SVG Trails Layer */}
                       {showTrails && heatmapType === 'none' && (
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full z-20 pointer-events-none">
                            {activePositions.map(player => {
                              if (player.trail.length < 2) return null;
                              
                              const sqKey = `${player.team}-${player.currentSquad}`;
                              const isHighlighted = highlightedSquad === null || highlightedSquad === sqKey;
                              if (!isHighlighted && highlightedSquad !== null) return null; // Hide other trails entirely

                              const points = player.trail.map(pos => `${mapCoordToPercent(pos.x)},${mapCoordToPercent(pos.y)}`).join(' ');
                              const strokeColor = player.team === 'axis' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)';
                              return (
                                <polyline 
                                  key={`trail-${player.id}`} 
                                  points={points} 
                                  fill="none" 
                                  stroke={strokeColor} 
                                  strokeWidth={isHighlighted && highlightedSquad !== null ? "0.3" : "0.1"} 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                />
                              );
                            })}
                          </svg>
                       )}

                       {/* Death Markers Layer */}
                       {showDeaths && heatmapType === 'none' && recentDeaths.map(death => {
                         const left = mapCoordToPercent(death.x);
                         const top = mapCoordToPercent(death.y);
                         const age = currentTime - death.time; // 0 to 60
                         const opacity = Math.max(0.2, 1 - (age / 60)); // fades out over 60 seconds
                         const isAxis = death.team === 'axis';
                         
                         return (
                           <div
                             key={death.id}
                             className={`absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center`}
                             style={{ left: `${left}%`, top: `${top}%`, opacity }}
                           >
                              <Skull className={`w-5 h-5 ${isAxis ? 'text-red-500' : 'text-blue-500'} drop-shadow-[0_0_4px_rgba(0,0,0,1)] animate-pulse`} />
                           </div>
                         );
                       })}

                       {/* Player Dots */}
                       {heatmapType === 'none' && activePositions.map(player => {
                         if (!player.currentPos) return null;
                         
                         // When players die, their position resets to exactly 0,0. We should hide them.
                         if (player.currentPos.x === 0 && player.currentPos.y === 0) return null;
                         
                         // X is usually Left-Right, Y is usually Top-Bottom in HLL maps.
                         const left = mapCoordToPercent(player.currentPos.x);
                         const top = mapCoordToPercent(player.currentPos.y);

                         const isAxis = player.team === 'axis';
                         const colorClass = isAxis ? 'bg-red-600 border-red-800' : 'bg-blue-600 border-blue-800';
                         
                         const roleData = player.currentRole !== null ? ROLE_MAPPING[player.currentRole] : null;
                         const IconComponent = roleData?.icon || User;
                         
                         const sqKey = `${player.team}-${player.currentSquad}`;
                         const isHighlighted = highlightedSquad === null || highlightedSquad === sqKey;
                         const opacityClass = isHighlighted ? 'opacity-100 z-40' : 'opacity-20 z-10 grayscale';

                         return (
                           <div
                             key={player.id}
                             className={`absolute w-5 h-5 border-2 rounded-full ${colorClass} ${opacityClass} text-white flex items-center justify-center shadow-[0_0_8px_rgba(0,0,0,0.8)] transition-[opacity,transform] duration-150 transform -translate-x-1/2 -translate-y-1/2 cursor-crosshair group`}
                             style={{ left: `${left}%`, top: `${top}%` }}
                           >
                              {/* Role Icon */}
                              <IconComponent className="w-2.5 h-2.5" />

                              {/* Tooltip */}
                              <span className="opacity-0 group-hover:opacity-100 absolute left-6 top-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap bg-background border border-border px-3 py-2 rounded shadow-2xl pointer-events-none z-50 flex flex-col scale-150 origin-left">
                                <span>{player.name}</span>
                                {player.currentRole !== null && (
                                   <span className="text-[10px] font-normal text-muted-foreground mt-1">
                                     Classe: {roleData?.name || player.currentRole} | Squad: {player.currentSquad === 0 ? 'Comandante' : player.currentSquad}
                                   </span>
                                )}
                              </span>
                           </div>
                         );
                       })}
                    </div>
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-col gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button variant="outline" size="icon" onClick={() => setCurrentTime(0)} className="hover:text-accent">
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button variant={isPlaying ? "default" : "secondary"} size="lg" onClick={() => setIsPlaying(!isPlaying)} className={isPlaying ? "bg-accent hover:bg-accent/80 text-accent-foreground" : ""}>
                    {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                    {isPlaying ? "Pausar" : "Reproduzir"}
                  </Button>
                  {/* Seletor de Velocidade com opção 10x */}
                  <div className="flex items-center bg-background border rounded-lg p-0.5 shadow-sm">
                    <span className="text-[11px] font-bold text-muted-foreground px-2 flex items-center gap-1">
                      <FastForward className="w-3.5 h-3.5" /> Vel:
                    </span>
                    {[1, 2, 5, 10, 20, 50].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                          playbackSpeed === spd
                            ? 'bg-accent text-accent-foreground shadow-sm scale-105'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <div className="flex bg-background border rounded-md ml-2">
                    <Button variant={teamFilter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTeamFilter('all')} className="rounded-none rounded-l-md">Ambos</Button>
                    <Button variant={teamFilter === 'axis' ? 'destructive' : 'ghost'} size="sm" onClick={() => setTeamFilter('axis')} className="rounded-none">Eixo</Button>
                    <Button variant={teamFilter === 'allies' ? 'default' : 'ghost'} size="sm" onClick={() => setTeamFilter('allies')} className="rounded-none rounded-r-md bg-blue-600 hover:bg-blue-700">Aliados</Button>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant={isCinematicMode ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => {
                        const next = !isCinematicMode;
                        setIsCinematicMode(next);
                        if (!next) resetCamera(1000);
                      }}
                      className={isCinematicMode ? "bg-amber-600 hover:bg-amber-700 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)] border-amber-500 font-bold" : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"}
                      title="Câmera autônoma com zoom dinâmico nos clímax e desaceleração tática dramática"
                    >
                      <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
                      {isCinematicMode ? 'Diretor: Ativo' : 'Modo Cinematográfico'}
                    </Button>
                    <Button 
                      variant={showStoryDrawer ? 'secondary' : 'outline'} 
                      size="sm" 
                      onClick={() => setShowStoryDrawer(!showStoryDrawer)}
                      className={showStoryDrawer ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "text-muted-foreground"}
                      title="Ver e navegar pelos capítulos decisivos da partida"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      Capítulos ({cinematicHighlights.length})
                    </Button>
                    <Button variant={smoothMovement ? 'default' : 'outline'} size="sm" onClick={() => setSmoothMovement(!smoothMovement)} className={smoothMovement ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""} title="Interpolação contínua e suave de posições (sem teletransporte)">
                      <Activity className="w-3.5 h-3.5 mr-1.5" />
                      {smoothMovement ? 'Movimento Suave' : 'Modo Bruto'}
                    </Button>
                    <Button variant={showFrontline ? 'default' : 'outline'} size="sm" onClick={() => setShowFrontline(!showFrontline)} className={showFrontline ? "bg-purple-600 hover:bg-purple-700" : ""}>
                      Frontline
                    </Button>
                    <Button variant={showTrails ? 'secondary' : 'outline'} size="sm" onClick={() => setShowTrails(!showTrails)} disabled={heatmapType !== 'none'}>
                      Rastros
                    </Button>
                    <Button variant={showDeaths ? 'destructive' : 'outline'} size="sm" onClick={() => setShowDeaths(!showDeaths)} disabled={heatmapType !== 'none'}>
                      Baixas (60s)
                    </Button>
                    <Button variant={showOfficers ? 'default' : 'outline'} size="sm" onClick={() => setShowOfficers(!showOfficers)}>
                      {showOfficers ? 'Ocultar Oficiais' : 'Mostrar Oficiais'}
                    </Button>
                    <Button variant={showCohesionPercent ? 'default' : 'outline'} size="sm" onClick={() => setShowCohesionPercent(!showCohesionPercent)} className={showCohesionPercent ? "bg-green-600 hover:bg-green-700" : ""}>
                      % Coesão
                    </Button>
                    <Button variant={heatmapType === 'presence' ? 'secondary' : 'outline'} size="sm" onClick={() => setHeatmapType(heatmapType === 'presence' ? 'none' : 'presence')}>
                      Heatmap (Posições)
                    </Button>
                    <Button variant={heatmapType === 'deaths' ? 'destructive' : 'outline'} size="sm" onClick={() => setHeatmapType(heatmapType === 'deaths' ? 'none' : 'deaths')} className={heatmapType === 'deaths' ? "bg-red-800 hover:bg-red-900 text-white" : ""}>
                      Heatmap (Mortes)
                    </Button>
                  </div>
                </div>
                
                <div className="font-mono font-bold text-2xl text-accent bg-background px-4 py-2 rounded-lg border shadow-sm">
                  {formatTime(currentTime)}
                </div>
             </div>

             <div className="flex items-center gap-4 relative">
                <span className="text-xs font-mono text-muted-foreground">0:00</span>
                
                <div className="relative flex-1 group">
                    <Slider 
                        value={[currentTime]} 
                        min={0} 
                        max={maxTime} 
                        step={1} 
                        onValueChange={(vals) => setCurrentTime(vals[0])}
                        className="relative z-10"
                    />
                    
                    {/* Chapter & Climax Markers on Timeline */}
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 pointer-events-none z-20 px-2">
                       {cinematicHighlights.map((hl) => {
                          if (maxTime === 0) return null;
                          const percent = (hl.peakTime / maxTime) * 100;
                          const isActive = currentHighlight?.id === hl.id;
                          return (
                             <button
                               key={hl.id}
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 playHighlight(hl);
                               }}
                               className="absolute top-1/2 -translate-y-1/2 transform -translate-x-1/2 pointer-events-auto cursor-pointer group/pin focus:outline-none"
                               style={{ left: `${percent}%` }}
                             >
                                <div className={`w-3.5 h-3.5 rounded-full border border-black/80 flex items-center justify-center transition-transform shadow-md ${
                                  isActive 
                                    ? 'bg-amber-400 scale-150 ring-2 ring-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]' 
                                    : 'bg-red-500 group-hover/pin:scale-125 group-hover/pin:bg-amber-400'
                                }`}>
                                   <Flame className="w-2 h-2 text-white fill-white" />
                                </div>
                                
                                <div className="opacity-0 group-hover/pin:opacity-100 pointer-events-none transition-all duration-200 absolute bottom-6 left-1/2 -translate-x-1/2 bg-stone-950/95 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-2xl text-left whitespace-nowrap z-50 scale-95 origin-bottom">
                                   <div className="text-[10px] font-mono font-bold text-amber-400">{formatTime(hl.peakTime)} • {hl.title}</div>
                                   <div className="text-[9px] text-stone-300">{hl.totalDeaths} baixas ({hl.alliesDeaths}A vs {hl.axisDeaths}E)</div>
                                </div>
                             </button>
                          );
                       })}
                    </div>

                    {/* Cap Flip Markers */}
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 pointer-events-none z-0 px-2">
                       {capFlips.map((flip, i) => {
                          if (maxTime === 0) return null;
                          const percent = (flip.ts / maxTime) * 100;
                          return (
                             <div 
                               key={`flip-${i}`} 
                               className="absolute w-1 h-3 bg-accent/80 rounded transform -translate-x-1/2 -translate-y-1/2"
                               style={{ left: `${percent}%` }}
                               title={`Captura: ${flip.axis_score} - ${flip.allied_score} aos ${formatTime(flip.ts)}`}
                             />
                          );
                       })}
                    </div>
                </div>

                <span className="text-xs font-mono text-muted-foreground">{formatTime(maxTime)}</span>
             </div>
          </div>

          {/* Seção Cinematográfica: Capítulos e Momentos Épicos da Partida */}
          {cinematicHighlights.length > 0 && showStoryDrawer && (
            <div className="mt-8 border border-amber-500/30 bg-gradient-to-b from-card to-card/70 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-amber-500/10 via-muted/30 to-transparent p-4 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                    <Clapperboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-headline font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      História da Partida: Momentos Decisivos Detectados pela IA
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                        {cinematicHighlights.length} Capítulos
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Clique em qualquer capítulo para saltar no tempo, posicionar a câmera automaticamente e reviver o clímax em velocidade dramática.
                    </p>
                  </div>
                </div>

                <Button
                  variant={isCinematicMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const next = !isCinematicMode;
                    setIsCinematicMode(next);
                    if (next && cinematicHighlights.length > 0) {
                      playHighlight(cinematicHighlights[0]);
                    } else {
                      resetCamera(1000);
                    }
                  }}
                  className={isCinematicMode ? "bg-amber-600 hover:bg-amber-700 text-white font-bold" : "border-amber-500/40 text-amber-400"}
                >
                  <Video className="w-4 h-4 mr-2" />
                  {isCinematicMode ? 'Reproduzindo Diretor' : 'Assistir do Início ao Fim'}
                </Button>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cinematicHighlights.map((hl) => {
                  const isCurrent = currentHighlight?.id === hl.id;
                  return (
                    <div
                      key={hl.id}
                      onClick={() => playHighlight(hl)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group hover:scale-[1.02] ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_20px_rgba(217,119,6,0.25)] ring-1 ring-amber-500'
                          : 'bg-muted/10 border-border/60 hover:border-amber-500/40 hover:bg-muted/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-background border text-amber-400 flex items-center gap-1.5 shadow-sm">
                            <Flame className="w-3 h-3 text-red-500" />
                            {formatTime(hl.peakTime)}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            Capítulo {hl.chapterIndex}
                          </span>
                        </div>

                        <div className="font-headline font-bold text-sm text-foreground group-hover:text-amber-400 transition-colors">
                          {hl.title.replace(/^Capítulo \d+: /, '')}
                        </div>

                        <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                          {hl.subtitle}
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {hl.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-blue-400 font-bold">{hl.alliesDeaths}A</span>
                          <span className="text-muted-foreground text-[9px]">vs</span>
                          <span className="text-red-400 font-bold">{hl.axisDeaths}E</span>
                          <span className="text-[9px] text-muted-foreground ml-1">({hl.totalDeaths} mortes)</span>
                        </div>

                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Assistir <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Squad Cohesion Panel */}
          {squadCohesion.length > 0 && (
            <div className="mt-6 border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/40 p-3 border-b">
                <h3 className="text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Inteligência de Coesão de Esquadrão
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {squadCohesion.slice(0, 6).map((sq: any) => {
                    const isAxis = sq.team === 'axis';
                    const sqKey = `${sq.team}-${sq.squadId}`;
                    const isSelected = highlightedSquad === sqKey;
                    
                    return (
                      <div 
                        key={sqKey} 
                        onClick={() => setHighlightedSquad(isSelected ? null : sqKey)}
                        className={`p-3 rounded border flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          isSelected 
                            ? 'ring-2 ring-accent bg-accent/10 border-accent' 
                            : isAxis 
                              ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/50' 
                              : 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm truncate pr-2 flex items-center gap-1">
                            {sq.isTank && <Truck className="w-4 h-4 text-orange-500" />}
                            {isAxis ? 'Eixo' : 'Aliados'} - {sq.isTank ? 'Tanque' : 'Squad'} {sq.squadId}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex-shrink-0 ${sq.score > 80 ? 'bg-green-500/20 text-green-500' : sq.score > 50 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                            {sq.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1 bg-black/10 px-2 py-1 rounded">
                          <span className="truncate">Líder: {sq.officer ? <span className="font-bold text-foreground">{sq.officer.name}</span> : <span className="text-red-500">Nenhum</span>}</span>
                          <span className="flex-shrink-0 ml-2">Membros: {sq.members.length}</span>
                        </div>
                        <div className="mt-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Índice: {sq.score.toFixed(0)}%</span>
                            <span>{sq.avgDistanceMeters.toFixed(0)}m de dist.</span>
                          </div>
                          <div className="w-full bg-black/20 h-1.5 rounded overflow-hidden">
                            <div className={`h-full ${sq.score > 80 ? 'bg-green-500' : sq.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${sq.score}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quadro de Honra: Destaques dos Esquadrões e Individuais com Filtro de Time */}
          {(squadHonors || individualHonors) && (
            <div className="mt-8 space-y-4">
              {/* Header do Quadro de Honra com Filtro de Time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3.5 rounded-xl border border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-headline font-bold uppercase tracking-wider text-foreground">
                      Quadro de Honras da Partida
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Reconhecimento dos melhores esquadrões e combatentes MVPs da partida
                    </p>
                  </div>
                </div>

                {/* Filtro Todos / Aliados / Eixo */}
                <div className="flex items-center gap-1.5 bg-background border p-1 rounded-lg shadow-inner self-start sm:self-auto">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-2">Filtrar:</span>
                  <button
                    onClick={() => setHonorsTeamFilter('all')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      honorsTeamFilter === 'all'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setHonorsTeamFilter('allies')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      honorsTeamFilter === 'allies'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-blue-400'
                    }`}
                  >
                    Aliados
                  </button>
                  <button
                    onClick={() => setHonorsTeamFilter('axis')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      honorsTeamFilter === 'axis'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-red-400'
                    }`}
                  >
                    Eixo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Painel 1: Destaques dos Esquadrões */}
                <div className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-muted/40 p-3.5 border-b flex items-center justify-between">
                    <h3 className="text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" /> Destaques dos Esquadrões
                    </h3>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {honorsTeamFilter === 'all' ? 'Geral' : honorsTeamFilter === 'allies' ? 'Aliados' : 'Eixo'}
                    </span>
                  </div>
                  
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Top Defesa */}
                    {squadHonors?.topDefense && (
                      <div 
                        onClick={() => setHighlightedSquad(squadHonors.topDefense.key === highlightedSquad ? null : squadHonors.topDefense.key)}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          squadHonors.topDefense.team === 'axis' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/60' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
                            <Shield className="w-3.5 h-3.5 text-blue-500" /> Top Defesa
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${squadHonors.topDefense.team === 'axis' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {squadHonors.topDefense.team === 'axis' ? 'Eixo' : 'Aliados'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-foreground flex items-center gap-1">
                              {squadHonors.topDefense.isTank ? <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span className="truncate">{squadHonors.topDefense.officerName || `Squad ${squadHonors.topDefense.squadId}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Squad {squadHonors.topDefense.squadId} • {squadHonors.topDefense.membersCount} soldados ({squadHonors.topDefense.avgDefense?.toLocaleString()}/homem)
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-blue-400">{squadHonors.topDefense.defenseScore.toLocaleString()}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Defesa</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Combate */}
                    {squadHonors?.topCombat && (
                      <div 
                        onClick={() => setHighlightedSquad(squadHonors.topCombat.key === highlightedSquad ? null : squadHonors.topCombat.key)}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          squadHonors.topCombat.team === 'axis' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/60' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
                            <Flame className="w-3.5 h-3.5 text-yellow-500" /> Top Combate
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${squadHonors.topCombat.team === 'axis' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {squadHonors.topCombat.team === 'axis' ? 'Eixo' : 'Aliados'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-foreground flex items-center gap-1">
                              {squadHonors.topCombat.isTank ? <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span className="truncate">{squadHonors.topCombat.officerName || `Squad ${squadHonors.topCombat.squadId}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Squad {squadHonors.topCombat.squadId} • {squadHonors.topCombat.membersCount} soldados ({squadHonors.topCombat.avgCombat?.toLocaleString()}/homem)
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-yellow-500">{squadHonors.topCombat.combatScore.toLocaleString()}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Combate</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Ofensivo */}
                    {squadHonors?.topOffense && (
                      <div 
                        onClick={() => setHighlightedSquad(squadHonors.topOffense.key === highlightedSquad ? null : squadHonors.topOffense.key)}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          squadHonors.topOffense.team === 'axis' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/60' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
                            <Flag className="w-3.5 h-3.5 text-red-500" /> Top Ofensivo
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${squadHonors.topOffense.team === 'axis' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {squadHonors.topOffense.team === 'axis' ? 'Eixo' : 'Aliados'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-foreground flex items-center gap-1">
                              {squadHonors.topOffense.isTank ? <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span className="truncate">{squadHonors.topOffense.officerName || `Squad ${squadHonors.topOffense.squadId}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Squad {squadHonors.topOffense.squadId} • {squadHonors.topOffense.membersCount} soldados ({squadHonors.topOffense.avgOffense?.toLocaleString()}/homem)
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-red-400">{squadHonors.topOffense.offenseScore.toLocaleString()}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Ataque</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Suporte & Logística */}
                    {squadHonors?.topSupport && (
                      <div 
                        onClick={() => setHighlightedSquad(squadHonors.topSupport.key === highlightedSquad ? null : squadHonors.topSupport.key)}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          squadHonors.topSupport.team === 'axis' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/60' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
                            <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Top Suporte & Nós
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${squadHonors.topSupport.team === 'axis' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {squadHonors.topSupport.team === 'axis' ? 'Eixo' : 'Aliados'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-foreground flex items-center gap-1">
                              {squadHonors.topSupport.isTank ? <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span className="truncate">{squadHonors.topSupport.officerName || `Squad ${squadHonors.topSupport.squadId}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Squad {squadHonors.topSupport.squadId} • {squadHonors.topSupport.membersCount} soldados ({squadHonors.topSupport.avgSupport?.toLocaleString()}/homem)
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-cyan-400">{squadHonors.topSupport.supportScore.toLocaleString()}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Suporte</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Esquadrão Mais Kills */}
                    {squadHonors?.topKills && (
                      <div 
                        onClick={() => setHighlightedSquad(squadHonors.topKills.key === highlightedSquad ? null : squadHonors.topKills.key)}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          squadHonors.topKills.team === 'axis' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/60' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
                            <Target className="w-3.5 h-3.5 text-green-500" /> Esquadrão Mais Kills
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${squadHonors.topKills.team === 'axis' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {squadHonors.topKills.team === 'axis' ? 'Eixo' : 'Aliados'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-foreground flex items-center gap-1">
                              {squadHonors.topKills.isTank ? <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span className="truncate">{squadHonors.topKills.officerName || `Squad ${squadHonors.topKills.squadId}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Squad {squadHonors.topKills.squadId} • {squadHonors.topKills.membersCount} soldados ({squadHonors.topKills.avgKills}/homem)
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-green-400">{squadHonors.topKills.killsScore}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Abates Totais</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Esquadrão Mais Coesão Total */}
                    {squadHonors?.topCohesion && (
                      <div 
                        onClick={() => setHighlightedSquad(squadHonors.topCohesion.key === highlightedSquad ? null : squadHonors.topCohesion.key)}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          squadHonors.topCohesion.team === 'axis' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/60' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
                            <Award className="w-3.5 h-3.5 text-purple-400" /> Mais Coesão Total
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${squadHonors.topCohesion.team === 'axis' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {squadHonors.topCohesion.team === 'axis' ? 'Eixo' : 'Aliados'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-foreground flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{squadHonors.topCohesion.officerName || `Squad ${squadHonors.topCohesion.squadId}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Squad {squadHonors.topCohesion.squadId} • {squadHonors.topCohesion.membersCount} soldados operando juntos
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-purple-400">{squadHonors.topCohesion.cohesionPercent}%</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Índice Médio</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Esquadrão do Oficial com Mais Abate em Tank */}
                    {squadHonors?.topTankSquad && (
                      <div 
                        onClick={() => setHighlightedSquad(squadHonors.topTankSquad.key === highlightedSquad ? null : squadHonors.topTankSquad.key)}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          squadHonors.topTankSquad.team === 'axis' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/60' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
                            <Truck className="w-3.5 h-3.5 text-orange-500" /> Mais Abates em Tank
                          </span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${squadHonors.topTankSquad.team === 'axis' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {squadHonors.topTankSquad.team === 'axis' ? 'Eixo' : 'Aliados'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate text-foreground flex items-center gap-1">
                              {squadHonors.topTankSquad.isTank ? <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" /> : <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <span className="truncate">{squadHonors.topTankSquad.officerName || `Squad ${squadHonors.topTankSquad.squadId}`}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {squadHonors.topTankSquad.isTank ? `Blindado • ${squadHonors.topTankSquad.membersCount} tripulantes` : `Infantaria • ${squadHonors.topTankSquad.membersCount} soldados`}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-orange-400">{squadHonors.topTankSquad.vehiclesScore}</div>
                            <div className="text-[9px] text-muted-foreground uppercase">Veículos/Tanques</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Painel 2: Destaques dos Oficiais */}
                <div className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-muted/40 p-3.5 border-b flex items-center justify-between">
                    <h3 className="text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-400" /> Destaques dos Oficiais
                    </h3>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {honorsTeamFilter === 'all' ? 'Geral' : honorsTeamFilter === 'allies' ? 'Aliados' : 'Eixo'}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Atirador de Tanque com Mais Abates de Veículo */}
                    {individualHonors?.topTankGunner && (() => {
                      const p = individualHonors.topTankGunner;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Atirador de Tanque</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Blindados • {p.kills || 0} Abates • Canhão & Metralhadora
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-orange-400">
                              {p.vehicles_destroyed || 0}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Tanques Destruídos</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Oficial com Mais Kills */}
                    {individualHonors?.topOfficerKills && (() => {
                      const p = individualHonors.topOfficerKills;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 shrink-0 shadow-sm">
                              <Crown className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Oficial com Mais Kills</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Líder Letal • K/D: {p.kill_death_ratio?.toFixed(2) || '0.00'} • {p.deaths || 0} Mortes
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-green-400">
                              {p.kills}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Abates Totais</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Oficial com Mais Defesa */}
                    {individualHonors?.topOfficerDefense && (() => {
                      const p = individualHonors.topOfficerDefense;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Oficial com Mais Defesa</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Líder Guardião • Sustentação de setor defendido
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-blue-400">
                              {p.defense?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Defesa</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Oficial com Mais Suporte */}
                    {individualHonors?.topOfficerSupport && (() => {
                      const p = individualHonors.topOfficerSupport;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-sm">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Oficial com Mais Suporte</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Líder Construtor • Guarnições e suprimentos colocados
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-purple-400">
                              {p.support?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Suporte</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Oficial com Mais Combate */}
                    {individualHonors?.topOfficerCombat && (() => {
                      const p = individualHonors.topOfficerCombat;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shrink-0 shadow-sm">
                              <Flame className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Oficial com Mais Combate</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Linha de Frente • Trocação de tiros ativa
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-yellow-500">
                              {p.combat?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Combate</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Oficial com Mais Ofensiva */}
                    {individualHonors?.topOfficerOffense && (() => {
                      const p = individualHonors.topOfficerOffense;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                              <Flag className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Oficial com Mais Ofensiva</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Assalto • Invasão e captura de pontos inimigos
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-red-400">
                              {p.offense?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Ataque</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Painel 3: Destaques dos Soldados (Não-Oficiais) */}
                <div className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-muted/40 p-3.5 border-b flex items-center justify-between">
                    <h3 className="text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-400" /> Destaques dos Soldados
                    </h3>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {honorsTeamFilter === 'all' ? 'Geral' : honorsTeamFilter === 'allies' ? 'Aliados' : 'Eixo'}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Infantaria Caçadora de Tanques */}
                    {individualHonors?.topInfantryTankHunter && (() => {
                      const p = individualHonors.topInfantryTankHunter;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      const bazookaKills = p.kills_by_type?.bazooka;
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-sm">
                              <Rocket className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Infantaria Caçadora de Tanques</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Anti-Tank a pé {bazookaKills ? `• ${bazookaKills} kills de Bazooka` : '• Minas & Cargas'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-orange-400">
                              {p.vehicles_destroyed || 0}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Tanques Destruídos</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Soldado com Mais Kills */}
                    {individualHonors?.topSoldierKills && (() => {
                      const p = individualHonors.topSoldierKills;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 shrink-0 shadow-sm">
                              <Crown className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Soldado com Mais Kills</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Soldado de Linha • K/D: {p.kill_death_ratio?.toFixed(2) || '0.00'} • {p.deaths || 0} Mortes
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-green-400">
                              {p.kills}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Abates Totais</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Soldado com Mais Defesa */}
                    {individualHonors?.topSoldierDefense && (() => {
                      const p = individualHonors.topSoldierDefense;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Soldado com Mais Defesa</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Soldado Guardião • Sustentação no ponto de defesa
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-blue-400">
                              {p.defense?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Defesa</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Soldado com Mais Suporte */}
                    {individualHonors?.topSoldierSupport && (() => {
                      const p = individualHonors.topSoldierSupport;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Soldado com Mais Suporte</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Engenheiro / Suporte • Construção de nós e defesas
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-cyan-400">
                              {p.support?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Suporte</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Soldado com Mais Combate */}
                    {individualHonors?.topSoldierCombat && (() => {
                      const p = individualHonors.topSoldierCombat;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shrink-0 shadow-sm">
                              <Flame className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Soldado com Mais Combate</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Soldado Combatente • Fogo cruzado e engajamento
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-yellow-500">
                              {p.combat?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Combate</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Soldado com Mais Ofensiva */}
                    {individualHonors?.topSoldierOffense && (() => {
                      const p = individualHonors.topSoldierOffense;
                      const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                          isAxis ? 'bg-red-500/5 border-red-500/25' : 'bg-blue-500/5 border-blue-500/25'
                        }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                              <Flag className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Soldado com Mais Ofensiva</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${isAxis ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {isAxis ? 'Eixo' : 'Aliados'}
                                </span>
                              </div>
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5">
                                {p.player}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                Soldado de Assalto • Pressão e avanço em setor inimigo
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black font-mono text-red-400">
                              {p.offense?.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground uppercase">Pontos Ataque</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
