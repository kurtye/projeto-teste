
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Users, 
  Shield, 
  Search, 
  BarChart2, 
  Target, 
  Sword, 
  Crosshair, 
  HeartPulse, 
  ChevronRight,
  TrendingUp,
  Map as MapIcon,
  Crown
} from 'lucide-react';
import { getMonthlyHallOfFame } from '@/app/hall-of-fame/actions';
import { clans } from '@/lib/clans';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { AdBanner } from '@/components/AdBanner';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const STAT_CATEGORY_INFO: Record<string, { label: string, icon: any, color: string }> = {
  totalKills: { label: 'Rei dos Kills', icon: Trophy, color: 'text-yellow-500' },
  totalOffense: { label: 'Rei do Ataque', icon: Sword, color: 'text-red-500' },
  totalDefense: { label: 'Rei da Defesa', icon: Shield, color: 'text-blue-500' },
  totalSupport: { label: 'Rei do Suporte', icon: HeartPulse, color: 'text-green-500' },
};

export default async function HllHomePage() {
  const currentDate = new Date();
  const currentMonthId = `month_${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;
  const hallOfFameData = await getMonthlyHallOfFame(currentMonthId);
  const hallOfFame = hallOfFameData.records;
  
  // Pick top 4 categories for the home page highlights
  const categoriesToShow = ['totalKills', 'totalOffense', 'totalDefense', 'totalSupport'];

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-12 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)] -z-10" />
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.05),transparent_70%)] -z-10" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 border-accent/20 bg-accent/5 text-accent text-xs font-bold tracking-[0.2em] uppercase rounded-full">
            Plataforma Oficial da Comunidade HLL BR
          </Badge>
          <h1 className="text-5xl md:text-8xl font-black font-headline uppercase tracking-tighter mb-6 leading-none">
            Mantenha o <span className="text-accent italic">Controle</span> <br /> 
            do <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-orange-500">Campo de Batalha</span>
          </h1>
          <p className="max-w-3xl mx-auto text-muted-foreground text-lg md:text-xl mb-12 leading-relaxed">
            Acompanhe cada conquista, analise estatísticas em tempo real e lidere seu clã rumo à glória. 
            Monitore seu desempenho, compare rankings e gerencie seu clã na plataforma definitiva para a comunidade brasileira de HLL.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto">
             <Link href="/ranking" className="w-full sm:w-auto overflow-visible">
               <Button 
                 size="lg" 
                 className="group relative h-20 px-8 md:px-12 text-xl md:text-2xl font-black rounded-2xl transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl shadow-orange-500/20 bg-gradient-to-r from-[#4b5320] via-[#556b2f] to-[#ffa600] border-b-4 border-[#8b4513]/50 hover:shadow-[#ffa600]/40 w-full"
               >
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl animate-pulse" />
                 <span className="relative flex items-center justify-center gap-3 tracking-tighter uppercase italic">
                    <Trophy className="h-6 w-6 md:h-8 md:w-8 animate-bounce" />
                    IR PARA O RANKING GERAL
                 </span>
               </Button>
             </Link>
             <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-50">
               Pressione para entrar na elite
             </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 items-center text-muted-foreground opacity-60">
             <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-bold tracking-widest uppercase">+{clans.length} CLÃS ATIVOS</span>
             </div>
             <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                <span className="text-sm font-bold tracking-widest uppercase">+10k JOGADORES</span>
             </div>
          </div>
        </div>
      </section>

      {/* Ad Section */}
      <div className="container mx-auto px-4 mb-24">
        <AdBanner>
           <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-1957003967974734"
                data-ad-slot="1234567890"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </AdBanner>
      </div>

      {/* Hall of Fame Highlights */}
      <section className="py-24 bg-card/30 backdrop-blur-sm border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-black font-headline uppercase tracking-tight">Hall da Fama</h2>
              <p className="text-muted-foreground">Os jogadores que dominam as estatísticas globais da comunidade</p>
            </div>
            <Button variant="ghost" asChild className="group text-accent hover:text-accent font-bold tracking-widest uppercase">
              <Link href="/hall-of-fame" className="flex items-center gap-2">
                Ver Hall da Fama Completo <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoriesToShow.map((cat) => {
              const player = hallOfFame ? hallOfFame[cat] : undefined;
              const info = STAT_CATEGORY_INFO[cat];
              if (!player || !player.playerName) return null;
              
              return (
                <Card key={cat} className="group overflow-hidden border-accent/10 hover:border-accent/30 transition-all duration-300 hover:shadow-2xl hover:shadow-accent/5 hover:-translate-y-1">
                  <div className={`h-1.5 w-full bg-accent/20 group-hover:bg-accent transition-colors`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg bg-accent/10 ${info.color}`}>
                         <info.icon className="h-6 w-6" />
                      </div>
                      <Crown className="h-5 w-5 text-accent opacity-20 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{info.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-headline truncate mb-4">{player.playerName}</div>
                    <Button variant="outline" size="sm" asChild className="w-full text-[11px] font-bold tracking-widest uppercase border-accent/10 hover:bg-accent/10">
                      <Link href={`/player/${player.id}`}>Ver Perfil Detalhado</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Clans */}
      <section className="py-24 border-t border-border/50">
        <div className="container mx-auto px-4">
           <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-black font-headline uppercase tracking-tight">Clãs em Destaque</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">As comunidades mais organizadas e competitivas do cenário nacional</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {clans.slice(0, 5).map((clan) => (
              <Link key={clan.id} href={`/clans/${clan.id}`} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <Card className="h-full border-accent/5 bg-card/50 hover:bg-transparent transition-all duration-300 flex flex-col items-center justify-center p-8 text-center border-2">
                   <div className="relative w-20 h-20 mb-4 rounded-full overflow-hidden border-2 border-accent/20 group-hover:border-accent transition-colors">
                     {clan.logoUrl ? (
                        <Image src={clan.logoUrl} alt={clan.name} fill className="object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent font-bold text-2xl">
                          {clan.tag}
                        </div>
                     )}
                   </div>
                   <h3 className="font-bold text-lg mb-1">{clan.name}</h3>
                   <Badge variant="secondary" className="bg-accent/10 text-accent border-none">{clan.tag}</Badge>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline" asChild className="border-accent/20 hover:bg-accent/10 font-bold uppercase tracking-widest">
               <Link href="/clans">Ver Todos os Clãs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* SEO/Value Section */}
      <section className="py-32 bg-accent/5 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
               <h2 className="text-4xl md:text-5xl font-black font-headline uppercase tracking-tight leading-none">
                 A Maior Base de Dados <br />
                 <span className="text-accent underline decoration-4 underline-offset-8">Tática do Brasil</span>
               </h2>
               <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                 <p>
                   O Hell Let Loose BR Dashboard foi criado com um único objetivo: fornecer transparência e competitividade saudável para a comunidade brasileira. Utilizamos dados reais processados diretamente dos servidores oficiais e da comunidade.
                 </p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-foreground font-bold italic">
                        <BarChart2 className="h-5 w-5 text-accent" /> MÉTRICAS REAIS
                      </div>
                      <p className="text-sm">Analise PPH, KPH e eficácia tática com precisão cirúrgica.</p>
                    </div>
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-foreground font-bold italic">
                        <Target className="h-5 w-5 text-accent" /> RANKING GLOBAL
                      </div>
                      <p className="text-sm">Veja onde você se encaixa na elite nacional de Hell Let Loose.</p>
                    </div>
                 </div>
               </div>
            </div>
            <div className="relative">
               <div className="aspect-video rounded-2xl bg-card border border-accent/20 overflow-hidden shadow-2xl relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 to-transparent" />
                  <div className="p-8 flex items-center justify-center h-full">
                     <div className="space-y-4 text-center">
                        <div className="inline-block p-4 rounded-full bg-accent/20 mb-4">
                           <Trophy className="h-12 w-12 text-accent" />
                        </div>
                        <p className="text-xl font-bold font-headline uppercase tracking-widest text-accent">Prepare-se para conquistar</p>
                        <p className="text-sm text-muted-foreground">Estatísticas atualizadas a cada partida</p>
                     </div>
                  </div>
               </div>
               {/* Decorative elements */}
               <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 blur-3xl rounded-full" />
               <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
