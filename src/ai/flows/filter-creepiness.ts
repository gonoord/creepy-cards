'use server';

/**
 * @fileOverview An AI agent that filters prompts and images based on their creepiness score.
 *
 * - filterCreepiness - A function that handles the creepiness filtering process.
 * - FilterCreepinessInput - The input type for the filterCreepiness function.
 * - FilterCreepinessOutput - The return type for the filterCreepiness function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FilterCreepinessInputSchema = z.object({
  prompt: z.string().describe('The prompt to be analyzed for creepiness.'),
});
export type FilterCreepinessInput = z.infer<typeof FilterCreepinessInputSchema>;

const FilterCreepinessOutputSchema = z.object({
  creepinessScore: z
    .number()
    .describe('A score from 0 to 1 indicating the creepiness of the prompt.'),
  isCreepyEnough: z
    .boolean()
    .describe('Whether the prompt is considered creepy enough based on the score.'),
});
export type FilterCreepinessOutput = z.infer<typeof FilterCreepinessOutputSchema>;

export async function filterCreepiness(input: FilterCreepinessInput): Promise<FilterCreepinessOutput> {
  return filterCreepinessFlow(input);
}

const creepinessPrompt = ai.definePrompt({
  name: 'creepinessPrompt',
  input: {schema: FilterCreepinessInputSchema},
  output: {schema: FilterCreepinessOutputSchema},
  prompt: `You are an AI that analyzes text prompts and assigns a creepiness score from 0 to 1.
  A score of 0 indicates not creepy at all, while a score of 1 indicates extremely creepy.
  You will also make a determination as to whether the prompt is creepy enough, and set the isCreepyEnough output field appropriately. If the creepiness score is greater than 0.5, then isCreepyEnough should be true.

  Analyze the following prompt:
  {{{prompt}}}`,
});

const filterCreepinessFlow = ai.defineFlow(
  {
    name: 'filterCreepinessFlow',
    inputSchema: FilterCreepinessInputSchema,
    outputSchema: FilterCreepinessOutputSchema,
  },
  async input => {
    const {output} = await creepinessPrompt(input);
    return output!;
  }
);
