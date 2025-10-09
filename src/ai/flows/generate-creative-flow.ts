
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

const VideoSceneSchema = z.object({
    scene_description: z.string().describe("A brief description of what happens in this scene."),
    video_prompt: z.string().describe("A detailed, ready-to-use prompt for an AI video generator to create this specific 2-3 second clip."),
    cover_image_prompt: z.string().describe("A detailed, ready-to-use prompt for an AI image generator to create the cover image or first frame for this scene."),
    video_url: z.string().optional(),
    cover_image_url: z.string().optional(),
});
export type VideoScene = z.infer<typeof VideoSceneSchema>;

const GenerateCreativeOutputSchema = z.object({
  content: z.object({
      primary: z.string().describe('The marketing content in the primary language.'),
      secondary: z.string().optional().describe('The marketing content in the secondary language.'),
  }).optional(),
  imageUrl: z.string().optional().describe('The URL of the generated image. This will be a data URI.'),
  finalPrompt: z.string().optional().describe("The final, full prompt that was sent to the image generation model."),
  carouselSlides: z.array(CarouselSlideSchema).optional().describe('An array of generated carousel slides, each with text and an image.'),
  videoScript: z.array(VideoSceneSchema).optional().describe("A storyboard of video scenes, each with prompts and generated URLs."),
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
  prompt: `You are an expert marketing strategist and AI prompt engineer specializing in creating visually cohesive and highly engaging social media carousels.

**Your Goal:** Deconstruct the user's Creative Brief into a sequence of 3-5 slides. For each slide, you must generate a title, body copy, and a **complete, final, detailed image generation prompt** that maintains stylistic consistency and leaves room for text overlays.

---
**1. THE BRAND's SOUL (Tone & Visuals):**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Values: {{brandHeart.values.primary}}
- **Visual Identity (The North Star for ALL Images):** {{brandHeart.visual_identity.primary}}

**2. THE OFFERING (The Subject):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**3. THE USER's CREATIVE BRIEF (The Main Story):**
{{#if basePrompt}}
- "{{basePrompt}}"
{{else}}
- Create a carousel that tells a story about the offering, starting with a problem or desire, showing the transformation, and ending with a call to action.
{{/if}}

---
**YOUR TASK:**

Based on all the information above, create a 3-5 slide carousel script. For each slide, you must adhere to these two critical rules for the \`creativePrompt\`:

**Rule #1: VISUAL COHESION**
- All \`creativePrompt\` fields MUST share a consistent artistic style, color palette, and mood. Use the brand's **Visual Identity** as the primary guide for this. The entire carousel must feel like a single, unified piece of art.

**Rule #2: COMPOSITION FOR TEXT**
- Each \`creativePrompt\` MUST instruct the AI to compose the image with significant "negative space" or a clean area at the top. The main subject should be framed in the lower two-thirds of the image. This is crucial for adding text overlays later. Use phrases like "negative space at the top", "frame the subject in the lower two-thirds", or "composition leaves ample clean space at the top for text".

For each slide, generate:
1.  **title:** A short, punchy title.
2.  **body:** Brief, engaging body text.
3.  **creativePrompt:** A **final, complete, and detailed prompt** for an AI image generator that follows the two rules above, incorporating the specific subject for that slide, the brand's visual identity, and the aspect ratio.

   **Example of a good \`creativePrompt\`:** "A serene, minimalist photo of a steaming mug of cacao on a rustic wooden table, framed in the lower two-thirds of the image leaving ample negative space at the top. The image should embody a soulful and authentic feeling, with earthy tones and soft natural light, film grain{{#if aspectRatio}}, ar {{aspectRatio}}{{/if}}"

Generate the carousel slides in the specified JSON format.`,
});


const videoPlanPrompt = ai.definePrompt({
    name: 'generateVideoPlanPrompt',
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
            scenes: z.array(VideoSceneSchema.pick({
                scene_description: true,
                video_prompt: true,
                cover_image_prompt: true,
            })).describe("An array of 3-5 video scenes that tell a cohesive story."),
        })
    },
    prompt: `You are a viral video director and AI prompt engineer. Your goal is to create a storyboard for a short, compelling video ad.

**Your Mission:** Break down the user's creative brief into a sequence of 3-5 distinct scenes. For each scene, you must generate a description, a video generation prompt, and a cover image prompt.

---
**1. THE BRAND's SOUL (Tone & Visuals):**
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- **Visual Identity (The North Star for ALL visuals):** {{brandHeart.visual_identity.primary}}

**2. THE OFFERING (The Subject):**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}

**3. THE USER's CREATIVE BRIEF (The Story):**
{{#if basePrompt}}
- "{{basePrompt}}"
{{else}}
- Create a short, viral-style video that tells a story about the offering. Start with a hook, present a problem, show the transformation/solution offered, and end on a high note.
{{/if}}

---
**YOUR TASK:**

Create a storyboard with 3-5 scenes. For each scene, you must generate:

1.  **scene_description:** A brief (1-2 sentence) description of the action or mood of this scene.
2.  **video_prompt:** A detailed, ready-to-use prompt for an AI video generator (like Veo) to create a **2-3 second video clip**. This prompt must be visually rich, include the aspect ratio, and be consistent with the brand's **Visual Identity**.
3.  **cover_image_prompt:** A detailed, ready-to-use prompt for an AI image generator (like Imagen) to create the **first frame or cover image** for this scene. This must be visually consistent with the video prompt and the brand's identity.

**CRITICAL RULE FOR ALL PROMPTS:** Maintain a consistent artistic style, color palette, and mood across all scenes. Use the brand's **Visual Identity** as the primary guide. The entire video must feel like a single, unified piece.

Generate the storyboard in the specified JSON format.
`,
});


