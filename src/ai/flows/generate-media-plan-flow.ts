
'use server';

/**
 * @fileOverview A flow to generate a holistic media plan based on a specific strategy.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';


const PlanItemSchema = z.object({
  offeringId: z.string().describe("The ID of the offering this content is for."),
  channel: z.enum(["Social Media", "Email", "WhatsApp", "Website"]).describe("The channel this content is for."),
  format: z.string().describe("The format of the content (e.g., 'Instagram Carousel', 'Weekly Newsletter')."),
  description: z.string().describe("A brief description of the content idea, tied to a conceptual step in the strategy."),
});

const GenerateMediaPlanOutputSchema = z.object({
  plan: z.array(PlanItemSchema),
});
export type GenerateMediaPlanOutput = z.infer<typeof GenerateMediaPlanOutputSchema>;

const GenerateMediaPlanInputSchema = z.object({
  funnelId: z.string(),
});
export type GenerateMediaPlanInput = z.infer<typeof GenerateMediaPlanInputSchema>;


const prompt = ai.definePrompt({
  name: 'generateMediaPlanPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          brandHeart: z.any(),
          strategy: z.any(),
      })
  },
  output: { schema: GenerateMediaPlanOutputSchema },
  prompt: `You are a world-class media planner who translates high-level strategy into an actionable content plan for conscious creators.

**The Strategy Blueprint to Execute:**
---
**Strategy for Offering: "{{strategy.offerings.title.primary}}" (Offering ID: {{strategy.offering_id}})**
- Goal: {{strategy.goal}}
- Selected Channels: {{#each strategy.strategy_brief.channels}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

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
---

**Your Task:**

Your job is to create a comprehensive, 1-week media plan. For **EACH stage** of the blueprint, you must generate at least one concrete content idea for **EACH of the selected channels**.

For each content idea in the plan, you must:
1.  **Specify Offering:** Use the offeringId from the strategy: '{{strategy.offering_id}}'.
2.  **Specify Channel:** Assign the content to one of the channels selected in the strategy (Social Media, Email, WhatsApp, Website).
3.  **Define Format:** Propose a specific, tangible format (e.g., '3-part Instagram carousel about the origin story', 'Weekly newsletter announcing early-bird discount', 'Short WhatsApp broadcast sharing a customer quote', 'A new "How it Works" section on the website').
4.  **Describe the Idea:** Write a brief, compelling 'description' for the content piece that clearly executes one of the conceptual steps from the blueprint for that stage.
5.  **Ensure Full Coverage:** Double-check that every stage in the blueprint has a corresponding content idea for every channel listed in the strategy.

Generate this entire plan in the **{{primaryLanguage}}** language.

Return the result as a flat array of plan items in the specified JSON format. Ensure you provide the correct 'offeringId' for each plan item.`,
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


    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));

    const { output } = await prompt({
        primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
        brandHeart,
        strategy,
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
