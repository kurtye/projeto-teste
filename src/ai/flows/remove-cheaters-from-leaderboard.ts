'use server';

/**
 * @fileOverview An AI-powered tool to identify and remove cheaters from the leaderboard.
 *
 * - removeCheaters - A function that takes leaderboard data and returns a filtered list without cheaters.
 * - RemoveCheatersInput - The input type for the removeCheaters function (leaderboard data as a string).
 * - RemoveCheatersOutput - The return type for the removeCheaters function (filtered leaderboard data as a string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RemoveCheatersInputSchema = z.string().describe('The leaderboard data as a string.');
export type RemoveCheatersInput = string;

const RemoveCheatersOutputSchema = z.string().describe('The filtered leaderboard data as a string, without cheaters.');
export type RemoveCheatersOutput = string;

export async function removeCheaters(leaderboardData: RemoveCheatersInput): Promise<RemoveCheatersOutput> {
  return removeCheatersFlow(leaderboardData);
}

const removeCheatersPrompt = ai.definePrompt({
  name: 'removeCheatersPrompt',
  input: {schema: RemoveCheatersInputSchema},
  output: {schema: RemoveCheatersOutputSchema},
  prompt: `You are an administrator whose job is to remove cheaters from the leaderboard data.

  Analyze the provided leaderboard data and identify any players who are likely cheating based on impossibly high scores, erratic behavior, or other suspicious patterns. Remove these players from the leaderboard and return the filtered leaderboard data.

  Leaderboard Data:\n{{{input}}}
  `,
});

const removeCheatersFlow = ai.defineFlow(
  {
    name: 'removeCheatersFlow',
    inputSchema: RemoveCheatersInputSchema,
    outputSchema: RemoveCheatersOutputSchema,
  },
  async leaderboardData => {
    const {output} = await removeCheatersPrompt(leaderboardData);
    return output!;
  }
);
