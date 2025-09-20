
'use server';

/**
 * @fileOverview A flow to generate a draft for a new offering based on a simple user prompt.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

const OfferingDraftSchema = z.object({
  title: z.string().describe("A concise and magnetic title for the offering."),
  description: z.string().describe("A compelling and authentic description of the offering, embodying the brand's tone."),
  price: z.number().optional().describe("A suggested price for the offering, as a number."),
});
export type OfferingDraft = z.infer<typeof OfferingDraftSchema>;

const GenerateOfferingDraftInputSchema = z.object({
  prompt: z.string().describe("The user's brief description of the new offering."),
});
export type GenerateOfferingDraftInput = z.infer<typeof GenerateOfferingDraftInputSchema>;


const prompt = ai.definePrompt({
  name: 'generateOfferingDraftPrompt',
  input: {
      schema: z.object({
          brandHeart: z.any(),
          offeringPrompt: z.string(),
      })
  },
  output: { schema: OfferingDraftSchema },
  prompt: `You are an expert brand strategist and copywriter for conscious creators. Your task is to expand a simple idea into a draft for a new offering, aligning it with the user's core brand identity.

**Brand Heart (The User's Brand Identity):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Mission: {{brandHeart.mission.primary}}
- Vision: {{brandHeart.vision.primary}}
- Values: {{brandHeart.values.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**User's Idea for the New Offering:**
"{{offeringPrompt}}"

**Your Task:**
Based on the user's idea and their Brand Heart, generate the following:
1.  **title**: A concise and magnetic title for the offering. It should be appealing and clear.
2.  **description**: A compelling and authentic description. Embody the brand's tone of voice. Clearly explain what the offering is, who it's for, and the transformation or value it provides.
3.  **price**: A suggested price for the offering. Base this on the type of offering (e.g., a digital product might be cheaper than a full-day workshop). Suggest a reasonable, whole number price.

Return the result in the specified JSON format.`,
});


const generateOfferingDraftFlow = ai.defineFlow(
  {
    name: 'generateOfferingDraftFlow',
    inputSchema: GenerateOfferingDraftInputSchema,
    outputSchema: OfferingDraftSchema,
  },
  async ({ prompt: offeringPrompt }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    const { data: brandHeart, error: brandHeartError } = await supabase
        .from('brand_hearts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    
    const { output } = await prompt({
        brandHeart,
        offeringPrompt,
    });
    
    if (!output) {
      throw new Error('The AI model did not return a response.');
    }

    return output;
  }
);


export async function generateOfferingDraft(input: GenerateOfferingDraftInput): Promise<OfferingDraft> {
    return generateOfferingDraftFlow(input);
}
