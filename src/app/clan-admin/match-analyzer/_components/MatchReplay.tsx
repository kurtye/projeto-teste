'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, FastForward, SkipBack, ZoomIn, ZoomOut, Maximize, User, Shield, Skull, Crosshair, Truck, Activity, Trophy, Flag, Flame, Target, Rocket, Award, Crown, Wrench, Clapperboard, Sparkles, Video, ChevronRight, X, Swords, Zap, Filter, Search } from 'lucide-react';
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

interface Encounter {
  action: 'KILL' | 'DEATH' | string;
  player_id?: string;
  player_name?: string;
  ts: number;
  weapon?: string;
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
  encounters?: Encounter[];
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

  // Player Combat Dossier & Timeline State
  const [selectedPlayerDossier, setSelectedPlayerDossier] = useState<PlayerStat | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'kills' | 'deaths'>('all');
  const [showKillfeed, setShowKillfeed] = useState<boolean>(true);
  const [showShotLines, setShowShotLines] = useState<boolean>(true);
  const [searchPlayerQuery, setSearchPlayerQuery] = useState<string>('');

  const filteredSearchPlayers = useMemo(() => {
    if (!searchPlayerQuery.trim() || !playerStats) return [];
    const q = searchPlayerQuery.trim().toLowerCase();
    return playerStats.filter(p => (p.player || '').toLowerCase().includes(q));
  }, [searchPlayerQuery, playerStats]);

  // Open Dossier for any player by name
  const openPlayerDossier = (playerName: string) => {
    if (!playerStats || playerStats.length === 0) return;
    const cleanTarget = playerName.trim().toLowerCase();
    const found = playerStats.find(p => (p.player || '').trim().toLowerCase() === cleanTarget)
      || playerStats.find(p => (p.player || '').toLowerCase().includes(cleanTarget))
      || null;
    if (found) {
      setSelectedPlayerDossier(found);
      setTimelineFilter('all');
    }
  };

