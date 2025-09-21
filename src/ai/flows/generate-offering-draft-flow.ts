
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
  type: z.enum(['Product', 'Service', 'Event']).describe("Infer the type of offering from the prompt."),
  price: z.number().optional().describe("A suggested price for the offering, as a number."),
  currency: z.string().optional().describe("The 3-letter currency code (e.g., USD, EUR, MXN) if mentioned. Default to USD if a price is mentioned but no currency is specified."),
  event_date: z.string().optional().describe("If the offering is an event and a date is mentioned, extract it and return it in YYYY-MM-DDTHH:mm:ss.sssZ ISO 8601 format. Assume current year if not specified."),
  duration: z.string().optional().describe("If the offering is an event, extract its duration if mentioned (e.g., '90 minutes', '2 hours', '3 days')."),
  frequency: z.string().optional().describe("If the offering is a recurring event, extract its frequency if mentioned (e.g., 'Weekly', 'Monthly'). Default to 'One-time' for events if not specified."),
  contextual_notes: z.string().optional().describe("Any important contextual notes for the campaign (e.g., 'pre-sale discount', 'for beginners')."),
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
3.  **type**: Infer the offering type ('Product', 'Service', or 'Event') from the prompt.
4.  **price**: A suggested price for the offering. Base this on the type of offering (e.g., a digital product might be cheaper than a full-day workshop). Suggest a reasonable, whole number price.
5.  **currency**: If a currency (e.g., Mexican Pesos, MXN, EUR, USD) is mentioned, provide the standard 3-letter ISO code. If a price is mentioned but no currency, default to 'USD'.
6.  **contextual_notes**: If the user's idea contains any special context for the campaign (like 'pre-sale', 'for beginners', 'limited spots'), extract and summarize it here.
7.  **event_date**: If it's an event with a date (e.g., "next Friday at 7pm", "December 21st"), provide it in YYYY-MM-DDTHH:mm:ss.sssZ ISO format. Assume the current year if not specified.
8.  **duration**: If a duration is mentioned (e.g., "90-minute", "3 days"), extract it.
9.  **frequency**: If it's a recurring event (e.g., "monthly circle"), extract the frequency. If it's an event with no recurrence mentioned, default to "One-time".

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
