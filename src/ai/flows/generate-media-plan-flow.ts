
'use server';

/**
 * @fileOverview A flow to generate a holistic media plan for a user.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';


const PlanItemSchema = z.object({
  offeringId: z.string().describe("The ID of the offering this content is for."),
  channel: z.enum(["Social Media", "Email", "WhatsApp"]).describe("The channel this content is for."),
  format: z.string().describe("The format of the content (e.g., 'Instagram Carousel', 'Weekly Newsletter')."),
  description: z.string().describe("A brief description of the content idea."),
});

const GenerateMediaPlanOutputSchema = z.object({
  plan: z.array(PlanItemSchema),
});
export type GenerateMediaPlanOutput = z.infer<typeof GenerateMediaPlanOutputSchema>;


const prompt = ai.definePrompt({
  name: 'generateMediaPlanPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          brandHeart: z.any(),
          offerings: z.array(z.any()),
      })
  },
  output: { schema: GenerateMediaPlanOutputSchema },
  prompt: `You are a holistic marketing strategist for conscious creators. Your task is to generate a 1-week content plan based on the user's brand identity and their list of active offerings. The plan should suggest specific content pieces for different channels.

**Brand Heart (Brand Identity):**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Mission: {{brandHeart.mission.primary}}
- Values: {{brandHeart.values.primary}}

**Active Offerings:**
{{#each offerings}}
- Offering ID: {{this.id}}
- Title: {{this.title.primary}}
- Description: {{this.description.primary}}
- Type: {{this.type}}
{{#if this.contextual_notes}}
- Context: {{this.contextual_notes}}
{{/if}}
---
{{/each}}

**Your Task:**

Generate a list of 5-7 suggested content pieces for the upcoming week in the **{{primaryLanguage}}** language.
- The plan should be diverse, covering different offerings and channels (Social Media, Email, WhatsApp).
- For each piece of content, specify the offering ID it relates to, the channel, the format, and a brief description of the idea.
- Example: A 3-part Instagram carousel for the 'Meditation Workshop' Offering.
- Example: A weekly newsletter announcing the 'New Moon Circle' Offering.
- Example: A short, personal WhatsApp message to the broadcast list about the 'Early Bird Discount'.

Return the result as a flat array of plan items in the specified JSON format. Ensure you provide the correct 'offeringId' for each plan item.`,
});


const generateMediaPlanFlow = ai.defineFlow(
  {
    name: 'generateMediaPlanFlow',
    outputSchema: GenerateMediaPlanOutputSchema,
  },
  async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    // Fetch Brand Heart, Profile, and all active Offerings in parallel
    const [
        { data: brandHeart, error: brandHeartError },
        { data: profile, error: profileError },
        { data: offerings, error: offeringError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('primary_language').eq('id', user.id).single(),
        supabase.from('offerings').select('id, title, description, type, contextual_notes').eq('user_id', user.id),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found. Please define your brand heart first.');
    if (profileError || !profile) throw new Error('User profile not found.');
    if (offeringError) throw new Error('Could not fetch offerings.');
    if (!offerings || offerings.length === 0) throw new Error('No active offerings found. Please create an offering first.');


    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));

    const { output } = await prompt({
        primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
        brandHeart,
        offerings,
    });
    
    if (!output) {
      throw new Error('The AI model did not return a response.');
    }

    return output;
  }
);


export async function generateMediaPlan(): Promise<GenerateMediaPlanOutput> {
    return generateMediaPlanFlow();
}

