
'use server';

/**
 * @fileOverview An AI flow to rank a list of viral hooks based on a brand's identity.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ViralHook } from '@/app/viral-hooks/actions';
import type { BrandHeartData } from '@/app/brand-heart/actions';

// Input schema for the flow
const RankHooksInputSchema = z.object({
  brandHeart: z.any().describe('The user\'s brand heart data, including tone, values, etc.'),
  viralHooks: z.array(z.any()).describe('A list of viral hook objects to be ranked.'),
});

// Zod schema for a single ranked hook in the output
const RankedHookSchema = z.object({
    id: z.number().describe('The original ID of the hook.'),
    relevance_score: z.number().min(1).max(10).describe('A score from 1-10 indicating how well the hook aligns with the brand\'s voice and values.'),
    virality_score: z.number().min(1).max(10).describe('A score from 1-10 indicating the hook\'s general potential to go viral.'),
    justification: z.string().describe('A brief, one-sentence justification for the assigned scores, from the perspective of a marketing expert.'),
});
export type RankedHook = z.infer<typeof RankedHookSchema>;

// Output schema for the flow
const RankHooksOutputSchema = z.object({
  rankedHooks: z.array(RankedHookSchema).describe('The list of hooks, each with its new ranking scores and justification.'),
});

const rankerPrompt = ai.definePrompt({
  name: 'viralHookRankerPrompt',
  input: { schema: RankHooksInputSchema },
  output: { schema: RankHooksOutputSchema },
  prompt: `You are an expert marketing strategist and social media analyst. Your task is to analyze a list of viral hooks and rank them based on their suitability for a specific brand.

**BRAND IDENTITY (The "Who"):**
- **Tone of Voice:** {{brandHeart.tone_of_voice.primary}}
- **Values:** {{brandHeart.values.primary}}
- **Brand Brief:** {{brandHeart.brand_brief.primary}}
- **Mission:** {{brandHeart.mission.primary}}

**LIST OF VIRAL HOOKS TO ANALYZE:**
{{#each viralHooks}}
- ID: {{this.id}}, Text: "{{this.hook_text}}" (Category: {{this.category}})
{{/each}}

**YOUR TASK:**
For each hook in the list, you must provide:
1.  **relevance_score (1-10):** How well does this hook align with the brand's specific tone, values, and mission? A score of 10 means it's a perfect match. A score of 1 means it's completely off-brand.
2.  **virality_score (1-10):** Regardless of the brand, how strong is this hook's general potential to go viral on platforms like TikTok or Instagram? A score of 10 is a guaranteed attention-grabber.
3.  **justification:** A very brief, one-sentence expert opinion explaining your reasoning for the scores.

**CRITICAL INSTRUCTIONS:**
- You MUST evaluate every single hook provided.
- Your output must be a JSON object containing a 'rankedHooks' array, where each object has 'id', 'relevance_score', 'virality_score', and 'justification'.

Analyze the hooks and return the ranked list in the specified JSON format.`,
});


export const rankViralHooks = ai.defineFlow(
  {
    name: 'rankViralHooksFlow',
    inputSchema: RankHooksInputSchema,
    outputSchema: RankHooksOutputSchema,
  },
  async ({ brandHeart, viralHooks }) => {
    
    if (!brandHeart || !viralHooks || viralHooks.length === 0) {
        throw new Error('Valid Brand Heart and a list of hooks are required for ranking.');
    }
    
    const { output } = await rankerPrompt({ brandHeart, viralHooks });

    if (!output) {
      throw new Error('The AI model did not return a response for the ranking task.');
    }

    return output;
  }
);
