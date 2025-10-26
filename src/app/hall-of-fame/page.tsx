import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function HallOfFamePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline md:text-2xl">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <span>Hall da Fama</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Página em construção. Aqui serão exibidos os jogadores com os maiores recordes em diferentes categorias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
