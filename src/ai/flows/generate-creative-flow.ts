
'use server';

/**
 * @fileOverview A flow to generate visual marketing creatives for an offering.
 * This flow now orchestrates both content (text) and creative (visuals) generation.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import type { MediaPart } from 'genkit';
import { generateLandingPage } from './generate-landing-page-flow';


// Define schemas
const GenerateCreativeInputSchema = z.object({
  offeringId: z.string(),
  creativeTypes: z.array(z.enum(['image', 'carousel', 'video', 'landing_page', 'text'])),
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
  content: z.object({
      primary: z.string().describe('The marketing content in the primary language.'),
      secondary: z.string().optional().describe('The marketing content in the secondary language.'),
  }).optional(),
  imageUrl: z.string().optional().describe('The URL of the generated image. This will be a data URI.'),
  carouselSlides: z.array(CarouselSlideSchema).optional().describe('An array of generated carousel slides, each with text and an image.'),
  videoUrl: z.string().optional().describe('The data URI of the generated video.'),
  landingPageHtml: z.string().optional().describe('The generated HTML content for the landing page.'),
});
export type GenerateCreativeOutput = z.infer<typeof GenerateCreativeOutputSchema>;

// Prompt for generating main text content
const contentPrompt = ai.definePrompt({
  name: 'generateContentOnlyPrompt',
  input: {
      schema: z.object({
          primaryLanguage: z.string(),
          secondaryLanguage: z.string().optional(),
          brandHeart: z.any(),
          offering: z.any(),
      })
  },
  output: { schema: GenerateCreativeOutputSchema.shape.content.unwrap() },
  prompt: `You are an expert marketing copywriter for conscious creators. Your task is to generate a social media post based on the user's brand identity and a specific offering.

**Brand Heart (Brand Identity):**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}

**Offering Details:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**Your Task:**
1. Write an engaging social media post in the **{{primaryLanguage}}** language that promotes the offering.
2. {{#if secondaryLanguage}}Translate the post into **{{secondaryLanguage}}**.{{/if}}
Return the result in the specified JSON format.`,
});


const imagePrompt = ai.definePrompt({
    name: 'generateImagePrompt',
    input: {
        schema: z.object({
            creativePrompt: z.string(),
        })
    },
    prompt: `{{creativePrompt}}`,
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
                creativePrompt: z.string().describe("A detailed, ready-to-use prompt for an AI image generator to create the visual for THIS SPECIFIC SLIDE. The prompt must be descriptive and align with the brand's aesthetic (soulful, minimalist, calm, creative, authentic). Example: 'A serene, minimalist flat-lay of a journal, a steaming mug of tea, and a single green leaf on a soft, textured linen background, pastel colors, soft natural light, photo-realistic'."),
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

Generate the carousel slides in the specified JSON format. Do not add any art style suffixes (like --ar 1:1) to the creative prompts you generate; those will be added later.`,
});


const defaultImageGenPromptTemplate = (brandHeart: any, offering: any) => `Generate a stunning, high-quality, and visually appealing advertisement image for the following offering.

**Brand Identity:**
- Brand Name: ${brandHeart.brand_name}
- Tone of Voice: ${brandHeart.tone_of_voice.primary}
- Keywords: Conscious, soulful, minimalist, calm, creative, authentic.

**Offering:**
- Title: ${offering.title.primary}

The image should be magnetic and aligned with a regenerative marketing philosophy. Do not include any text in the image.`;

const defaultVideoGenPromptTemplate = (brandHeart: any, offering: any) => `Generate a visually stunning, high-quality, 5-second video for the following offering.

**Brand Identity:**
- Brand Name: ${brandHeart.brand_name}
- Tone of Voice: ${brandHeart.tone_of_voice.primary}
- Keywords: Conscious, soulful, minimalist, calm, creative, authentic.

**Offering:**
- Title: ${offering.title.primary}

The video should be cinematic, magnetic and aligned with a regenerative marketing philosophy. No text in the video.`;


export const generateCreativeFlow = ai.defineFlow(
  {
    name: 'generateCreativeFlow',
    inputSchema: GenerateCreativeInputSchema,
    outputSchema: GenerateCreativeOutputSchema,
  },
  async ({ offeringId, creativeTypes, aspectRatio, creativePrompt: userCreativePrompt, referenceImageUrl }) => {
    
    async function downloadVideo(video: MediaPart): Promise<string> {
        const fetch = (await import('node-fetch')).default;
        const videoDownloadResponse = await fetch(`${video.media!.url}&key=${process.env.GEMINI_API_KEY}`);
        if (!videoDownloadResponse || videoDownloadResponse.status !== 200 || !videoDownloadResponse.body) {
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

    const [{ data: brandHeart, error: brandHeartError }, { data: offering, error: offeringError }, { data: profile, error: profileError }] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
        supabase.from('profiles').select('primary_language, secondary_language').eq('id', user.id).single()
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');
    if (profileError || !profile) throw new Error('User profile not found.');

    let output: GenerateCreativeOutput = {};

    const languages = await import('@/lib/languages');
    const languageNames = new Map(languages.languages.map(l => [l.value, l.label]));

    // Generate text content in parallel
    const contentPromise = creativeTypes.includes('text') 
        ? contentPrompt({
            primaryLanguage: languageNames.get(profile.primary_language) || profile.primary_language,
            secondaryLanguage: profile.secondary_language ? languageNames.get(profile.secondary_language) : undefined,
            brandHeart,
            offering,
        })
        : Promise.resolve(null);
    
    const visualPromises = [];
    const finalAspectRatio = aspectRatio ? ` --ar ${aspectRatio}` : '';

    if (creativeTypes.includes('landing_page')) {
        visualPromises.push(generateLandingPage({ offeringId, creativePrompt: userCreativePrompt || 'Generate a beautiful landing page for this offering.' }).then(r => ({ landingPageHtml: r.htmlContent })));
    }
    
    if (creativeTypes.includes('video')) {
        const videoBasePrompt = userCreativePrompt || defaultVideoGenPromptTemplate(brandHeart, offering);
        const finalVideoPrompt = videoBasePrompt + finalAspectRatio;
        
        visualPromises.push(ai.generate({
            model: googleAI.model('veo-2.0-generate-001'),
            prompt: finalVideoPrompt,
            config: { durationSeconds: 5, aspectRatio: aspectRatio },
        }).then(async ({ operation }) => {
            if (!operation) throw new Error('Expected video operation.');
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.checkOperation(operation);
            }
            if (operation.error) throw new Error(`Video generation failed: ${operation.error.message}`);
            const video = operation.output?.message?.content.find(p => !!p.media);
            if (!video || !video.media?.url) throw new Error('Generated video not found.');
            return { videoUrl: await downloadVideo(video) };
        }));
    }

    if (creativeTypes.includes('image')) {
        const imageBasePrompt = userCreativePrompt || defaultImageGenPromptTemplate(brandHeart, offering);
        const finalImagePrompt = imageBasePrompt + finalAspectRatio;
        const promptPayload = { creativePrompt: finalImagePrompt };

        visualPromises.push(imagePrompt(promptPayload).then(async ({ text }) => {
            let generationResult;
            if (referenceImageUrl) {
                generationResult = await ai.generate({
                    model: 'googleai/gemini-2.5-flash-image-preview',
                    prompt: [{ media: { url: referenceImageUrl } }, { text: text }],
                    config: { responseModalities: ['TEXT', 'IMAGE'] },
                });
            } else {
                generationResult = await ai.generate({
                    model: googleAI.model('imagen-4.0-fast-generate-001'),
                    prompt: text,
                });
            }
            return { imageUrl: generationResult.media?.url };
        }));
    }
    
    if (creativeTypes.includes('carousel')) {
        visualPromises.push(carouselPrompt({ brandHeart, offering }).then(async ({ output: carouselOutput }) => {
            if (carouselOutput?.slides) {
                const artStyleSuffix = userCreativePrompt ? `, ${userCreativePrompt.split(',').slice(1).join(',')}` : '';

                const slidePromises = carouselOutput.slides.map(async (slide) => {
                    const finalSlidePrompt = slide.creativePrompt + artStyleSuffix + finalAspectRatio;
                    const { media } = await ai.generate({
                        model: googleAI.model('imagen-4.0-fast-generate-001'),
                        prompt: finalSlidePrompt,
                    });
                    return { ...slide, imageUrl: media?.url, creativePrompt: finalSlidePrompt };
                });
                return { carouselSlides: await Promise.all(slidePromises) };
            }
            return { carouselSlides: [] };
        }));
    }

    const [contentResult, ...visualResults] = await Promise.all([contentPromise, ...visualPromises]);
    
    if (contentResult?.output) {
        output.content = contentResult.output;
    }

    visualResults.forEach(result => {
        if (result) {
            output = { ...output, ...result };
        }
    });
    
    return output;
  }
);


export async function generateCreativeForOffering(input: GenerateCreativeInput): Promise<GenerateCreativeOutput> {
    return generateCreativeFlow(input);
}

    