  // Jump replay directly to an encounter event
  const jumpToEncounter = (enc: Encounter) => {
    setCurrentTime(Math.max(0, enc.ts - 3));
    setIsPlaying(true);
    
    // Smooth scroll to tactical replay map if user is scrolled down
    if (typeof document !== 'undefined') {
      const mapElement = document.getElementById('match-replay-map-container');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    if (selectedPlayerDossier) {
      const matchPlayer = matchData.players_list.find(p => 
        p.name.toLowerCase() === (selectedPlayerDossier.player || '').toLowerCase()
      );
      if (matchPlayer) {
        const pos = getInterpolatedPosition(matchPlayer.position, enc.ts);
        if (pos && (pos.x !== 0 || pos.y !== 0)) {
          zoomToCoords(pos.x, pos.y, 2.5, 1200);
        }
      }
    }
  };

  // Reset replay on match change
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setHighlightedSquad(null);
    setSelectedPlayerDossier(null);
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

  // Destaques e Momentos Épicos da Partida (Super-Câmera Cinematográfica Alimentada por Encounters)
  const cinematicHighlights = useMemo(() => {
    // 1. Extrair baixas da telemetria de movimento
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

    // Helper para obter coordenadas precisas no mapa no momento t
    const getCoordsAt = (playerName?: string, t = 0): { x: number; y: number } => {
      if (playerName) {
        const hero = matchData.players_list.find(pl =>
          pl.name.toLowerCase() === playerName.toLowerCase() ||
          pl.name.toLowerCase().includes(playerName.toLowerCase())
        );
        if (hero) {
          const pos = getInterpolatedPosition(hero.position, t);
          if (pos && (pos.x !== 0 || pos.y !== 0)) return { x: Math.round(pos.x), y: Math.round(pos.y) };
        }
      }
      // Fallback: proximidade de baixas na janela de tempo
      const nearbyDeaths = allDeaths.filter(d => Math.abs(d.time - t) <= 25);
      if (nearbyDeaths.length > 0) {
        const ax = nearbyDeaths.reduce((acc, d) => acc + d.x, 0) / nearbyDeaths.length;
        const ay = nearbyDeaths.reduce((acc, d) => acc + d.y, 0) / nearbyDeaths.length;
        return { x: Math.round(ax), y: Math.round(ay) };
      }
      return { x: 100000, y: 100000 };
    };

    // Helper para extrair esquadrões ativos na área
    const getNearbySquads = (coords: { x: number; y: number }, t: number) => {
      const squads: Record<string, { team: string; squadId: number; officerName?: string }> = {};
      if (allMatchSquads && allMatchSquads.length > 0) {
        allMatchSquads.slice(0, 4).forEach((sq: any) => {
          squads[`${sq.team}-${sq.squadId}`] = {
            team: sq.team,
            squadId: sq.squadId,
            officerName: sq.officerName || undefined,
          };
        });
      }
      return Object.values(squads);
    };

    // 2. Extrair todos os abates reais dos encontros (Timeline / Encounters)
    interface RawKill {
      killer: string;
      killerTeam: string;
      victim: string;
      ts: number;
      weapon: string;
    }
    const allKills: RawKill[] = [];
    playerStats.forEach(p => {
      const side = (typeof p.team === 'object' ? p.team?.side : p.team) || 'allies';
      (p.encounters || []).forEach(e => {
        if (e.action === 'KILL') {
          allKills.push({
            killer: p.player || 'Combatente',
            killerTeam: side,
            victim: e.player_name || 'Inimigo',
            ts: e.ts,
            weapon: e.weapon || '',
          });
        }
      });
    });

    interface HighlightCandidate {
      type: 'satchel' | 'multikill' | 'antitank' | 'breakthrough' | 'massacre' | 'clash';
      badgeIcon: string;
      badgeLabel: string;
      peakTime: number;
      title: string;
      subtitle: string;
      description: string;
      heroPlayer?: string;
      heroTeam?: string;
      weaponUsed?: string;
      victims?: string[];
      coords?: { x: number; y: number };
      score: number;
      alliesDeaths?: number;
      axisDeaths?: number;
      totalDeaths?: number;
    }

    const candidates: HighlightCandidate[] = [];

    // A. DETONAÇÕES HEROICAS COM SATCHEL (Cargas Explosivas)
    const satchelKills = allKills.filter(k => {
      const w = k.weapon.toUpperCase();
      return w.includes('SATCHEL') || w.includes('HAFTHOHLLADUNG') || w.includes('BOMB');
    });
    const satchelGroups: Record<string, RawKill[]> = {};
    satchelKills.forEach(k => {
      const key = `${k.killer}_${Math.floor(k.ts / 15)}`;
      if (!satchelGroups[key]) satchelGroups[key] = [];
      satchelGroups[key].push(k);
    });
    Object.values(satchelGroups).forEach(group => {
      const killer = group[0].killer;
      const victims = group.map(g => g.victim);
      const ts = group[0].ts;
      candidates.push({
        type: 'satchel',
        badgeIcon: '🧨',
        badgeLabel: 'Carga Satchel',
        peakTime: ts,
        title: `Detonação Heroica de Satchel`,
        subtitle: `${killer} detonou Satchel (${group.length} ${group.length > 1 ? 'Baixas' : 'Baixa'})`,
        description: `Ação heroica com ${group[0].weapon}: ${killer} eliminou ${victims.join(', ')}!`,
        heroPlayer: killer,
        heroTeam: group[0].killerTeam,
        weaponUsed: group[0].weapon,
        victims,
        coords: getCoordsAt(killer, ts),
        score: 130 + group.length * 25,
      });
    });

    // B. DISPAROS DE PRECISÃO ANTI-TANQUE / BAZOOKA (Destruição de Blindados e Tropas)
    const atKills = allKills.filter(k => {
      const w = k.weapon.toUpperCase();
      return w.includes('BAZOOKA') || w.includes('PANZERSCHRECK') || w.includes('PIAT') || w.includes('ANTI-TANK') || w.includes('PAK') || w.includes('57MM');
    });
    const atGroups: Record<string, RawKill[]> = {};
    atKills.forEach(k => {
      const key = `${k.killer}_${Math.floor(k.ts / 15)}`;
      if (!atGroups[key]) atGroups[key] = [];
      atGroups[key].push(k);
    });
    Object.values(atGroups).forEach(group => {
      const killer = group[0].killer;
      const victims = group.map(g => g.victim);
      const ts = group[0].ts;
      candidates.push({
        type: 'antitank',
        badgeIcon: '🚀',
        badgeLabel: 'Disparo Anti-Tanque',
        peakTime: ts,
        title: `Ataque Anti-Blindado Certeiro`,
        subtitle: `${killer} eliminou ${group.length} com ${group[0].weapon}`,
        description: `Disparo certeiro de ${group[0].weapon}: neutralizou ${victims.join(', ')}!`,
        heroPlayer: killer,
        heroTeam: group[0].killerTeam,
        weaponUsed: group[0].weapon,
        victims,
        coords: getCoordsAt(killer, ts),
        score: 115 + group.length * 20,
      });
    });

    // C. SEQUÊNCIAS MORTAIS / MULTI-KILLS (3+ kills em <= 20 segundos)
    const killsByKiller: Record<string, RawKill[]> = {};
    allKills.forEach(k => {
      if (!killsByKiller[k.killer]) killsByKiller[k.killer] = [];
      killsByKiller[k.killer].push(k);
    });
    Object.entries(killsByKiller).forEach(([killer, kills]) => {
      kills.sort((a, b) => a.ts - b.ts);
      for (let i = 0; i < kills.length; i++) {
        const streak = [kills[i]];
        for (let j = i + 1; j < kills.length; j++) {
          if (kills[j].ts - kills[i].ts <= 20) {
            streak.push(kills[j]);
          } else {
            break;
          }
        }
        if (streak.length >= 3) {
          const victims = streak.map(s => s.victim);
          const weapons = [...new Set(streak.map(s => s.weapon))];
          const midTs = streak[Math.floor(streak.length / 2)].ts;
          candidates.push({
            type: 'multikill',
            badgeIcon: '⚡',
            badgeLabel: `Multi-Kill (${streak.length}x)`,
            peakTime: midTs,
            title: `Sequência Mortal (${streak.length}x Abates)`,
            subtitle: `${killer} eliminou ${streak.length} em ${Math.max(1, streak[streak.length - 1].ts - streak[0].ts)}s`,
            description: `Sequência implacável usando ${weapons.join(', ')} neutralizando ${victims.slice(0, 3).join(', ')}${victims.length > 3 ? ` e mais ${victims.length - 3}` : ''}!`,
            heroPlayer: killer,
            heroTeam: streak[0].killerTeam,
            weaponUsed: weapons[0],
            victims,
            coords: getCoordsAt(killer, midTs),
            score: 110 + streak.length * 18,
          });
          i += streak.length - 1;
        }
      }
    });

    // D. QUEBRA DE LINHA / CONQUISTA DE PONTO (Cap Flips)
    (capFlips || []).forEach(cf => {
      candidates.push({
        type: 'breakthrough',
        badgeIcon: '🚩',
        badgeLabel: 'Conquista de Setor',
        peakTime: cf.ts,
        title: `Quebra de Linha & Avanço Estratégico`,
        subtitle: `Placar Atualizado: Aliados ${cf.allied_score} — ${cf.axis_score} Eixo`,
        description: `Conquista heroica de setor estratégico sob fogo cruzado, alterando o controle do mapa!`,
        coords: getCoordsAt(undefined, cf.ts),
        score: 125,
      });
    });

    // E. GRANDES MASSACRES E CONFRONTOS DE INFANTARIA (Clusters de 60s)
    const duration = maxTime;
    for (let t = 0; t <= duration - 60; t += 20) {
      const windowDeaths = allDeaths.filter(d => d.time >= t && d.time <= t + 60);
      if (windowDeaths.length >= 18) {
        const avgX = windowDeaths.reduce((acc, d) => acc + d.x, 0) / windowDeaths.length;
        const avgY = windowDeaths.reduce((acc, d) => acc + d.y, 0) / windowDeaths.length;
        const inCluster = windowDeaths.filter(d => Math.hypot(d.x - avgX, d.y - avgY) <= 60000);
        if (inCluster.length >= 16) {
          const allies = inCluster.filter(d => d.team === 'allies').length;
          const axis = inCluster.filter(d => d.team === 'axis').length;
          candidates.push({
            type: inCluster.length >= 30 ? 'massacre' : 'clash',
            badgeIcon: '⚔️',
            badgeLabel: inCluster.length >= 30 ? 'Grande Massacre' : 'Choque de Linhas',
            peakTime: t + 30,
            title: inCluster.length >= 30 ? 'O Grande Massacre de Infantaria' : 'Choque Violento de Trincheiras',
            subtitle: `${inCluster.length} Baixas Registradas em 60s`,
            description: `Fogo cruzado intenso e artilharia pesada: ${allies} Aliados e ${axis} tropas do Eixo caíram na disputa do setor.`,
            coords: { x: Math.round(avgX), y: Math.round(avgY) },
            alliesDeaths: allies,
            axisDeaths: axis,
            totalDeaths: inCluster.length,
            score: 95 + inCluster.length * 1.5,
          });
        }
      }
    }

    // Seleção com diversidade tática (máximo de 3 satchels, 3 multikills, 2 antitanks, 2 capflips)
    // e espaçamento de ao menos 90s entre eventos
    candidates.sort((a, b) => b.score - a.score);
    const selected: HighlightCandidate[] = [];
    const typeCount: Record<string, number> = {};

    for (const cand of candidates) {
      const count = typeCount[cand.type] || 0;
      if (count >= 3 && (cand.type === 'satchel' || cand.type === 'multikill')) continue;
      if (count >= 2 && (cand.type === 'antitank' || cand.type === 'breakthrough' || cand.type === 'massacre')) continue;

      const overlap = selected.some(s => Math.abs(s.peakTime - cand.peakTime) < 90);
      if (!overlap) {
        selected.push(cand);
        typeCount[cand.type] = count + 1;
        if (selected.length >= 10) break;
      }
    }

    // Ordenação cronológica para criar a narrativa sequencial dos Capítulos
    selected.sort((a, b) => a.peakTime - b.peakTime);

    return selected.map((ev, index) => {
      const startTime = Math.max(0, ev.peakTime - 12);
      const endTime = ev.peakTime + 18;
      const windowDeaths = allDeaths.filter(d => d.time >= startTime && d.time <= endTime);
      const allies = ev.alliesDeaths ?? windowDeaths.filter(d => d.team === 'allies').length;
      const axis = ev.axisDeaths ?? windowDeaths.filter(d => d.team === 'axis').length;
      const coords = ev.coords || getCoordsAt(ev.heroPlayer, ev.peakTime);

      return {
        id: `highlight-${index + 1}`,
        chapterIndex: index + 1,
        type: ev.type,
        badgeIcon: ev.badgeIcon,
        badgeLabel: ev.badgeLabel,
        startTime,
        peakTime: ev.peakTime,
        endTime,
        coords,
        title: `Capítulo ${index + 1}: ${ev.title}`,
        subtitle: ev.subtitle,
        description: ev.description,
        heroPlayer: ev.heroPlayer,
        heroTeam: ev.heroTeam,
        weaponUsed: ev.weaponUsed,
        victims: ev.victims,
        alliesDeaths: allies,
        axisDeaths: axis,
        totalDeaths: ev.totalDeaths ?? (allies + axis),
        nearbySquads: getNearbySquads(coords, ev.peakTime),
      };
    });
  }, [matchData, maxTime, allMatchSquads, playerStats, capFlips]);

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

  // -------------------------------------------------------------
  // FEED DE COMBATE GLOBAL & LINHAS DE TIRO (Encounters)
  // -------------------------------------------------------------

  // Lista ordenada global de todos os abates (encounters) da partida
  const globalKills = useMemo(() => {
    if (!playerStats || playerStats.length === 0) return [];
    const kills: {
      id: string;
      ts: number;
      killerName: string;
      killerTeam: 'allies' | 'axis';
      victimName: string;
      victimTeam: 'allies' | 'axis';
      weapon: string;
    }[] = [];

    const playerTeamMap = new Map<string, 'allies' | 'axis'>();
    playerStats.forEach((p: any) => {
      const team = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis' ? 'axis' : 'allies';
      if (p.player) playerTeamMap.set(p.player.trim().toLowerCase(), team);
    });

    playerStats.forEach((p: any) => {
      const killerTeam = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis' ? 'axis' : 'allies';
      (p.encounters || []).forEach((enc: any, idx: number) => {
        if (enc.action === 'KILL') {
          const victimClean = (enc.player_name || '').trim().toLowerCase();
          const victimTeam = playerTeamMap.get(victimClean) || (killerTeam === 'allies' ? 'axis' : 'allies');
          kills.push({
            id: `${p.player}-${enc.ts}-${idx}`,
            ts: enc.ts,
            killerName: p.player || 'Desconhecido',
            killerTeam,
            victimName: enc.player_name || 'Inimigo',
            victimTeam,
            weapon: enc.weapon || 'Arma Leve',
          });
        }
      });
    });

    return kills.sort((a, b) => a.ts - b.ts);
  }, [playerStats]);

  // Feed de abates em tempo real no mapa (últimos 6 segundos)
  const recentKillsFeed = useMemo(() => {
    if (!showKillfeed) return [];
    return globalKills
      .filter(k => k.ts >= currentTime - 6 && k.ts <= currentTime)
      .slice(-4);
  }, [globalKills, currentTime, showKillfeed]);

  // Vetores de tiro e traçantes de combate no mapa (últimos 3 segundos)
  const activeShotLines = useMemo(() => {
    if (!showShotLines || heatmapType !== 'none') return [];
    const recent = globalKills.filter(k => k.ts >= currentTime - 3 && k.ts <= currentTime);
    if (recent.length === 0) return [];

    const lines: {
      id: string;
      killerX: number;
      killerY: number;
      victimX: number;
      victimY: number;
      team: 'allies' | 'axis';
      weapon: string;
      age: number;
    }[] = [];

    recent.forEach(k => {
      const killerPlayer = activePositions.find(p => p.name.toLowerCase() === k.killerName.toLowerCase());
      const victimPlayer = activePositions.find(p => p.name.toLowerCase() === k.victimName.toLowerCase());

      if (
        killerPlayer?.currentPos &&
        victimPlayer?.currentPos &&
        killerPlayer.currentPos.x !== 0 &&
        killerPlayer.currentPos.y !== 0 &&
        victimPlayer.currentPos.x !== 0 &&
        victimPlayer.currentPos.y !== 0
      ) {
        lines.push({
          id: k.id,
          killerX: killerPlayer.currentPos.x,
          killerY: killerPlayer.currentPos.y,
          victimX: victimPlayer.currentPos.x,
          victimY: victimPlayer.currentPos.y,
          team: k.killerTeam,
          weapon: k.weapon,
          age: currentTime - k.ts,
        });
      }
    });

    return lines;
  }, [globalKills, currentTime, activePositions, showShotLines, heatmapType]);

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
          <div id="match-replay-map-container" className="relative w-full h-[70vh] min-h-[500px] bg-black/10 border-2 border-border rounded-xl overflow-hidden shadow-inner flex items-center justify-center bg-stone-900 cursor-grab active:cursor-grabbing">
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                                <span>{currentHighlight.badgeIcon}</span>
                                <span>{currentHighlight.badgeLabel}</span>
                              </span>
                              {currentHighlight.heroPlayer && (
                                <button
                                  type="button"
                                  onClick={() => openPlayerDossier(currentHighlight.heroPlayer!)}
                                  className="text-[11px] font-bold text-amber-400 hover:text-amber-200 bg-black/60 border border-amber-500/30 hover:border-amber-400 px-2 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                                  title={`Abrir Dossiê de Combate de ${currentHighlight.heroPlayer}`}
                                >
                                  <span>👤 {currentHighlight.heroPlayer}</span>
                                  <span className="text-[9px] text-amber-300 underline">[Ver Dossiê]</span>
                                </button>
                              )}
                            </div>
                            <div className="font-headline font-black text-sm sm:text-base text-foreground truncate">
                              {currentHighlight.subtitle}
                            </div>
                            <p className="text-xs text-stone-300 mt-0.5 line-clamp-2 leading-relaxed">
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

                  {/* Tactical Killfeed Overlay (Top Right of Map) */}
                  {showKillfeed && recentKillsFeed.length > 0 && (
                    <div className="absolute top-4 right-16 z-50 flex flex-col gap-1.5 pointer-events-auto max-w-xs sm:max-w-sm">
                      {recentKillsFeed.map((k) => (
                        <div
                          key={k.id}
                          onClick={() => openPlayerDossier(k.killerName)}
                          className="bg-stone-950/90 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1.5 shadow-2xl flex items-center justify-between gap-2 text-xs transition-all hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-right-3 duration-200"
                          title="Clique para ver o Dossiê e Linha do Tempo do Atirador"
                        >
                          <span className={`font-bold truncate max-w-[100px] ${k.killerTeam === 'axis' ? 'text-red-400' : 'text-blue-400'}`} title={k.killerName}>
                            {k.killerName}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-stone-300 shrink-0">
                            <Crosshair className="w-2.5 h-2.5 text-amber-400" />
                            <span className="truncate max-w-[90px]">{k.weapon}</span>
                          </div>
                          <span className={`font-bold truncate max-w-[100px] ${k.victimTeam === 'axis' ? 'text-red-400' : 'text-blue-400'}`} title={k.victimName}>
                            {k.victimName}
                          </span>
                        </div>
                      ))}
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
                                 <span 
                                   className={`truncate ${sq.officerName ? 'hover:underline hover:text-red-300' : ''}`}
                                   title={sq.officerName ? `Abrir Dossiê de Combate de ${sq.officerName}` : undefined}
                                   onClick={(e) => {
                                     if (sq.officerName) {
                                       e.stopPropagation();
                                       openPlayerDossier(sq.officerName);
                                     }
                                   }}
                                 >
                                   {sq.officerName ? sq.officerName : `Squad ${sq.squadId}`}
                                 </span>
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
                                 <span 
                                   className={`truncate ${sq.officerName ? 'hover:underline hover:text-blue-300' : ''}`}
                                   title={sq.officerName ? `Abrir Dossiê de Combate de ${sq.officerName}` : undefined}
                                   onClick={(e) => {
                                     if (sq.officerName) {
                                       e.stopPropagation();
                                       openPlayerDossier(sq.officerName);
                                     }
                                   }}
                                 >
                                   {sq.officerName ? sq.officerName : `Squad ${sq.squadId}`}
                                 </span>
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

                       {/* Combat Shot Lines Layer (Linhas de Tiro / Traçantes) */}
                       {showShotLines && heatmapType === 'none' && activeShotLines.length > 0 && (
                         <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full z-25 pointer-events-none">
                           <defs>
                             <linearGradient id="alliedTracer" x1="0%" y1="0%" x2="100%" y2="100%">
                               <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                               <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
                             </linearGradient>
                             <linearGradient id="axisTracer" x1="0%" y1="0%" x2="100%" y2="100%">
                               <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                               <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
                             </linearGradient>
                           </defs>
                           {activeShotLines.map(line => {
                             const x1 = mapCoordToPercent(line.killerX);
                             const y1 = mapCoordToPercent(line.killerY);
                             const x2 = mapCoordToPercent(line.victimX);
                             const y2 = mapCoordToPercent(line.victimY);
                             const isAxis = line.team === 'axis';
                             const opacity = Math.max(0.15, 1 - (line.age / 3));

                             return (
                               <g key={`shot-${line.id}`} opacity={opacity}>
                                 <line
                                   x1={`${x1}%`}
                                   y1={`${y1}%`}
                                   x2={`${x2}%`}
                                   y2={`${y2}%`}
                                   stroke={isAxis ? "rgba(239, 68, 68, 0.5)" : "rgba(56, 189, 248, 0.5)"}
                                   strokeWidth="0.5"
                                   strokeDasharray="1.5 1"
                                 />
                                 <line
                                   x1={`${x1}%`}
                                   y1={`${y1}%`}
                                   x2={`${x2}%`}
                                   y2={`${y2}%`}
                                   stroke={isAxis ? "url(#axisTracer)" : "url(#alliedTracer)"}
                                   strokeWidth="0.25"
                                   strokeLinecap="round"
                                 />
                                 <circle
                                   cx={`${x2}%`}
                                   cy={`${y2}%`}
                                   r="0.5"
                                   fill={isAxis ? "#ef4444" : "#38bdf8"}
                                   className="animate-ping"
                                 />
                               </g>
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
                             onClick={(e) => {
                               e.stopPropagation();
                               openPlayerDossier(player.name);
                             }}
                             className={`absolute w-5 h-5 border-2 rounded-full ${colorClass} ${opacityClass} text-white flex items-center justify-center shadow-[0_0_8px_rgba(0,0,0,0.8)] transition-[opacity,transform] duration-150 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 hover:ring-2 hover:ring-amber-400 group z-30`}
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
                                <span className="text-[9px] text-amber-400 font-bold mt-1">
                                  👉 Clique para abrir Linha do Tempo
                                </span>
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
          <div className="mt-8 flex flex-col gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
             {/* Linha 1: Controles Principais de Reprodução & Busca de Jogador */}
             <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Button variant="outline" size="icon" onClick={() => setCurrentTime(0)} className="hover:text-accent shrink-0">
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant={isPlaying ? "default" : "secondary"} 
                    size="lg" 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className={`shrink-0 font-bold ${isPlaying ? "bg-accent hover:bg-accent/80 text-accent-foreground shadow-sm" : ""}`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                    {isPlaying ? "Pausar" : "Reproduzir"}
                  </Button>

                  {/* Seletor de Velocidade com opção 10x padrão */}
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

                  {/* Filtro de Time */}
                  <div className="flex bg-background border rounded-md shadow-sm">
                    <Button variant={teamFilter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTeamFilter('all')} className="rounded-none rounded-l-md text-xs h-8">Ambos</Button>
                    <Button variant={teamFilter === 'axis' ? 'destructive' : 'ghost'} size="sm" onClick={() => setTeamFilter('axis')} className="rounded-none text-xs h-8">Eixo</Button>
                    <Button variant={teamFilter === 'allies' ? 'default' : 'ghost'} size="sm" onClick={() => setTeamFilter('allies')} className="rounded-none rounded-r-md bg-blue-600 hover:bg-blue-700 text-xs h-8">Aliados</Button>
                  </div>

                  {/* Barra de Busca de Jogador (Acesso Rápido ao Dossiê) */}
                  <div className="relative">
                    <div className="flex items-center bg-background border rounded-lg px-2.5 py-1 shadow-sm focus-within:ring-1 focus-within:ring-accent h-8">
                      <Search className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="Buscar combatente..."
                        value={searchPlayerQuery}
                        onChange={(e) => setSearchPlayerQuery(e.target.value)}
                        className="bg-transparent text-xs outline-none w-32 sm:w-44 placeholder:text-muted-foreground"
                      />
                      {searchPlayerQuery && (
                        <button onClick={() => setSearchPlayerQuery('')} className="text-muted-foreground hover:text-foreground ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown de Resultados da Busca */}
                    {searchPlayerQuery.trim().length > 0 && (
                      <div className="absolute left-0 top-full mt-1.5 w-72 max-h-64 overflow-y-auto bg-card/95 border border-border/80 rounded-xl shadow-2xl backdrop-blur-md z-50 p-1 divide-y divide-border/30">
                        {filteredSearchPlayers.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground text-center">Nenhum combatente encontrado</div>
                        ) : (
                          filteredSearchPlayers.slice(0, 10).map((p) => {
                            const isP事Axis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
                            return (
                              <button
                                key={p.player_id}
                                type="button"
                                onClick={() => {
                                  openPlayerDossier(p.player || '');
                                  setSearchPlayerQuery('');
                                }}
                                className="w-full text-left p-2 hover:bg-muted/60 rounded-lg flex items-center justify-between text-xs transition-colors group"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-bold text-foreground block truncate group-hover:text-amber-400">{p.player}</span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                    <span className={isP事Axis ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
                                      {isP事Axis ? 'Eixo' : 'Aliados'}
                                    </span>
                                    <span>•</span>
                                    <span>{p.kills || 0}K / {p.deaths || 0}D</span>
                                  </span>
                                </div>
                                <span className="text-[10px] text-amber-400 font-bold shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                  Dossiê
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Relógio Digital da Partida */}
                <div className="font-mono font-bold text-2xl text-accent bg-background px-4 py-1.5 rounded-lg border shadow-sm shrink-0">
                  {formatTime(currentTime)}
                </div>
             </div>

             {/* Linha 2: Modos Táticos, Câmera Diretor e Camadas Analíticas (Totalmente Responsivo) */}
             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Grupo Câmera & Narrativa */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-background/60 border rounded-lg shadow-sm">
                  <Button 
                    variant={isCinematicMode ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => {
                      const next = !isCinematicMode;
                      setIsCinematicMode(next);
                      if (!next) resetCamera(1000);
                    }}
                    className={isCinematicMode ? "bg-amber-600 hover:bg-amber-700 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)] border-amber-500 font-bold h-7 text-xs px-2.5" : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-xs px-2.5"}
                    title="Câmera autônoma com zoom dinâmico nos clímax e desaceleração dramática"
                  >
                    <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
                    {isCinematicMode ? 'Diretor: Ativo' : 'Modo Cinematográfico'}
                  </Button>
                  <Button 
                    variant={showStoryDrawer ? 'secondary' : 'outline'} 
                    size="sm" 
                    onClick={() => setShowStoryDrawer(!showStoryDrawer)}
                    className={showStoryDrawer ? "bg-amber-500/20 text-amber-300 border-amber-500/40 h-7 text-xs px-2.5" : "text-muted-foreground h-7 text-xs px-2.5"}
                    title="Ver e navegar pelos capítulos decisivos da partida"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Capítulos ({cinematicHighlights.length})
                  </Button>
                </div>

                {/* Grupo Destaques Táticos em Tempo Real */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-background/60 border rounded-lg shadow-sm">
                  <Button variant={showKillfeed ? 'default' : 'outline'} size="sm" onClick={() => setShowKillfeed(!showKillfeed)} className={showKillfeed ? "bg-amber-600 hover:bg-amber-700 text-white font-medium h-7 text-xs px-2.5" : "h-7 text-xs px-2.5"}>
                    <Crosshair className="w-3.5 h-3.5 mr-1.5" />
                    Killfeed
                  </Button>
                  <Button variant={showShotLines ? 'default' : 'outline'} size="sm" onClick={() => setShowShotLines(!showShotLines)} className={showShotLines ? "bg-red-600 hover:bg-red-700 text-white font-medium h-7 text-xs px-2.5" : "h-7 text-xs px-2.5"}>
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Traçantes
                  </Button>
                  <Button variant={showFrontline ? 'default' : 'outline'} size="sm" onClick={() => setShowFrontline(!showFrontline)} className={showFrontline ? "bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs px-2.5" : "h-7 text-xs px-2.5"}>
                    Frontline
                  </Button>
                  <Button variant={smoothMovement ? 'default' : 'outline'} size="sm" onClick={() => setSmoothMovement(!smoothMovement)} className={smoothMovement ? "bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2.5" : "h-7 text-xs px-2.5"} title="Interpolação contínua e suave de posições (sem teletransporte)">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    {smoothMovement ? 'Movimento Suave' : 'Modo Bruto'}
                  </Button>
                </div>

                {/* Grupo Camadas & Heatmaps */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-background/60 border rounded-lg shadow-sm">
                  <Button variant={showTrails ? 'secondary' : 'outline'} size="sm" onClick={() => setShowTrails(!showTrails)} disabled={heatmapType !== 'none'} className="h-7 text-xs px-2">
                    Rastros
                  </Button>
                  <Button variant={showDeaths ? 'destructive' : 'outline'} size="sm" onClick={() => setShowDeaths(!showDeaths)} disabled={heatmapType !== 'none'} className="h-7 text-xs px-2">
                    Baixas (60s)
                  </Button>
                  <Button variant={showOfficers ? 'default' : 'outline'} size="sm" onClick={() => setShowOfficers(!showOfficers)} className="h-7 text-xs px-2">
                    {showOfficers ? 'Ocultar Oficiais' : 'Oficiais'}
                  </Button>
                  <Button variant={showCohesionPercent ? 'default' : 'outline'} size="sm" onClick={() => setShowCohesionPercent(!showCohesionPercent)} className={showCohesionPercent ? "bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-2" : "h-7 text-xs px-2"}>
                    % Coesão
                  </Button>
                  <Button variant={heatmapType === 'presence' ? 'secondary' : 'outline'} size="sm" onClick={() => setHeatmapType(heatmapType === 'presence' ? 'none' : 'presence')} className="h-7 text-xs px-2">
                    Heatmap (Pos.)
                  </Button>
                  <Button variant={heatmapType === 'deaths' ? 'destructive' : 'outline'} size="sm" onClick={() => setHeatmapType(heatmapType === 'deaths' ? 'none' : 'deaths')} className={heatmapType === 'deaths' ? "bg-red-800 hover:bg-red-900 text-white h-7 text-xs px-2" : "h-7 text-xs px-2"}>
                    Heatmap (Mortes)
                  </Button>
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

                        {/* Badge do Tipo de Evento & Protagonista */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                            <span>{hl.badgeIcon}</span>
                            <span>{hl.badgeLabel}</span>
                          </span>
                          {hl.heroPlayer && (
                            <span className="text-[10px] font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                              👤 {hl.heroPlayer}
                            </span>
                          )}
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
                              <span 
                                className={`truncate ${squadHonors.topDefense.officerName ? 'hover:underline hover:text-blue-300' : ''}`}
                                title={squadHonors.topDefense.officerName ? `Clique para abrir o Dossiê de Combate de ${squadHonors.topDefense.officerName}` : undefined}
                                onClick={(e) => {
                                  if (squadHonors.topDefense.officerName) {
                                    e.stopPropagation();
                                    openPlayerDossier(squadHonors.topDefense.officerName);
                                  }
                                }}
                              >
                                {squadHonors.topDefense.officerName || `Squad ${squadHonors.topDefense.squadId}`}
                              </span>
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
                              <span 
                                className={`truncate ${squadHonors.topCombat.officerName ? 'hover:underline hover:text-yellow-400' : ''}`}
                                title={squadHonors.topCombat.officerName ? `Clique para abrir o Dossiê de Combate de ${squadHonors.topCombat.officerName}` : undefined}
                                onClick={(e) => {
                                  if (squadHonors.topCombat.officerName) {
                                    e.stopPropagation();
                                    openPlayerDossier(squadHonors.topCombat.officerName);
                                  }
                                }}
                              >
                                {squadHonors.topCombat.officerName || `Squad ${squadHonors.topCombat.squadId}`}
                              </span>
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
                              <span 
                                className={`truncate ${squadHonors.topOffense.officerName ? 'hover:underline hover:text-red-300' : ''}`}
                                title={squadHonors.topOffense.officerName ? `Clique para abrir o Dossiê de Combate de ${squadHonors.topOffense.officerName}` : undefined}
                                onClick={(e) => {
                                  if (squadHonors.topOffense.officerName) {
                                    e.stopPropagation();
                                    openPlayerDossier(squadHonors.topOffense.officerName);
                                  }
                                }}
                              >
                                {squadHonors.topOffense.officerName || `Squad ${squadHonors.topOffense.squadId}`}
                              </span>
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
                              <span 
                                className={`truncate ${squadHonors.topSupport.officerName ? 'hover:underline hover:text-cyan-300' : ''}`}
                                title={squadHonors.topSupport.officerName ? `Clique para abrir o Dossiê de Combate de ${squadHonors.topSupport.officerName}` : undefined}
                                onClick={(e) => {
                                  if (squadHonors.topSupport.officerName) {
                                    e.stopPropagation();
                                    openPlayerDossier(squadHonors.topSupport.officerName);
                                  }
                                }}
                              >
                                {squadHonors.topSupport.officerName || `Squad ${squadHonors.topSupport.squadId}`}
                              </span>
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
                              <span 
                                className={`truncate ${squadHonors.topKills.officerName ? 'hover:underline hover:text-green-300' : ''}`}
                                title={squadHonors.topKills.officerName ? `Clique para abrir o Dossiê de Combate de ${squadHonors.topKills.officerName}` : undefined}
                                onClick={(e) => {
                                  if (squadHonors.topKills.officerName) {
                                    e.stopPropagation();
                                    openPlayerDossier(squadHonors.topKills.officerName);
                                  }
                                }}
                              >
                                {squadHonors.topKills.officerName || `Squad ${squadHonors.topKills.squadId}`}
                              </span>
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
                              <span 
                                className={`truncate ${squadHonors.topCohesion.officerName ? 'hover:underline hover:text-purple-300' : ''}`}
                                title={squadHonors.topCohesion.officerName ? `Clique para abrir o Dossiê de Combate de ${squadHonors.topCohesion.officerName}` : undefined}
                                onClick={(e) => {
                                  if (squadHonors.topCohesion.officerName) {
                                    e.stopPropagation();
                                    openPlayerDossier(squadHonors.topCohesion.officerName);
                                  }
                                }}
                              >
                                {squadHonors.topCohesion.officerName || `Squad ${squadHonors.topCohesion.squadId}`}
                              </span>
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
                              <span 
                                className={`truncate ${squadHonors.topTankSquad.officerName ? 'hover:underline hover:text-orange-300' : ''}`}
                                title={squadHonors.topTankSquad.officerName ? `Clique para abrir o Dossiê de Combate de ${squadHonors.topTankSquad.officerName}` : undefined}
                                onClick={(e) => {
                                  if (squadHonors.topTankSquad.officerName) {
                                    e.stopPropagation();
                                    openPlayerDossier(squadHonors.topTankSquad.officerName);
                                  }
                                }}
                              >
                                {squadHonors.topTankSquad.officerName || `Squad ${squadHonors.topTankSquad.squadId}`}
                              </span>
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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
                        <div 
                          onClick={() => openPlayerDossier(p.player)}
                          title={`Clique para abrir o Dossiê de Combate de ${p.player}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:shadow-md ${
                          isAxis ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/50' : 'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/50'
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
                              <div className="font-headline font-bold text-sm text-foreground truncate mt-0.5 hover:underline">
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

      {/* Slide-over Drawer: Dossiê e Linha do Tempo Individual de Combate */}
      {selectedPlayerDossier && (() => {
        const p = selectedPlayerDossier;
        const isAxis = (typeof p.team === 'object' ? p.team?.side : p.team) === 'axis';
        const encounters = p.encounters || [];
        const killsCount = encounters.filter(e => e.action === 'KILL').length;
        const deathsCount = encounters.filter(e => e.action === 'DEATH').length;

        // Contabilizar armas mais letais
        const weaponCounts: Record<string, number> = {};
        encounters.forEach(e => {
          if (e.action === 'KILL' && e.weapon) {
            weaponCounts[e.weapon] = (weaponCounts[e.weapon] || 0) + 1;
          }
        });
        const topWeapons = Object.entries(weaponCounts).sort((a, b) => b[1] - a[1]);

        // Contabilizar dominância / nemesis (abates repetidos contra mesma vítima)
        const victimKillsMap: Record<string, number> = {};
        encounters.forEach(e => {
          if (e.action === 'KILL' && e.player_name) {
            victimKillsMap[e.player_name] = (victimKillsMap[e.player_name] || 0) + 1;
          }
        });

        // Construir linha do tempo unificada (Encontros + Conquistas de Ponto + Mudanças de Classe)
        interface UnifiedTimelineItem {
          id: string;
          kind: 'encounter' | 'capflip' | 'rolechange';
          ts: number;
          encounter?: Encounter;
          capFlip?: CapFlip;
          roleChange?: { roleName: string; squadId: number };
        }

        const timelineItems: UnifiedTimelineItem[] = [];

        // 1. Encontros de combate (Kills e Mortes)
        encounters.forEach((enc, idx) => {
          if (timelineFilter === 'kills' && enc.action !== 'KILL') return;
          if (timelineFilter === 'deaths' && enc.action !== 'DEATH') return;
          timelineItems.push({
            id: `enc-${enc.ts}-${idx}`,
            kind: 'encounter',
            ts: enc.ts,
            encounter: enc,
          });
        });

        // 2. Conquistas de setor (Cap Flips)
        if (timelineFilter === 'all' && capFlips) {
          capFlips.forEach((cf, idx) => {
            timelineItems.push({
              id: `cf-${cf.ts}-${idx}`,
              kind: 'capflip',
              ts: cf.ts,
              capFlip: cf,
            });
          });
        }

        // 3. Mudanças de esquadrão / classe registradas em units
        if (timelineFilter === 'all' && p.units) {
          p.units.forEach((u, idx, arr) => {
            const prev = idx > 0 ? arr[idx - 1] : null;
            const isNew = !prev || prev.role !== u.role || prev.squad !== u.squad;
            if (isNew) {
              const roleName = ROLE_MAPPING[u.role]?.name || `Função #${u.role}`;
              timelineItems.push({
                id: `unit-${u.ts}-${idx}`,
                kind: 'rolechange',
                ts: u.ts,
                roleChange: { roleName, squadId: u.squad },
              });
            }
          });
        }

        // Ordenar cronologicamente
        timelineItems.sort((a, b) => a.ts - b.ts);

        const kd = p.deaths && p.deaths > 0 
          ? ((p.kills || 0) / p.deaths).toFixed(2) 
          : (p.kills || 0).toString();

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedPlayerDossier(null)}
            />

            {/* Slide-over Drawer lateral */}
            <div className="relative w-full max-w-xl md:w-[560px] h-full bg-card/95 border-l border-border/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
              
              {/* Header do Dossiê */}
              <div className={`p-5 border-b flex items-start justify-between gap-4 ${
                isAxis 
                  ? 'bg-gradient-to-r from-red-950/40 via-red-900/15 to-transparent border-red-500/30' 
                  : 'bg-gradient-to-r from-blue-950/40 via-blue-900/15 to-transparent border-blue-500/30'
              }`}>
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border shadow-lg shrink-0 ${
                    isAxis 
                      ? 'bg-red-500/20 border-red-500/40 text-red-400' 
                      : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                  }`}>
                    {isAxis ? <Skull className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isAxis 
                          ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {isAxis ? 'Eixo (Alemanha)' : 'Aliados'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ID: {p.player_id.slice(-6)}
                      </span>
                    </div>
                    <h2 className="text-xl font-headline font-black text-foreground truncate mt-0.5 tracking-tight">
                      {p.player}
                    </h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Swords className="w-3.5 h-3.5 text-amber-400" />
                      Dossiê Tático & Linha do Tempo de Combate
                    </p>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedPlayerDossier(null)}
                  className="rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Estatísticas Rápidas de Combate */}
              <div className="p-4 bg-muted/20 border-b border-border/40 grid grid-cols-4 gap-2 text-center">
                <div className="bg-background/60 p-2.5 rounded-xl border border-border/40 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Abates</div>
                  <div className="text-lg font-black font-mono text-emerald-400">{p.kills || 0}</div>
                </div>
                <div className="bg-background/60 p-2.5 rounded-xl border border-border/40 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Mortes</div>
                  <div className="text-lg font-black font-mono text-rose-400">{p.deaths || 0}</div>
                </div>
                <div className="bg-background/60 p-2.5 rounded-xl border border-border/40 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">K/D Ratio</div>
                  <div className="text-lg font-black font-mono text-amber-400">{kd}</div>
                </div>
                <div className="bg-background/60 p-2.5 rounded-xl border border-border/40 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Combate</div>
                  <div className="text-lg font-black font-mono text-yellow-500">{p.combat?.toLocaleString() || 0}</div>
                </div>
              </div>

              {/* Pontuações de Apoio (Defesa, Suporte, Ofensiva, Veículos) */}
              <div className="px-4 py-2.5 bg-muted/10 border-b border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span>Defesa: <strong className="text-foreground font-mono">{p.defense?.toLocaleString() || 0}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Suporte: <strong className="text-foreground font-mono">{p.support?.toLocaleString() || 0}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-red-400" />
                  <span>Ataque: <strong className="text-foreground font-mono">{p.offense?.toLocaleString() || 0}</strong></span>
                </div>
                {(p.vehicles_destroyed || 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                    <span>Veículos: <strong className="text-orange-400 font-mono">{p.vehicles_destroyed}</strong></span>
                  </div>
                )}
              </div>

              {/* Arsenal e Armas Mais Letais */}
              {topWeapons.length > 0 && (
                <div className="p-4 border-b border-border/40 bg-muted/10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    Arsenal Empregado ({topWeapons.length} {topWeapons.length === 1 ? 'arma' : 'armas'})
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {topWeapons.map(([weaponName, count]) => (
                      <span 
                        key={weaponName} 
                        className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-background/80 border border-border/60 text-foreground flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="truncate max-w-[160px]">{weaponName}</span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold text-[10px]">
                          {count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Controles de Filtro da Linha do Tempo */}
              <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-background/70 p-1 rounded-lg border border-border/50">
                  <Button 
                    variant={timelineFilter === 'all' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setTimelineFilter('all')}
                    className="h-7 text-xs px-2.5 font-bold"
                  >
                    Todos ({encounters.length})
                  </Button>
                  <Button 
                    variant={timelineFilter === 'kills' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setTimelineFilter('kills')}
                    className={`h-7 text-xs px-2.5 font-bold ${timelineFilter === 'kills' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-400'}`}
                  >
                    Abates ({killsCount})
                  </Button>
                  <Button 
                    variant={timelineFilter === 'deaths' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setTimelineFilter('deaths')}
                    className={`h-7 text-xs px-2.5 font-bold ${timelineFilter === 'deaths' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'text-rose-400'}`}
                  >
                    Mortes ({deathsCount})
                  </Button>
                </div>

                <span className="text-[10px] text-muted-foreground italic hidden sm:inline">
                  Clique em ▶ para saltar no Replay
                </span>
              </div>

              {/* Lista Cronológica de Confrontos & Marcos da Partida (Timeline) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {timelineItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                    <Crosshair className="w-8 h-8 opacity-30 text-amber-400" />
                    <p className="text-sm font-medium">Nenhum evento registrado para este filtro.</p>
                  </div>
                ) : (
                  timelineItems.map((item) => {
                    // Caso 1: Marco de Captura de Setor (Cap Flip)
                    if (item.kind === 'capflip' && item.capFlip) {
                      const cf = item.capFlip;
                      return (
                        <div 
                          key={item.id} 
                          className="p-3 rounded-xl border border-purple-500/40 bg-purple-950/20 backdrop-blur-sm flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-background/80 border border-purple-500/30 text-purple-300">
                              {formatTime(item.ts)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                <Flag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span>Objetivo do Mapa Conquistado</span>
                              </div>
                              <div className="text-[11px] text-purple-200/70 font-mono mt-0.5">
                                Placar: Aliados {cf.allied_score} — {cf.axis_score} Eixo
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentTime(item.ts);
                              setIsPlaying(true);
                            }}
                            className="h-8 px-2.5 text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/20 font-mono flex items-center gap-1 shrink-0"
                            title={`Saltar o replay para o momento da conquista (${formatTime(item.ts)})`}
                          >
                            <Play className="w-3 h-3 fill-purple-300" />
                            <span>Ponto</span>
                          </Button>
                        </div>
                      );
                    }

                    // Caso 2: Mudança de Classe ou Esquadrão
                    if (item.kind === 'rolechange' && item.roleChange) {
                      return (
                        <div 
                          key={item.id} 
                          className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-950/15 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[11px] font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-background/80 border">
                              {formatTime(item.ts)}
                            </span>
                            <span className="text-[11px] text-stone-200 truncate">
                              Assumiu <strong>{item.roleChange.roleName}</strong> no Esquadrão #{item.roleChange.squadId}
                            </span>
                          </div>
                          <span className="text-[9px] text-blue-400 font-mono font-bold uppercase shrink-0 px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/30">
                            Classe
                          </span>
                        </div>
                      );
                    }

                    // Caso 3: Encontro de Combate (Abate ou Morte)
                    const enc = item.encounter!;
                    const isKill = enc.action === 'KILL';
                    const isCurrent = Math.abs(currentTime - enc.ts) <= 2;
                    const killsVsVictim = isKill && enc.player_name ? (victimKillsMap[enc.player_name] || 1) : 0;

                    return (
                      <div 
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent 
                            ? 'ring-2 ring-amber-400 bg-amber-500/10 border-amber-500/60 shadow-[0_0_15px_rgba(251,191,36,0.25)]' 
                            : isKill
                              ? 'bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-950/25'
                              : 'bg-rose-950/15 border-rose-500/25 hover:border-rose-500/50 hover:bg-rose-950/25'
                        }`}
                      >
                        {/* Indicador de Tempo e Tipo */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col items-center">
                            <span className="font-mono text-xs font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-background/80 border border-border/50">
                              {formatTime(enc.ts)}
                            </span>
                            {isCurrent && (
                              <span className="text-[8px] font-bold text-amber-400 animate-pulse mt-0.5">
                                NO AR
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded border ${
                                isKill 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              }`}>
                                {isKill ? 'Abate' : 'Morte'}
                              </span>
                              <span className="font-bold text-sm text-foreground truncate">
                                {isKill ? `vs ${enc.player_name || 'Inimigo'}` : `por ${enc.player_name || 'Inimigo'}`}
                              </span>
                              {/* Nemesis / Dominando Badge */}
                              {killsVsVictim >= 2 && (
                                <span 
                                  className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 shadow-sm" 
                                  title={`Eliminou ${enc.player_name} ${killsVsVictim} vezes durante a partida`}
                                >
                                  <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                  {killsVsVictim}x
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5 flex items-center gap-1.5">
                              <Crosshair className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{enc.weapon || 'Arma Desconhecida'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Botão Ver no Replay */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => jumpToEncounter(enc)}
                          className="h-8 px-2.5 text-xs bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border-amber-500/40 hover:border-amber-500 font-mono flex items-center gap-1.5 shrink-0 shadow-sm"
                          title={`Saltar o replay para ${formatTime(enc.ts)} e focar no combate`}
                        >
                          <Play className="w-3 h-3 fill-amber-400" />
                          <span className="hidden sm:inline">Ver no Replay</span>
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Rodapé Informativo */}
              <div className="p-3 bg-muted/40 border-t border-border/60 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Dados extraídos do log de combate CRCON com sincronização precisa no replay.</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
