'use server';

/**
 * @fileOverview A flow to adapt value strategies to a specific brand identity.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getBrandHeart } from '@/app/brand-heart/actions';
import { getValueStrategies, type ValueStrategy } from '@/app/funnels/actions';
import { createClient } from '@/lib/supabase/server';

const AdaptedStrategySchema = z.object({
  original_id: z.number().describe('The ID of the original strategy.'),
  original_method: z.string().describe('The original content method name.'),
  relevance_score: z.number().min(1).max(10).describe('A score from 1-10 indicating how well this strategy aligns with the brand’s voice and offerings.'),
  adapted_method: z.string().describe("The content method, rewritten to be more specific and on-brand."),
  strategy: z.string().describe("A brief, actionable content idea of how the brand can apply this adapted method for a specific offering."),
  visual_prompt: z.string().describe("A detailed, ready-to-use prompt for an AI image generator that captures the essence of the content idea, aligned with the brand's visual identity.")
});

export type AdaptedStrategy = z.infer<typeof AdaptedStrategySchema>;

const AdaptStrategiesOutputSchema = z.object({
  topStrategies: z.array(AdaptedStrategySchema).describe('An array of the top 10 value strategies, adapted for the brand.'),
});

const adapterPrompt = ai.definePrompt({
    name: 'valueStrategyAdapterPrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            valueStrategies: z.array(z.any()),
        })
    },
    output: { schema: AdaptStrategiesOutputSchema },
    prompt: `You are a master content strategist for conscious, purpose-driven brands.

Your mission is to analyze a list of generic value content strategies and transform the top 10 into bespoke, highly-relevant content ideas for a specific brand.

**BRAND IDENTITY (The "Who"):**
- **Tone of Voice:** {{brandHeart.tone_of_voice.primary}}
- **Values:** {{brandHeart.values.primary}}
- **Mission:** {{brandHeart.mission.primary}}
- **Visual Identity:** {{brandHeart.visual_identity.primary}}

**LIST OF GENERIC VALUE STRATEGIES:**
{{#each valueStrategies}}
- ID: {{this.id}}, Method: "{{this.content_method}}", Purpose: "{{this.value_purpose}}"
{{/each}}

**YOUR THREE-STEP MISSION:**

**Step 1: Analyze & Rank**
Mentally evaluate all the strategies. For each one, determine a 'relevance_score' (how well its purpose and method align with the brand's soul and likely offerings).

**Step 2: Select the Top 10**
Identify the 10 strategies with the highest relevance scores. These are the ones you will adapt.

**Step 3: Adapt and Strategize for the Top 10**
For each of the 10 selected strategies, you must generate a complete strategic package with the following fields:
1.  **original_id**: The ID of the original strategy.
2.  **original_method**: The original, generic method name.
3.  **relevance_score**: Your calculated relevance score from 1-10.
4.  **adapted_method**: Rewrite the content method name to be more specific and embody the brand's unique **Tone of Voice**. It should sound like a content format the brand would create. (e.g., "Mini-Tutorial" might become "60-Second Soulful Software Tip").
5.  **strategy**: Create a brief, 1-2 sentence actionable content idea. How can the brand apply this method to tell a story or share knowledge about one of their potential offerings? Make it specific.
6.  **visual_prompt**: Write a detailed, rich prompt for an AI image generator (like Midjourney). This prompt MUST be inspired by the content idea and deeply aligned with the brand's **Visual Identity**.

Your final output must be a JSON object containing a 'topStrategies' array with exactly 10 items, each containing all the fields described above.`,
});

export const adaptAndSaveValueStrategies = ai.defineFlow(
  {
    name: 'adaptAndSaveValueStrategiesFlow',
    outputSchema: AdaptStrategiesOutputSchema,
  },
  async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const [brandHeart, valueStrategies] = await Promise.all([
        getBrandHeart(),
        getValueStrategies(),
    ]);
    
    if (!brandHeart) {
        throw new Error('Brand Heart not found. Please define your brand heart first.');
    }
     if (!valueStrategies || valueStrategies.length === 0) {
        throw new Error('No value strategies found in the database.');
    }
    
    const { output } = await adapterPrompt({ brandHeart, valueStrategies });

    if (!output?.topStrategies) {
      throw new Error('The AI model did not return a response for the adaptation task.');
    }

    // Delete old adapted strategies for the user
    const { error: deleteError } = await supabase
        .from('adapted_value_strategies')
        .delete()
        .eq('user_id', user.id);
    
    if (deleteError) {
        console.error("Error deleting old adapted value strategies:", deleteError);
        throw new Error("Could not clear old strategy data.");
    }
    
    // Save the new ones
    const recordsToInsert = output.topStrategies.map(strategy => ({
        ...strategy,
        user_id: user.id
    }));

    const { error: insertError } = await supabase
        .from('adapted_value_strategies')
        .insert(recordsToInsert);

    if (insertError) {
        console.error("Error inserting new adapted value strategies:", insertError);
        throw new Error("Could not save the new AI-generated value strategy.");
    }

    return output;
  }
);
