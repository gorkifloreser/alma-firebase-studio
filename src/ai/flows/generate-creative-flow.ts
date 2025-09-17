
'use server';

/**
 * @fileOverview A flow to generate visual marketing creatives for an offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Define schemas
const GenerateCreativeInputSchema = z.object({
  offeringId: z.string(),
  creativeTypes: z.array(z.enum(['image', 'carousel', 'video'])),
});
export type GenerateCreativeInput = z.infer<typeof GenerateCreativeInputSchema>;

const GenerateCreativeOutputSchema = z.object({
  imageUrl: z.string().optional().describe('The URL of the generated image. This will be a data URI.'),
  carouselSlidesText: z.string().optional().describe('Suggest text for carousel slides.'),
  videoScript: z.string().optional().describe('A short script for a video ad.'),
});
export type GenerateCreativeOutput = z.infer<typeof GenerateCreativeOutputSchema>;

const imagePrompt = ai.definePrompt({
    name: 'generateImagePrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
        })
    },
    prompt: `Generate a stunning, high-quality, and visually appealing advertisement image for the following offering.

**Brand Identity:**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Keywords: Conscious, soulful, minimalist, calm, creative, authentic.

**Offering:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.contextual_notes}}
- Context: {{offering.contextual_notes}}
{{/if}}

The image should be magnetic and aligned with a regenerative marketing philosophy. It should attract, not pursue. Evoke a feeling of calm and authenticity. Do not include any text in the image.
`,
});

const carouselPrompt = ai.definePrompt({
    name: 'generateCarouselPrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
        })
    },
    output: {
        schema: z.object({
            slides: z.array(z.object({
                title: z.string(),
                body: z.string(),
            })).describe('An array of 3-5 carousel slides, each with a title and body.'),
        })
    },
  prompt: `You are a marketing expert specializing in creating engaging social media carousels.
Based on the Brand Heart and Offering below, create a 3-5 slide carousel script.
Each slide should have a short, punchy title and a brief body text. The goal is to tell a story that leads to the offering.

**Brand Heart:**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}

**Offering:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

Generate the carousel slides in the specified JSON format.`,
});


const videoScriptPrompt = ai.definePrompt({
    name: 'generateVideoScriptPrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
        })
    },
    output: {
        schema: z.object({
            script: z.string().describe('A short, 15-30 second video script with scene descriptions and spoken words.'),
        })
    },
  prompt: `You are a scriptwriter for short, impactful social media video ads.
Create a 15-30 second video script for the following offering, keeping the brand's soul in mind.
The script should include visual scene descriptions and any voiceover or on-screen text.

**Brand Heart:**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Mission: {{brandHeart.mission.primary}}

**Offering:**
- Title: {{offering.title.primary}}

Generate the video script in the specified JSON format.`,
});


export const generateCreativeFlow = ai.defineFlow(
  {
    name: 'generateCreativeFlow',
    inputSchema: GenerateCreativeInputSchema,
    outputSchema: GenerateCreativeOutputSchema,
  },
  async ({ offeringId, creativeTypes }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const [{ data: brandHeart, error: brandHeartError }, { data: offering, error: offeringError }] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');

    const promptPayload = { brandHeart, offering };
    let output: GenerateCreativeOutput = {};

    if (creativeTypes.includes('image') || creativeTypes.includes('carousel')) {
        const { text } = await imagePrompt(promptPayload);
        const { media } = await ai.generate({
            model: googleAI.model('imagen-4.0-fast-generate-001'),
            prompt: text,
        });
        if (media?.url) {
            output.imageUrl = media.url;
        }
    }
    
    if (creativeTypes.includes('carousel')) {
        const { output: carouselOutput } = await carouselPrompt(promptPayload);
        if (carouselOutput) {
            output.carouselSlidesText = carouselOutput.slides.map((slide, i) => `Slide ${i+1}: ${slide.title}\n${slide.body}`).join('\n\n');
        }
    }

    if (creativeTypes.includes('video')) {
        const { output: videoOutput } = await videoScriptPrompt(promptPayload);
        if (videoOutput?.script) {
            output.videoScript = videoOutput.script;
        }
    }

    return output;
  }
);


export async function generateCreativeForOffering(input: GenerateCreativeInput): Promise<GenerateCreativeOutput> {
    return generateCreativeFlow(input);
}
