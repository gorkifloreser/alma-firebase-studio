
'use server';

/**
 * @fileOverview An AI flow to rewrite a social media post based on suggestions.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const RewritePostInputSchema = z.object({
  originalText: z.string().describe('The original text of the social media post.'),
  suggestions: z.array(z.string()).describe('A list of actionable suggestions for improvement.'),
});
export type RewritePostInput = z.infer<typeof RewritePostInputSchema>;

const RewritePostOutputSchema = z.object({
  rewrittenText: z.string().describe('The rewritten and improved version of the social media post.'),
});
export type RewritePostOutput = z.infer<typeof RewritePostOutputSchema>;


const rewritePrompt = ai.definePrompt({
    name: 'rewritePostPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
    input: {
        schema: z.object({
            originalText: z.string(),
            suggestions: z.array(z.string()),
            brandHeart: z.any(),
        })
    },
    output: { schema: RewritePostOutputSchema },
    prompt: `You are an expert copy editor and social media strategist. Your task is to rewrite a social media post to incorporate a list of suggestions, while strictly maintaining the brand's original tone of voice.

---
**1. Brand's Tone of Voice (Your North Star):**
"{{brandHeart.tone_of_voice.primary}}"
---
**2. Original Post Text:**
"{{originalText}}"
---
**3. Suggestions for Improvement:**
{{#each suggestions}}
- {{this}}
{{/each}}
---

**YOUR TASK:**
Rewrite the "Original Post Text" to seamlessly integrate all the "Suggestions for Improvement".

**CRITICAL RULES:**
- The rewritten post MUST embody the brand's **Tone of Voice**. Do not make it sound generic or robotic.
- Do not just append the suggestions. Weave them naturally into the original post's structure and message.
- The final output should be only the rewritten post text.

Return the rewritten text in the specified JSON format.
`,
});

export const rewritePostFlow = ai.defineFlow(
  {
    name: 'rewritePostFlow',
    inputSchema: RewritePostInputSchema,
    outputSchema: RewritePostOutputSchema,
  },
  async ({ originalText, suggestions }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data: brandHeart, error: brandHeartError } = await supabase
      .from('brand_hearts')
      .select('tone_of_voice')
      .eq('user_id', user.id)
      .single();

    if (brandHeartError || !brandHeart) {
      throw new Error('Brand Heart not found. Tone of voice is required for rewriting.');
    }
    
    const { output } = await rewritePrompt({ originalText, suggestions, brandHeart });

    if (!output) {
      throw new Error('The AI model did not return a rewritten post.');
    }

    return output;
  }
);

export async function rewritePost(input: RewritePostInput): Promise<RewritePostOutput> {
    return rewritePostFlow(input);
}
