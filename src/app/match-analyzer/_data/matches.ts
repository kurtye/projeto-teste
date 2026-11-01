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

export interface MapDefinition {
  id: string;
  name: string;
  image: string;
  keywords: string[];
}

export const AVAILABLE_MAPS: MapDefinition[] = [
  {
    id: 'omaha',
    name: 'Omaha Beach (Custom)',
    image: '/maps/omaha.jpg',
    keywords: ['omaha', 'omaha beach', 'omaha_custom'],
  },
  {
    id: 'omaha-png',
    name: 'Omaha Beach (PNG MLL)',
    image: '/maps/Omaha_Custom_MLL.png',
    keywords: ['omaha_custom_mll'],
  },
  {
    id: 'utah',
    name: 'Utah Beach',
    image: '/maps/utah.jpg',
    keywords: ['utah', 'utah beach'],
  },
];

export function detectMapImage(mapNameOrQuery?: string): string {
  if (!mapNameOrQuery) return '/maps/utah.jpg';
  const lower = mapNameOrQuery.toLowerCase();
  const found = AVAILABLE_MAPS.find(m =>
    m.keywords.some(k => lower.includes(k)) || m.name.toLowerCase() === lower || m.image === mapNameOrQuery
  );
  return found ? found.image : '/maps/utah.jpg';
}

export function getMapNameByImage(imageSrc?: string): string {
  const found = AVAILABLE_MAPS.find(m => m.image === imageSrc);
  return found ? found.name : 'Utah Beach';
}

export const MATCH_PRESETS: MatchConfig[] = [
  {
    id: '1634',
    gameId: '1634',
    title: 'HRB x SVS - LSA 19/10/2026',
    shortTitle: 'Partida #1634 (HRB x SVS)',
    subtitle: '19/10/2026 • 1h 30m • Vitória Aliada 3-2',
    date: '19/10/2026',
    duration: '1h 30m',
    mapName: 'Omaha Beach Warfare',
    mapImage: '/maps/omaha.jpg',
    telemetryUrl: '/matches/1634.json',
    isNew: true,
    gameUrl: 'https://hrb-stats.hlladmin.com/games/1634',
  },
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
    isNew: false,
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
