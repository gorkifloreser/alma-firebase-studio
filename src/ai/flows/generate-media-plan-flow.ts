

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
  stageName: z.string().describe("The strategy stage this item belongs to (e.g., 'Awareness', 'Consideration')."),
  objective: z.string().describe("The specific purpose or objective of this individual content piece. This should be a new, specific goal for the copy written."),
  concept: z.string().describe("The core concept or idea for this content piece. This should be a new, specific idea for the content generated."),
  suggested_post_at: z.string().optional().describe("A suggested date and time for posting this content in ISO 8601 format (e.g., '2025-10-26T14:30:00Z'). Base this on the campaign dates and channel best practices."),
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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  channels: z.array(z.string()).optional(),
  language: z.string().optional(),
});
export type GenerateMediaPlanInput = z.infer<typeof GenerateMediaPlanInputSchema>;


const RegeneratePlanItemInputSchema = z.object({
    funnelId: z.string(),
    channel: z.string(),
    stageName: z.string().optional(),
    objective: z.string().optional(),
    concept: z.string().optional(),
});
export type RegeneratePlanItemInput = z.infer<typeof RegeneratePlanItemInputSchema>;


const generateChannelPlanPrompt = ai.definePrompt({
  name: 'generateChannelPlanPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          secondaryLanguage: z.string().optional(),
          campaignLanguage: z.string(),
          brandHeart: z.any(),
          offering: z.any(),
          strategy: z.any(),
          channel: z.string(),
          validFormats: z.array(z.string()),
          bestPractices: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
      })
  },
  output: { schema: ChannelPlanSchema },
  prompt: `You are an expert direct response copywriter and AI prompt engineer who is fluent in both {{primaryLanguage}} and {{#if secondaryLanguage}}{{secondaryLanguage}}{{else}}{{primaryLanguage}}{{/if}}. Your task is to create a set of actionable, ready-to-use content packages for a specific marketing channel, based on a provided strategy blueprint, brand identity, and channel-specific best practices.

**CRITICAL INSTRUCTION: You must generate the entire output in the following language: {{campaignLanguage}}**

**The Strategy Blueprint to Execute:**
---
**Strategy for Offering: "{{offering.title.primary}}" (Offering ID: {{offering.id}})**
- Goal: {{strategy.goal}}
- Funnel Model: **{{strategy.strategy_brief.funnelType}}**
- Blueprint Stages:
{{#each strategy.strategy_brief.strategy}}
  - **Stage: {{this.stageName}}** (Objective: {{this.objective}})
{{/each}}
---
**Brand Identity (The "Who"):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{#if (eq campaignLanguage primaryLanguage)}}{{brandHeart.brand_brief.primary}}{{else}}{{brandHeart.brand_brief.secondary}}{{/if}}
- Tone of Voice: {{#if (eq campaignLanguage primaryLanguage)}}{{brandHeart.tone_of_voice.primary}}{{else}}{{brandHeart.tone_of_voice.secondary}}{{/if}}
---
**Offering Details (The "What"):**
- Title: {{#if (eq campaignLanguage primaryLanguage)}}{{offering.title.primary}}{{else}}{{offering.title.secondary}}{{/if}}
- Description: {{#if (eq campaignLanguage primaryLanguage)}}{{offering.description.primary}}{{else}}{{offering.description.secondary}}{{/if}}
- Contextual Notes: {{offering.contextual_notes}}
---
**Campaign Timing:**
- Start Date: {{#if startDate}}{{startDate}}{{else}}Not specified{{/if}}
- End Date: {{#if endDate}}{{endDate}}{{else}}Not specified{{/if}}
You must create a content sequence that is appropriately paced for this duration.
---
**CHANNEL-SPECIFIC INSTRUCTIONS for '{{channel}}':**
"{{bestPractices}}"
---

**Your Task:**

Generate a list of concrete content packages for the **'{{channel}}' channel ONLY**. Create one content package for each stage in the blueprint. Each package MUST contain:

1.  **offeringId**: '{{offering.id}}'.
2.  **channel**: '{{channel}}'.
3.  **format**: Choose the best visual format for this content from this list: [{{#each validFormats}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}].
4.  **copy**: Write compelling, direct-response ad copy for the post, embodying the brand's tone of voice.
5.  **hashtags**: A space-separated list of 5-10 relevant hashtags.
6.  **creativePrompt**: A detailed, visually rich prompt for an AI image/video generator.
7.  **stageName**: The name of the blueprint stage this item belongs to.
8.  **objective**: **Generate a NEW, specific goal for THIS content piece.** Example: "To build social proof by highlighting a customer transformation."
9.  **concept**: **Generate a NEW, specific concept for THIS content piece.** Example: "Feature a powerful customer quote as the hero image with copy that expands on their story."
10. **suggested_post_at**: Suggest an ideal post date/time in ISO 8601 format (e.g., '2025-10-26T14:30:00Z').

Generate this entire plan in the **{{campaignLanguage}}** language. Return the result as a flat array of plan items in the specified JSON format.`,
});


