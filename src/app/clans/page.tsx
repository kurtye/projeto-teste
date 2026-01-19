
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, ChevronRight } from 'lucide-react';
import { clans } from '@/lib/clans';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function ClansPage() {
  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <Users className="h-8 w-8 text-accent" />
          Clãs da Comunidade
        </h1>
        <p className="text-muted-foreground mt-2">
          Conheça os clãs que formam a comunidade brasileira de Hell Let Loose.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {clans.map((clan) => (
          <Link key={clan.id} href={`/clans/${clan.id}`} className="group">
            <Card className="h-full transition-all duration-200 hover:border-accent hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary bg-background">
                    {clan.logoUrl ? (
                      <div className="relative w-full h-full rounded-full overflow-hidden">
                        <Image src={clan.logoUrl} alt={`${clan.name} logo`} fill className="object-cover" />
                      </div>
                    ) : (
                      <AvatarFallback className="text-xl">{clan.tag}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl font-headline group-hover:text-accent transition-colors">{clan.name}</CardTitle>
                    <CardDescription>[{clan.tag}]</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Ver Perfil do Clã <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