const defaultImageGenPromptTemplate = (brandHeart: any, offering: any) => `Generate a stunning, high-quality, and visually appealing advertisement image for the following offering. The image should be magnetic and aligned with a regenerative marketing philosophy.`;


export const generateCreativeFlow = ai.defineFlow(
  {
    name: 'generateCreativeFlow',
    inputSchema: GenerateCreativeInputSchema,
    outputSchema: GenerateCreativeOutputSchema,
  },
  async ({ offeringId, creativeTypes, aspectRatio, creativePrompt: userCreativePrompt, referenceImageUrl }) => {
    
    async function downloadVideo(video: MediaPart): Promise<string> {
      console.log('[downloadVideo] START - Downloading video from URL:', video.media!.url);
      const fetch = (await import('node-fetch')).default;
      try {
        const videoDownloadResponse = await fetch(`${video.media!.url}&key=${process.env.GEMINI_API_KEY}`);
        if (!videoDownloadResponse.ok) {
          const errorText = await videoDownloadResponse.text();
          console.error(`[downloadVideo] ERROR - Failed to fetch video. Status: ${videoDownloadResponse.status}`, errorText);
          throw new Error(`Failed to fetch video: ${videoDownloadResponse.statusText}`);
        }
        const buffer = await videoDownloadResponse.arrayBuffer();
        const base64String = Buffer.from(buffer).toString('base64');
        console.log(`[downloadVideo] SUCCESS - Video downloaded. Buffer size: ${buffer.byteLength} bytes.`);
        const dataUri = `data:video/mp4;base64,${base64String}`;
        console.log(`[downloadVideo] FINISH - Converted to data URI. Length: ${dataUri.length}`);
        return dataUri;
      } catch (error) {
        console.error('[downloadVideo] CATCH BLOCK - An error occurred during fetch or conversion:', error);
        throw new Error('Failed to download or process video data.');
      }
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
        const videoBasePrompt = userCreativePrompt || 'Create a short, viral-style video about this offering.';
        
        visualPromises.push(videoPlanPrompt({
            brandHeart,
            offering,
            basePrompt: videoBasePrompt,
            aspectRatio
        }).then(async ({ output: planOutput }) => {
            if (!planOutput?.scenes) throw new Error('Video plan generation failed.');

            const scenePromises = planOutput.scenes.map(async (scene) => {
                const videoGenPromise = ai.generate({
                    model: googleAI.model(process.env.GENKIT_VIDEO_GEN_MODEL || 'veo-2.0-generate-001'),
                    prompt: [{ text: scene.video_prompt }],
                    config: { aspectRatio, durationSeconds: 3 },
                });

                const imageGenPromise = ai.generate({
                    model: googleAI.model(process.env.GENKIT_IMAGE_GEN_MODEL || 'imagen-4.0-generate-preview-06-06'),
                    prompt: scene.cover_image_prompt,
                });

                const [{ operation: videoOperation }, { media: imageMedia }] = await Promise.all([videoGenPromise, imageGenPromise]);
                
                if (!videoOperation) throw new Error('Expected video operation.');
                let checkedOp = videoOperation;
                while (!checkedOp.done) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    checkedOp = await ai.checkOperation(checkedOp);
                }
                if (checkedOp.error) throw new Error(`Video scene generation failed: ${checkedOp.error.message}`);
                
                const video = checkedOp.output?.message?.content.find(p => !!p.media);
                
                return {
                    ...scene,
                    video_url: video ? await downloadVideo(video) : undefined,
                    cover_image_url: imageMedia?.url,
                };
            });

            return { videoScript: await Promise.all(scenePromises) };
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
    
    console.log('[generateCreativeFlow] FINAL OUTPUT to be sent to client:', { ...output, videoScript: output.videoScript ? `[${output.videoScript.length} scenes]` : null });
    return output;
  }
);


export async function generateCreativeForOffering(input: GenerateCreativeInput): Promise<GenerateCreativeOutput> {
    return generateCreativeFlow(input);
}
