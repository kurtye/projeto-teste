
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfUse() {
  const lastUpdate = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center pb-8 border-b border-border/30">
          <CardTitle className="text-4xl font-black font-headline uppercase">Termos de Uso</CardTitle>
          <p className="text-muted-foreground mt-2 italic text-sm">Última atualização: {lastUpdate}</p>
        </CardHeader>
        <CardContent className="pt-8 prose prose-invert prose-lg max-w-none text-foreground/80 
          prose-headings:text-accent prose-headings:font-headline prose-strong:text-foreground
          prose-p:mb-6 prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2">
          
          <p>
            Bem-vindo ao <strong>Hell Let Loose BR (HLL BR)</strong>. Ao acessar ou utilizar nossa plataforma, você concorda em cumprir e estar vinculado aos seguintes Termos de Uso.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">1. Aceitação dos Termos</h2>
          <p>
            O uso desta plataforma constitui a aceitação plena de todos os termos e condições aqui estabelecidos. Se você não concorda com qualquer parte destes termos, deve interromper imediatamente o uso do site.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">2. Descrição do Serviço</h2>
          <p>
            O HLL BR fornece uma plataforma de agregação de dados, rankings estatísticos e ferramentas de gerenciamento para a comunidade do jogo Hell Let Loose. Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspecto do serviço a qualquer momento, sem aviso prévio.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">3. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo original desta plataforma (textos, design, logotipos, códigos) é de propriedade do HLL BR. Hell Let Loose, Team17 e Black Matter são marcas registradas de seus respectivos proprietários. O uso de marcas de terceiros no site é puramente para fins informativos e de referência à comunidade do jogo.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">4. Conduta do Usuário</h2>
          <p>
            Ao utilizar a plataforma, você concorda em:
          </p>
          <ul>
            <li>Não utilizar os dados para fins comerciais não autorizados.</li>
            <li>Não realizar scraping ou coleta automatizada de dados de forma abusiva.</li>
            <li>Não tentar interferir na segurança ou integridade do sistema.</li>
            <li>Não postar conteúdo ofensivo ou discriminatório em áreas públicas (como nomes de clãs ou perfis).</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">5. Limitação de Responsabilidade</h2>
          <p>
            O HLL BR não garante a precisão absoluta dos dados estatísticos, pois eles dependem de APIs de terceiros. A plataforma é fornecida "como está" e não nos responsabilizamos por perdas de dados, interrupções de serviço ou decisões tomadas com base nas informações aqui contidas.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">6. Links para Terceiros</h2>
          <p>
            Nosso site pode conter links para sites de terceiros (Discord, Steam, etc.). Não temos controle sobre e não assumimos responsabilidade pelo conteúdo ou práticas de privacidade desses sites.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-border/30 pb-2">7. Resolução de Conflitos</h2>
          <p>
            Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca da sede administrativa da plataforma.
          </p>

          <div className="mt-16 p-6 bg-accent/5 border border-accent/20 rounded-xl">
            <h3 className="text-xl font-bold text-accent mb-4">Dúvidas?</h3>
            <p className="m-0 italic">
              Se você tiver qualquer dúvida sobre estes termos, entre em contato: <strong>contato@hllbrasil.com</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
