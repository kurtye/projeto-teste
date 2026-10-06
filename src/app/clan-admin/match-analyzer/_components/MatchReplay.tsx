'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, FastForward, SkipBack, ZoomIn, ZoomOut, Maximize, User, Shield, Skull, Crosshair, Truck } from 'lucide-react';
import Image from 'next/image';
import { ROLE_MAPPING } from '@/lib/roles';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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
  player_id: string;
  units: PlayerStatUnit[];
}

export function MatchReplay({ matchData, capFlips = [], playerStats = [] }: { matchData: MatchData, capFlips?: CapFlip[], playerStats?: PlayerStat[] }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [teamFilter, setTeamFilter] = useState<'all' | 'axis' | 'allies'>('all');
  const [showTrails, setShowTrails] = useState(false);
  const [heatmapType, setHeatmapType] = useState<'none' | 'presence' | 'deaths'>('none');
  const [showFrontline, setShowFrontline] = useState(true);
  const [showDeaths, setShowDeaths] = useState(true);
  const [showOfficers, setShowOfficers] = useState(true);
  const [showCohesionPercent, setShowCohesionPercent] = useState(false);
  const [highlightedSquad, setHighlightedSquad] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Player active positions
  const activePositions = useMemo(() => {
    return matchData.players_list.map(player => {
      // Find the closest position that is <= currentTime
      // Since it's sorted by time, we can find the last one that matches
      let closestPos = player.position[0];
      const trail: Position[] = [];
      const trailDuration = 60; // 60 seconds of history for trail
      
      for (let i = 0; i < player.position.length; i++) {
        const pos = player.position[i];
        if (pos.time <= currentTime) {
          closestPos = pos;
          if (showTrails && pos.time >= currentTime - trailDuration && pos.x !== 0 && pos.y !== 0) {
            trail.push(pos);
          }
        } else {
          break;
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
        currentPos: closestPos,
        trail,
        currentRole,
        currentSquad
      };
    }).filter(p => {
       if (teamFilter !== 'all' && p.team !== teamFilter) return false;
       return p.currentPos && p.currentPos.time > currentTime - 300;
    }); // Disappear if no update for 5 mins
  }, [matchData, currentTime, teamFilter, showTrails, playerStats]);

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

  // Compute all historical squads for the sidebars
  const allMatchSquads = useMemo(() => {
    if (!playerStats || playerStats.length === 0) return [];
    
    const squads: Record<string, any> = {};

    playerStats.forEach((p: any) => {
      const team = p.team ? p.team.side : 'unknown'; // 'axis' or 'allies'
      if (!p.units || team === 'unknown') return;

      p.units.forEach((u: any) => {
        const squadId = u.squad;
        if (squadId === null || squadId === 0 || squadId === undefined) return;
        
        const key = `${team}-${squadId}`;
        if (!squads[key]) {
          squads[key] = { key, team, squadId, officerName: null, isTank: false, combatScore: 0, playersAdded: new Set() };
        }

        if (!squads[key].playersAdded.has(p.player_id)) {
          squads[key].playersAdded.add(p.player_id);
          squads[key].combatScore += (p.combat || 0);
        }

        const roleId = u.role;
        // 9=Officer, 4=Spotter, 11=TankCmd
        if (roleId === 9 || roleId === 4 || roleId === 11) {
          squads[key].officerName = p.player;
        }
        if (roleId === 11 || roleId === 12) {
          squads[key].isTank = true;
        }
      });
    });

    const result = Object.values(squads).filter((s: any) => 
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
         let currentPos = null;
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
      positionsAtT.forEach(p => {
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

  // Rankings
  const topFraggers = useMemo(() => {
    if (!playerStats || playerStats.length === 0) return [];
    return [...playerStats].sort((a: any, b: any) => (b.kills || 0) - (a.kills || 0)).slice(0, 5);
  }, [playerStats]);

  const topMeatGrinders = useMemo(() => {
    if (!playerStats || playerStats.length === 0) return [];
    return [...playerStats].sort((a: any, b: any) => (b.deaths || 0) - (a.deaths || 0)).slice(0, 5);
  }, [playerStats]);

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
              Replay Interativo: {matchData.map}
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
               initialScale={1}
               minScale={0.5}
               maxScale={4}
               centerOnInit={true}
            >
              {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
                <>
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
                          src="/maps/utah.jpg" 
                          alt="Utah Beach" 
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
                             className={`absolute w-5 h-5 border-2 rounded-full ${colorClass} ${opacityClass} text-white flex items-center justify-center shadow-[0_0_8px_rgba(0,0,0,0.8)] transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 cursor-crosshair group`}
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
                  <Button variant="outline" onClick={() => setPlaybackSpeed(s => s === 1 ? 5 : s === 5 ? 20 : s === 20 ? 50 : 1)}>
                    <FastForward className="w-4 h-4 mr-2" />
                    {playbackSpeed}x
                  </Button>

                  <div className="flex bg-background border rounded-md ml-2">
                    <Button variant={teamFilter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTeamFilter('all')} className="rounded-none rounded-l-md">Ambos</Button>
                    <Button variant={teamFilter === 'axis' ? 'destructive' : 'ghost'} size="sm" onClick={() => setTeamFilter('axis')} className="rounded-none">Eixo</Button>
                    <Button variant={teamFilter === 'allies' ? 'default' : 'ghost'} size="sm" onClick={() => setTeamFilter('allies')} className="rounded-none rounded-r-md bg-blue-600 hover:bg-blue-700">Aliados</Button>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
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
                    
                    {/* Cap Flip Markers */}
                    <div className="absolute inset-0 top-1/2 -translate-y-1/2 pointer-events-none z-0 px-2">
                       {capFlips.map((flip, i) => {
                          // Prevent division by zero if maxTime is 0, though highly unlikely
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

          {/* Individual Rankings Panel */}
          {playerStats.length > 0 && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Fraggers */}
              <div className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm">
                <div className="bg-muted/40 p-3 border-b">
                  <h3 className="text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-green-500" /> Top 5 Fraggers
                  </h3>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/20 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2">Jogador</th>
                        <th className="px-4 py-2 text-center">Kills</th>
                        <th className="px-4 py-2 text-center">Mortes</th>
                        <th className="px-4 py-2 text-right">K/D</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {topFraggers.map((p: any, idx) => (
                        <tr key={p.player_id} className="hover:bg-muted/10">
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-3">{idx + 1}.</span> 
                            {p.player}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-green-500">{p.kills}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{p.deaths}</td>
                          <td className="px-4 py-3 text-right">{p.kill_death_ratio?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Meat Grinders */}
              <div className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm">
                <div className="bg-muted/40 p-3 border-b">
                  <h3 className="text-sm font-headline font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Skull className="w-4 h-4 text-red-500" /> Top 5 Meat Grinders (Mais Mortes)
                  </h3>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/20 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2">Jogador</th>
                        <th className="px-4 py-2 text-center">Mortes</th>
                        <th className="px-4 py-2 text-center">Kills</th>
                        <th className="px-4 py-2 text-right">K/D</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {topMeatGrinders.map((p: any, idx) => (
                        <tr key={p.player_id} className="hover:bg-muted/10">
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-3">{idx + 1}.</span> 
                            {p.player}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-red-500">{p.deaths}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{p.kills}</td>
                          <td className="px-4 py-3 text-right">{p.kill_death_ratio?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
