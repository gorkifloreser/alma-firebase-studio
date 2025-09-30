
import { z } from 'genkit';

export const GenerateValueContentInputSchema = z.object({
  offeringTitle: z.string().describe("The title of the main offering for context."),
  offeringDescription: z.string().describe("The description of the main offering for context."),
  contentType: z.string().describe("The type of value content to generate (e.g., 'Key Benefit', 'Customer Story')."),
  concept: z.string().describe("The core idea or concept to be developed."),
});
export type GenerateValueContentInput = z.infer<typeof GenerateValueContentInputSchema>;

export const GenerateValueContentOutputSchema = z.object({
  developedContent: z.string().describe("The fully developed content, written in the brand's voice."),
});
export type GenerateValueContentOutput = z.infer<typeof GenerateValueContentOutputSchema>;
