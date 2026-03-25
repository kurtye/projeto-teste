
import Link from 'next/link';
import { Shield, Info, BookOpen, Mail, Github, MessageSquare } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card/30 backdrop-blur-md border-t border-border/50 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center font-black text-2xl text-accent-foreground">H</div>
              <span className="text-xl font-bold font-headline uppercase tracking-tighter">HLL <span className="text-accent">BR</span></span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A maior base de dados e plataforma de estatísticas para a comunidade brasileira de Hell Let Loose. 
              Criado por jogadores, para jogadores.
            </p>
            <div className="flex items-center gap-4">
              <Link href="#" className="p-2 bg-muted rounded-full hover:bg-accent/20 hover:text-accent transition-all">
                <Github className="h-5 w-5" />
              </Link>
              <Link href="#" className="p-2 bg-muted rounded-full hover:bg-accent/20 hover:text-accent transition-all">
                <MessageSquare className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-6">
            <h4 className="font-bold uppercase tracking-widest text-sm text-accent">Navegação</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Início</Link></li>
              <li><Link href="/ranking" className="text-muted-foreground hover:text-foreground transition-colors">Ranking Geral</Link></li>
              <li><Link href="/clans" className="text-muted-foreground hover:text-foreground transition-colors">Lista de Clãs</Link></li>
              <li><Link href="/hall-of-fame" className="text-muted-foreground hover:text-foreground transition-colors">Hall da Fama</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-6">
            <h4 className="font-bold uppercase tracking-widest text-sm text-accent">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/politica-de-privacidade" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"><BookOpen className="h-4 w-4" /> Privacidade</Link></li>
              <li><Link href="/termos-de-uso" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"><Shield className="h-4 w-4" /> Termos de Uso</Link></li>
              <li><Link href="/sobre" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"><Info className="h-4 w-4" /> Sobre o Projeto</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="font-bold uppercase tracking-widest text-sm text-accent">Contato</h4>
            <p className="text-sm text-muted-foreground">Tem dúvidas ou sugestões? Entre em contato com nossa equipe.</p>
            <Link href="mailto:contato@hllbrasil.com" className="inline-flex items-center gap-2 text-accent bg-accent/10 px-4 py-2 rounded-lg font-bold hover:bg-accent/20 transition-all">
              <Mail className="h-4 w-4" /> Enviar E-mail
            </Link>
          </div>
        </div>

        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} Hell Let Loose BR. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-muted-foreground/50 max-w-sm text-center md:text-right">
            Esta plataforma não é afiliada à Team17 ou Black Matter. Hell Let Loose é uma marca registrada de seus respectivos proprietários.
          </p>
        </div>
      </div>
    </footer>
  );
}
