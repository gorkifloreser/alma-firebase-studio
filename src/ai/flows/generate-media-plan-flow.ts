

'use server';

/**
 * @fileOverview A flow to generate a holistic media plan based on a specific strategy.
 * This flow parallelizes plan generation for each channel to improve performance.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { GenerateFunnelOutput, ConceptualStep } from './generate-funnel-flow';
import { mediaFormatConfig } from '@/lib/media-formats';
import { googleAI } from '@genkit-ai/googleai';


const PlanItemSchema = z.object({
  offering_id: z.string().describe("The ID of the offering this content is for."),
  user_channel_settings: z.object({ channel_name: z.string() }).describe("The channel this content is for."),
  format: z.string().describe("The specific visual format for the content, chosen from the provided list."),
  copy: z.string().describe("The full ad copy for the post, including a headline, body text, and a call to action."),
  hashtags: z.string().describe("A space-separated list of relevant hashtags."),
  creative_prompt: z.string().describe("A detailed, ready-to-use prompt for an AI image or video generator to create the visual for this content piece."),
  stage_name: z.string().describe("The strategy stage this item belongs to (e.g., 'Awareness', 'Consideration')."),
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
  model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          secondaryLanguage: z.string().optional(),
          campaignLanguage: z.string(),
          brandHeart: z.any(),
          offering: z.any(),
          strategy: z.any(),
          topAdaptedHooks: z.array(z.any()), // New input for viral hooks
          channel: z.string(),
          validFormats: z.array(z.string()),
          bestPractices: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
      })
  },
  output: { schema: ChannelPlanSchema },
  prompt: `You are an expert event marketing strategist and AI prompt engineer with a deep understanding of authentic, heart-centered marketing. You are fluent in both {{primaryLanguage}} and {{#if secondaryLanguage}}{{secondaryLanguage}}{{else}}{{primaryLanguage}}{{/if}}.

**YOUR GOAL:** Create a time-sensitive, strategic content plan for the '{{channel}}' channel, based on the provided campaign dates and event details.

**CRITICAL INSTRUCTION: You must generate the entire output in the following language: {{campaignLanguage}}**

---
**INPUT #1: CAMPAIGN TIMELINE (Your Guide for "WHEN")**
- Campaign Start Date: {{#if startDate}}{{startDate}}{{else}}Not specified{{/if}}
- Campaign End Date: {{#if endDate}}{{endDate}}{{else}}Not specified{{/if}}
- Event Date (if applicable): {{#if offering.offering_schedules.[0].event_date}}{{offering.offering_schedules.[0].event_date}}{{else}}N/A{{/if}}
---
**INPUT #2: THE TOP 10 ADAPTED VIRAL HOOKS (Your Primary Inspiration for "WHAT")**
{{#each topAdaptedHooks}}
- **Hook**: "{{this.adapted_hook}}" (Strategy: {{this.strategy}}, Visuals: {{this.visual_prompt}})
{{/each}}
---
**INPUT #3: THE BRAND'S SOUL (The "Who" - Your Guide for TONE and VOICE)**
- Brand Name: {{brandHeart.brand_name}}
- **Tone of Voice:** {{brandHeart.tone_of_voice.primary}}
- **Visual Identity:** {{brandHeart.visual_identity.primary}}
---
**INPUT #4: THE OFFERING (The "What" - The Core Subject)**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- **Value Content (Key Talking Points):** 
{{#each offering.value_content}}
    - **Type**: {{this.type}}, **Concept**: {{this.concept}}, **Developed Content**: {{this.developed_content}}
{{/each}}
---
**INPUT #5: STRATEGIC CONTEXT (The "How" and "Where")**
- Strategy Blueprint Stages:
{{#each strategy.strategy_brief.strategy}}
  - **Stage: {{this.stageName}}** (Objective: {{this.objective}})
{{/each}}
- Channel for this plan: **'{{channel}}'**
- Best practices for '{{channel}}': "{{bestPractices}}"
---

**YOUR TASK: Create Time-Aware, Authentic, VIRAL Content Packages**

Based on all the provided context, generate a list of concrete content packages for the **'{{channel}}' channel ONLY**. Create one content package for each stage in the blueprint, making sure to use a **different viral hook** from the list for each stage.

**Crucially, you MUST use the Campaign Timeline to suggest realistic and strategic dates for each post.** For example, suggest awareness posts near the start date, urgency posts near the end date, and "thank you" or "recap" posts after the event date.

Each package MUST contain:
1.  **offering_id**: '{{offering.id}}'.
2.  **user_channel_settings**: { "channel_name": '{{channel}}' }.
3.  **format**: Choose the best visual format for this content from this list: [{{#each validFormats}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}].
4.  **copy**: Write compelling, direct-response ad copy. Start with a hook from the provided list, then seamlessly weave in the Brand's Soul, the Offering's value, and a clear call to action.
5.  **hashtags**: A space-separated list of 5-10 relevant hashtags.
6.  **creative_prompt**: A detailed, visually rich prompt for an AI image/video generator, inspired by the chosen hook's visual strategy and infused with the brand's specific visual identity.
7.  **stage_name**: The name of the blueprint stage this item belongs to.
8.  **objective**: **Generate a NEW, specific goal for THIS content piece** that aligns with the stage's objective.
9.  **concept**: **Generate a NEW, specific concept for THIS content piece** based on the chosen viral hook and the offering's value content.
10. **suggested_post_at**: Suggest an ideal post date/time in ISO 8601 format (e.g., '2025-10-26T14:30:00Z'). **This MUST be a logical date within the campaign timeline.**

Generate this entire plan in the **{{campaignLanguage}}** language. Return the result as a flat array of plan items in the specified JSON format.`,
});


const regeneratePlanItemPrompt = ai.definePrompt({
    name: 'regeneratePlanItemPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
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
- Offering ID: {{offering.id}}

**CHANNEL-SPECIFIC INSTRUCTIONS for '{{channel}}':**
"{{bestPractices}}"

**Your Specific Task:**

Generate ONE NEW, DIFFERENT content package for the **'{{channel}}' channel**, for the **'{{stageName}}'** stage of the campaign.

This content package MUST contain:
1.  **offering_id**: '{{offering.id}}'.
2.  **user_channel_settings**: { "channel_name": '{{channel}}' }.
3.  **format**: Suggest a NEW, DIFFERENT visual format from this list: [{{#each validFormats}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}].
4.  **copy**: Write NEW, DIFFERENT, compelling ad copy that embodies the brand's tone of voice.
5.  **hashtags**: A NEW, DIFFERENT space-separated list of 5-10 relevant hashtags.
6.  **creative_prompt**: A NEW, DIFFERENT, detailed prompt for an AI image/video generator.
7.  **stage_name**: '{{stageName}}'.
8.  **objective**: **Generate a NEW, specific goal for this content piece.**
9.  **concept**: **Generate a NEW, specific concept for this content piece.**
10. **suggested_post_at**: Suggest an ideal post date/time in ISO 8601 format (e.g., '2025-10-26T14:30:00Z').

Generate this single content package in the **{{primaryLanguage}}** language. Return the result as a single JSON object.`,
});

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
        { data: adaptedHooks, error: adaptedHooksError }, // Fetch adapted hooks
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('primary_language, secondary_language').eq('id', user.id).single(),
        supabase.from('funnels').select(`*, offerings (*, offering_schedules(*))`).eq('id', funnelId).eq('user_id', user.id).single(),
        supabase.from('user_channel_settings').select('channel_name, best_practices').eq('user_id', user.id),
        supabase.from('adapted_viral_hooks').select('*').eq('user_id', user.id).limit(10),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
    if (!strategy.offerings) throw new Error('The selected strategy is not linked to a valid offering.');
    if (channelSettingsError) throw new Error('Could not fetch channel settings.');
    if (adaptedHooksError || !adaptedHooks || adaptedHooks.length === 0) {
        throw new Error('No adapted viral hooks found. Please generate a Top 10 strategy from the Viral Hooks Library first.');
    }
    
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
            topAdaptedHooks: adaptedHooks, // Pass the hooks to the prompt
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
