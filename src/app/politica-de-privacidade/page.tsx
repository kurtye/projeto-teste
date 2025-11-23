
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookUser } from 'lucide-react';
import Link from 'next/link';

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <BookUser className="h-8 w-8 text-accent" />
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground mt-2">
          Última atualização: 3 de Agosto de 2024
        </p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="py-6 prose prose-invert prose-lg max-w-none text-foreground/90 prose-headings:text-accent prose-headings:font-headline prose-strong:text-foreground space-y-4">
          <p>
            A sua privacidade é importante para nós. É política do Hell Let Loose BR respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site <Link href="/">Hell Let Loose BR</Link>, e outros sites que possuímos e operamos.
          </p>

          <h2>1. Coleta de Dados</h2>
          <p>
            Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos и legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
          </p>
          <p>
            Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
          </p>

          <h2>2. Cookies e Web Beacons</h2>
          <p>
            Utilizamos cookies para armazenar informações, como as suas preferências pessoais quando visita o nosso website. Isto poderá incluir um simples pop-up ou uma ligação em vários serviços que providenciamos.
          </p>
          <p>
            Em adição, também utilizamos publicidade de terceiros no nosso website para suportar os custos de manutenção. Alguns desses publicitários poderão utilizar tecnologias como os cookies e/ou web beacons quando publicitam no nosso website, o que fará com que esses publicitários (como o Google através do Google AdSense) também recebam as suas informações pessoais, como o endereço IP, o seu provedor de internet, o seu browser, etc. Esta função é geralmente utilizada para geotargeting (mostrar publicidade de São Paulo apenas aos leitores oriundos de São Paulo, por exemplo) ou apresentar publicidade direcionada a um tipo de utilizador.
          </p>
          <p>
            Você detém o poder de desligar os seus cookies nas opções do seu browser ou efetuando alterações nas ferramentas de programas antivírus. No entanto, isso poderá alterar a forma como interage com o nosso website ou outros websites.
          </p>

          <h2>3. Google Analytics e Google AdSense</h2>
          <p>
            Este site usa o Google Analytics para coletar informações anônimas, como o número de visitantes do site e as páginas mais populares. Manter este cookie ativado nos ajuda a melhorar nosso site.
          </p>
          <p>
            O serviço Google AdSense que usamos para veicular publicidade usa um cookie DoubleClick para veicular anúncios mais relevantes em toda a Web e limitar o número de vezes que um determinado anúncio é exibido para você. Para mais informações sobre o Google AdSense, consulte as FAQs oficiais sobre privacidade do Google AdSense.
          </p>

          <h2>4. Links para Sites de Terceiros</h2>
          <p>
            O nosso site pode ter ligações para sites externos que не são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.
          </p>

          <h2>5. Compromisso do Usuário</h2>
          <p>
            O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o Hell Let Loose BR oferece no site e com caráter enunciativo, mas não limitativo:
          </p>
          <ul>
            <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé e à ordem pública;</li>
            <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou sobre azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</li>
            <li>C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do Hell Let Loose BR, de seus fornecedores ou terceiros, para introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas de hardware ou software que sejam capazes de causar os danos anteriormente mencionados.</li>
          </ul>

          <p>
            Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados.
          </p>
          <p>
            O uso continuado de nosso site será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco através da página <Link href="/sobre">Sobre</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
