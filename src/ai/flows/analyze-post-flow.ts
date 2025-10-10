
'use server';

/**
 * @fileOverview An AI flow to analyze a social media post against audience personas
 * and provide actionable suggestions for improvement.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const SuggestionSchema = z.object({
  type: z.enum(['tone', 'content', 'clarity', 'engagement', 'cta']).describe('The category of the suggestion.'),
  suggestion: z.string().describe('A concrete, actionable suggestion to improve the post.'),
  reasoning: z.string().describe("A brief explanation of why this suggestion is being made, referencing the audience's characteristics."),
});

const AnalyzePostOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('A list of 1-3 suggestions to improve the post.'),
  overall_feedback: z.string().describe("A brief, encouraging summary of the post's strengths and areas for improvement."),
});

const AnalyzePostInputSchema = z.object({
  postText: z.string(),
});
export type AnalyzePostInput = z.infer<typeof AnalyzePostInputSchema>;
export type PostSuggestion = z.infer<typeof SuggestionSchema>;


const analysisPrompt = ai.definePrompt({
    name: 'analyzePostPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-flash'),
    input: {
        schema: z.object({
            postText: z.string(),
            brandHeart: z.any(),
        })
    },
    output: { schema: AnalyzePostOutputSchema },
    prompt: `You are an expert social media strategist and copy editor with a deep understanding of empathetic, audience-centric communication.

**Your Goal:** Analyze the provided social media post text and give 1-3 actionable suggestions for improvement based on how well it aligns with the brand's target audience personas.

---
**1. The Brand's Audience Personas (Your Primary Focus):**
{{#each brandHeart.audience}}
- **Persona: {{this.title}}**
  - **Profile:** {{this.content}}
{{/each}}
---
**2. The Social Media Post to Analyze:**
"{{postText}}"
---

**YOUR TASK:**

1.  **Analyze Alignment:** Carefully read the post and compare its tone, language, and message against the goals, pain points, and values of the audience personas.
2.  **Generate Suggestions:** Based on your analysis, provide 1-3 concrete, actionable suggestions for improving the post. For each suggestion, specify the 'type' and provide a clear 'reasoning' that connects it back to a specific audience persona.
    *   **Types**: 'tone', 'content', 'clarity', 'engagement', 'cta'.
    *   **Good Suggestion Example**: "Change 'Book a call' to 'Schedule a free clarity call'. This wording is less transactional and aligns better with Holistic Helen's goal of finding gentle guidance."
3.  **Provide Overall Feedback:** Write a brief, encouraging summary (1-2 sentences) of what the post does well and its main opportunity for improvement.

Return the result in the specified JSON format.
`,
});

export const analyzePostFlow = ai.defineFlow(
  {
    name: 'analyzePostFlow',
    inputSchema: AnalyzePostInputSchema,
    outputSchema: AnalyzePostOutputSchema,
  },
  async ({ postText }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data: brandHeart, error: brandHeartError } = await supabase
      .from('brand_hearts')
      .select('audience')
      .eq('user_id', user.id)
      .single();

    if (brandHeartError || !brandHeart || !brandHeart.audience || brandHeart.audience.length === 0) {
      throw new Error('Audience personas not found. Please define at least one audience profile in your Brand Heart.');
    }
    
    const { output } = await analysisPrompt({ postText, brandHeart });

    if (!output) {
      throw new Error('The AI model did not return an analysis.');
    }

    return output;
  }
);

export async function analyzePost(input: AnalyzePostInput) {
    return analyzePostFlow(input);
}
