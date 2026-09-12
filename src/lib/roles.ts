import { 
  Target, 
  Flame, 
  Zap, 
  HeartPulse, 
  Crosshair, 
  Shield, 
  Star, 
  Truck,
  LucideIcon
} from 'lucide-react';

export const ROLE_MAPPING: Record<number, { name: string, icon: LucideIcon }> = {
  0: { name: 'Rifleman', icon: Target },
  1: { name: 'Assault', icon: Flame },
  2: { name: 'Auto Rifleman', icon: Zap },
  3: { name: 'Medic', icon: HeartPulse },
  4: { name: 'Spotter', icon: Crosshair },
  5: { name: 'Support', icon: Zap },
  6: { name: 'Machine Gunner', icon: Crosshair },
  7: { name: 'Anti-Tank', icon: Truck },
  8: { name: 'Engineer', icon: Shield },
  9: { name: 'Officer', icon: Star },
  10: { name: 'Sniper', icon: Crosshair },
  11: { name: 'Tank Commander', icon: Truck },
  12: { name: 'Crewman', icon: Truck },
};
