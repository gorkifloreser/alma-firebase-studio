
'use server';

/**
 * @fileOverview A flow to edit an image based on a text instruction.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const EditImageInputSchema = z.object({
  imageUrl: z
    .string()
    .describe(
      "The image to edit, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  instruction: z.string().describe('The text instruction for how to edit the image.'),
});
export type EditImageInput = z.infer<typeof EditImageInputSchema>;

export const EditImageOutputSchema = z.object({
  editedImageUrl: z.string().describe('The data URI of the edited image.'),
});
export type EditImageOutput = z.infer<typeof EditImageOutputSchema>;


export const editImageWithInstruction = ai.defineFlow(
  {
    name: 'editImageWithInstruction',
    inputSchema: EditImageInputSchema,
    outputSchema: EditImageOutputSchema,
  },
  async ({ imageUrl, instruction }) => {
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        { media: { url: imageUrl } },
        { text: instruction },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // IMPORTANT: Must request both TEXT and IMAGE
      },
    });

    if (!media?.url) {
      throw new Error('Image editing failed: The AI model did not return a new image.');
    }
    
    return { editedImageUrl: media.url };
  }
);