const regeneratePlanItemPrompt = ai.definePrompt({
    name: 'regeneratePlanItemPrompt',
    input: {
        schema: z.object({
            primaryLanguage: z.string(),
            brandHeart: z.any(),
            offering: z.any(),
            channel: z.string(),
            stageName: z.string().optional(),
            validFormats: z.array(z.string()),
            bestPractices: z.string().optional(),
        })
    },
    output: { schema: PlanItemSchema },
    prompt: `You are an expert direct response copywriter and AI prompt engineer. Your task is to regenerate ONE actionable, ready-to-use content package for a specific marketing channel, based on a provided brand identity and a specific strategic stage.

**Brand Identity (The "Who"):**
- Brand Name: {{brandHeart.brand_name}}
- Mission: {{brandHeart.mission.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**Offering Details (The "What"):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**CHANNEL-SPECIFIC INSTRUCTIONS for '{{channel}}':**
"{{bestPractices}}"

**Your Specific Task:**

Generate ONE NEW, DIFFERENT content package for the **'{{channel}}' channel**, for the **'{{stageName}}'** stage of the campaign.

This content package MUST contain:
1.  **offeringId**: '{{offering.id}}'.
2.  **channel**: '{{channel}}'.
3.  **format**: Suggest a NEW, DIFFERENT visual format from this list: [{{#each validFormats}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}].
4.  **copy**: Write NEW, DIFFERENT, compelling ad copy that embodies the brand's tone of voice.
5.  **hashtags**: A NEW, DIFFERENT space-separated list of 5-10 relevant hashtags.
6.  **creativePrompt**: A NEW, DIFFERENT, detailed prompt for an AI image/video generator.
7.  **stageName**: '{{stageName}}'.
8.  **objective**: **Generate a NEW, specific goal for this content piece.**
9.  **concept**: **Generate a NEW, specific concept for this content piece.**

Generate this single content package in the **{{primaryLanguage}}** language. Return the result as a single JSON object.`,
});


const mediaFormatConfig = [
    { label: "Image", formats: [ { value: '1:1 Square Image', channels: ['instagram', 'facebook'] }, { value: '4:5 Portrait Image', channels: ['instagram', 'facebook'] }, { value: '9:16 Story Image', channels: ['instagram', 'facebook'] }, ] },
    { label: "Video", formats: [ { value: '9:16 Reel/Short', channels: ['instagram', 'facebook', 'tiktok', 'linkedin'] }, { value: '1:1 Square Video', channels: ['instagram', 'facebook', 'linkedin'] }, { value: '16:9 Landscape Video', channels: ['facebook', 'linkedin', 'website'] }, ] },
    { label: "Text & Communication", formats: [ { value: 'Carousel (3-5 slides)', channels: ['instagram', 'facebook', 'linkedin'] }, { value: 'Newsletter', channels: ['webmail'] }, { value: 'Promotional Email', channels: ['webmail'] }, { value: 'Blog Post', channels: ['website'] }, { value: 'Landing Page', channels: ['website'] }, { value: 'Text Message', channels: ['whatsapp', 'telegram'] }, ] }
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
  async ({ funnelId, startDate, endDate, channels: requestedChannels, language: campaignLanguage }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    // Fetch all required data in parallel
    const [
        { data: brandHeart, error: brandHeartError },
        { data: profile, error: profileError },
        { data: strategy, error: strategyError },
        { data: channelSettings, error: channelSettingsError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('primary_language, secondary_language').eq('id', user.id).single(),
        supabase.from('funnels').select(`*, offerings (*)`).eq('id', funnelId).eq('user_id', user.id).single(),
        supabase.from('user_channel_settings').select('channel_name, best_practices').eq('user_id', user.id),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
    if (!strategy.offerings) throw new Error('The selected strategy is not linked to a valid offering.');
    if (channelSettingsError) throw new Error('Could not fetch channel settings.');
    
    const strategyBrief = strategy.strategy_brief as unknown as GenerateFunnelOutput;
    const channels = requestedChannels || strategyBrief?.channels || [];
    const offering = strategy.offerings;

    if (channels.length === 0) {
      throw new Error('No channels were selected for this media plan.');
    }

    const channelSettingsMap = new Map(channelSettings.map(s => [s.channel_name, s.best_practices]));

    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));
    const primaryLanguage = languageNames.get(profile.primary_language) || profile.primary_language;
    const secondaryLanguage = profile.secondary_language ? languageNames.get(profile.secondary_language) : undefined;

    // Create a parallel generation task for each channel
    const channelPromises = channels.map(channel => {
        const validFormats = getFormatsForChannel(channel);
        const bestPractices = channelSettingsMap.get(channel) || 'No specific best practices provided.';
        return generateChannelPlanPrompt({
            primaryLanguage,
            secondaryLanguage,
            campaignLanguage: languageNames.get(campaignLanguage || profile.primary_language) || campaignLanguage || primaryLanguage,
            brandHeart,
            offering,
            strategy,
            channel,
            validFormats,
            bestPractices,
            startDate,
            endDate,
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
    async ({ funnelId, channel, stageName }) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated.');

        const [
            { data: brandHeart, error: brandHeartError },
            { data: profile, error: profileError },
            { data: strategy, error: strategyError },
            { data: channelSetting, error: channelSettingError },
        ] = await Promise.all([
            supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
            supabase.from('profiles').select('primary_language').eq('id', user.id).single(),
            supabase.from('funnels').select(`*, offerings (*)`).eq('id', funnelId).eq('user_id', user.id).single(),
            supabase.from('user_channel_settings').select('best_practices').eq('user_id', user.id).eq('channel_name', channel).single(),
        ]);

        if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
        if (profileError || !profile) throw new Error('User profile not found.');
        if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
        if (!strategy.offerings) throw new Error('Strategy not linked to a valid offering.');
        if (channelSettingError) console.warn(`No best practices found for channel: ${channel}`);


        const languages = await import('@/lib/languages');
        const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));
        const primaryLanguage = languageNames.get(profile.primary_language) || profile.primary_language;
        
        const validFormats = getFormatsForChannel(channel);
        const bestPractices = channelSetting?.best_practices || 'No specific best practices provided.';

        const { output } = await regeneratePlanItemPrompt({
            primaryLanguage,
            brandHeart,
            offering: strategy.offerings,
            channel,
            stageName,
            validFormats,
            bestPractices,
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
