
'use server';

/**
 * @fileOverview A flow to generate marketing content for a specific offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

// Define schemas for structured output
const ContentSchema = z.object({
    primary: z.string().describe('The marketing content in the primary language.'),
    secondary: z.string().optional().describe('The marketing content in the secondary language.'),
});

const GenerateContentOutputSchema = z.object({
    content: ContentSchema,
});
export type GenerateContentOutput = z.infer<typeof GenerateContentOutputSchema>;


// Define the input schema for the flow
const GenerateContentInputSchema = z.object({
  offeringId: z.string(),
});
export type GenerateContentInput = z.infer<typeof GenerateContentInputSchema>;


const prompt = ai.definePrompt({
  name: 'generateContentPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          secondaryLanguage: z.string().optional(),
          brandHeart: z.any(),
          offering: z.any(),
      })
  },
  output: { schema: GenerateContentOutputSchema },
  prompt: `You are an expert marketing copywriter for conscious creators. Your task is to generate a social media post based on the user's brand identity and a specific offering.

**Brand Heart (Brand Identity):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Mission: {{brandHeart.mission.primary}}
- Vision: {{brandHeart.vision.primary}}
- Values: {{brandHeart.values.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**Offering Details:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.price}}
- Price: {{offering.price}} {{offering.currency}}
{{/if}}
{{#if offering.contextual_notes}}
- Important Contextual Notes for this campaign: {{offering.contextual_notes}}
{{/if}}

**Your Task:**

1.  Write an engaging and authentic social media post in the **{{primaryLanguage}}** language that promotes the offering.
    - Embody the brand's tone of voice and values.
    - Clearly communicate the value of the offering.
    - End with a clear call to action.
    - Ensure the output is only the text for the social media post.

{{#if secondaryLanguage}}
2.  Translate the post you just created into **{{secondaryLanguage}}**. Ensure the translation is natural and culturally relevant.
{{/if}}

Return the result in the specified JSON format.`,
});


const generateContentFlow = ai.defineFlow(
  {
    name: 'generateContentFlow',
    inputSchema: GenerateContentInputSchema,
    outputSchema: GenerateContentOutputSchema,
  },
  async ({ offeringId }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    // Fetch Brand Heart, Profile, Offering
    const [
        { data: brandHeart, error: brandHeartError },
        { data: profile, error: profileError },
        { data: offering, error: offeringError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('primary_language, secondary_language').eq('id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');

    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));

    const { output } = await prompt({
        primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
        secondaryLanguage: profile.secondary_language ? languageNames.get(profile.secondary_language) : undefined,
        brandHeart,
        offering,
    });
    
    if (!output) {
      throw new Error('The AI model did not return a response.');
    }

    return output;
  }
);

// Export a server action that wraps the flow
export async function generateContentForOffering(input: GenerateContentInput): Promise<GenerateContentOutput> {
    return generateContentFlow(input);
}
