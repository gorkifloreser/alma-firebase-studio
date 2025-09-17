
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
  funnelType: z.string().describe("The name of the funnel model being used, e.g., 'Lead Magnet'."),
  funnelPrinciples: z.string().describe("The core principles or strategy of the funnel model."),
  goal: z.string().describe("The specific goal of this strategy."),
  channels: z.array(z.string()).describe("The marketing channels to focus on for this strategy."),
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
          funnelPrinciples: z.string(),
          goal: z.string(),
          channels: z.array(z.string()),
      })
  },
  output: { schema: GenerateFunnelOutputSchema },
  prompt: `You are a world-class marketing strategist who specializes in creating authentic, science-based marketing funnels. You do not use pressure tactics. Instead, you build connection and offer value based on a deep understanding of customer psychology.

Your task is to create a complete marketing funnel for a specific offering, based on the provided Brand Heart, a specific funnel model, and a clear goal. The funnel consists of a Landing Page and a 3-step follow-up sequence.

**Strategy Goal:** {{goal}}
**Target Channels:** {{#each channels}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
**Funnel Model to Use:** {{funnelType}}
This model's core principles are: {{funnelPrinciples}}

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

Generate the funnel content for the **{{primaryLanguage}}** language first. The content must be tailored to achieve the stated goal and optimized for the selected target channels.

---

### **Part 1: Landing Page (Awareness & Evaluation Stage)**

The landing page must bridge the gap from awareness to evaluation.
1.  **Headline (Awareness)**: Start with a powerful headline that focuses on the user's **problem** or "Job to be Done". Use a question or a relatable statement that shows empathy for their struggle.
2.  **Body Content (Evaluation)**:
    *   Transition from the problem to your **solution**. Explain how the offering solves the problem.
    *   Incorporate **Social Proof** (e.g., "Join 1,000+ happy customers") and **Authority** (e.g., "Built by industry experts").
    *   Clearly articulate the benefits and the "after" state. Show, don't just tell.
    *   The content should be persuasive but authentic, aligning with the brand's tone of voice.
    *   The goal is to build trust and make your solution the clear, logical, and emotionally resonant choice.

Create the content for the landing page.

---

### **Part 2: 3-Step Follow-Up Sequence (Evaluation & Action Stage)**

This sequence should nurture the lead, build more trust, and lead to a frictionless final action. It should be written assuming it's for an email or WhatsApp channel, as appropriate.

1.  **Follow-Up 1 (Welcome & Value)**:
    *   **Title**: A welcoming subject line.
    *   **Content**: Immediately provide value. If there's a lead magnet, deliver it. Reassure them they made a good decision. Reinforce the brand's mission.

2.  **Follow-Up 2 (Build Trust & Address Pain Points)**:
    *   **Title**: A subject line that piques curiosity or addresses a specific pain point.
    *   **Content**: Go deeper into the problem your offering solves. Use storytelling. Introduce a customer testimonial (social proof) or a surprising statistic (authority) to build credibility. Show you understand their challenges.

3.  **Follow-Up 3 (Clear Call to Action)**:
    *   **Title**: A clear, direct subject line.
    *   **Content**: Make a clear, simple, and direct invitation to take the final step (e.g., purchase, sign up for a trial, book a demo). Remove ambiguity. Reiterate the single biggest benefit they will get by taking action now. Keep it short and focused.

---

{{#if secondaryLanguage}}
### **Part 3: Translation**

Now, translate all the content you just created (Landing Page and the 3-step Follow-Up Sequence) into **{{secondaryLanguage}}**. Ensure the translation is natural, culturally relevant, and maintains the original tone and strategic intent.
{{/if}}

Return the entire result in the specified JSON format.`,
});


const generateFunnelFlow = ai.defineFlow(
  {
    name: 'generateFunnelFlow',
    inputSchema: GenerateFunnelInputSchema,
    outputSchema: GenerateFunnelOutputSchema,
  },
  async ({ offeringId, funnelType, funnelPrinciples, goal, channels }) => {
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
        funnelType,
        funnelPrinciples,
        goal,
        channels,
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
