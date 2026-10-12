export interface MatchConfig {
  id: string;
  gameId: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  date: string;
  duration: string;
  mapName: string;
  mapImage: string;
  telemetryUrl: string;
  isNew?: boolean;
  gameUrl: string;
}

export const MATCH_PRESETS: MatchConfig[] = [
  {
    id: '1600',
    gameId: '1600',
    title: 'Partida #1600 • Utah Beach Warfare (Night)',
    shortTitle: 'Partida #1600',
    subtitle: '11/10/2026 • 1h 30m • Vitória Aliada 4-1',
    date: '11/10/2026',
    duration: '1h 30m',
    mapName: 'Utah Beach Warfare (Night)',
    mapImage: '/maps/utah.jpg',
    telemetryUrl: '/matches/1600.json',
    isNew: true,
    gameUrl: 'https://hrb-stats.hlladmin.com/games/1600',
  },
  {
    id: '1567',
    gameId: '1567',
    title: 'Partida #1567 • Utah Beach Warfare',
    shortTitle: 'Partida #1567',
    subtitle: '05/10/2026 • 57 min • Vitória Eixo 3-2',
    date: '05/10/2026',
    duration: '57m',
    mapName: 'Utah Beach Warfare',
    mapImage: '/maps/utah.jpg',
    telemetryUrl: '/matches/1567.json',
    isNew: false,
    gameUrl: 'https://hrb-stats.hlladmin.com/games/1567',
  },
];
