
'use server';

/**
 * @fileOverview A flow to generate a draft for a new offering based on a simple user prompt.
 * This version is updated to handle multiple price points or schedules.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const OfferingScheduleDraftSchema = z.object({
  price_label: z.string().optional().describe("The descriptive label for this specific price point (e.g., 'Cacao Nibs 100g', 'Early Bird')."),
  price: z.number().optional().describe("A suggested price for this specific schedule/variant."),
  currency: z.string().optional().describe("The 3-letter currency code for this price (e.g., USD, EUR, MXN)."),
  event_date: z.string().optional().describe("If this variant is an event with a specific date, extract it in YYYY-MM-DDTHH:mm:ss.sssZ format."),
  duration: z.string().optional().describe("If this variant has a specific duration, extract it."),
  frequency: z.string().optional().describe("If this variant has a specific frequency, extract it."),
  location_label: z.string().optional().describe("If the event has a location name (e.g., 'My Studio', 'Online'), extract it. MUST be null if not specified."),
  location_address: z.string().optional().describe("If a physical address is mentioned, extract it. MUST be null if not specified."),
  location_gmaps_url: z.string().optional().describe("If a Google Maps URL is provided, extract it. MUST be null if not specified."),
});

const OfferingDraftSchema = z.object({
  title: z.string().describe("A concise and magnetic title for the overall offering."),
  description: z.string().describe("A compelling and authentic description of the offering, embodying the brand's tone."),
  type: z.enum(['Product', 'Service', 'Event']).describe("Infer the type of offering from the prompt."),
  contextual_notes: z.string().optional().describe("Any important contextual notes for the campaign (e.g., 'pre-sale discount', 'for beginners')."),
  schedules: z.array(OfferingScheduleDraftSchema).describe("An array of all the different price points, schedules, or product variants mentioned in the prompt."),
});
export type OfferingDraft = z.infer<typeof OfferingDraftSchema>;

const GenerateOfferingDraftInputSchema = z.object({
  prompt: z.string().describe("The user's brief description of the new offering."),
});
export type GenerateOfferingDraftInput = z.infer<typeof GenerateOfferingDraftInputSchema>;


const prompt = ai.definePrompt({
  name: 'generateOfferingDraftPrompt',
  model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-flash'),
  input: {
      schema: z.object({
          brandHeart: z.any(),
          offeringPrompt: z.string(),
      })
  },
  output: { schema: OfferingDraftSchema },
  prompt: `You are an expert brand strategist and copywriter for conscious creators. Your task is to expand a simple idea into a draft for a new offering, aligning it with the user's core brand identity. You MUST identify if there are multiple versions, price points, or schedules for the offering.

**Brand Heart (The User's Brand Identity):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Mission: {{brandHeart.mission.primary}}
- Values: {{brandHeart.values.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**User's Idea for the New Offering:**
"{{offeringPrompt}}"

**Your Task:**
Based on the user's idea and their Brand Heart, generate the following:
1.  **title**: A concise and magnetic title for the overall offering.
2.  **description**: A compelling and authentic description. Embody the brand's tone of voice.
3.  **type**: Infer the offering type ('Product', 'Service', or 'Event').
4.  **contextual_notes**: If the user's idea contains any special context for the campaign (like 'pre-sale', 'for beginners'), extract and summarize it here.
5.  **schedules**: This is the most important part. Analyze the prompt for multiple product variations, price points, or event dates. Create one entry in the 'schedules' array for EACH distinct variation. For each entry, extract the following:
    - **price_label**: A descriptive label for this specific variant (e.g., "Cacao Nibs 100g", "General Admission", "Early Bird Price"). THIS IS CRITICAL.
    - **price**: The price for this specific variant.
    - **currency**: The currency code (e.g., USD, MXN). Default to USD if not specified.
    - **event_date**: If it's an event with a specific date, provide it in ISO 8601 format.
    - **duration**: If a duration is mentioned for this variant.
    - **frequency**: If a frequency is mentioned for this variant.
    - **location_label**: The name of the location, if any (e.g., 'My Studio', 'Online').
    - **location_address**: The physical address, if any.
    - **location_gmaps_url**: The Google Maps URL, if any.

**CRITICAL RULE**: For any of the above fields that are not mentioned in the user's idea, you MUST return null. Do not invent information. Do not use an empty object.

**Example:**
User prompt: "Ceremonial Grade Cacao in three presentations: cacao nibs 100 grams $170 MXN, cacao powder $180 MXN and cacao tablets $190 MXN"
Your Output for 'schedules' should be:
[
  { "price_label": "cacao nibs 100 grams", "price": 170, "currency": "MXN" },
  { "price_label": "cacao powder", "price": 180, "currency": "MXN" },
  { "price_label": "cacao tablets", "price": 190, "currency": "MXN" }
]

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
