import { getWeaponRanking } from './actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Crosshair, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdBanner } from '@/components/AdBanner';

// Force dynamic rendering to always get the latest data
export const dynamic = 'force-dynamic';

const getRankHighlightClasses = (rank: number): string => {
    switch (rank) {
        case 1: return "text-yellow-400";
        case 2: return "text-slate-400";
        case 3: return "text-orange-400";
        default: return "text-muted-foreground";
    }
}

export default async function ArmasPage() {
  const weaponRanking = await getWeaponRanking();

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <Crosshair className="h-8 w-8 text-accent" />
          Arsenal da Comunidade
        </h1>
        <p className="text-muted-foreground mt-2">
          As armas que mais causaram dano nos campos de batalha.
        </p>
      </div>

       <AdBanner className="my-8">
          <ins className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-1957003967974734"
              data-ad-slot="1512951312"
              data-ad-format="auto"
              data-full-width-responsive="true"></ins>
       </AdBanner>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de Armas por Kills</CardTitle>
          <CardDescription>
            Contagem total de abates para cada arma em todos os servidores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Arma</TableHead>
                <TableHead className="text-right">Total de Kills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weaponRanking.length > 0 ? (
                weaponRanking.map((weapon, index) => {
                  const rank = index + 1;
                  return (
                    <TableRow key={weapon.id}>
                      <TableCell className={cn("font-bold text-lg", getRankHighlightClasses(rank))}>
                         <div className="flex items-center gap-2">
                            {rank <= 3 ? <Trophy className="h-5 w-5" /> : <span className="w-5 text-center">{rank}</span>}
                         </div>
                      </TableCell>
                      <TableCell className="font-medium">{weapon.name}</TableCell>
                      <TableCell className="text-right font-semibold text-accent">
                        {weapon.totalKills.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Nenhuma estatística de arma encontrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
