
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

const prompt = ai.definePrompt({
  name: 'analyzeClanPerformancePrompt',
  input: {schema: AnalyzeClanPerformanceInputSchema},
  output: {schema: AnalyzeClanPerformanceOutputSchema},
  prompt: `
    Você é um analista experiente do jogo Hell Let Loose.
    Sua tarefa é analisar os dados estatísticos mensais de um clã e gerar um relatório em formato Markdown.

    Destaques esperados:
    - Use títulos (###) para cada categoria.
    - Identifique o jogador com mais abates (MVP).
    - Identifique um jogador com boa pontuação de suporte ou defesa.
    - Identifique um jogador com pontuações bem equilibradas.
    - Escreva uma breve conclusão sobre o desempenho do clã.
    - Baseie-se apenas nos dados fornecidos em JSON. Não invente jogadores.

    Dados:
    {{{statsJson}}}
  `,
});

const analyzeClanPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeClanPerformanceFlow',
    inputSchema: AnalyzeClanPerformanceInputSchema,
    outputSchema: AnalyzeClanPerformanceOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    const report = response.output;

    // Validate that the output is a non-empty string.
    if (typeof report === 'string' && report.trim().length > 0) {
      return report;
    }

    // If we get here, the output is not valid.
    console.error("AI analysis failed. Raw response from model:", JSON.stringify(response));
    throw new Error("A IA não conseguiu gerar um relatório. A resposta estava vazia ou em formato inválido.");
  }
);
