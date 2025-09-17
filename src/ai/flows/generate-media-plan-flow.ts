
'use server';

/**
 * @fileOverview A flow to generate a holistic media plan based on offerings and their strategies.
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


const prompt = ai.definePrompt({
  name: 'generateMediaPlanPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          brandHeart: z.any(),
          strategies: z.array(z.any()), // Array of funnels/strategies
      })
  },
  output: { schema: GenerateMediaPlanOutputSchema },
  prompt: `You are a holistic marketing strategist and media planner for conscious creators. Your task is to generate a 1-week content plan based on the user's brand identity and their strategic blueprints.

**Brand Heart (Brand Identity):**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Mission: {{brandHeart.mission.primary}}
- Values: {{brandHeart.values.primary}}

**Active Strategies:**
{{#each strategies}}
---
**Strategy for Offering: "{{this.offerings.title.primary}}" (Offering ID: {{this.offering_id}})**
- Goal: {{this.goal}}
- Channels: {{#each this.strategy_brief.channels}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

**Blueprint:**
{{#each this.strategy_brief.strategy}}
- **Stage: {{this.stageName}}**
  - Objective: {{this.objective}}
  - Key Message: {{this.keyMessage}}
  - Conceptual Steps:
    {{#each this.conceptualSteps}}
    - Concept: {{this.concept}} (Objective: {{this.objective}})
    {{/each}}
{{/each}}
---
{{/each}}

**Your Task:**

Based on ALL the provided strategies, break down the conceptual steps into a concrete and actionable 1-week media plan in the **{{primaryLanguage}}** language. Create 5-7 content ideas in total.

For each content idea in the plan, you must:
1.  **Derive from a Conceptual Step:** Your idea must be a direct, tangible execution of one of the "Conceptual Steps" from the provided blueprints.
2.  **Specify Offering:** Clearly state the 'offeringId' the content is for.
3.  **Specify Channel:** Assign the content to one of the channels selected in its strategy (Social Media, Email, WhatsApp, Website).
4.  **Define Format:** Propose a specific format (e.g., '3-part Instagram carousel', 'Weekly newsletter', 'Short WhatsApp broadcast', 'Blog Post section').
5.  **Describe the Idea:** Write a brief 'description' of the content piece. For example: "A carousel that uses a relatable story to introduce the core problem the audience faces, ending with a question."

Return the result as a flat array of plan items in the specified JSON format. Ensure you provide the correct 'offeringId' for each plan item.`,
});


const generateMediaPlanFlow = ai.defineFlow(
  {
    name: 'generateMediaPlanFlow',
    outputSchema: GenerateMediaPlanOutputSchema,
  },
  async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    // Fetch Brand Heart, Profile, and all Funnels (Strategies) with their offerings
    const [
        { data: brandHeart, error: brandHeartError },
        { data: profile, error: profileError },
        { data: strategies, error: strategiesError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('primary_language').eq('id', user.id).single(),
        supabase.from('funnels').select(`
            *,
            offerings (id, title)
        `).eq('user_id', user.id),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (strategiesError) throw new Error('Could not fetch strategies.');
    if (!strategies || strategies.length === 0) throw new Error('No active strategies found. Please create a strategy first.');


    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));

    const { output } = await prompt({
        primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
        brandHeart,
        strategies: strategies.filter(s => s.offerings), // Only include strategies with a valid offering
    });
    
    if (!output) {
      throw new Error('The AI model did not return a response.');
    }

    return output;
  }
);


export async function generateMediaPlan(): Promise<GenerateMediaPlanOutput> {
    return generateMediaPlanFlow();
}
