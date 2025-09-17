
'use server';

/**
 * @fileOverview A flow to generate a holistic media plan based on a specific strategy.
 * This flow parallelizes plan generation for each channel to improve performance.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';


const PlanItemSchema = z.object({
  offeringId: z.string().describe("The ID of the offering this content is for."),
  channel: z.string().describe("The specific channel this content is for (e.g., 'Instagram', 'Facebook')."),
  format: z.string().describe("The specific visual format for the content (e.g., '1:1 Square Image', '9:16 Reel Video')."),
  copy: z.string().describe("The full ad copy for the post, including a headline, body text, and a call to action."),
  hashtags: z.string().describe("A space-separated list of relevant hashtags."),
  creativePrompt: z.string().describe("A detailed, ready-to-use prompt for an AI image or video generator to create the visual for this content piece."),
});

const ChannelPlanSchema = z.object({
  plan: z.array(PlanItemSchema),
});

const GenerateMediaPlanOutputSchema = z.object({
  plan: z.array(PlanItemSchema),
});
export type GenerateMediaPlanOutput = z.infer<typeof GenerateMediaPlanOutputSchema>;

const GenerateMediaPlanInputSchema = z.object({
  funnelId: z.string(),
});
export type GenerateMediaPlanInput = z.infer<typeof GenerateMediaPlanInputSchema>;


const generateChannelPlanPrompt = ai.definePrompt({
  name: 'generateChannelPlanPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          brandHeart: z.any(),
          strategy: z.any(),
          channel: z.string(),
      })
  },
  output: { schema: ChannelPlanSchema },
  prompt: `You are an expert direct response copywriter and AI prompt engineer. Your task is to create a set of actionable, ready-to-use content packages for a specific marketing channel, based on a provided strategy blueprint.

**The Strategy Blueprint to Execute:**
---
**Strategy for Offering: "{{strategy.offerings.title.primary}}" (Offering ID: {{strategy.offering_id}})**
- Goal: {{strategy.goal}}

**Blueprint Stages:**
{{#each strategy.strategy_brief.strategy}}
- **Stage: {{this.stageName}}**
  - Objective: {{this.objective}}
  - Key Message: {{this.keyMessage}}
  - Conceptual Steps:
    {{#each this.conceptualSteps}}
    - Concept: {{this.concept}} (Objective: {{this.objective}})
    {{/each}}
{{/each}}
---
**Brand Identity:**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Mission: {{brandHeart.mission.primary}}
- Target Audience: Conscious creators, entrepreneurs, artists, healers.
---

**Your Task:**

Your job is to generate a list of concrete content packages for the **'{{channel}}' channel ONLY**.

For **EACH conceptual step** in the blueprint, you must generate one complete content package. Each package must contain:
1.  **format**: The specific visual format best suited for the concept and channel. Examples: '1:1 Square Image', '9:16 Reel Video', '4:5 Portrait Image', 'Carousel (3 slides)'.
2.  **copy**: Write compelling, direct-response ad copy for the post. It must align with the brand's tone of voice and the objective of the conceptual step. Include a headline, body, and a clear call-to-action.
3.  **hashtags**: A space-separated list of 5-10 relevant hashtags for the post.
4.  **creativePrompt**: A detailed, ready-to-use prompt for an AI image/video generator (like Midjourney or DALL-E) to create the visual. The prompt must be descriptive and align with the brand's aesthetic (soulful, minimalist, calm, creative, authentic). Example: "A serene, minimalist flat-lay of a journal, a steaming mug of tea, and a single green leaf on a soft, textured linen background, pastel colors, soft natural light, photo-realistic --ar 1:1".

Ensure you provide the correct 'offeringId' ('{{strategy.offering_id}}') and 'channel' ('{{channel}}') for each generated content package.

Generate this entire plan in the **{{primaryLanguage}}** language. Return the result as a flat array of plan items in the specified JSON format.`,
});


const generateMediaPlanFlow = ai.defineFlow(
  {
    name: 'generateMediaPlanFlow',
    inputSchema: GenerateMediaPlanInputSchema,
    outputSchema: GenerateMediaPlanOutputSchema,
  },
  async ({ funnelId }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    const [
        { data: brandHeart, error: brandHeartError },
        { data: profile, error: profileError },
        { data: strategy, error: strategyError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('primary_language').eq('id', user.id).single(),
        supabase.from('funnels').select(`
            *,
            offerings (id, title)
        `).eq('id', funnelId).eq('user_id', user.id).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
    if (!strategy.offerings) throw new Error('The selected strategy is not linked to a valid offering.');
    if (!strategy.strategy_brief?.channels || strategy.strategy_brief.channels.length === 0) {
      throw new Error('The selected strategy has no channels defined.');
    }

    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));
    const primaryLanguage = languageNames.get(profile.primary_language) || profile.primary_language;

    // Create a parallel generation task for each channel
    const channelPromises = strategy.strategy_brief.channels.map(channel =>
        generateChannelPlanPrompt({
            primaryLanguage,
            brandHeart,
            strategy,
            channel,
        }).then(result => result.output?.plan || []) // Return the plan array or an empty array on failure
    );

    // Wait for all channels to finish generating
    const allChannelPlans = await Promise.all(channelPromises);

    // Flatten the array of arrays into a single plan
    const finalPlan = allChannelPlans.flat();

    if (finalPlan.length === 0) {
      throw new Error('The AI model did not return a response for any channel.');
    }

    return { plan: finalPlan };
  }
);


export async function generateMediaPlanForStrategy(input: GenerateMediaPlanInput): Promise<GenerateMediaPlanOutput> {
    return generateMediaPlanFlow(input);
}
