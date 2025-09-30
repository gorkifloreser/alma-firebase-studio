
'use server';

/**
 * @fileOverview A flow to develop a value content concept into a full piece of content.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

// Schemas for the flow
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


const prompt = ai.definePrompt({
  name: 'generateValueContentPrompt',
  input: { schema: z.object({
        brandHeart: z.any(),
        offeringTitle: z.string(),
        offeringDescription: z.string(),
        contentType: z.string(),
        concept: z.string(),
    }) 
  },
  output: { schema: GenerateValueContentOutputSchema },
  prompt: `You are an expert content strategist and copywriter for authentic, conscious brands.
Your task is to take a simple concept and develop it into a compelling piece of value content, fully embodying the brand's unique voice.

**Brand Heart (Your Creative Compass):**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}
- Mission: {{brandHeart.mission.primary}}

**Main Offering Context:**
- Title: {{offeringTitle}}
- Description: {{offeringDescription}}

**Content Development Task:**
- **Content Type to Create:** "{{contentType}}"
- **Core Concept to Develop:** "{{concept}}"

**Your Mission:**
Expand the "Core Concept" into a well-written, engaging piece of content.
- Ensure the tone perfectly matches the brand's **Tone of Voice**.
- Weave in the brand's **Values** and **Mission**.
- The content should provide genuine value (teach, inspire, entertain, or build trust).
- It should subtly relate back to the **Main Offering Context** without being a hard sell.

Return ONLY the developed content in the specified JSON format.
`,
});


const generateValueContentFlow = ai.defineFlow(
  {
    name: 'generateValueContentFlow',
    inputSchema: GenerateValueContentInputSchema,
    outputSchema: GenerateValueContentOutputSchema,
  },
  async ({ offeringTitle, offeringDescription, contentType, concept }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data: brandHeart, error: brandHeartError } = await supabase
      .from('brand_hearts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    
    const { output } = await prompt({
        brandHeart,
        offeringTitle,
        offeringDescription,
        contentType,
        concept,
    });
    
    if (!output) {
      throw new Error('The AI model did not return a response.');
    }

    return output;
  }
);

export async function generateValueContent(input: GenerateValueContentInput): Promise<GenerateValueContentOutput> {
    return generateValueContentFlow(input);
}
