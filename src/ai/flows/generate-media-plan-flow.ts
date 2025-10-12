

'use server';

/**
 * @fileOverview A flow to generate a holistic media plan based on a specific strategy.
 * This flow parallelizes plan generation for each channel to improve performance.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { GenerateFunnelOutput, ConceptualStep } from './generate-funnel-flow';
import { mediaFormatConfig, type MediaFormatCategory, type AspectRatio } from '@/lib/media-formats';
import { googleAI } from '@genkit-ai/googleai';


const PlanItemSchema = z.object({
  offering_id: z.string().describe("The ID of the offering this content is for."),
  user_channel_settings: z.object({ channel_name: z.string() }).describe("The channel this content is for."),
  media_format: z.string().describe("The specific visual format for the content, chosen from the provided list of valid formats."),
  aspect_ratio: z.string().optional().default('').describe("The aspect ratio for the visual content (e.g., '1:1', '9:16'). Must be an empty string if not applicable."),
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
    userHint: z.string().optional(), // Added user hint
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
          isEvent: z.boolean(),
          strategy: z.any(),
          topAdaptedHooks: z.array(z.any()), // New input for viral hooks
          channel: z.string(),
          validFormatsString: z.string(), // Simplified from array to string
          bestPractices: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
      })
  },
  output: { schema: ChannelPlanSchema },
  prompt: `You are an expert marketing strategist and AI prompt engineer with a deep understanding of authentic, heart-centered marketing. You are fluent in both {{primaryLanguage}} and {{#if secondaryLanguage}}{{secondaryLanguage}}{{else}}{{primaryLanguage}}{{/if}}.

**YOUR GOAL:** Create a time-sensitive, strategic content plan for the '{{channel}}' channel, based on the provided campaign dates and event details.

**CRITICAL INSTRUCTION: You must generate the entire output in the following language: {{campaignLanguage}}**

---
**INPUT #1: CAMPAIGN TIMELINE (Your Guide for "WHEN")**
- Campaign Start Date: {{#if startDate}}{{startDate}}{{else}}Not specified{{/if}}
- Campaign End Date: {{#if endDate}}{{endDate}}{{else}}Not specified{{/if}}
{{#if isEvent}}
- Event Date (if applicable): {{#if offering.offering_schedules.[0].event_date}}{{offering.offering_schedules.[0].event_date}}{{else}}N/A{{/if}}
{{/if}}
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
- Type: {{offering.type}}
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
- **Valid Formats for '{{channel}}'**:
{{{validFormatsString}}}
---

**YOUR TASK: Create Time-Aware, Authentic, VIRAL Content Packages**

Based on all the provided context, generate a list of concrete content packages for the **'{{channel}}' channel ONLY**. Create one content package for each stage in the blueprint, making sure to use a **different viral hook** from the list for each stage.

{{#if isEvent}}
**Crucially, you MUST use the Campaign Timeline and Event Date to suggest realistic and strategic dates for each post.** For example, suggest awareness posts near the start date, urgency posts near the end date, and "thank you" or "recap" posts after the event date.
{{else}}
**Crucially, you MUST use the Campaign Timeline to suggest realistic and strategic dates for each post.** Distribute the posts evenly throughout the campaign duration.
{{/if}}

Each package MUST contain:
1.  **offering_id**: '{{offering.id}}'.
2.  **user_channel_settings**: { "channel_name": '{{channel}}' }.
3.  **media_format**: From the 'Valid Formats' list, you MUST select a valid format value (e.g., 'Image', 'Video', 'Text Post').
4.  **aspect_ratio**: From the SAME LINE as your chosen media_format in the 'Valid Formats' list, you MUST select one of the provided aspect ratios. If the line says 'N/A' or is empty, you MUST use an empty string ("").
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
            validFormatsString: z.string(), // Simplified to string
            bestPractices: z.string().optional(),
            userHint: z.string().optional(), // Added user hint
        })
    },
    output: { schema: PlanItemSchema },
    prompt: `You are an expert direct response copywriter and AI prompt engineer. Your task is to regenerate ONE actionable, ready-to-use content package for a specific marketing channel, based on a provided brand identity, a specific strategic stage, and a user's hint for changes.

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

**Valid Formats for '{{channel}}'**:
{{{validFormatsString}}}

**USER HINT FOR REGENERATION (Crucial):**
"{{#if userHint}}{{userHint}}{{else}}No specific hint provided. Regenerate the item to be fresh and different.{{/if}}"

**Your Specific Task:**

Based on all the context above, and prioritizing the user's hint, generate ONE NEW, DIFFERENT content package for the **'{{channel}}' channel**, for the **'{{stageName}}'** stage of the campaign.

This content package MUST contain:
1.  **offering_id**: '{{offering.id}}'.
2.  **user_channel_settings**: { "channel_name": '{{channel}}' }.
3.  **media_format**: Suggest a NEW, DIFFERENT format from the 'Valid Formats' list.
4.  **aspect_ratio**: From the SAME LINE as your chosen media_format, select one of the provided aspect ratios. If it says 'N/A', you MUST use an empty string ("").
5.  **copy**: Write NEW, DIFFERENT, compelling ad copy that embodies the brand's tone of voice and follows the user's hint.
6.  **hashtags**: A NEW, DIFFERENT space-separated list of 5-10 relevant hashtags.
7.  **creative_prompt**: A NEW, DIFFERENT, detailed prompt for an AI image/video generator that aligns with the user's hint.
8.  **stage_name**: '{{stageName}}'.
9.  **objective**: **Generate a NEW, specific goal for this content piece**, guided by the user's hint.
10. **concept**: **Generate a NEW, specific concept for this content piece**, guided by the user's hint.
11. **suggested_post_at**: Suggest an ideal post date/time in ISO 8601 format (e.g., '2025-10-26T14:30:00Z').

Generate this single content package in the **{{primaryLanguage}}** language. Return the result as a single JSON object.`,
});

const getValidFormatsAsString = (channel: string): string => {
    const channelLower = channel.toLowerCase();
    const categories = mediaFormatConfig
        .map(category => ({
            ...category,
            formats: category.formats.filter(format => format.channels.includes(channelLower))
        }))
        .filter(category => category.formats.length > 0);

    let formatString = '';
    categories.forEach(category => {
        category.formats.forEach(format => {
            const ratios = format.aspect_ratios.length > 0 ? format.aspect_ratios.map(r => r.value).join(', ') : 'N/A';
            formatString += `- ${format.value} (aspect_ratios: ${ratios})\n`;
        });
    });
    return formatString.trim();
};


const generateMediaPlanFlow = ai.defineFlow(
  {
    name: 'generateMediaPlanFlow',
    inputSchema: GenerateMediaPlanInputSchema,
    outputSchema: GenerateMediaPlanOutputSchema,
  },
  async ({ funnelId, startDate, endDate, channels: requestedChannels, language: campaignLanguage }) => {
    console.log('[FLOW_START] generateMediaPlanFlow initiated.');
    console.log(`[INPUT] Funnel ID: ${funnelId}, Start: ${startDate}, End: ${endDate}, Channels: ${requestedChannels?.join(', ')}, Language: ${campaignLanguage}`);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[AUTH_ERROR] User not authenticated.');
      throw new Error('User not authenticated.');
    }
    console.log(`[AUTH] User authenticated: ${user.id}`);

    // Fetch all required data in parallel
    console.log('[FETCH] Fetching all required data from Supabase...');
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
    console.log('[FETCH_SUCCESS] All data fetched.');

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
    if (!strategy.offerings) throw new Error('The selected strategy is not linked to a valid offering.');
    if (channelSettingsError) throw new Error('Could not fetch channel settings.');
    if (adaptedHooksError || !adaptedHooks || adaptedHooks.length === 0) {
        throw new Error('No adapted viral hooks found. Please generate a Top 10 strategy from the Viral Hooks Library first.');
    }
    console.log('[DATA_VALIDATION] All required data is present.');
    
    const strategyBrief = strategy.strategy_brief as unknown as GenerateFunnelOutput;
    const channels = requestedChannels || [];
    const offering = strategy.offerings;

    if (channels.length === 0) {
      console.error('[CONFIG_ERROR] No channels were selected.');
      throw new Error('No channels were selected for this media plan.');
    }

    const channelSettingsMap = new Map(channelSettings.map(s => [s.channel_name, s.best_practices]));

    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));
    const primaryLanguage = languageNames.get(profile.primary_language) || profile.primary_language;
    const secondaryLanguage = profile.secondary_language ? languageNames.get(profile.secondary_language) : undefined;
    const isEvent = offering.type === 'Event';
    console.log(`[PREP] Languages prepared: Primary=${primaryLanguage}, Campaign=${campaignLanguage}`);

    // Create a parallel generation task for each channel
    console.log(`[AI_CALL_PREP] Preparing to call AI for ${channels.length} channels.`);
    const channelPromises = channels.map(channel => {
        const validFormatsString = getValidFormatsAsString(channel);
        
        console.log(`[AI_CALL_PREP] Channel: ${channel}`);
        console.log(`[AI_CALL_PREP] Valid Formats for ${channel}:`, validFormatsString);

        const bestPractices = channelSettingsMap.get(channel) || 'No specific best practices provided.';
        
        return generateChannelPlanPrompt({
            primaryLanguage,
            secondaryLanguage,
            campaignLanguage: languageNames.get(campaignLanguage || profile.primary_language) || campaignLanguage || primaryLanguage,
            brandHeart,
            offering,
            isEvent,
            strategy,
            topAdaptedHooks: adaptedHooks,
            channel,
            validFormatsString,
            bestPractices,
            startDate,
            endDate,
        }).then(result => {
            console.log(`[AI_RESPONSE] Received response for channel: ${channel}`);
            if (!result.output?.plan) {
                console.warn(`[AI_RESPONSE_WARN] No plan generated for channel: ${channel}`);
            }
            return result.output?.plan || [];
        })
    });

    const allChannelPlans = await Promise.all(channelPromises);
    const finalPlan = allChannelPlans.flat();
    console.log(`[AGGREGATION] All channel plans aggregated. Total items: ${finalPlan.length}`);

    if (finalPlan.length === 0) {
      console.error('[FLOW_ERROR] The AI model did not return a response for any channel.');
      throw new Error('The AI model did not return a response for any channel.');
    }

    console.log('[FLOW_SUCCESS] generateMediaPlanFlow completed successfully.');
    return { plan: finalPlan };
  }
);

const regeneratePlanItemFlow = ai.defineFlow(
    {
        name: 'regeneratePlanItemFlow',
        inputSchema: RegeneratePlanItemInputSchema,
        outputSchema: PlanItemSchema,
    },
    async ({ funnelId, channel, stageName, userHint }) => {
        console.log('[FLOW_START] regeneratePlanItemFlow initiated.');
        console.log(`[INPUT] Funnel ID: ${funnelId}, Channel: ${channel}, Stage: ${stageName}, Hint: ${userHint}`);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('[AUTH_ERROR] User not authenticated.');
            throw new Error('User not authenticated.');
        }
        console.log(`[AUTH] User authenticated: ${user.id}`);

        console.log('[FETCH] Fetching all required data from Supabase for regeneration...');
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
        console.log('[FETCH_SUCCESS] All data fetched for regeneration.');

        if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
        if (profileError || !profile) throw new Error('User profile not found.');
        if (strategyError || !strategy) throw new Error('Could not fetch the specified strategy.');
        if (!strategy.offerings) throw new Error('Strategy not linked to a valid offering.');
        if (channelSettingError) console.warn(`No best practices found for channel: ${channel}`);
        console.log('[DATA_VALIDATION] All required data for regeneration is present.');

        const languages = await import('@/lib/languages');
        const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));
        const primaryLanguage = languageNames.get(profile.primary_language) || profile.primary_language;
        
        const validFormatsString = getValidFormatsAsString(channel);
        
        console.log(`[AI_CALL_PREP] Valid Formats for ${channel}:`, validFormatsString);

        const bestPractices = channelSetting?.best_practices || 'No specific best practices provided.';

        console.log('[AI_CALL] Calling regeneratePlanItemPrompt...');
        const { output } = await regeneratePlanItemPrompt({
            primaryLanguage,
            brandHeart,
            offering: strategy.offerings,
            channel,
            stageName,
            validFormatsString,
            bestPractices,
            userHint,
        });

        if (!output) {
          console.error('[FLOW_ERROR] The AI model did not return a response for regeneration.');
          throw new Error('The AI model did not return a response.');
        }

        console.log('[AI_RESPONSE] Received response for regeneration:', output);
        console.log('[FLOW_SUCCESS] regeneratePlanItemFlow completed successfully.');
        return output;
    }
);

export async function generateMediaPlanForStrategy(input: GenerateMediaPlanInput): Promise<GenerateMediaPlanOutput> {
    return generateMediaPlanFlow(input);
}

export async function regeneratePlanItem(input: RegeneratePlanItemInput): Promise<PlanItem> {
    return regeneratePlanItemFlow(input);
}
