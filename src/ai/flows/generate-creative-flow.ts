
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
  artStyleId: z.string().optional().describe('The ID of a saved art style to apply.'),
});
export type GenerateCreativeInput = z.infer<typeof GenerateCreativeInputSchema>;

const CarouselSlideSchema = z.object({
    title: z.string(),
    body: z.string(),
    imageUrl: z.string().optional().describe("The URL of the generated image for this slide. This will be a data URI."),
    finalPrompt: z.string().optional().describe("The final, full prompt that was sent to the image generation model."),
});
export type CarouselSlide = z.infer<typeof CarouselSlideSchema>;

const GenerateCreativeOutputSchema = z.object({
  content: z.object({
      primary: z.string().describe('The marketing content in the primary language.'),
      secondary: z.string().optional().describe('The marketing content in the secondary language.'),
  }).optional(),
  imageUrl: z.string().optional().describe('The URL of the generated image. This will be a data URI.'),
  finalPrompt: z.string().optional().describe("The final, full prompt that was sent to the image generation model."),
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


const masterImagePrompt = ai.definePrompt({
    name: 'masterImagePromptGenerator',
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
    prompt: `You are an expert art director and AI prompt engineer for conscious, soulful brands.

Your task is to combine all the information below to create a single, detailed, and visually rich prompt for an image generation model. The final output must be only the prompt string itself.

**RULE: DO NOT include any text, letters, or words in the visual description for the image. The final image must be purely visual.**

**1. THE BRAND's SOUL (Tone & Keywords):**
- Tone: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}
- Visual Keywords: Soulful, minimalist, calm, authentic, organic.

**2. THE OFFERING (The Subject):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**3. THE CREATIVE BRIEF (The Scene & Style):**
- Your main instruction is: "{{basePrompt}}"

**4. THE ART STYLE (The Suffix):**
{{#if artStyleSuffix}}
- Apply this specific art style: {{artStyleSuffix}}
{{else}}
- Use a photo-realistic, soft, and natural style.
{{/if}}

**FINAL TASK:**
Combine all the information above to create a single, unified, detailed, and visually rich prompt for an image generation model. The final output prompt must be a fusion of the Brand's Soul, the Offering's subject, the specific Creative Brief, and the art style suffix.

**Example output:** "A serene, minimalist flat-lay of a journal, a steaming mug of tea, and a single green leaf on a soft, textured linen background, embodying a soulful and authentic feeling, pastel colors, soft natural light, photo-realistic{{#if aspectRatio}}, ar {{aspectRatio}}{{/if}}"

Output only the final prompt string.`,
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

Generate the carousel slides in the specified JSON format. Do not add any art style suffixes or aspect ratios (like --ar 1:1) to the creative prompts you generate; those will be added later.`,
});


const defaultImageGenPromptTemplate = (brandHeart: any, offering: any) => `Generate a stunning, high-quality, and visually appealing advertisement image for the following offering. The image should be magnetic and aligned with a regenerative marketing philosophy.`;
const defaultVideoGenPromptTemplate = (brandHeart: any, offering: any) => `Generate a visually stunning, high-quality, 5-second video for the following offering. The video should be cinematic, magnetic and aligned with a regenerative marketing philosophy.`;


export const generateCreativeFlow = ai.defineFlow(
  {
    name: 'generateCreativeFlow',
    inputSchema: GenerateCreativeInputSchema,
    outputSchema: GenerateCreativeOutputSchema,
  },
  async ({ offeringId, creativeTypes, aspectRatio, creativePrompt: userCreativePrompt, referenceImageUrl, artStyleId }) => {
    
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

    const [
        { data: brandHeart, error: brandHeartError }, 
        { data: offering, error: offeringError }, 
        { data: profile, error: profileError },
    ] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
        supabase.from('profiles').select('primary_language, secondary_language').eq('id', user.id).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');
    if (profileError || !profile) throw new Error('User profile not found.');

    const { data: artStyle } = artStyleId ? await supabase.from('art_styles').select('prompt_suffix').eq('id', artStyleId).single() : { data: null };


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

    if (creativeTypes.includes('landing_page')) {
        visualPromises.push(generateLandingPage({ offeringId, creativePrompt: userCreativePrompt || 'Generate a beautiful landing page for this offering.' }).then(r => ({ landingPageHtml: r.htmlContent })));
    }
    
    if (creativeTypes.includes('video')) {
        const videoBasePrompt = userCreativePrompt || defaultVideoGenPromptTemplate(brandHeart, offering);
        
        visualPromises.push(ai.generate({
            model: googleAI.model('veo-2.0-generate-001'),
            prompt: videoBasePrompt,
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

        visualPromises.push(masterImagePrompt({ brandHeart, offering, basePrompt: imageBasePrompt, aspectRatio, artStyleSuffix: artStyle?.prompt_suffix }).then(async ({ output: promptOutput }) => {
            if (!promptOutput) {
                throw new Error('Master image prompt generation failed.');
            }
            const finalImagePrompt = promptOutput.text;
            let generationResult;
            if (referenceImageUrl) {
                generationResult = await ai.generate({
                    model: 'googleai/gemini-2.5-flash-image-preview',
                    prompt: [{ media: { url: referenceImageUrl } }, { text: finalImagePrompt }],
                    config: { responseModalities: ['TEXT', 'IMAGE'] },
                });
            } else {
                generationResult = await ai.generate({
                    model: googleAI.model('imagen-4.0-fast-generate-001'),
                    prompt: finalImagePrompt,
                });
            }
            return { imageUrl: generationResult.media?.url, finalPrompt: finalImagePrompt };
        }));
    }
    
    if (creativeTypes.includes('carousel')) {
        visualPromises.push(carouselPrompt({ brandHeart, offering }).then(async ({ output: carouselOutput }) => {
            if (carouselOutput?.slides) {

                const slidePromises = carouselOutput.slides.map(async (slide) => {
                    const slideBasePrompt = slide.creativePrompt;

                    const { output: promptOutput } = await masterImagePrompt({
                        brandHeart,
                        offering,
                        basePrompt: slideBasePrompt,
                        aspectRatio,
                        artStyleSuffix: artStyle?.prompt_suffix,
                    });

                    if (!promptOutput) {
                        throw new Error(`Failed to generate master prompt for a carousel slide.`);
                    }
                    const finalSlidePrompt = promptOutput.text;

                    const { media } = await ai.generate({
                        model: googleAI.model('imagen-4.0-fast-generate-001'),
                        prompt: finalSlidePrompt,
                    });
                    
                    return { ...slide, imageUrl: media?.url, finalPrompt: finalSlidePrompt };
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
