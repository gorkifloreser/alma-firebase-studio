
'use server';

/**
 * @fileOverview A flow to generate a marketing funnel for a specific offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

const FunnelStepSchema = z.object({
    title: z.string().describe('The title or headline for this step (e.g., "Email 1: Welcome").'),
    content: z.string().describe('The body content for this step (landing page copy, email body, etc.).'),
});

const GenerateFunnelOutputSchema = z.object({
    primary: z.object({
        landingPage: FunnelStepSchema.describe('The content for the landing page.'),
        followUpSequence: z.array(FunnelStepSchema).describe('A 3-step follow-up sequence (e.g., for email or WhatsApp).'),
    }),
    secondary: z.object({
        landingPage: FunnelStepSchema.describe('The content for the landing page in the secondary language.'),
        followUpSequence: z.array(FunnelStepSchema).describe('A 3-step follow-up sequence in the secondary language.'),
    }).optional(),
});
export type GenerateFunnelOutput = z.infer<typeof GenerateFunnelOutputSchema>;


const GenerateFunnelInputSchema = z.object({
  offeringId: z.string(),
});
export type GenerateFunnelInput = z.infer<typeof GenerateFunnelInputSchema>;


const prompt = ai.definePrompt({
  name: 'generateFunnelPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          secondaryLanguage: z.string().optional(),
          brandHeart: z.any(),
          offering: z.any(),
      })
  },
  output: { schema: GenerateFunnelOutputSchema },
  prompt: `You are a world-class marketing strategist who specializes in creating authentic, "regenerative" marketing funnels. You do not use pressure tactics. Instead, you build connection and offer value.

Your task is to create a complete marketing funnel for a specific offering, based on the provided Brand Heart.

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

Generate the funnel content for the **{{primaryLanguage}}** language first.

1.  **Landing Page**: Create the copy for a high-converting, soulful landing page.
    -   **Title**: An engaging headline that captures the essence of the offering.
    -   **Content**: Body copy that explains the transformation or value the user will receive. It should align with the brand's tone of voice and values.

2.  **Follow-Up Sequence**: Create a 3-step follow-up sequence. This could be for email or WhatsApp. Each step should build on the last, nurture the relationship, and gently guide the user towards the offering.
    -   **Step 1**: A welcoming message that delivers initial value.
    -   **Step 2**: A message that addresses a potential pain point or desire and shows how the offering can help.
    -   **Step 3**: A final, gentle invitation to purchase or engage, highlighting the core benefit.

{{#if secondaryLanguage}}
Now, translate all the content you just created (Landing Page and Follow-Up Sequence) into **{{secondaryLanguage}}**. Ensure the translation is natural, culturally relevant, and maintains the original tone.
{{/if}}

Return the entire result in the specified JSON format.`,
});


const generateFunnelFlow = ai.defineFlow(
  {
    name: 'generateFunnelFlow',
    inputSchema: GenerateFunnelInputSchema,
    outputSchema: GenerateFunnelOutputSchema,
  },
  async ({ offeringId }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

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

export async function generateFunnel(input: GenerateFunnelInput): Promise<GenerateFunnelOutput> {
    return generateFunnelFlow(input);
}
