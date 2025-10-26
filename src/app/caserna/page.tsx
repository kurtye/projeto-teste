import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

export default function CasernaPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-headline md:text-2xl">
            <Briefcase className="h-6 w-6 text-accent" />
            <span>Caserna</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Página em construção. Aqui serão exibidas estatísticas gerais dos servidores e da comunidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
