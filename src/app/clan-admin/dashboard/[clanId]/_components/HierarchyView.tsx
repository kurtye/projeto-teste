'use client';

import type { ClanMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface HierarchyViewProps {
  members: ClanMember[];
}

const ranksInOrder = [
    'Marechal',
    'General-de-Exercito',
    'General-de-Divisao',
    'General-de-Brigada',
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
    // Just use the rank name directly as it matches the file name.
    return `/patentes/${rank}.jpeg`;
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
          <Card key={rank} className="bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-6">
                 <div className="relative h-16 w-16">
                     <Image 
                        src={getRankImage(rank)} 
                        alt={rank} 
                        fill
                        className="object-contain"
                     />
                 </div>
                 <div>
                    <CardTitle className="text-xl font-headline">
                        {rank.replace(/-/g, ' ')}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{members.length} membro(s)</p>
                 </div>
            </CardHeader>
            <CardContent>
                {members.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {members.map(member => (
                        <Link key={member.id} href={`/player/${encodeURIComponent(member.id)}`}>
                        <div className={cn(
                            "flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted",
                            member.status !== 'active' && 'opacity-60 hover:opacity-100'
                        )}>
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
                ) : (
                     <p className="text-sm text-muted-foreground italic">Nenhum membro nesta patente.</p>
                )}
            </CardContent>
          </Card>
      ))}
    </div>
  );
}
