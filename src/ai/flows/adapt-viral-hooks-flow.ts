
'use server';

/**
 * @fileOverview A flow to rank viral hooks and adapt the top 10 to a specific brand identity.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getBrandHeart, BrandHeartData } from '@/app/brand-heart/actions';
import { getViralHooks, type ViralHook } from '@/app/viral-hooks/actions';
import { createClient } from '@/lib/supabase/server';


const AdaptedHookSchema = z.object({
  original_id: z.number().describe('The ID of the original hook.'),
  original_text: z.string().describe('The original text of the hook.'),
  category: z.string().describe('The category of the hook.'),
  relevance_score: z.number().min(1).max(10).describe('A score from 1-10 indicating how well the hook aligns with the brand\'s voice and values.'),
  virality_score: z.number().min(1).max(10).describe('A score from 1-10 indicating the hook\'s general potential to go viral.'),
  adapted_hook: z.string().describe("The hook's text, rewritten to perfectly match the brand's specific tone of voice."),
  strategy: z.string().describe("A brief, actionable storytelling strategy for how to turn this hook into a piece of content that is relatable and provides value."),
  visual_prompt: z.string().describe("A detailed, ready-to-use prompt for an AI image generator (like Midjourney or DALL-E) that captures the essence of the hook, aligned with the brand's visual identity.")
});

export type AdaptedHook = z.infer<typeof AdaptedHookSchema>;

const AdaptHooksOutputSchema = z.object({
  topHooks: z.array(AdaptedHookSchema).describe('An array of the top 10 viral hooks, adapted for the brand.'),
});


const adapterPrompt = ai.definePrompt({
    name: 'viralHookAdapterPrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            viralHooks: z.array(z.any()),
        })
    },
    output: { schema: AdaptHooksOutputSchema },
    prompt: `You are a world-class viral marketing strategist and creative director for conscious, soulful brands.

Your task is to analyze a list of generic viral hooks and transform the top 10 into bespoke, strategic content ideas that perfectly match a specific brand's identity.

**BRAND IDENTITY (The "Who"):**
- **Tone of Voice:** {{brandHeart.tone_of_voice.primary}}
- **Values:** {{brandHeart.values.primary}}
- **Mission:** {{brandHeart.mission.primary}}
- **Visual Identity:** {{brandHeart.visual_identity.primary}}

**LIST OF GENERIC VIRAL HOOKS:**
{{#each viralHooks}}
- ID: {{this.id}}, Text: "{{this.hook_text}}", Category: "{{this.category}}"
{{/each}}

**YOUR THREE-STEP MISSION:**

**Step 1: Analyze & Rank**
Mentally evaluate all the hooks. For each one, determine a 'relevance_score' (how well it fits the brand's soul) and a 'virality_score' (its raw attention-grabbing power).

**Step 2: Select the Top 10**
Identify the 10 hooks with the best combined scores for relevance and virality. These are the hooks you will adapt.

**Step 3: Adapt and Strategize for the Top 10**
For each of the 10 selected hooks, you must generate a complete strategic package with the following fields:
1.  **original_id**: The ID of the original hook.
2.  **original_text**: The original, generic text of the hook.
3.  **category**: The original category of the hook.
4.  **relevance_score**: Your calculated score from 1-10.
5.  **virality_score**: Your calculated score from 1-10.
6.  **adapted_hook**: Rewrite the hook text. It MUST perfectly embody the brand's unique **Tone of Voice**. It should sound like the brand wrote it, not a generic template.
7.  **strategy**: Create a brief, 1-2 sentence storytelling strategy. How can the brand use this hook to tell a story that connects with their audience and provides value? Make it actionable.
8.  **visual_prompt**: Write a detailed, rich prompt for an AI image generator. This prompt MUST be inspired by the hook's story and be deeply aligned with the brand's **Visual Identity**.

Your final output must be a JSON object containing a 'topHooks' array with exactly 10 items, each containing all the fields described above.`,
});


export const adaptAndSaveViralHooks = ai.defineFlow(
  {
    name: 'adaptAndSaveViralHooksFlow',
    outputSchema: AdaptHooksOutputSchema,
  },
  async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const [brandHeart, viralHooks] = await Promise.all([
        getBrandHeart(),
        getViralHooks(),
    ]);
    
    if (!brandHeart) {
        throw new Error('Brand Heart not found. Please define your brand heart first.');
    }
     if (!viralHooks || viralHooks.length === 0) {
        throw new Error('No viral hooks found in the database.');
    }
    
    const { output } = await adapterPrompt({ brandHeart, viralHooks });

    if (!output?.topHooks) {
      throw new Error('The AI model did not return a response for the adaptation task.');
    }

    // Delete old adapted hooks for the user
    const { error: deleteError } = await supabase
        .from('adapted_viral_hooks')
        .delete()
        .eq('user_id', user.id);
    
    if (deleteError) {
        console.error("Error deleting old adapted hooks:", deleteError);
        throw new Error("Could not clear old strategy data.");
    }
    
    // Save the new ones
    const recordsToInsert = output.topHooks.map(hook => ({
        ...hook,
        user_id: user.id
    }));

    const { error: insertError } = await supabase
        .from('adapted_viral_hooks')
        .insert(recordsToInsert);

    if (insertError) {
        console.error("Error inserting new adapted hooks:", insertError);
        throw new Error("Could not save the new AI-generated strategy.");
    }

    return output;
  }
);
