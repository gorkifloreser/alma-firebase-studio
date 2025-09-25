
'use server';

/**
 * @fileOverview A flow to regenerate a single image for a carousel slide.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Define schemas
export const RegenerateCarouselSlideInputSchema = z.object({
  offeringId: z.string(),
  basePrompt: z.string().describe('The creative brief or instruction for the new image.'),
  aspectRatio: z.string().optional(),
  artStyleId: z.string().optional(),
});
export type RegenerateCarouselSlideInput = z.infer<typeof RegenerateCarouselSlideInputSchema>;

export const RegenerateCarouselSlideOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the newly generated image.'),
  finalPrompt: z.string().describe('The final, full prompt sent to the image generation model.'),
});
export type RegenerateCarouselSlideOutput = z.infer<typeof RegenerateCarouselSlideOutputSchema>;


const masterImagePrompt = ai.definePrompt({
    name: 'masterImagePromptForRegen', // Use a different name to avoid conflicts if it's identical
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
            basePrompt: z.string(),
            aspectRatio: z.string().optional(),
            artStyleSuffix: z.string().optional(),
        })
    },
    output: { schema: z.object({ text: z.string() }) },
    prompt: `You are an expert art director and AI prompt engineer.
Your task is to create a single, detailed, and visually rich prompt for an image generation model.

**RULE: DO NOT include any text, letters, or words in the visual description for the image. The final image must be purely visual.**

**1. BRAND TONE & KEYWORDS:**
- Tone: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}
- Keywords: Soulful, minimalist, calm, authentic, organic.

**2. OFFERING SUBJECT:**
- Title: {{offering.title.primary}}

**3. CREATIVE BRIEF:**
- Your main instruction is: "{{basePrompt}}"

**4. ART STYLE:**
{{#if artStyleSuffix}}
- Apply this specific art style: {{artStyleSuffix}}
{{else}}
- Use a photo-realistic, soft, and natural style.
{{/if}}

**FINAL TASK:**
Combine all info to create one unified, detailed prompt for an image generation model. The final output must be only the prompt string.
Example output: "A serene, minimalist flat-lay of a journal, a steaming mug of tea, and a single green leaf on a soft, textured linen background, embodying a soulful and authentic feeling, pastel colors, soft natural light, photo-realistic{{#if aspectRatio}}, ar {{aspectRatio}}{{/if}}"

Output only the final prompt string.`,
});


export const regenerateCarouselSlideFlow = ai.defineFlow(
  {
    name: 'regenerateCarouselSlideFlow',
    inputSchema: RegenerateCarouselSlideInputSchema,
    outputSchema: RegenerateCarouselSlideOutputSchema,
  },
  async ({ offeringId, basePrompt, aspectRatio, artStyleId }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const [
        { data: brandHeart, error: brandHeartError },
        { data: offering, error: offeringError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('title, description').eq('id', offeringId).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');

    const { data: artStyle } = artStyleId ? await supabase.from('art_styles').select('prompt_suffix').eq('id', artStyleId).single() : { data: null };

    const { output: promptOutput } = await masterImagePrompt({
      brandHeart,
      offering,
      basePrompt,
      aspectRatio,
      artStyleSuffix: artStyle?.prompt_suffix,
    });

    if (!promptOutput) {
      throw new Error('Failed to generate master prompt for slide regeneration.');
    }
    const finalPrompt = promptOutput.text;

    const { media } = await ai.generate({
      model: googleAI.model('imagen-4.0-fast-generate-001'),
      prompt: finalPrompt,
    });

    if (!media?.url) {
      throw new Error('Image generation failed for the slide.');
    }

    return { imageUrl: media.url, finalPrompt };
  }
);


export async function regenerateCarouselSlide(input: RegenerateCarouselSlideInput): Promise<RegenerateCarouselSlideOutput> {
    return regenerateCarouselSlideFlow(input);
}
