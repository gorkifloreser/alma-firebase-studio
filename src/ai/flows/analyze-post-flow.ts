
'use server';

/**
 * @fileOverview An AI flow to analyze a social media post against audience personas
 * and provide actionable suggestions for improvement, including scores and structured feedback.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// New schemas for structured feedback
const PointSchema = z.object({
  point: z.string().describe("A single, concise point about the post's strength or weakness."),
});

const StrengthSchema = PointSchema;
const SuggestionSchema = PointSchema;

const AnalyzePostOutputSchema = z.object({
  overall_score: z.number().min(1).max(10).describe("A score from 1-10 evaluating the post's overall effectiveness based on the criteria."),
  strengths: z.array(StrengthSchema).describe("A list of 2-3 things the post does well, each with a checkmark icon."),
  suggestions: z.array(SuggestionSchema).describe("A list of 2-3 actionable suggestions for improvement, each with a warning or info icon."),
  reasoning: z.string().describe("A brief, encouraging summary explaining the scores and main opportunities."),
});

export type PostAnalysis = z.infer<typeof AnalyzePostOutputSchema>;

const AnalyzePostInputSchema = z.object({
  postText: z.string(),
  hashtags: z.string().optional(),
});
export type AnalyzePostInput = z.infer<typeof AnalyzePostInputSchema>;


const analysisPrompt = ai.definePrompt({
    name: 'analyzePostPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-flash'),
    input: {
        schema: z.object({
            postText: z.string(),
            hashtags: z.string().optional(),
            brandHeart: z.any(),
        })
    },
    output: { schema: AnalyzePostOutputSchema },
    prompt: `You are an expert social media strategist specializing in organic growth for conscious brands.

Your Goal: Analyze the provided social media post based on four core pillars: Audience Attention, Virality Potential, Content Value, and Hashtag Quality. Provide a score, strengths, and actionable suggestions.

---
**1. The Brand's Audience Personas (Your Primary Focus):**
{{#each brandHeart.audience}}
- **Persona: {{this.title}}**
  - **Profile:** {{this.content}}
{{/each}}
---
**2. The Social Media Post to Analyze:**
- **Post Copy:** "{{postText}}"
- **Hashtags:** "{{hashtags}}"
---

**YOUR TASK:**

Evaluate the post against the following four pillars and then formulate your response.

**Pillar 1: Audience Attention (Reach)**
- Does the opening line immediately grab the attention of the target audience?
- Does it speak directly to their known pain points or aspirations?

**Pillar 2: Virality Potential (Hook)**
- Does the post have a strong "hook"? Is it controversial, surprising, relatable, or exceptionally valuable?
- Does it encourage sharing or saving?

**Pillar 3: Content Value**
- Does the post deliver on its initial promise?
- Does it teach, inspire, entertain, or build trust in a meaningful way?
- Is there a clear takeaway for the reader?

**Pillar 4: Hashtag Quality**
- Are the hashtags relevant to the content and the target audience?
- Is there a good mix of broad, niche, and community-specific hashtags?
- Is the quantity appropriate (not too few, not too many)?

**Now, construct your response in the specified JSON format:**

1.  **overall_score**: Assign a score from 1 to 10. A 10 means it's a perfect post that excels in all four pillars. A 1 means it has significant issues.
2.  **strengths**: List 2-3 specific things the post does well. These should be positive, concrete points. (e.g., "The hook is highly relatable to 'Holistic Helen's' journey.").
3.  **suggestions**: List 2-3 actionable, concrete suggestions for improvement. These should be constructive and easy to implement. (e.g., "Add a specific question at the end to boost engagement.", "Replace #love with a more niche hashtag like #cacaoceremony.").
4.  **reasoning**: Write a brief (2-3 sentences) encouraging summary that explains your scoring and highlights the biggest opportunity for growth.
`,
});

export const analyzePostFlow = ai.defineFlow(
  {
    name: 'analyzePostFlow',
    inputSchema: AnalyzePostInputSchema,
    outputSchema: AnalyzePostOutputSchema,
  },
  async ({ postText, hashtags }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data: brandHeart, error: brandHeartError } = await supabase
      .from('brand_hearts')
      .select('audience')
      .eq('user_id', user.id)
      .single();

    if (brandHeartError || !brandHeart || !brandHeart.audience || (Array.isArray(brandHeart.audience) && brandHeart.audience.length === 0)) {
      throw new Error('Audience personas not found. Please define at least one audience profile in your Brand Heart.');
    }
    
    const { output } = await analysisPrompt({ postText, hashtags, brandHeart });

    if (!output) {
      throw new Error('The AI model did not return an analysis.');
    }

    return output;
  }
);

export async function analyzePost(input: AnalyzePostInput): Promise<PostAnalysis> {
    return analyzePostFlow(input);
}
