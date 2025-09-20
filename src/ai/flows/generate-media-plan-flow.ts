
'use server';

/**
 * @fileOverview A flow to generate a holistic media plan based on a specific strategy.
 * This flow parallelizes plan generation for each channel to improve performance.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { GenerateFunnelOutput, ConceptualStep } from './generate-funnel-flow';


const PlanItemSchema = z.object({
  offeringId: z.string().describe("The ID of the offering this content is for."),
  channel: z.string().describe("The specific channel this content is for (e.g., 'Instagram', 'Facebook')."),
  format: z.string().describe("The specific visual format for the content, chosen from the provided list."),
  copy: z.string().describe("The full ad copy for the post, including a headline, body text, and a call to action."),
  hashtags: z.string().describe("A space-separated list of relevant hashtags."),
  creativePrompt: z.string().describe("A detailed, ready-to-use prompt for an AI image or video generator to create the visual for this content piece."),
  conceptualStep: z.any().optional().describe("The original conceptual step from the blueprint that this item is based on."),
});
export type PlanItem = z.infer<typeof PlanItemSchema>;

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


const RegeneratePlanItemInputSchema = z.object({
    funnelId: z.string(),
    channel: z.string(),
    conceptualStep: z.any(),
});
export type RegeneratePlanItemInput = z.infer<typeof RegeneratePlanItemInputSchema>;


const generateChannelPlanPrompt = ai.definePrompt({
  name: 'generateChannelPlanPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          brandHeart: z.any(),
          offering: z.any(),
          strategy: z.any(),
          channel: z.string(),
          validFormats: z.array(z.string()),
      })
  },
  output: { schema: ChannelPlanSchema },
  prompt: `You are an expert direct response copywriter and AI prompt engineer. Your task is to create a set of actionable, ready-to-use content packages for a specific marketing channel, based on a provided strategy blueprint and brand identity.

**The Strategy Blueprint to Execute:**
---
**Strategy for Offering: "{{offering.title.primary}}" (Offering ID: {{offering.id}})**
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
**Brand Identity (The "Who"):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Mission: {{brandHeart.mission.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}
- Target Audience: Conscious creators, entrepreneurs, artists, healers.

**Offering Details (The "What"):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.contextual_notes}}
- Contextual Notes: {{offering.contextual_notes}}
{{/if}}
---

**Your Task:**

Your job is to generate a list of concrete content packages for the **'{{channel}}' channel ONLY**.

For **EACH conceptual step** in the blueprint, you must generate exactly ONE complete content package. Each package must contain:
1.  **offeringId**: The ID of the offering this content is for ('{{offering.id}}').
2.  **channel**: The specific channel this content is for ('{{channel}}').
3.  **format**: The specific visual format. **You MUST choose one from this list of valid formats for this channel**: [{{#each validFormats}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}].
4.  **copy**: Write compelling, direct-response ad copy for the post. It must embody the brand's unique Tone of Voice and be directly inspired by the Brand's Mission and Values. It must also achieve the objective of the conceptual step. Include a headline, body, and a clear call-to-action.
5.  **hashtags**: A space-separated list of 5-10 relevant hashtags for the post, mixing niche and broader terms.
6.  **creativePrompt**: A detailed, ready-to-use prompt for an AI image/video generator (like Midjourney or DALL-E) to create the visual. The prompt must be descriptive, visually rich, and perfectly aligned with the Brand's aesthetic (soulful, minimalist, calm, creative, authentic) and the copy you just wrote. Example: "A serene, minimalist flat-lay of a journal, a steaming mug of tea, and a single green leaf on a soft, textured linen background, pastel colors, soft natural light, photo-realistic --ar 1:1".
7.  **conceptualStep**: Include the original conceptual step object from the blueprint that this item is based on. **This is for context and you must include the 'stageName' and 'objective' inside this object**.

Generate this entire plan in the **{{primaryLanguage}}** language. Return the result as a flat array of plan items in the specified JSON format.`,
});


const regeneratePlanItemPrompt = ai.definePrompt({
    name: 'regeneratePlanItemPrompt',
    input: {
        schema: z.object({
            primaryLanguage: z.string(),
            brandHeart: z.any(),
            offering: z.any(),
            channel: z.string(),
            conceptualStep: z.any(),
            validFormats: z.array(z.string()),
        })
    },
    output: { schema: PlanItemSchema },
    prompt: `You are an expert direct response copywriter and AI prompt engineer. Your task is to regenerate ONE actionable, ready-to-use content package for a specific marketing channel, based on a provided brand identity and a specific conceptual step.

**Brand Identity (The "Who"):**
- Brand Name: {{brandHeart.brand_name}}
- Mission: {{brandHeart.mission.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**Offering Details (The "What"):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**Your Specific Task:**

Your job is to generate ONE concrete content package for the **'{{channel}}' channel**, based ONLY on this conceptual step:
- **Concept**: {{conceptualStep.concept}}
- **Objective**: {{conceptualStep.objective}}
- **Stage Name**: {{conceptualStep.stageName}}

This content package MUST contain:
1.  **offeringId**: The ID of the offering this content is for ('{{offering.id}}').
2.  **channel**: The specific channel this content is for ('{{channel}}').
3.  **format**: Suggest a NEW, DIFFERENT specific visual format from your previous attempt. **You MUST choose one from this list**: [{{#each validFormats}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}].
4.  **copy**: Write NEW, DIFFERENT, compelling, direct-response ad copy that embodies the brand's tone of voice and achieves the conceptual step's objective.
5.  **hashtags**: A NEW, DIFFERENT space-separated list of 5-10 relevant hashtags.
6.  **creativePrompt**: A NEW, DIFFERENT, detailed, ready-to-use prompt for an AI image/video generator. The prompt should be aligned with the brand's aesthetic.
7.  **conceptualStep**: Include the original conceptual step object from the input. It MUST include the 'stageName', 'concept', and 'objective' fields.

Generate this single content package in the **{{primaryLanguage}}** language. Return the result as a single JSON object.`,
});


const mediaFormatConfig = [
    { label: "Image", formats: [ { value: '1:1 Square Image', channels: ['instagram', 'facebook'] }, { value: '4:5 Portrait Image', channels: ['instagram', 'facebook'] }, { value: '9:16 Story Image', channels: ['instagram', 'facebook'] }, ] },
    { label: "Video", formats: [ { value: '9:16 Reel/Short', channels: ['instagram', 'facebook', 'tiktok', 'linkedin'] }, { value: '1:1 Square Video', channels: ['instagram', 'facebook', 'linkedin'] }, { value: '16:9 Landscape Video', channels: ['facebook', 'linkedin', 'website'] }, ] },
    { label: "Text & Communication", formats: [ { value: 'Carousel (3-5 slides)', channels: ['instagram', 'facebook', 'linkedin'] }, { value: 'Newsletter', channels: ['webmail'] }, { value: 'Promotional Email', channels: ['webmail'] }, { value: 'Blog Post', channels: ['website'] }, { value: 'Text Message', channels: ['whatsapp', 'telegram'] }, ]
    }
];

const getFormatsForChannel = (channel: string): string[] => {
    const channelLower = channel.toLowerCase();
    return mediaFormatConfig.flatMap(category => 
        category.formats
            .filter(format => format.channels.includes(channelLower))
            .map(format => format.value)
    );
};


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
            offerings (*)
        `).eq('id', funnelId).eq('user_id', user.id).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
    if (!strategy.offerings) throw new Error('The selected strategy is not linked to a valid offering.');
    
    const strategyBrief = strategy.strategy_brief as unknown as GenerateFunnelOutput;
    const channels = strategyBrief?.channels || [];
    const offering = strategy.offerings;

    if (channels.length === 0) {
      throw new Error('The selected strategy has no channels defined.');
    }

    // Add stageName to each conceptualStep for easier grouping later
    const strategyWithStageNames = {
        ...strategy,
        strategy_brief: {
            ...strategyBrief,
            strategy: strategyBrief.strategy.map(stage => ({
                ...stage,
                conceptualSteps: stage.conceptualSteps.map(step => ({
                    ...step,
                    stageName: stage.stageName
                }))
            }))
        }
    };


    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));
    const primaryLanguage = languageNames.get(profile.primary_language) || profile.primary_language;

    // Create a parallel generation task for each channel
    const channelPromises = channels.map(channel => {
        const validFormats = getFormatsForChannel(channel);
        return generateChannelPlanPrompt({
            primaryLanguage,
            brandHeart,
            offering,
            strategy: strategyWithStageNames,
            channel,
            validFormats,
        }).then(result => result.output?.plan || []) // Return the plan array or an empty array on failure
    });

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

const regeneratePlanItemFlow = ai.defineFlow(
    {
        name: 'regeneratePlanItemFlow',
        inputSchema: RegeneratePlanItemInputSchema,
        outputSchema: PlanItemSchema,
    },
    async ({ funnelId, channel, conceptualStep }) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated.');

        const [
            { data: brandHeart, error: brandHeartError },
            { data: profile, error: profileError },
            { data: strategy, error: strategyError },
        ] = await Promise.all([
            supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
            supabase.from('profiles').select('primary_language').eq('id', user.id).single(),
            supabase.from('funnels').select(`*, offerings (*)`).eq('id', funnelId).eq('user_id', user.id).single(),
        ]);

        if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
        if (profileError || !profile) throw new Error('User profile not found.');
        if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
        if (!strategy.offerings) throw new Error('Strategy not linked to a valid offering.');

        const languages = await import('@/lib/languages');
        const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));
        const primaryLanguage = languageNames.get(profile.primary_language) || profile.primary_language;
        
        const validFormats = getFormatsForChannel(channel);

        const { output } = await regeneratePlanItemPrompt({
            primaryLanguage,
            brandHeart,
            offering: strategy.offerings,
            channel,
            conceptualStep,
            validFormats,
        });

        if (!output) {
          throw new Error('The AI model did not return a response.');
        }

        return output;
    }
);


export async function generateMediaPlanForStrategy(input: GenerateMediaPlanInput): Promise<GenerateMediaPlanOutput> {
    return generateMediaPlanFlow(input);
}

export async function regeneratePlanItem(input: RegeneratePlanItemInput): Promise<PlanItem> {
    return regeneratePlanItemFlow(input);
}
