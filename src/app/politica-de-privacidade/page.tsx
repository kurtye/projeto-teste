
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  const lastUpdate = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center pb-8 border-b border-border/30">
          <CardTitle className="text-4xl font-black font-headline uppercase">Política de Privacidade</CardTitle>
          <p className="text-muted-foreground mt-2 italic text-sm">Última atualização: {lastUpdate}</p>
        </CardHeader>
        <CardContent className="pt-8 prose prose-invert prose-lg max-w-none text-foreground/80 
          prose-headings:text-accent prose-headings:font-headline prose-strong:text-foreground
          prose-p:mb-6 prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2">
          
          <p>
            O <strong>Hell Let Loose BR (HLL BR)</strong> valoriza a sua privacidade. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações ao utilizar nossa plataforma.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">1. Coleta de Informações</h2>
          <p>
            Coletamos informações necessárias para fornecer e melhorar nossos serviços, incluindo:
          </p>
          <ul>
            <li><strong>Dados Públicos de Perfis:</strong> Coletamos estatísticas públicas do jogo Hell Let Loose através de APIs de servidores e da Steam para fins de ranking e histórico.</li>
            <li><strong>Informações de Autenticação:</strong> Se você se cadastrar como administrador de clã, coletamos seu e-mail e informações básicas de perfil via Firebase Auth.</li>
            <li><strong>Preferências de Jogador:</strong> Dados fornecidos voluntariamente através do formulário de preferências do clã (ex: classes preferidas, estilo de jogo).</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">2. Uso das Informações</h2>
          <p>
            As informações coletadas são utilizadas para:
          </p>
          <ul>
            <li>Exibir rankings globais e de clãs para a comunidade.</li>
            <li>Gerenciar alinhamentos (lineups) e preferências para administradores de clãs.</li>
            <li>Gerar relatórios táticos assistidos por Inteligência Artificial.</li>
            <li>Exibir anúncios relevantes através do Google AdSense.</li>
            <li>Melhorar a experiência do usuário e a funcionalidade da plataforma.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">3. Google AdSense e Cookies</h2>
          <p>
            Utilizamos o <strong>Google AdSense</strong> para veicular anúncios. O Google utiliza cookies (como o cookie DART) para exibir anúncios com base nas suas visitas a este e outros sites na Internet. Você pode optar por não utilizar o cookie DART visitando a Política de Privacidade da rede de conteúdo e dos anúncios do Google.
          </p>
          <p>
            Utilizamos o <strong>Google Analytics</strong> para entender como os usuários interagem com o site. Esses dados são anônimos e focados em métricas de tráfego.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">4. Proteção de Dados</h2>
          <p>
            Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração ou destruição. Utilizamos serviços de infraestrutura de nuvem líderes de mercado (Google Cloud/Firebase) para garantir a integridade dos dados.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">5. Seus Direitos</h2>
          <p>
            Como usuário, você tem o direito de:
          </p>
          <ul>
            <li>Solicitar a remoção de seus dados de preferência.</li>
            <li>Solicitar a anonimização de seu nome em nossos rankings públicos (entre em contato via Discord ou e-mail).</li>
            <li>Revogar permissões de cookies através das configurações do seu navegador.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">6. Alterações nesta Política</h2>
          <p>
            Reservamo-nos o direito de atualizar esta política a qualquer momento. Notificaremos os usuários sobre mudanças significativas publicando um aviso em nossa plataforma.
          </p>

          <div className="mt-16 p-6 bg-accent/5 border border-accent/20 rounded-xl">
            <h3 className="text-xl font-bold text-accent mb-4">Contato</h3>
            <p className="m-0 italic">
              Para questões relacionadas à privacidade, entre em contato através do e-mail: <strong>contato@hllbrasil.com</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
