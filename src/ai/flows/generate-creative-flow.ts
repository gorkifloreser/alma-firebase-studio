
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
  referenceImageUrl: z.string().optional().describe('The URL of an existing image to use as a reference for image-to-image or image-to-video generation.'),
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
  model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
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
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
            basePrompt: z.string(),
            aspectRatio: z.string().optional(),
        })
    },
    output: { schema: z.object({ text: z.string() }) },
    prompt: `You are an expert art director and AI prompt engineer for conscious, soulful brands.

Your task is to combine all the information below to create a single, detailed, and visually rich prompt for an image generation model. The final output must be only the prompt string itself.

**RULE: DO NOT include any text, letters, or words in the visual description for the image. The final image must be purely visual.**

**1. THE BRAND's SOUL (Tone & Visuals):**
- Tone: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}
- **Visual Identity:** {{brandHeart.visual_identity.primary}}

**2. THE OFFERING (The Subject):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**3. THE CREATIVE BRIEF (The Scene):**
- Your main instruction is: "{{basePrompt}}"

**FINAL TASK:**
Combine all the information above to create a single, unified, detailed, and visually rich prompt for an image generation model. The final output prompt must be a fusion of the Brand's Soul, the Offering's subject, and the specific Creative Brief.

**Example output:** "A serene, minimalist flat-lay of a journal, a steaming mug of tea, and a single green leaf on a soft, textured linen background, embodying a soulful and authentic feeling, earthy tones, soft natural light, film grain{{#if aspectRatio}}, ar {{aspectRatio}}{{/if}}"

Output only the final prompt string.`,
});


const carouselPrompt = ai.definePrompt({
    name: 'generateCarouselPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-2.5-pro'),
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
            basePrompt: z.string().optional(),
            aspectRatio: z.string().optional(),
        })
    },
    output: {
        schema: z.object({
            slides: z.array(z.object({
                title: z.string(),
                body: z.string(),
                creativePrompt: z.string().describe("A detailed, final, ready-to-use prompt for an AI image generator to create the visual for THIS SPECIFIC SLIDE. This prompt must be a fusion of the brand's aesthetic, the offering, the art style, the aspect ratio, and the user's creative brief. It should be self-contained and ready for generation."),
            })).describe('An array of 3-5 carousel slides, each with a title, body, and a unique, final creative prompt for its image.'),
        })
    },
  prompt: `You are a marketing expert and AI prompt engineer specializing in creating engaging social media carousels.

**Your Goal:** Deconstruct the user's Creative Brief into a sequence of 3-5 slides. For each slide, you must generate a title, body copy, and a **complete, final, detailed image generation prompt**.

---
**1. THE BRAND's SOUL (Tone & Visuals):**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}
- **Visual Identity:** {{brandHeart.visual_identity.primary}}

**2. THE OFFERING (The Subject):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**3. THE USER's CREATIVE BRIEF (The Main Story):**
{{#if basePrompt}}
- "{{basePrompt}}"
{{else}}
- Create a carousel that tells a story about the offering, starting with the problem or desire, showing the transformation, and ending with a call to action.
{{/if}}

---
**YOUR TASK:**

Based on all the information above, create a 3-5 slide carousel script. For each slide:
1.  **title:** A short, punchy title.
2.  **body:** Brief, engaging body text.
3.  **creativePrompt:** A **final, complete, and detailed prompt** for an AI image generator (like DALL-E or Midjourney). This prompt MUST incorporate the specific subject for that slide (derived from the user's creative brief), the brand's visual identity, and the aspect ratio if provided. Do NOT include placeholders.

   **CRUCIAL RULE:** You MUST base each slide's \`creativePrompt\` directly on the corresponding instructions found in the user's 'Creative Brief'. If the user's brief describes 'Slide 1' as 'a close-up of a cup', your \`creativePrompt\` for the first slide MUST describe a close-up of a cup, enhanced with the brand's aesthetic. Do NOT invent new scenarios.

   **Example of a good \`creativePrompt\`:** "A serene, minimalist flat-lay of a journal and a steaming mug of cacao on a rustic wooden table, embodying a soulful and authentic feeling, with earthy tones and soft natural light, film grain{{#if aspectRatio}}, ar {{aspectRatio}}{{/if}}"

Generate the carousel slides in the specified JSON format.`,
});


const defaultImageGenPromptTemplate = (brandHeart: any, offering: any) => `Generate a stunning, high-quality, and visually appealing advertisement image for the following offering. The image should be magnetic and aligned with a regenerative marketing philosophy.`;
const defaultVideoGenPromptTemplate = (brandHeart: any, offering: any) => `Generate a visually stunning, high-quality, 5-second video for the following offering. The video should be cinematic, magnetic and aligned with a regenerative marketing philosophy.`;


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
    
    const visualPromises: Promise<Partial<GenerateCreativeOutput>>[] = [];

    if (creativeTypes.includes('landing_page')) {
        visualPromises.push(generateLandingPage({ offeringId, creativePrompt: userCreativePrompt || 'Generate a beautiful landing page for this offering.' }).then(r => ({ landingPageHtml: r.htmlContent })));
    }
    
    if (creativeTypes.includes('video')) {
        const videoBasePrompt = userCreativePrompt || defaultVideoGenPromptTemplate(brandHeart, offering);
        
        const videoPromptPayload: (MediaPart | { text: string })[] = [{ text: videoBasePrompt }];
        if (referenceImageUrl) {
            videoPromptPayload.unshift({ media: { url: referenceImageUrl, contentType: 'image/jpeg' } });
        }

        visualPromises.push(ai.generate({
            model: googleAI.model(process.env.GENKIT_VIDEO_MODEL || 'veo-3.0-generate-preview'),
            prompt: videoPromptPayload,
            config: { aspectRatio: aspectRatio },
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

        visualPromises.push(masterImagePrompt({ brandHeart, offering, basePrompt: imageBasePrompt, aspectRatio }).then(async ({ output: promptOutput }) => {
            if (!promptOutput) {
                throw new Error('Master image prompt generation failed.');
            }
            const finalImagePrompt = promptOutput.text;
            let generationResult;
            if (referenceImageUrl) {
                generationResult = await ai.generate({
                    model: 'googleai/gemini-2.5-flash-image-preview',
                    prompt: [{ media: { contentType: 'image/jpeg', url: referenceImageUrl } }, { text: finalImagePrompt }],
                    config: { responseModalities: ['TEXT', 'IMAGE'] },
                });
            } else {
                generationResult = await ai.generate({
                    model: googleAI.model(process.env.GENKIT_IMAGE_GEN_MODEL || 'imagen-4.0-generate-preview-06-06'),
                    prompt: finalImagePrompt,
                });
            }
            return { imageUrl: generationResult.media?.url, finalPrompt: finalImagePrompt };
        }));
    }
    
    if (creativeTypes.includes('carousel')) {
        const carouselBasePrompt = userCreativePrompt || 'Generate a 3-5 slide carousel that tells a story about this offering.';
        
        visualPromises.push(carouselPrompt({ 
            brandHeart, 
            offering, 
            basePrompt: carouselBasePrompt,
            aspectRatio,
        }).then(async ({ output: carouselOutput }) => {
            if (carouselOutput?.slides) {

                const slidePromises = carouselOutput.slides.map(async (slide) => {
                    const finalSlidePrompt = slide.creativePrompt; // The prompt is now final and complete from the carouselPrompt

                    const { media } = await ai.generate({
                        model: googleAI.model(process.env.GENKIT_IMAGE_GEN_MODEL || 'imagen-4.0-generate-preview-06-06'),
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
