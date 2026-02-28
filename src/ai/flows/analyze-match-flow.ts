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
        1. **Visão Geral:** Identifique o mapa (map_name), quem venceu (allied vs axis) e a duração.
        2. **Destaques da Partida (Os Melhores):**
           - **MVP Absoluto:** Quem teve o maior impacto geral (equilíbrio entre combate, ataque, defesa e suporte).
           - **Especialista em Blindados:** Identifique quem causou mais destruição usando tanques (baseado em kills_by_type.armor ou armas de veículos).
           - **Mestre da Artilharia:** Verifique kills_by_type.artillery.
           - **Líder de Logística:** Quem teve o maior score de 'support'.
           - **Defensor Implacável:** Quem teve o maior score de 'defense'.
        3. **Eficiência Letal:** Destaque jogadores com alta taxa de "Kills por Minuto" (kills_per_minute) e baixo número de mortes.
        4. **Rivalidades e Curiosidades:** 
           - Procure por "duelos" (jogadores que mataram muito um ao outro através do campo death_by).
           - Mencione se houve muitos Teamkills e quem foi o mais "perigoso" para os aliados.
        5. **Conclusão Estratégica:** Baseado nos scores de Offense vs Defense, a partida foi uma guerra de desgaste ou um atropelo rápido?

        **Regras de Formatação:**
        - Use títulos '###' para seções.
        - Use negrito para nomes de jogadores.
        - Seja imersivo, use termos militares (ex: "Setor Utah", "Linhas de Suprimento", "Guarnição").
        - O relatório deve ser em Português do Brasil.

        DADOS DA PARTIDA:
        ${input.matchJson}
      `,
    });

    return response.text;
  }
);
