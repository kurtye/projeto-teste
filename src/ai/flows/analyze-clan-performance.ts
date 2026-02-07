
'use server';
/**
 * @fileOverview An AI-powered tool to analyze clan monthly performance and generate a report.
 *
 * - analyzeClanPerformance - A function that takes clan statistics and generates a performance report.
 * - AnalyzeClanPerformanceInput - The input type for the function (stats as a JSON string).
 * - AnalyzeClanPerformanceOutput - The return type for the function (the report as a Markdown string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeClanPerformanceInputSchema = z.object({
  statsJson: z.string().describe('A JSON string representing an array of player monthly statistics.')
});
export type AnalyzeClanPerformanceInput = z.infer<typeof AnalyzeClanPerformanceInputSchema>;

const AnalyzeClanPerformanceOutputSchema = z.string().describe('A concise performance report in Markdown format, highlighting standout players.');
export type AnalyzeClanPerformanceOutput = string;

export async function analyzeClanPerformance(input: AnalyzeClanPerformanceInput): Promise<AnalyzeClanPerformanceOutput> {
  return analyzeClanPerformanceFlow(input);
}

const analyzeClanPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeClanPerformanceFlow',
    inputSchema: AnalyzeClanPerformanceInputSchema,
    outputSchema: AnalyzeClanPerformanceOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
        prompt: `
          Você é um analista de dados especialista no jogo Hell Let Loose, encarregado de criar um relatório de desempenho mensal para um clã.

          Sua tarefa é analisar os dados estatísticos em JSON fornecidos e gerar um relatório detalhado e envolvente em formato Markdown. O relatório deve ser mais do que uma simples lista; deve contar uma história sobre o desempenho do clã no mês.

          **Estrutura do Relatório:**

          Use títulos com '###' para cada seção.

          1.  **### Destaques do Mês**
              Identifique os melhores jogadores nas seguintes categorias. Para cada um, mencione o nome do jogador e a estatística chave que o destacou.
              - **MVP do Mês (Mais Abates):** O jogador com o maior \`totalKills\`.
              - **Muralha de Aço (Melhor Defensor):** O jogador com a maior pontuação em \`totalDefense\`.
              - **Ponta de Lança (Melhor Atacante):** O jogador com a maior pontuação em \`totalOffense\`.
              - **Anjo da Guarda (Melhor Suporte):** O jogador com a maior pontuação em \`totalSupport\`.
              - **O Mais Dedicado (Mais Horas Jogadas):** O jogador com o maior \`totalTimeSeconds\`.
              - **Eficiência Letal (Melhor Taxa de Abates por Hora):** Calcule \`(totalKills / (totalTimeSeconds / 3600))\` para os jogadores com tempo significativo e destaque o melhor. Evite jogadores com pouquíssimo tempo de jogo para não distorcer a métrica.

          2.  **### Pelotão de Honra**
              Mencione 2 ou 3 outros jogadores que tiveram um desempenho notável, mesmo que não tenham sido os melhores em uma categoria específica. Pode ser por terem pontuações equilibradas, uma boa relação K/D, ou uma alta pontuação de combate geral.

          3.  **### Análise Geral do Clã**
              Escreva uma conclusão sobre o desempenho geral do clã. Com base nos dados, o clã parece mais focado em ataque, defesa ou é equilibrado? Como foi o engajamento (total de horas jogadas pelo clã)?

          **Instruções Importantes:**
          - Seja criativo com os títulos e a linguagem para tornar o relatório mais imersivo.
          - Baseie-se ESTRITAMENTE nos dados fornecidos no JSON. Não invente jogadores ou estatísticas.
          - Calcule as horas jogadas a partir de \`totalTimeSeconds\` (dividindo por 3600).

          **Dados para Análise:**
          ${input.statsJson}
        `,
    });

    const report = response.text;

    // Validate that the output is a non-empty string.
    if (typeof report === 'string' && report.trim().length > 0) {
      return report;
    }
    
    console.error("AI analysis failed. Raw response from model:", JSON.stringify(response));
    throw new Error("A IA não conseguiu gerar um relatório. A resposta estava vazia ou em formato inválido.");
  }
);
