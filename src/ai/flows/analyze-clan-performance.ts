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

const AnalyzeClanPerformanceInputSchema = z.string().describe('A JSON string representing an array of player monthly statistics.');
export type AnalyzeClanPerformanceInput = string;

const AnalyzeClanPerformanceOutputSchema = z.string().describe('A concise performance report in Markdown format, highlighting standout players.');
export type AnalyzeClanPerformanceOutput = string;

export async function analyzeClanPerformance(stats: AnalyzeClanPerformanceInput): Promise<AnalyzeClanPerformanceOutput> {
  return analyzeClanPerformanceFlow(stats);
}

const prompt = ai.definePrompt({
  name: 'analyzeClanPerformancePrompt',
  input: {schema: AnalyzeClanPerformanceInputSchema},
  output: {schema: AnalyzeClanPerformanceOutputSchema},
  prompt: `
    Você é um analista militar experiente, especializado em avaliar o desempenho de esquadrões no jogo Hell Let Loose. Sua tarefa é analisar os dados estatísticos mensais de um clã e gerar um relatório conciso e estratégico.

    Regras:
    - O relatório deve ser em formato Markdown.
    - Use títulos (###) para cada categoria de destaque.
    - Seja direto e use uma linguagem militar (ex: "operador", "em combate", "desempenho notável").
    - Identifique pelo menos 3 jogadores que se destacaram em diferentes áreas.
    - Destaque o jogador com mais abates (MVP de Combate).
    - Destaque um jogador com alta pontuação de suporte ou defesa (Anjo da Guarda).
    - Destaque um jogador com bom equilíbrio entre as pontuações, sugerindo um bom jogador de equipe (Operador Versátil).
    - Finalize com uma breve conclusão tática sobre o desempenho geral do clã no mês.
    - **NÃO** invente jogadores ou dados. Baseie-se apenas nos dados fornecidos.

    Dados Estatísticos do Clã (JSON):
    {{{input}}}
  `,
});

const analyzeClanPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeClanPerformanceFlow',
    inputSchema: AnalyzeClanPerformanceInputSchema,
    outputSchema: AnalyzeClanPerformanceOutputSchema,
  },
  async (statsJson) => {
    const {output} = await prompt(statsJson);
    return output!;
  }
);
