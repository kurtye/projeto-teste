'use client';

import type { ClanMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Shield, Star, User } from 'lucide-react';
import Link from 'next/link';

interface HierarchyViewProps {
  members: ClanMember[];
}

const ranksInOrder = ['Líder', 'Comandante', 'Oficial', 'Veterano', 'Membro', 'Recruta'];

const rankIcons: { [key: string]: React.ReactNode } = {
  'Líder': <Crown className="h-5 w-5 text-yellow-400" />,
  'Comandante': <Crown className="h-5 w-5 text-orange-400" />,
  'Oficial': <Shield className="h-5 w-5 text-blue-400" />,
  'Veterano': <Star className="h-5 w-5 text-indigo-400" />,
  'Membro': <User className="h-5 w-5 text-green-400" />,
  'Recruta': <User className="h-5 w-5 text-gray-400" />,
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
