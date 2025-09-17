
'use server';

/**
 * @fileOverview A flow to generate a marketing strategy blueprint for a specific offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

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
});
export type GenerateFunnelInput = z.infer<typeof GenerateFunnelInputSchema>;


const prompt = ai.definePrompt({
  name: 'generateFunnelPrompt',
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
  prompt: `You are a world-class marketing strategist who specializes in creating authentic, customer-centric marketing strategies based on psychology.

Your task is to create a high-level STRATEGY BLUEPRINT for a marketing campaign. This is not about writing the final copy; it's about defining the psychological journey for the customer.

**Overall Campaign Goal:** {{goal}}
**Funnel Model to Use:** {{funnelType}}
This model's core principles are: {{funnelPrinciples}}

**Brand Heart (Brand Identity):**
- Brand Name: {{brandHeart.brand_name}}
- Mission: {{brandHeart.mission.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**Offering Details:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.contextual_notes}}
- Important Contextual Notes: {{offering.contextual_notes}}
{{/if}}

**Your Task:**

First, define the overall success metrics for the campaign that are directly tied to the main goal.

Then, map out a 3-4 stage psychological journey for the customer. This journey should guide them from being unaware of the solution to becoming a happy customer.

For each stage of the journey, you must define:
1.  **stageName**: A clear name for the stage (e.g., "Spark Curiosity (Awareness)", "Build Trust (Consideration)", "Inspire Action (Conversion)").
2.  **objective**: What is the primary psychological goal of this stage? What mindset shift do you want to create for the customer?
3.  **keyMessage**: What is the single, most important idea or feeling this stage should communicate about the offering?
4.  **conceptualSteps**: A sequence of 2-3 high-level conceptual ideas for content that would achieve the stage's objective. For each step, provide:
    *   **step**: The step number (1, 2, 3...).
    *   **concept**: The core idea for a post, email, or message. (e.g., "Introduce the core problem the audience faces, using a relatable story.", "Share a powerful customer testimonial that highlights the transformation.", "Announce a limited-time bonus for the offering.").
    *   **objective**: The specific purpose of this individual piece of content. (e.g., "Establish empathy and connection.", "Build social proof.", "Create a sense of urgency.").
5.  **successMetrics**: What are the 2-3 key metrics to track for this specific stage's performance?

Generate this entire plan in the **{{primaryLanguage}}** language. Do not reference specific channels like "Email" or "Facebook" in your plan. The plan should be channel-agnostic.

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

    const { output } = await prompt({
        primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
        brandHeart,
        offering,
        funnelType,
        funnelPrinciples,
        goal,
    });
    
    if (!output) {
      throw new Error('The AI model did not return a response.');
    }

    return output;
  }
);

export async function generateFunnel(input: GenerateFunnelInput): Promise<GenerateFunnelOutput> {
    return generateFunnelFlow(input);
}
