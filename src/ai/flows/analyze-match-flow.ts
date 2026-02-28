'use server';
/**
 * @fileOverview Um agente de IA para análise tática de partidas de Hell Let Loose.
 *
 * - analyzeMatch - Função que processa o JSON da partida e gera insights.
 * - AnalyzeMatchInput - Esquema de entrada (JSON da partida como string).
 * - AnalyzeMatchOutput - Esquema de saída (Relatório Markdown).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMatchInputSchema = z.object({
  matchJson: z.string().describe('O JSON completo da partida retornado pela API.'),
});
export type AnalyzeMatchInput = z.infer<typeof AnalyzeMatchInputSchema>;

const AnalyzeMatchOutputSchema = z.string().describe('Um relatório tático detalhado em Markdown.');
export type AnalyzeMatchOutput = string;

export async function analyzeMatch(input: AnalyzeMatchInput): Promise<AnalyzeMatchOutput> {
  return analyzeMatchFlow(input);
}

const analyzeMatchFlow = ai.defineFlow(
  {
    name: 'analyzeMatchFlow',
    inputSchema: AnalyzeMatchInputSchema,
    outputSchema: AnalyzeMatchOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        Você é um Analista Tático Militar especialista no jogo Hell Let Loose.
        Sua tarefa é analisar o JSON de uma partida e gerar um relatório envolvente, técnico e detalhado em Markdown.

        **Instruções de Análise:**
        1. **Visão Geral:** Identifique o mapa (map_name), o resultado final (axis vs allied) e a duração aproximada.

        2. **Comandantes e MVPs de Campo:**
           - Identifique o **MVP dos Aliados (Allies)** e o **MVP do Eixo (Axis)**. Baseie sua escolha no equilíbrio entre kills, pontuação de combate e impacto nos objetivos.

        3. **Elite da Batalha (Top 3 por Categoria):**
           - Liste os 3 melhores jogadores (nome e pontuação) em:
             - **### Operações Ofensivas (Offense)**
             - **### Estratégia Defensiva (Defense)**
             - **### Logística e Apoio (Support)**
             - **### Eficiência em Combate (Combat)**

        4. **Especialistas em Armamento:**
           - **Predador de Infantaria:** Identifique o jogador com mais abates de infantaria (campo \`kills_by_type.infantry\`). ATENÇÃO: Ignore abates vindos de artilharia ou blindados para este destaque específico.
           - **Arma de Infantaria Mais Letal:** Determine qual arma individual (ex: M1 Garand, Kar98k, MP40, STG44) causou o maior número total de mortes na partida (somando todos os jogadores).
           - **Divisão de Blindados:** Destaque os melhores tanquistas (kills por armor/veículos).
           - **Bateria de Artilharia:** Destaque quem operou a artilharia com mais precisão (\`kills_by_type.artillery\`).

        5. **Rivalidades e Eficiência:** 
           - Procure por "Duelos Mortais" (jogadores que se eliminaram mutuamente várias vezes).
           - Mencione jogadores com K/D extremamente alto ou Kills por Minuto impressionantes.

        6. **Conclusão Tática:** Com base nos dados de Offense e Defense das equipes, analise como a batalha se desenrolou (foi uma defesa heróica, um avanço imparável ou uma guerra de atrito?).

        **Regras de Formatação:**
        - Use títulos '###' para seções.
        - Use negrito para nomes de jogadores e armas.
        - O relatório deve ser em Português do Brasil.
        - Seja imersivo, use termos como "Setor", "Linhas de Suprimento", "Guarnição".

        DADOS DA PARTIDA:
        ${input.matchJson}
      `,
    });

    return response.text;
  }
);
