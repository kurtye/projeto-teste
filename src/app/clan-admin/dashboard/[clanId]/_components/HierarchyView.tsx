
'use client';

import type { ClanMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Shield, Star, User, Diamond, Award } from 'lucide-react';
import Link from 'next/link';

interface HierarchyViewProps {
  members: ClanMember[];
}

const ranksInOrder = [
    'Marechal',
    'General de Exército',
    'General de Divisão',
    'General de Brigada',
    'Coronel',
    'Tenente-Coronel',
    'Major',
    'Capitão',
    'Primeiro-Tenente',
    'Segundo-Tenente',
    'Aspirante',
    'Subtenente',
    'Primeiro-Sargento',
    'Segundo-Sargento',
    'Terceiro-Sargento',
    'Cabo',
    'Soldado',
    'Recruta'
];

const rankIcons: { [key: string]: React.ReactNode } = {
  'Marechal': <Crown className="h-5 w-5 text-yellow-400" />,
  'General de Exército': <Crown className="h-5 w-5 text-yellow-500" />,
  'General de Divisão': <Crown className="h-5 w-5 text-yellow-600" />,
  'General de Brigada': <Crown className="h-5 w-5 text-yellow-700" />,
  'Coronel': <Star className="h-5 w-5 text-purple-400" />,
  'Tenente-Coronel': <Star className="h-5 w-5 text-purple-500" />,
  'Major': <Star className="h-5 w-5 text-purple-600" />,
  'Capitão': <Diamond className="h-5 w-5 text-blue-400" />,
  'Primeiro-Tenente': <Diamond className="h-5 w-5 text-blue-500" />,
  'Segundo-Tenente': <Diamond className="h-5 w-5 text-blue-600" />,
  'Aspirante': <Award className="h-5 w-5 text-teal-400" />,
  'Subtenente': <Award className="h-5 w-5 text-teal-500" />,
  'Primeiro-Sargento': <Shield className="h-5 w-5 text-green-400" />,
  'Segundo-Sargento': <Shield className="h-5 w-5 text-green-500" />,
  'Terceiro-Sargento': <Shield className="h-5 w-5 text-green-600" />,
  'Cabo': <User className="h-5 w-5 text-gray-400" />,
  'Soldado': <User className="h-5 w-5 text-gray-500" />,
  'Recruta': <User className="h-5 w-5 text-gray-600" />,
};

export function HierarchyView({ members }: HierarchyViewProps) {
  const membersByRank = ranksInOrder.map(rank => {
    return {
      rank,
      members: members.filter(member => member.rank === rank),
    };
  });

  return (
    <div className="space-y-6">
      {membersByRank.map(({ rank, members }) => (
        members.length > 0 && (
          <Card key={rank} className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-headline">
                {rankIcons[rank] || <User className="h-5 w-5" />}
                <span>{rank} ({members.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {members.map(member => (
                  <Link key={member.id} href={`/player/${encodeURIComponent(member.id)}`}>
                    <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{member.playerName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden">
                        <p className="truncate font-medium">{member.playerName}</p>
                        <p className="text-xs text-muted-foreground">{member.status}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
}
