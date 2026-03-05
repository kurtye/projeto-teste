
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

const AnalyzeClanPerformanceOutputSchema = z.string().describe('A detailed performance report in Markdown format, highlighting top performers and efficiency metrics.');
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
          Você é um Analista de Inteligência Militar e Especialista de Dados do jogo Hell Let Loose.
          Sua missão é processar as estatísticas mensais de um clã e gerar um Relatório de Operações Mensais (ROM) imersivo, estratégico e detalhado em Markdown.

          **Instruções de Análise e Estrutura:**

          Use títulos com '###' para cada seção e negrito para nomes de jogadores.

          1. **### 🏅 Pódio de Excelência (Top 3 por Categoria)**
             Para cada categoria abaixo, liste os 3 melhores jogadores (Nome e Valor).
             - **Ponta de Lança (Ofensiva):** Baseado em \`totalOffense\`.
             - **Muralha Inabalável (Defensiva):** Baseado em \`totalDefense\`.
             - **Espinha Dorsal (Suporte):** Baseado em \`totalSupport\`.
             - **Mestres do Combate (Pontuação Geral):** Baseado em \`totalCombat\`.
             - **Ceifadores (Total de Abates):** Baseado em \`totalKills\`.
             - **Veteranos de Campo (Tempo de Jogo):** Baseado em \`totalTimeSeconds\` (converta para horas).

          2. **### ⚡ Índice de Eficiência Operacional**
             Aqui você deve premiar a qualidade sobre a quantidade. Identifique jogadores que, proporcionalmente ao tempo que jogaram, entregaram resultados excepcionais. 
             Analise os dados calculando métricas por hora (\`valor / (totalTimeSeconds / 3600)\`).
             - **Letalidade Técnica:** Quem tem a melhor média de Kills/Hora (mencione os 2 melhores).
             - **Utilidade Estratégica:** Quem gera mais pontos de Suporte por hora (mencione os 2 melhores).
             - **Impacto em Combate:** Quem tem a maior pontuação de Combate por hora.
             *Nota: Ignore jogadores com menos de 2 horas de jogo nesta seção para evitar distorções.*

          3. **### 📋 Análise de Perfil do Clã**
             Dê sua "opinião" profissional sobre o estado do clã neste mês.
             - O clã é predominantemente ofensivo, defensivo ou focado em logística?
             - Como está o equilíbrio entre os veteranos (muitas horas) e os talentos eficientes (muitos pontos em pouco tempo)?
             - Qual setor (Ataque, Defesa ou Suporte) parece ser o ponto mais forte do grupo?

          4. **### 🎖️ Menções Honrosas**
             Cite 2 jogadores que não entraram nos pódios mas que merecem destaque por serem equilibrados em todas as métricas ou por terem uma "Vida Mais Longa" (\`longestLifeSecs\`) notável.

          **Regras de Estilo:**
          - Linguagem militar e imersiva (use termos como "Setor", "Logística", "Linha de Frente", "Baixas Inimigas").
          - Resposta estritamente em Português do Brasil.
          - Baseie-se APENAS nos dados fornecidos.

          **Dados das Operações (JSON):**
          ${input.statsJson}
        `,
    });

    const report = response.text;

    if (typeof report === 'string' && report.trim().length > 0) {
      return report;
    }
    
    throw new Error("A IA não conseguiu processar os dados táticos. Tente novamente.");
  }
);
