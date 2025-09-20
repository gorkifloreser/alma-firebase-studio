
'use server';

/**
 * @fileOverview A flow to generate a description for an image using a vision model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateImageDescriptionInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo to be described, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  contextTitle: z.string().optional().describe("The title of the offering this image is for, to provide context."),
  contextDescription: z.string().optional().describe("The description of the offering this image is for, to provide context."),
});
export type GenerateImageDescriptionInput = z.infer<typeof GenerateImageDescriptionInputSchema>;

const GenerateImageDescriptionOutputSchema = z.object({
  description: z.string().describe('A concise, descriptive caption for the image.'),
});
export type GenerateImageDescriptionOutput = z.infer<typeof GenerateImageDescriptionOutputSchema>;


const prompt = ai.definePrompt({
  name: 'generateImageDescriptionPrompt',
  input: { schema: GenerateImageDescriptionInputSchema },
  output: { schema: GenerateImageDescriptionOutputSchema },
  prompt: `Analyze the following image and generate a short, descriptive caption for it.
This description will be used as alt-text and as context for other AI models, so be concise and accurate.
Focus on the main subject and action in the image.

Use the following context about the offering this image is for to inform your description:
- Offering Title: {{{contextTitle}}}
- Offering Description: {{{contextDescription}}}

Image: {{media url=imageDataUri}}`,
});


const generateImageDescriptionFlow = ai.defineFlow(
  {
    name: 'generateImageDescriptionFlow',
    inputSchema: GenerateImageDescriptionInputSchema,
    outputSchema: GenerateImageDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Image description generation failed.');
    }
    return output;
  }
);


export async function generateImageDescription(input: GenerateImageDescriptionInput): Promise<GenerateImageDescriptionOutput> {
  return generateImageDescriptionFlow(input);
}
