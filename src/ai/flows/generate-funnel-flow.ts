

'use server';

/**
 * @fileOverview A flow to generate a marketing strategy blueprint for a specific offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const ConceptualStepSchema = z.object({
    step: z.number().describe('The step number in the sequence.'),
    concept: z.string().describe('The core concept, angle, or idea for this content piece.'),
    objective: z.string().describe('The specific goal of this step (e.g., "Build credibility", "Create urgency").'),
});
export type ConceptualStep = z.infer<typeof ConceptualStepSchema>;

const ChannelStrategySchema = z.object({
    stageName: z.string().describe('The name of this funnel stage (e.g., "Awareness", "Consideration").'),
    objective: z.string().describe('The overall objective for this stage within the campaign.'),
    keyMessage: z.string().describe('The single most important message to convey during this stage.'),
    conceptualSteps: z.array(ConceptualStepSchema).describe('A sequence of conceptual content ideas for this stage.'),
    successMetrics: z.array(z.string()).describe('Key metrics to track the success of this stage (e.g., "1000 impressions", "50 email signups").'),
});
export type ChannelStrategy = z.infer<typeof ChannelStrategySchema>;


const GenerateFunnelOutputSchema = z.object({
    campaignSuccessMetrics: z.array(z.string()).describe('An array of overall success metrics for the entire campaign, directly tied to the main goal.'),
    strategy: z.array(ChannelStrategySchema).describe('An array of strategies, one for each stage of the psychological journey.'),
    channels: z.array(z.string()).optional().describe('The marketing channels to focus on for this strategy.'),
});
export type GenerateFunnelOutput = z.infer<typeof GenerateFunnelOutputSchema>;


const GenerateFunnelInputSchema = z.object({
  offeringId: z.string(),
  funnelType: z.string().describe("The name of the funnel model being used, e.g., 'Lead Magnet'."),
  funnelPrinciples: z.string().describe("The core principles or strategy of the funnel model."),
  goal: z.string().describe("The specific goal of this strategy."),
  channels: z.array(z.string()).optional().describe('The marketing channels to focus on for this strategy.'),
});
export type GenerateFunnelInput = z.infer<typeof GenerateFunnelInputSchema>;


const prompt = ai.definePrompt({
  name: 'generateFunnelPrompt',
  model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          brandHeart: z.any(),
          offering: z.any(),
          funnelType: z.string(),
          funnelPrinciples: z.string(),
          goal: z.string(),
      })
  },
  output: { schema: GenerateFunnelOutputSchema },
  prompt: `You are a world-class marketing strategist who specializes in creating authentic, customer-centric marketing strategies based on psychology. Your primary goal is to sound like the brand you are representing, using their unique tone of voice.

Your task is to create a high-level STRATEGY BLUEPRINT for a marketing campaign. This is not about writing the final copy; it's about defining the psychological journey for the customer in a way that is authentic to the brand.

**The "Who" (The Brand's Soul - This is your most important input):**
- Brand Name: {{brandHeart.brand_name}}
- **Tone of Voice: {{brandHeart.tone_of_voice.primary}}**
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Mission: {{brandHeart.mission.primary}}
- Values: {{brandHeart.values.primary}}

**The "What" (The Offering We Are Promoting):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.contextual_notes}}
- Important Contextual Notes: {{offering.contextual_notes}}
{{/if}}

**The Goal:** {{goal}}

**Funnel Model to Use:** {{funnelType}}
This model's core principles are: {{funnelPrinciples}}

**Your Task (The "How"):**

First, define the overall **campaignSuccessMetrics** for the campaign that are directly tied to the main goal.

Then, map out a 5-stage psychological journey for the customer. **Crucially, the names of the stages and the concepts within them must deeply reflect the brand's unique Tone of Voice.**

For each stage of the journey, you must define:
1.  **stageName**: A creative, on-brand name for the stage, followed by the classic marketing stage in parentheses. Example: "The Gentle Invitation (Awareness)". Use the stages: Awareness, Consideration, Conversion, Loyalty.
2.  **objective**: What is the primary psychological goal of this stage? What mindset shift do you want to create for the customer, expressed in the brand's voice?
3.  **keyMessage**: What is the single, most important idea or feeling this stage should communicate about the offering? Frame this from the brand's perspective.
4.  **conceptualSteps**: A sequence of 2-3 high-level conceptual ideas for content. For each step, provide:
    *   **step**: The step number (1, 2, 3...).
    *   **concept**: The core idea for a post, email, or message, described using the brand's authentic voice. (e.g., "Share a vulnerable story about the 'why' behind this offering," not "Introduce the problem.").
    *   **objective**: The specific purpose of this individual piece of content. (e.g., "To build resonance and empathy," not "Establish connection.").
5.  **successMetrics**: What are the 2-3 key metrics to track for this specific stage's performance?

**CRUCIAL FINAL STEP:** The fifth and final stage of your generated strategy MUST ALWAYS be "Harvesting the Glow (Advocacy)". Its objective is to automate the collection of testimonials and reviews from satisfied customers. Its conceptual steps should include ideas for sending personalized emails or messages asking for a review on social media, Google Maps, or the brand's website. This creates a regenerative loop where customer success becomes new marketing content.

Generate this entire plan in the **{{primaryLanguage}}** language.

Return the result in the specified JSON format.`,
});


const generateFunnelFlow = ai.defineFlow(
  {
    name: 'generateFunnelFlow',
    inputSchema: GenerateFunnelInputSchema,
    outputSchema: GenerateFunnelOutputSchema,
  },
  async ({ offeringId, funnelType, funnelPrinciples, goal }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const [
        { data: brandHeart, error: brandHeartError },
        { data: profile, error: profileError },
        { data: offering, error: offeringError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('primary_language, secondary_language').eq('id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');

    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));

    const promptContext = {
        primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
        brandHeart,
        offering,
        funnelType,
        funnelPrinciples,
        goal,
    };
    
    // AI Best Practice: Log the input context for verification
    console.log('--- AI CONTEXT FOR FUNNEL GENERATION ---');
    console.log('Funnel Type:', funnelType);
    console.log('Goal:', goal);
    console.log('Offering Title:', offering.title.primary);
    console.log('Tone of Voice:', brandHeart.tone_of_voice.primary);
    console.log('Audience:', JSON.stringify(brandHeart.audience, null, 2));
    console.log('------------------------------------');


    const { output } = await prompt(promptContext);
    
    if (!output) {
      throw new Error('The AI model did not return a response.');
    }
    
    // AI Best Practice: Log the raw output for verification
    console.log('--- RAW AI OUTPUT FROM FUNNEL GENERATION ---');
    console.log(JSON.stringify(output, null, 2));
    console.log('------------------------------------');


    return output;
  }
);

export async function generateFunnelPreview(input: Omit<GenerateFunnelInput, 'channels'> & { channels?: string[] }): Promise<GenerateFunnelOutput> {
    return generateFunnelFlow(input);
}
