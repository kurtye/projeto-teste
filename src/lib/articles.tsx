import React from 'react';

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  content: React.ReactNode;
}

export const articles: Article[] = [
  {
    slug: 'comunicacao-eficaz',
    title: 'A Arte da Comunicação Eficaz em Hell Let Loose',
    description: 'Domine o campo de batalha com comunicação clara e estratégica. Aprenda a usar os canais de voz, a marcar inimigos e a coordenar com seu esquadrão para alcançar a vitória.',
    date: '1 de Agosto de 2024',
    tags: ['Estratégia', 'Comunicação', 'Iniciante'],
    content: (
        <div className="space-y-4">
            <p>
                Em Hell Let Loose, a comunicação não é apenas uma ferramenta, é a principal arma. Um time que se comunica bem tem uma vantagem esmagadora sobre um que joga em silêncio. Este guia vai te ajudar a dominar a arte da comunicação para levar seu esquadrão à vitória.
            </p>
            <h3>Os Canais de Voz</h3>
            <p>
                Existem três canais de voz principais:
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li><strong>Proximidade (Branco):</strong> Todos os jogadores próximos (aliados e inimigos) podem te ouvir. Ótimo para interações rápidas com jogadores de outros esquadrões ou para aquela provocação psicológica contra o inimigo.</li>
                <li><strong>Esquadrão (Verde):</strong> Apenas os membros do seu esquadrão te ouvem. Este é o seu principal canal de comunicação para coordenação tática, pedidos de suprimentos, e para informar a posição dos inimigos.</li>
                <li><strong>Comando (Vermelho):</strong> Apenas o Comandante e os Líderes de Esquadrão têm acesso. É aqui que a estratégia geral da batalha é definida, onde os líderes solicitam bombardeios, tanques e informam sobre os movimentos de tropas em larga escala.</li>
            </ul>
            <h3>A Regra dos "3 Cs": Claro, Conciso e Calmo</h3>
            <p>
                Quando estiver em combate, a adrenalina está alta. Para ser eficaz, sua comunicação precisa seguir os 3 Cs:
            </p>
             <ol className="list-decimal space-y-2 pl-6">
                <li><strong>Claro:</strong> Fale de forma audível. Dê informações precisas. Em vez de "Inimigo ali!", tente "Infantaria inimiga, 120 graus, atrás da parede de pedra!".</li>
                <li><strong>Conciso:</strong> Vá direto ao ponto. Os canais de voz podem ficar lotados. Evite conversas desnecessárias durante o combate.</li>
                <li><strong>Calmo:</strong> Manter a calma sob pressão ajuda a transmitir a informação de forma mais eficaz e mantém a moral do esquadrão alta.</li>
            </ol>
            <h3>Utilizando as Marcações (Pings)</h3>
            <p>
                O sistema de marcações é um complemento vital à comunicação por voz. Use-o constantemente:
            </p>
             <ul className="list-disc space-y-2 pl-6">
                <li><strong>Marcação de Observação/Ataque:</strong> Use para indicar posições inimigas gerais.</li>
                <li><strong>Marcação de Tanque/Veículo Leve:</strong> Essencial para que as classes anti-tanque saibam onde focar.</li>
                <li><strong>Marcação de Guarnição/Posto Avançado:</strong> Marque spawns inimigos assim que os encontrar. Destruí-los é uma prioridade máxima.</li>
            </ul>
            <p>
                Lembre-se: uma marcação vale mais que mil palavras. Combine suas chamadas de voz com marcações precisas para dar ao seu time a melhor informação situacional possível. Boa sorte no campo de batalha!
            </p>
        </div>
    ),
  },
  {
    slug: 'posicionamento-metralhadora',
    title: 'Posicionamento de Metralhadoras: Supressão e Controle de Área',
    description: 'Uma metralhadora bem posicionada pode mudar o rumo de uma batalha. Descubra os melhores locais para montar sua MG, como criar campos de tiro mortais e suprimir o avanço inimigo.',
    date: '30 de Julho de 2024',
    tags: ['Dicas', 'Metralhadora', 'Defesa'],
    content: (
       <div className="space-y-4">
            <p>
                A classe de Metralhadora (MG) é uma das mais poderosas para defesa e controle de área em Hell Let Loose. Uma MG bem posicionada pode parar um avanço inimigo inteiro, fornecendo fogo de supressão devastador e negando áreas chave ao adversário.
            </p>
            <h3>Princípios do Bom Posicionamento</h3>
            <p>
                O segredo para ser um bom metralhador não é apenas atirar, mas onde você decide montar sua arma.
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li><strong>Campos de Tiro Amplos:</strong> Procure locais que ofereçam uma visão desobstruída de áreas onde o inimigo provavelmente avançará, como campos abertos, estradas ou vales.</li>
                <li><strong>Cobertura e Ocultação:</strong> Nunca se posicione em um local totalmente aberto. Use janelas, muros baixos, trincheiras, ou vegetação densa para se proteger. Lembre-se, você é um alvo prioritário.</li>
                <li><strong>Flanqueamento é a Chave:</strong> Evite atirar diretamente de frente para o inimigo. Tente se posicionar em um ângulo (flanco) em relação à linha de avanço deles. Eles terão mais dificuldade em encontrar sua posição e revidar.</li>
                <li><strong>Mude de Posição:</strong> Assim que sua posição for comprometida (ou seja, você começar a receber muito fogo inimigo), reposicione-se. Um metralhador parado é um metralhador morto.</li>
            </ul>
            <h3>Fogo de Supressão: Sua Maior Ferramenta</h3>
            <p>
                Seu trabalho não é necessariamente conseguir o maior número de kills, mas sim suprimir o inimigo. Fogo de supressão (atirar perto das posições inimigas, mesmo que você não os veja diretamente) causa os seguintes efeitos:
            </p>
             <ul className="list-disc space-y-2 pl-6">
                <li>Desfoca a tela do inimigo, dificultando a mira.</li>
                <li>Reduz a velocidade e a precisão deles.</li>
                <li>Força-os a se abaixar e procurar cobertura, permitindo que seu esquadrão avance.</li>
            </ul>
            <p>
                Atire em rajadas curtas e controladas para manter a precisão e economizar munição. Varra a área onde você suspeita que os inimigos estejam. A supressão eficaz ganha batalhas.
            </p>
        </div>
    ),
  },
  {
    slug: 'papel-comandante',
    title: 'O Papel do Comandante: Liderando para a Vitória',
    description: 'Entenda as responsabilidades e as habilidades-chave de um Comandante eficaz, desde a gestão de recursos até a coordenação estratégica dos esquadrões.',
    date: '28 de Julho de 2024',
    tags: ['Estratégia', 'Comando', 'Liderança'],
    content: (
      <div className="space-y-4">
        <p>
          O Comandante é o cérebro da equipe em Hell Let Loose. Suas decisões podem levar um time à glória ou à derrota humilhante. Não é uma função para os fracos de coração, mas é uma das mais recompensadoras do jogo.
        </p>
        <h3>Gerenciamento de Recursos</h3>
        <p>
          Sua principal tarefa é gerenciar os recursos da equipe (munições, manpower e combustível), que são gerados passivamente por nós que os engenheiros constroem. Com esses recursos, você pode usar uma variedade de habilidades de comando:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Reforçar (Manpower):</strong> Lança suprimentos aéreos para que líderes de esquadrão possam construir guarnições em território inimigo.</li>
          <li><strong>Voo de Reconhecimento (Combustível):</strong> Revela as posições da infantaria e veículos inimigos em uma grande área do mapa, fornecendo inteligência crucial.</li>
          <li><strong>Bombardeio (Munições):</strong> Uma das habilidades mais letais, capaz de limpar pontos fortes e destruir veículos. Use com sabedoria e sempre avise seus aliados da área de impacto.</li>
          <li><strong>Spawns de Veículos (Combustível):</strong> Você é responsável por fornecer tanques pesados, médios e leves para seus esquadrões de blindados. A coordenação com eles é vital.</li>
        </ul>
        <h3>Coordenação Estratégica</h3>
        <p>
          Use o canal de voz de comando (vermelho) para se comunicar constantemente com seus Líderes de Esquadrão (SLs).
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li><strong>Defina Objetivos Claros:</strong> Designe quais esquadrões devem atacar e quais devem defender. Um erro comum é todo o time atacar, deixando os pontos de defesa vulneráveis.</li>
          <li><strong>Construa a "Backbone" de Spawns:</strong> Incentive seus SLs a construir guarnições. Uma boa rede de guarnições é a espinha dorsal de um ataque bem-sucedido e uma defesa sólida.</li>
          <li><strong>Ouça seus Líderes:</strong> Seus SLs são seus olhos e ouvidos no campo. Se um SL pede um bombardeio em uma posição específica ou informa sobre um tanque inimigo, confie nele e aja rapidamente.</li>
        </ol>
        <p>
          Um bom comandante é um multiplicador de força. Ele capacita seus líderes, que por sua vez capacitam seus esquadrões. Comunique-se, planeje e execute para levar seu time à vitória.
        </p>
      </div>
    ),
  },
  {
    slug: 'dominando-blindados',
    title: 'Dominando o Jogo de Blindados: Dicas para Tanquistas',
    description: 'Aprenda a operar tanques de forma eficaz, desde a comunicação da tripulação até as táticas de posicionamento e engajamento contra outros blindados e infantaria.',
    date: '25 de Julho de 2024',
    tags: ['Blindados', 'Táticas', 'Avançado'],
    content: (
      <div className="space-y-4">
        <p>
          Os tanques são os reis do campo de batalha em Hell Let Loose, mas operá-los de forma eficaz requer mais do que apenas apontar e atirar. Um esquadrão de blindados bem coordenado pode romper linhas, destruir defesas e espalhar o caos.
        </p>
        <h3>A Tripulação: Uma Unidade Coesa</h3>
        <p>
          Um tanque é operado por uma tripulação de 3 pessoas, e cada uma tem um papel vital:
        </p>
        <ul className="list-disc spacey-y-2 pl-6">
          <li><strong>Comandante do Tanque:</strong> Sua visão é de 360 graus. Você é os olhos da tripulação. Sua função é avistar alvos (especialmente tanques inimigos e infantaria anti-tanque), comunicar com o comando e outros esquadrões, e dar ordens ao motorista e ao artilheiro.</li>
          <li><strong>Artilheiro:</strong> Você controla a torre e as armas. Sua função é engajar os alvos designados pelo comandante. Comunique os tempos de recarga e o tipo de munição carregada (AP para blindados, HE for infantaria e estruturas).</li>
          <li><strong>Motorista:</strong> Você controla o movimento do tanque. Seu trabalho é posicionar o tanque de forma a dar ao artilheiro um bom campo de tiro, enquanto mantém a blindagem frontal virada para a ameaça principal. Ouça as ordens do comandante!</li>
        </ul>
        <h3>Táticas de Combate</h3>
        <p>
          Sobreviver e dominar exige tática, não apenas força bruta.
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li><strong>Posicionamento é Tudo (Hull-Down):</strong> Sempre que possível, posicione seu tanque de forma que apenas a torre fique exposta sobre uma colina ou obstáculo ("hull-down"). Isso minimiza sua silhueta e protege seu casco, que é mais vulnerável.</li>
          <li><strong>Nunca Exponha seus Flancos:</strong> A blindagem lateral e traseira de um tanque é muito mais fraca. Sempre tente manter a blindagem frontal, a mais espessa, virada para a direção da ameaça. Se precisar recuar, faça-o em marcha à ré.</li>
          <li><strong>Trabalhe com a Infantaria:</strong> Um tanque sozinho é vulnerável à infantaria anti-tanque. Avance com o apoio de seus esquadrões de infantaria. Eles podem proteger seus flancos e eliminar ameaças próximas enquanto você fornece poder de fogo pesado.</li>
          <li><strong>Conheça seu Inimigo:</strong> Saiba quais tanques você pode penetrar frontalmente e quais você precisa flanquear. Um Sherman 75mm terá dificuldades contra a frente de um Tiger, mas um tiro no flanco ou na traseira pode ser devastador.</li>
        </ol>
        <p>
          A comunicação constante dentro da tripulação é o fator mais importante. Avistem, comuniquem e movam-se como uma unidade para se tornarem a ponta de lança do seu time.
        </p>
      </div>
    ),
  },
  {
    slug: 'engenharia-de-combate',
    title: 'Engenharia de Combate Essencial',
    description: 'Aprenda o papel vital do Engenheiro, construindo nós de recursos, fortificações defensivas e usando cargas explosivas para destruir as defesas inimigas.',
    date: '22 de Julho de 2024',
    tags: ['Dicas', 'Engenheiro', 'Defesa'],
    content: (
      <div className="space-y-4">
        <p>
          A classe de Engenheiro é uma das mais subestimadas, mas absolutamente crucial para a vitória. Engenheiros são a espinha dorsal da logística e defesa do time, garantindo que o Comandante tenha recursos e que os pontos fortes sejam difíceis de capturar.
        </p>
        <h3>A Prioridade Número Um: Nós de Recursos</h3>
        <p>
          No início de cada partida, a primeira tarefa de um esquadrão de engenheiros deve ser construir um conjunto completo de Nós de Recursos (Manpower, Munições e Combustível).
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Construa na Segunda Linha:</strong> Coloque os nós no território do meio do mapa (a "segunda linha"). Construí-los muito na retaguarda gera menos recursos, e muito na frente os torna vulneráveis a serem destruídos.</li>
          <li><strong>Como Fazer:</strong> Peça a um jogador de Suporte para largar uma caixa de suprimentos. Use sua chave inglesa para construir os três nós. Repita o processo com outra caixa de suprimentos para finalizar. Um esquadrão coordenado pode fazer isso nos primeiros 5 minutos de jogo.</li>
          <li><strong>Impacto:</strong> Nós bem posicionados e construídos cedo garantem que seu Comandante terá um fluxo constante de recursos para usar habilidades como bombardeios e tanques pesados durante toda a partida.</li>
        </ul>
        <h3>Fortificando a Defesa</h3>
        <p>
          Quando seu esquadrão é designado para defender um ponto forte, o Engenheiro brilha. Use os suprimentos largados pelo caminhão de suprimentos ou por airdrops para construir:
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li><strong>Bunkers e Barricadas:</strong> Crie posições fortificadas que oferecem excelente cobertura para a infantaria e metralhadoras.</li>
          <li><strong>Arame Farpado:</strong> Canalize o avanço da infantaria inimiga para "zonas de morte" onde seu time tem vantagem. Coloque-os em entradas de prédios, trincheiras e passagens estreitas.</li>
          <li><strong>Minas Anti-Tanque:</strong> Coloque-as em estradas principais, pontes e rotas de flanqueamento comuns para tanques. Uma mina bem colocada pode parar um avanço blindado antes mesmo que ele comece.</li>
        </ol>
        <h3>O Lado Ofensivo: Cargas Explosivas</h3>
        <p>
          Engenheiros também possuem Cargas Explosivas (Satchel Charges), uma das ferramentas de demolição mais potentes do jogo. Use-as para:
        </p>
        <ul className="list-disc space-y-2 pl-6">
            <li><strong>Destruir Tanques Inimigos:</strong> Aproximar-se sorrateiramente de um tanque e plantar uma carga é uma maneira quase garantida de destruí-lo.</li>
            <li><strong>Limpar Bunkers:</strong> Se um prédio ou bunker está cheio de inimigos, jogar uma carga pela janela pode limpar a estrutura inteira.</li>
            <li><strong>Destruir Fortificações:</strong> Use as cargas para destruir arame farpado, barricadas e outras defesas que o engenheiro inimigo construiu.</li>
        </ul>
        <p>
          Seja construindo a base para a vitória ou explodindo as defesas inimigas, o Engenheiro é uma classe dinâmica e essencial para qualquer time que queira vencer.
        </p>
      </div>
    ),
  },
];
