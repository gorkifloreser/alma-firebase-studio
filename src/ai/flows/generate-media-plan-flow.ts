
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
  prompt: `You are a holistic marketing strategist and media planner for conscious creators. Your task is to generate a 1-week content plan based on the user's brand identity and a specific strategic blueprint.

**Brand Heart (Brand Identity):**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Mission: {{brandHeart.mission.primary}}
- Values: {{brandHeart.values.primary}}

**The Strategy Blueprint to Execute:**
---
**Strategy for Offering: "{{strategy.offerings.title.primary}}" (Offering ID: {{strategy.offering_id}})**
- Goal: {{strategy.goal}}
- Channels: {{#each strategy.strategy_brief.channels}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

**Blueprint:**
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

**Your Task:**

Based on the provided strategy, break down the conceptual steps into a concrete and actionable 1-week media plan in the **{{primaryLanguage}}** language. Create 5-7 content ideas in total, distributing them across the specified channels.

For each content idea in the plan, you must:
1.  **Derive from a Conceptual Step:** Your idea must be a direct, tangible execution of one of the "Conceptual Steps" from the provided blueprint.
2.  **Specify Offering:** Use the offeringId from the strategy: '{{strategy.offering_id}}'.
3.  **Specify Channel:** Assign the content to one of the channels selected in the strategy (Social Media, Email, WhatsApp, Website).
4.  **Define Format:** Propose a specific format (e.g., '3-part Instagram carousel', 'Weekly newsletter', 'Short WhatsApp broadcast', 'Blog Post section').
5.  **Describe the Idea:** Write a brief 'description' of the content piece. For example: "A carousel that uses a relatable story to introduce the core problem the audience faces, ending with a question."

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
