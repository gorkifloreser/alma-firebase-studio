
'use server';

/**
 * @fileOverview An AI flow to generate a target audience profile (buyer persona)
 * based on a brand's identity and its offerings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createClient } from '@/lib/supabase/server';
import { googleAI } from '@genkit-ai/googleai';

// Define the output schema for a detailed audience profile
const AudienceProfileSchema = z.object({
  name: z.string().describe("A memorable name for this persona (e.g., 'Conscious Creator Carla', 'Holistic Helen')."),
  demographics: z.string().describe("Key demographic information: age range, gender, location, occupation, and income level. MUST incorporate user hints."),
  psychographics: z.string().describe("Their core values, beliefs, lifestyle, and personality traits. What do they care about deeply?"),
  goals: z.string().describe("What are their primary goals and aspirations, both personally and professionally, related to the brand's offerings?"),
  painPoints: z.string().describe("What are their biggest challenges, frustrations, and pain points that the brand's offerings can solve?"),
  wateringHoles: z.string().describe("Where do they hang out online? (e.g., specific social media platforms, blogs, forums, influencers they follow)."),
  summary: z.string().describe("A brief, 2-3 sentence summary that encapsulates the essence of this persona.")
});

const GenerateAudienceOutputSchema = z.object({
  profileText: z.string().describe("The complete, well-formatted audience profile in a single string, ready to be displayed in a textarea. Use markdown for formatting (e.g., ## Name, ### Demographics).")
});
export type GenerateAudienceOutput = z.infer<typeof GenerateAudienceOutputSchema>;

const GenerateAudienceInputSchema = z.object({
    userHint: z.string().optional().describe("User-provided hints about the audience, like age range, location, or specific interests."),
});
export type GenerateAudienceInput = z.infer<typeof GenerateAudienceInputSchema>;


const audiencePrompt = ai.definePrompt({
    name: 'generateAudiencePrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offerings: z.array(z.any()).optional(),
            userHint: z.string().optional(),
        })
    },
    output: { schema: AudienceProfileSchema },
    prompt: `You are an expert market researcher and brand strategist. Your task is to analyze a brand's core identity, its products/services, and user-provided hints to create a detailed, insightful, and empathetic buyer persona.

**BRAND IDENTITY (The "Who"):**
- **Brand Name:** {{brandHeart.brand_name}}
- **Mission:** {{brandHeart.mission.primary}}
- **Vision:** {{brandHeart.vision.primary}}
- **Values:** {{brandHeart.values.primary}}
- **Tone of Voice:** {{brandHeart.tone_of_voice.primary}}

**OFFERINGS (The "What"):**
{{#if offerings.length}}
{{#each offerings}}
- **{{this.title.primary}}**: {{this.description.primary}} (Type: {{this.type}})
{{/each}}
{{else}}
- No specific offerings provided. Analyze based on the brand identity alone.
{{/if}}

**USER'S HINTS (CRITICAL CONTEXT):**
{{#if userHint}}
- **User's perception of the audience:** "{{userHint}}"
- **IMPORTANT:** You MUST prioritize these hints when creating the persona, especially for demographics like age and location.
{{else}}
- No specific hints provided by the user.
{{/if}}


**YOUR MISSION:**
Based on all the information above, create a profile for ONE ideal customer. Define the following characteristics for this persona:
1.  **name**: A catchy, alliterative name for the persona.
2.  **demographics**: Age, gender, location, occupation, etc. **This must align with the user's hints if provided.**
3.  **psychographics**: Their values, beliefs, and lifestyle. What is important to them?
4.  **goals**: What do they want to achieve that your brand can help with?
5.  **painPoints**: What are their biggest struggles and frustrations?
6.  **wateringHoles**: Where do they spend their time online?
7.  **summary**: A short paragraph that brings this person to life.

Provide a detailed and actionable profile that will help the brand create resonant marketing content.
`,
});

const generateAudienceFlow = ai.defineFlow(
  {
    name: 'generateAudienceFlow',
    inputSchema: GenerateAudienceInputSchema,
    outputSchema: GenerateAudienceOutputSchema,
  },
  async ({ userHint }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    // Fetch Brand Heart and Offerings in parallel
    const [{ data: brandHeart, error: brandHeartError }, { data: offerings, error: offeringsError }] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('title, description, type').eq('user_id', user.id).limit(5),
    ]);

    if (brandHeartError || !brandHeart) {
      throw new Error('Brand Heart not found. Please define your brand heart first.');
    }
    
    const { output } = await audiencePrompt({ brandHeart, offerings: offerings || [], userHint });

    if (!output) {
      throw new Error('The AI model did not return a response for the audience suggestion.');
    }
    
    // Format the structured output into a single string for the textarea
    const profileText = `## ${output.name}

### Summary
${output.summary}

### Demographics
${output.demographics}

### Psychographics & Values
${output.psychographics}

### Goals & Aspirations
${output.goals}

### Pains & Challenges
${output.painPoints}

### Online Hangouts (Watering Holes)
${output.wateringHoles}
`;
    return { profileText };
  }
);

export async function generateAudienceSuggestion(input: GenerateAudienceInput): Promise<GenerateAudienceOutput> {
    return generateAudienceFlow(input);
}
