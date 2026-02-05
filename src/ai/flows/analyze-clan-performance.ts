
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
    // Using ai.generate directly for more control and to bypass potential schema validation issues.
    const response = await ai.generate({
        prompt: `
          Você é um analista experiente do jogo Hell Let Loose.
          Sua tarefa é analisar os dados estatísticos mensais de um clã e gerar um relatório conciso em formato Markdown.

          A partir dos dados em JSON abaixo, identifique:
          - O jogador com mais abates (MVP do mês).
          - Um jogador destaque em Suporte ou Defesa.
          - Um jogador com pontuações bem equilibradas entre combate, ataque, defesa e suporte.
          - Escreva uma breve conclusão sobre o desempenho geral do clã no mês.

          Formate a saída estritamente como um texto Markdown. Use títulos com '###'.
          Baseie-se APENAS nos dados fornecidos. Não invente jogadores ou estatísticas.

          Dados:
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
