
'use server';

/**
 * @fileOverview An AI agent that generates a creepy image based on a text prompt.
 *
 * - generateCreepyImage - A function that generates a creepy image.
 * - GenerateCreepyImageInput - The input type for the generateCreepyImage function.
 * - GenerateCreepyImageOutput - The return type for the generateCreepyImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCreepyImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to use to generate the creepy image.'),
});
export type GenerateCreepyImageInput = z.infer<typeof GenerateCreepyImageInputSchema>;

const GenerateCreepyImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      'The generated creepy image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'      
    ),
});
export type GenerateCreepyImageOutput = z.infer<typeof GenerateCreepyImageOutputSchema>;

export async function generateCreepyImage(input: GenerateCreepyImageInput): Promise<GenerateCreepyImageOutput> {
  return generateCreepyImageFlow(input);
}

const generateCreepyImageFlow = ai.defineFlow(
  {
    name: 'generateCreepyImageFlow',
    inputSchema: GenerateCreepyImageInputSchema,
    outputSchema: GenerateCreepyImageOutputSchema,
  },
  async input => {
    const fullPrompt = `${input.prompt}, in the vibrant, colorful, and spooky art style reminiscent of classic Goosebumps book covers.`;
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: fullPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE', 
          },
        ],
      },
    });

    if (!media || !media.url) {
      console.error('Image generation failed: No media object or URL returned.', {prompt: fullPrompt, media});
      throw new Error('Image generation failed to return a valid image. The spirits are uncooperative!');
    }

    return {imageDataUri: media.url};
  }
);

