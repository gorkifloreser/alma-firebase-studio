
'use server';

/**
 * @fileOverview A robust, multi-step flow to generate a draft for a new offering.
 * It first routes to the correct offering type and then uses a specialized prompt.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
    OfferingDraftSchema,
    GenerateOfferingDraftInputSchema,
    type OfferingDraft,
    type GenerateOfferingDraftInput
} from './types';


//================================================================================
// 1. Router Prompt - Determines the offering type
//================================================================================

const routeOfferingTypePrompt = ai.definePrompt({
    name: 'routeOfferingTypePrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-flash'),
    input: { schema: z.object({ offeringPrompt: z.string() }) },
    output: { schema: z.object({ type: z.enum(['Product', 'Service', 'Event', 'Value Content']) }) },
    prompt: `Based on the user's prompt, what type of offering is it? The user prompt is: "{{offeringPrompt}}". Respond with only one of the following words: 'Product', 'Service', 'Event', or 'Value Content'.`
});

//================================================================================
// 2. Specialist Prompts - One for each offering type
//================================================================================

const basePrompt = `You are an expert brand strategist and copywriter for conscious creators. Your task is to expand a simple idea into a draft for a new offering, aligning it with the user's core brand identity.

**Brand Heart (The User's Brand Identity):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Mission: {{brandHeart.mission.primary}}
- Values: {{brandHeart.values.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**User's Idea for the New Offering:**
"{{offeringPrompt}}"

**Your Task:**
Based on the user's idea and their Brand Heart, generate the requested fields. For any field that is not mentioned in the user's idea, you MUST return null. Do not invent information.`;

// Specialist for Events
const generateEventDraftPrompt = ai.definePrompt({
    name: 'generateEventDraftPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-flash'),
    input: { schema: z.object({ brandHeart: z.any(), offeringPrompt: z.string() }) },
    output: { schema: OfferingDraftSchema },
    prompt: `${basePrompt}

Generate a full offering draft for an EVENT. You must extract event-specific details.
- **schedules**: Create one entry for EACH distinct event date or time. For each entry, extract:
  - event_date (in ISO 8601 format), duration, frequency.
  - location_label, location_address, location_gmaps_url. If not specified, these MUST be null.
  - price, price_label, currency. If not specified, these MUST be null.`
});

// Specialist for Products/Services
const generateProductServiceDraftPrompt = ai.definePrompt({
    name: 'generateProductServiceDraftPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-flash'),
    input: { schema: z.object({ brandHeart: z.any(), offeringPrompt: z.string() }) },
    output: { schema: OfferingDraftSchema },
    prompt: `${basePrompt}

Generate a full offering draft for a PRODUCT or SERVICE. You must extract pricing information.
- **schedules**: Create one entry for EACH distinct product variant or price point. For each entry, extract:
  - price_label (e.g., "Cacao Nibs 100g", "Standard Tier"). THIS IS CRITICAL.
  - price, currency. If not specified, these MUST be null.
  - You MUST NOT generate event-related fields like event_date, duration, or location.`
});

// Specialist for Value Content
const generateValueContentDraftPrompt = ai.definePrompt({
    name: 'generateValueContentDraftPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-flash'),
    input: { schema: z.object({ brandHeart: z.any(), offeringPrompt: z.string() }) },
    output: { schema: OfferingDraftSchema },
    prompt: `${basePrompt}

Generate a title, description, and contextual notes for a VALUE CONTENT offering (like a blog post or free guide).
- **schedules**: You MUST return an empty array [] for this field, as value content does not have pricing or schedules.`
});


//================================================================================
// 3. Main Flow - The Router
//================================================================================

const generateOfferingDraftFlow = ai.defineFlow(
  {
    name: 'generateOfferingDraftFlow',
    inputSchema: GenerateOfferingDraftInputSchema,
    outputSchema: OfferingDraftSchema,
  },
  async ({ prompt: offeringPrompt }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data: brandHeart, error: brandHeartError } = await supabase
        .from('brand_hearts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    
    // Step 1: Route to determine the type
    const { output: routeOutput } = await routeOfferingTypePrompt({ offeringPrompt });
    if (!routeOutput) throw new Error('AI failed to determine offering type.');
    const offeringType = routeOutput.type;

    console.log(`Routing to specialist for type: ${offeringType}`);

    // Step 2: Call the appropriate specialist
    let finalOutput: OfferingDraft | undefined;

    switch (offeringType) {
        case 'Event':
            const { output: eventOutput } = await generateEventDraftPrompt({ brandHeart, offeringPrompt });
            finalOutput = eventOutput;
            break;
        case 'Product':
        case 'Service':
            const { output: productOutput } = await generateProductServiceDraftPrompt({ brandHeart, offeringPrompt });
            finalOutput = productOutput;
            break;
        case 'Value Content':
            const { output: valueOutput } = await generateValueContentDraftPrompt({ brandHeart, offeringPrompt });
            finalOutput = valueOutput;
            break;
        default:
            throw new Error(`Unknown offering type: ${offeringType}`);
    }

    if (!finalOutput) {
      throw new Error('The specialist AI model did not return a response.');
    }

    // Step 3: Ensure the type is correctly set on the final object before returning
    finalOutput.type = offeringType;

    console.log("Final AI Flow Output:", JSON.stringify(finalOutput, null, 2));

    return finalOutput;
  }
);

export async function generateOfferingDraft(input: GenerateOfferingDraftInput): Promise<OfferingDraft> {
    return generateOfferingDraftFlow(input);
}
