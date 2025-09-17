
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

const ChannelStrategySchema = z.object({
    channel: z.string().describe('The marketing channel (e.g., "Email", "Social Media").'),
    objective: z.string().describe('The overall objective for this channel within the campaign.'),
    keyMessage: z.string().describe('The single most important message to convey on this channel.'),
    conceptualSteps: z.array(ConceptualStepSchema).describe('A sequence of conceptual content ideas for this channel.'),
});

const GenerateFunnelOutputSchema = z.object({
    strategy: z.array(ChannelStrategySchema).describe('An array of strategies, one for each selected marketing channel.'),
});
export type GenerateFunnelOutput = z.infer<typeof GenerateFunnelOutputSchema>;


const GenerateFunnelInputSchema = z.object({
  offeringId: z.string(),
  funnelType: z.string().describe("The name of the funnel model being used, e.g., 'Lead Magnet'."),
  funnelPrinciples: z.string().describe("The core principles or strategy of the funnel model."),
  goal: z.string().describe("The specific goal of this strategy."),
  channels: z.array(z.string()).describe("The marketing channels to focus on for this strategy."),
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
          channels: z.array(z.string()),
      })
  },
  output: { schema: GenerateFunnelOutputSchema },
  prompt: `You are a world-class marketing strategist who specializes in creating authentic, science-based marketing strategies. You do not use pressure tactics. Instead, you build connection and offer value based on a deep understanding of customer psychology.

Your task is to create a high-level STRATEGY BLUEPRINT for a marketing campaign. This is not about writing the final copy; it's about defining the conceptual framework that will guide content creation later.

**Overall Campaign Goal:** {{goal}}
**Funnel Model to Use:** {{funnelType}}
This model's core principles are: {{funnelPrinciples}}

**Brand Heart (Brand Identity):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Mission: {{brandHeart.mission.primary}}
- Values: {{brandHeart.values.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**Offering Details:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.contextual_notes}}
- Important Contextual Notes: {{offering.contextual_notes}}
{{/if}}

**Your Task:**

For EACH of the target channels provided below, create a dedicated strategy. Each channel's strategy should be designed to work in concert with the others to achieve the overall campaign goal.

**Target Channels:** {{#each channels}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

For each channel, you must define:
1.  **channel**: The name of the channel.
2.  **objective**: What is this channel's primary role in achieving the campaign goal? (e.g., "Drive top-of-funnel awareness", "Nurture leads with educational content", "Convert warm leads to customers").
3.  **keyMessage**: What is the single, most important idea or feeling this channel should communicate about the offering?
4.  **conceptualSteps**: A sequence of 3-5 high-level conceptual ideas for content. For each step, provide:
    *   **step**: The step number (1, 2, 3...).
    *   **concept**: The core idea for the post, email, or message. (e.g., "Introduce the core problem the audience faces, using a relatable story.", "Share a powerful customer testimonial that highlights the transformation.", "Announce a limited-time bonus for the offering.").
    *   **objective**: The specific purpose of this individual piece of content. (e.g., "Establish empathy and connection.", "Build social proof.", "Create a sense of urgency.").

Generate this entire plan in the **{{primaryLanguage}}** language.

Return the result in the specified JSON format, as an array of channel strategies.`,
});


const generateFunnelFlow = ai.defineFlow(
  {
    name: 'generateFunnelFlow',
    inputSchema: GenerateFunnelInputSchema,
    outputSchema: GenerateFunnelOutputSchema,
  },
  async ({ offeringId, funnelType, funnelPrinciples, goal, channels }) => {
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
        channels,
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
