
'use server';

/**
 * @fileOverview A flow to generate a new creative prompt for an offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

// Define schemas
const GenerateCreativePromptInputSchema = z.object({
  offeringId: z.string(),
  userComment: z.string().optional().describe('A specific request or comment from the user to guide the prompt generation.'),
});
export type GenerateCreativePromptInput = z.infer<typeof GenerateCreativePromptInputSchema>;

const GenerateCreativePromptOutputSchema = z.object({
  newCreativePrompt: z.string().describe("A new, detailed, ready-to-use prompt for an AI image generator to create a visual."),
});
export type GenerateCreativePromptOutput = z.infer<typeof GenerateCreativePromptOutputSchema>;


const prompt = ai.definePrompt({
    name: 'generateCreativeAIPrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
            userComment: z.string().optional(),
        })
    },
    output: { schema: GenerateCreativePromptOutputSchema },
    prompt: `You are an expert AI Prompt Engineer specializing in creating detailed, visually rich prompts for image generation models like Midjourney or DALL-E.

Your task is to generate a NEW, CREATIVE, and DIFFERENT prompt for an advertisement image based on the provided brand and offering.

**Brand Identity:**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Keywords: Conscious, soulful, minimalist, calm, creative, authentic.

**Offering:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.contextual_notes}}
- Context: {{offering.contextual_notes}}
{{/if}}

{{#if userComment}}
**User's Specific Request:**
"{{userComment}}"
Incorporate this request into the new prompt you generate.
{{/if}}

**Instructions:**
1.  Generate a single, new, detailed creative prompt.
2.  The prompt should be visually descriptive, mentioning elements, composition, lighting, and style.
3.  The prompt must align with the brand's soulful, minimalist, and authentic aesthetic.
4.  Do NOT include any text in the prompt itself (e.g., "A poster with the words...").
5.  Focus on creating a prompt that results in a beautiful, magnetic image.

Return ONLY the new prompt in the specified JSON format.`,
});


const generateCreativePromptFlow = ai.defineFlow(
  {
    name: 'generateCreativePromptFlow',
    inputSchema: GenerateCreativePromptInputSchema,
    outputSchema: GenerateCreativePromptOutputSchema,
  },
  async ({ offeringId, userComment }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const [{ data: brandHeart, error: brandHeartError }, { data: offering, error: offeringError }] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');
    
    const { output } = await prompt({ brandHeart, offering, userComment });
    
    if (!output) {
      throw new Error('The AI model did not return a response for the creative prompt.');
    }

    return output;
  }
);


export async function generateCreativePrompt(input: GenerateCreativePromptInput): Promise<GenerateCreativePromptOutput> {
    return generateCreativePromptFlow(input);
}
