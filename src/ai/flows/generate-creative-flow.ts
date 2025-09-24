
'use server';

/**
 * @fileOverview A flow to generate visual marketing creatives for an offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { Readable } from 'stream';
import type { MediaPart } from 'genkit';
import { generateLandingPage } from './generate-landing-page-flow';


// Define schemas
const GenerateCreativeInputSchema = z.object({
  offeringId: z.string(),
  creativeTypes: z.array(z.enum(['image', 'carousel', 'video', 'landing_page'])),
  aspectRatio: z.string().optional().describe('The desired aspect ratio, e.g., "1:1", "4:5", "9:16", "16:9".'),
  creativePrompt: z.string().optional().describe('A specific prompt to use for generation, bypassing the default prompts.'),
  referenceImageUrl: z.string().optional().describe('The URL of an existing image to use as a reference for image-to-image generation.'),
});
export type GenerateCreativeInput = z.infer<typeof GenerateCreativeInputSchema>;

const CarouselSlideSchema = z.object({
    title: z.string(),
    body: z.string(),
    imageUrl: z.string().optional().describe("The URL of the generated image for this slide. This will be a data URI."),
    creativePrompt: z.string().describe("A detailed, ready-to-use prompt for an AI image generator to create the visual for this slide."),
});
export type CarouselSlide = z.infer<typeof CarouselSlideSchema>;

const GenerateCreativeOutputSchema = z.object({
  imageUrl: z.string().optional().describe('The URL of the generated image. This will be a data URI.'),
  carouselSlides: z.array(CarouselSlideSchema).optional().describe('An array of generated carousel slides, each with text and an image.'),
  videoUrl: z.string().optional().describe('The data URI of the generated video.'),
  landingPageHtml: z.string().optional().describe('The generated HTML content for the landing page.'),
});
export type GenerateCreativeOutput = z.infer<typeof GenerateCreativeOutputSchema>;


const imagePrompt = ai.definePrompt({
    name: 'generateImagePrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
            creativePrompt: z.string().optional(),
        })
    },
    prompt: `{{#if creativePrompt}}
{{creativePrompt}}
{{else}}
Generate a stunning, high-quality, and visually appealing advertisement image for the following offering.

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
{{/if}}`,
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
                creativePrompt: z.string().describe("A detailed, ready-to-use prompt for an AI image generator to create the visual for THIS SPECIFIC SLIDE. The prompt must be descriptive and align with the brand's aesthetic (soulful, minimalist, calm, creative, authentic). Example: 'A serene, minimalist flat-lay of a journal, a steaming mug of tea, and a single green leaf on a soft, textured linen background, pastel colors, soft natural light, photo-realistic --ar 1:1'."),
            })).describe('An array of 3-5 carousel slides, each with a title, body, and a unique creative prompt for its image.'),
        })
    },
  prompt: `You are a marketing expert specializing in creating engaging social media carousels.
Based on the Brand Heart and Offering below, create a 3-5 slide carousel script.
Each slide must have a short, punchy title, a brief body text, and a unique, detailed creative prompt to generate an image for that specific slide. The goal is to tell a story that leads to the offering.

**Brand Heart:**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}

**Offering:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

Generate the carousel slides in the specified JSON format.`,
});


const videoPrompt = ai.definePrompt({
    name: 'generateVideoPrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
            creativePrompt: z.string().optional(),
        })
    },
    prompt: `{{#if creativePrompt}}
{{creativePrompt}}
{{else}}
Generate a visually stunning, high-quality, 5-second video for the following offering.

**Brand Identity:**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Keywords: Conscious, soulful, minimalist, calm, creative, authentic.

**Offering:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

The video should be cinematic, magnetic and aligned with a regenerative marketing philosophy. It should attract, not pursue. Evoke a feeling of calm and authenticity. There should be no text in the video.
{{/if}}
`
});


export const generateCreativeFlow = ai.defineFlow(
  {
    name: 'generateCreativeFlow',
    inputSchema: GenerateCreativeInputSchema,
    outputSchema: GenerateCreativeOutputSchema,
  },
  async ({ offeringId, creativeTypes, aspectRatio, creativePrompt, referenceImageUrl }) => {
    
    // This function uses server-only dependencies and must be defined inside the flow.
    async function downloadVideo(video: MediaPart): Promise<string> {
        const fetch = (await import('node-fetch')).default;
        // Add API key before fetching the video.
        const videoDownloadResponse = await fetch(
            `${video.media!.url}&key=${process.env.GEMINI_API_KEY}`
        );
        if (
            !videoDownloadResponse ||
            videoDownloadResponse.status !== 200 ||
            !videoDownloadResponse.body
        ) {
            throw new Error('Failed to fetch video');
        }

        const chunks: Buffer[] = [];
        for await (const chunk of videoDownloadResponse.body) {
            chunks.push(chunk as Buffer);
        }
        const buffer = Buffer.concat(chunks);
        return `data:video/mp4;base64,${buffer.toString('base64')}`;
    }
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const [{ data: brandHeart, error: brandHeartError }, { data: offering, error: offeringError }] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');

    const promptPayload = { brandHeart, offering, creativePrompt };
    let output: GenerateCreativeOutput = {};

    if (creativeTypes.includes('landing_page')) {
        const { htmlContent } = await generateLandingPage({ offeringId, creativePrompt: creativePrompt || 'Generate a beautiful landing page for this offering.' });
        output.landingPageHtml = htmlContent;
    }
    
    if (creativeTypes.includes('video')) {
        const { text: videoGenPrompt } = await videoPrompt(promptPayload);
        let { operation } = await ai.generate({
            model: googleAI.model('veo-2.0-generate-001'),
            prompt: videoGenPrompt,
            config: {
                durationSeconds: 5,
                aspectRatio: aspectRatio,
            },
        });
        
        if (!operation) {
            throw new Error('Expected the model to return an operation for video generation.');
        }

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.checkOperation(operation);
        }

        if (operation.error) {
            throw new Error(`Failed to generate video: ${operation.error.message}`);
        }

        const video = operation.output?.message?.content.find(p => !!p.media);
        if (!video || !video.media?.url) {
            throw new Error('Failed to find the generated video in the operation result.');
        }

        output.videoUrl = await downloadVideo(video);
    }

    if (creativeTypes.includes('image')) {
        const { text } = await imagePrompt(promptPayload);
        let generationResult;

        if (referenceImageUrl) {
            // Image-to-image generation - this model does not support aspectRatio
            generationResult = await ai.generate({
                model: 'googleai/gemini-2.5-flash-image-preview',
                prompt: [
                    { media: { url: referenceImageUrl } },
                    { text: text },
                ],
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                },
            });
        } else {
            // Text-to-image generation
            const imageConfig: any = {};
            if (aspectRatio) {
                imageConfig.aspectRatio = aspectRatio;
            }
            generationResult = await ai.generate({
                model: googleAI.model('imagen-4.0-fast-generate-001'),
                prompt: text,
                config: imageConfig,
            });
        }

        if (generationResult.media?.url) {
            output.imageUrl = generationResult.media.url;
        }
    }
    
    if (creativeTypes.includes('carousel')) {
        const { output: carouselOutput } = await carouselPrompt(promptPayload);
        if (carouselOutput?.slides) {
            const imageConfig: any = {};
            if (aspectRatio) {
                imageConfig.aspectRatio = aspectRatio;
            }
            const slidePromises = carouselOutput.slides.map(async (slide) => {
                const { media } = await ai.generate({
                    model: googleAI.model('imagen-4.0-fast-generate-001'),
                    prompt: slide.creativePrompt,
                    config: imageConfig,
                });
                return {
                    ...slide,
                    imageUrl: media?.url,
                };
            });
            output.carouselSlides = await Promise.all(slidePromises);
        }
    }
    
    return output;
  }
);


export async function generateCreativeForOffering(input: GenerateCreativeInput): Promise<GenerateCreativeOutput> {
    return generateCreativeFlow(input);
}
