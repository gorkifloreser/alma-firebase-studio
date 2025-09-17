
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
  funnelType: z.string().describe("The type of funnel to generate, based on a preset model. E.g., 'Lead Magnet', 'Direct Offer', 'Nurture & Convert', 'Onboarding & Habit'."),
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
          funnelType: z.string(),
          funnelModelExplanation: z.string(),
      })
  },
  output: { schema: GenerateFunnelOutputSchema },
  prompt: `You are a world-class marketing strategist who specializes in creating authentic, science-based marketing funnels. You do not use pressure tactics. Instead, you build connection and offer value.

Your task is to create a complete marketing funnel for a specific offering, based on the provided Brand Heart and a specific funnel model.

**Funnel Model to Use: {{funnelType}}**
This model's strategy is: {{funnelModelExplanation}}

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

Generate the funnel content for the **{{primaryLanguage}}** language first. Apply the principles of the **{{funnelType}}** model.

1.  **Landing Page**: Create the copy for a high-converting, soulful landing page.
    -   **Title**: An engaging headline that captures the essence of the offering and aligns with the funnel model.
    -   **Content**: Body copy that explains the transformation or value the user will receive. It should align with the brand's tone of voice and the funnel's psychological principles. For example, if using 'Direct Offer', incorporate social proof and scarcity. If 'Lead Magnet', focus on the value of the free item.

2.  **Follow-Up Sequence**: Create a 3-step follow-up sequence. This could be for email or WhatsApp. Each step should build on the last, nurture the relationship, and gently guide the user towards the offering, according to the chosen funnel model.
    -   **Step 1**: A welcoming message that delivers initial value (or the lead magnet).
    -   **Step 2**: A message that addresses a pain point or desire and shows how the offering can help, perhaps using testimonials (social proof) or expert positioning (authority).
    -   **Step 3**: A final, clear invitation to purchase or engage, highlighting the core benefit. For a 'Direct Offer', this might be a last chance reminder. For a 'Nurture' funnel, it might be a soft invitation to a discovery call.

{{#if secondaryLanguage}}
Now, translate all the content you just created (Landing Page and Follow-Up Sequence) into **{{secondaryLanguage}}**. Ensure the translation is natural, culturally relevant, and maintains the original tone.
{{/if}}

Return the entire result in the specified JSON format.`,
});


const funnelModelExplanations = {
    'Lead Magnet': "Focus on Reciprocity and Commitment. Offer a valuable free resource (e.g., guide, workshop) to capture leads. The funnel should emphasize the value of the freebie and make signing up extremely easy.",
    'Direct Offer': "Focus on Scarcity and Social Proof. Drive immediate sales for a product or event. Use testimonials, customer counts, and time-limited offers to increase motivation.",
    'Nurture & Convert': "Focus on Liking and Authority. Build trust over a series of value-driven messages. Best for high-ticket services. The tone should be helpful and expert, not salesy.",
    'Onboarding & Habit': "Focus on the Hook Model (Trigger, Action, Variable Reward, Investment). Guide new users to their 'aha!' moment and encourage retention. The content should be educational and show the product in action.",
    'Sustainable Funnel': "Focus on Fair Value Exchange. The relationship is balanced and does no harm. Use clear & honest marketing, a solid product, and functional support. Best for standard e-commerce and reliable services.",
    'Regenerative Funnel': "Focus on Net-Positive Value Creation. The relationship gives more than it takes. Use education, community building, and mission-driven impact. Best for mission-driven brands and communities.",
};


const generateFunnelFlow = ai.defineFlow(
  {
    name: 'generateFunnelFlow',
    inputSchema: GenerateFunnelInputSchema,
    outputSchema: GenerateFunnelOutputSchema,
  },
  async ({ offeringId, funnelType }) => {
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
    
    const funnelExplanation = funnelModelExplanations[funnelType as keyof typeof funnelModelExplanations] || "A standard marketing funnel.";


    const { output } = await prompt({
        primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
        secondaryLanguage: profile.secondary_language ? languageNames.get(profile.secondary_language) : undefined,
        brandHeart,
        offering,
        funnelType,
        funnelModelExplanation: funnelExplanation,
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
