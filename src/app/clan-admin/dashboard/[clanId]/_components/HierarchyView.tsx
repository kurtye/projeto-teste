
'use client';

import type { ClanMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';

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

const getRankImage = (rank: string) => {
    // Correctly forms the image name, preserving case and using the .jpeg extension.
    const imageName = rank.replace(/ /g, '-') + '.jpeg';
    return `/patentes/${imageName}`;
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
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-headline">
                        {rank}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{members.length} membro(s)</p>
                </div>
                <Image src={getRankImage(rank)} alt={rank} width={48} height={48} />
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
                        <p className="text-xs text-muted-foreground capitalize">{member.status}</p>
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
