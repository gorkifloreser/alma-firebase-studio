
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateCreativeForOffering as genCreativeFlow, type GenerateCreativeInput, type GenerateCreativeOutput, type CarouselSlide, type VideoScene } from '@/ai/flows/generate-creative-flow';
import { generateCreativePrompt as genCreativePromptFlow, type GenerateCreativePromptInput, type GenerateCreativePromptOutput } from '@/ai/flows/generate-creative-prompt-flow';
import { editImageWithInstruction as editImageFlow, type EditImageInput, type EditImageOutput } from '@/ai/flows/edit-image-flow';
import { regenerateCarouselSlide as regenerateSlideFlow, type RegenerateCarouselSlideInput, type RegenerateCarouselSlideOutput } from '@/ai/flows/regenerate-carousel-slide-flow';


import type { MediaPlanItem } from '@/app/funnels/actions';
import type { CalendarItem as ContentItem } from '../calendar/actions';

export type ArtisanItem = MediaPlanItem & {
    offerings: {
        title: { primary: string | null };
    } | null;
};

/**
 * Fetches items for the Artisan view for the current user.
 * This includes items that are queued for generation, in progress, or ready for review.
 * @returns {Promise<ArtisanItem[]>} A promise that resolves to an array of artisan items.
 */
export async function getArtisanItems(mediaPlanId?: string): Promise<ArtisanItem[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    let query = supabase
        .from('media_plan_items')
        .select(`
            *,
            user_channel_settings (channel_name),
            offerings (title)
        `)
        .eq('user_id', user.id)
        .in('status', ['queued_for_generation', 'generation_in_progress', 'ready_for_review', 'scheduled', 'published']);

    if (mediaPlanId) {
        query = query.eq('media_plan_id', mediaPlanId);
    }
        
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching artisan items:", error);
        throw new Error("Could not fetch items for the Artisan view.");
    }

    return data as unknown as ArtisanItem[];
}


/**
 * Fetches a single content item by its ID.
 * @param {string} mediaPlanItemId - The ID of the item to fetch.
 * @returns {Promise<ContentItem | null>} The full content item or null if not found.
 */
export async function getContentItem(mediaPlanItemId: string): Promise<ContentItem | null> {
    console.log(`[ACTION: getContentItem] -- START -- Fetching content for media_plan_item_id: ${mediaPlanItemId}`);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('media_plan_items')
        .select(`
            *,
            offerings (title),
            user_channel_settings (channel_name)
        `)
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id)
        .single();
    
    console.log('[ACTION: getContentItem] -- DB_RESPONSE -- Raw data from Supabase:', data);
    
    if (error) {
        console.error(`[ACTION: getContentItem] -- ERROR -- Error fetching content item ${mediaPlanItemId}:`, error);
        return null;
    }
    
    console.log(`[ACTION: getContentItem] -- SUCCESS -- Successfully fetched content for ${mediaPlanItemId}. Image URL: ${data?.image_url}`);
    return data as ContentItem;
}


/**
 * Invokes the Genkit creative generation flow.
 * @param {GenerateCreativeInput} input The offering ID and creative type.
 * @returns {Promise<GenerateCreativeOutput>} The generated creative.
 * @throws {Error} If the generation fails.
 */
export async function generateCreativeForOffering(input: GenerateCreativeInput): Promise<GenerateCreativeOutput> {
    try {
        const result = await genCreativeFlow(input);
        return result;
    } catch (error: any) {
        console.error("Creative generation action failed:", error);
        throw new Error(`Failed to generate creative. Please try again. ${error.message}`);
    }
}

/**
 * Invokes the Genkit flow to regenerate a creative prompt.
 * @param {GenerateCreativePromptInput} input The context for regeneration.
 * @returns {Promise<GenerateCreativePromptOutput>} The new creative prompt.
 */
export async function generateCreativePrompt(input: GenerateCreativePromptInput): Promise<GenerateCreativePromptOutput> {
    return genCreativePromptFlow(input);
}


type SaveContentInput = {
    offeringId: string;
    contentBody: { primary: string | null; secondary: string | null; } | null;
    imageUrl: string | null;
    carouselSlides: CarouselSlide[] | null;
    videoScript: VideoScene[] | null;
    landingPageHtml: string | null;
    status: 'draft' | 'ready_for_review' | 'scheduled' | 'published';
    mediaPlanItemId?: string | null;
    scheduledAt?: string | null;
    media_format?: string;
    aspect_ratio?: string;
};


async function uploadBase64Image(supabase: any, base64: string, userId: string, offeringId: string): Promise<string> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME || 'Alma';
    const filePath = `${userId}/offerings_media_generated/${offeringId}/${crypto.randomUUID()}.png`;
    
    const base64Data = base64.split(';base64,').pop();
    if (!base64Data) {
        throw new Error('Invalid Base64 image data. Cannot extract image content.');
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: false
        });

    if (uploadError) {
        console.error('[uploadBase64Image] -- ERROR -- Fallo en la subida a Supabase Storage:', uploadError);
        throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrl;
}


/**
 * Saves or updates content within a media plan item.
 * @param {SaveContentInput} input - The content data to save.
 * @returns {Promise<ContentItem>} The updated media plan item, which now doubles as the content item.
 */
export async function saveContent(input: SaveContentInput): Promise<ContentItem> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    const { 
        mediaPlanItemId, 
        contentBody, 
        imageUrl, 
        carouselSlides, 
        videoScript, 
        landingPageHtml, 
        status, 
        scheduledAt,
        offeringId,
        media_format,
        aspect_ratio,
    } = input;

    let currentMediaPlanItemId = mediaPlanItemId;

    if (!currentMediaPlanItemId && status !== 'draft') {
        // If it's a new custom item, it should start as a draft.
        // We'll create the record first.
        const { data: newMediaItem, error: createError } = await supabase.from('media_plan_items').insert({
            user_id: user.id,
            offering_id: offeringId,
            status: 'draft',
            concept: 'Custom Content'
        }).select().single();

        if (createError) {
            throw new Error(`Could not create a new draft item. DB Error: ${createError.message}`);
        }
        currentMediaPlanItemId = newMediaItem.id;
    }


    let finalImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
        finalImageUrl = await uploadBase64Image(supabase, imageUrl, user.id, offeringId);
    }
    
    let finalCarouselSlides = carouselSlides;
    if (carouselSlides) {
        finalCarouselSlides = await Promise.all(
            carouselSlides.map(async (slide) => {
                if (slide.imageUrl && slide.imageUrl.startsWith('data:image')) {
                    const newUrl = await uploadBase64Image(supabase, slide.imageUrl, user.id, offeringId);
                    return { ...slide, imageUrl: newUrl };
                }
                return slide;
            })
        );
    }

        const payload: any = {
            copy: contentBody?.primary,
            content_body: contentBody ? JSON.stringify(contentBody) : null,
            image_url: finalImageUrl,
            carousel_slides: finalCarouselSlides ? JSON.stringify(finalCarouselSlides) : null,
            video_script: videoScript ? JSON.stringify(videoScript) : null,
            landing_page_html: landingPageHtml,
            status: status,
            scheduled_at: scheduledAt || null,
            updated_at: new Date().toISOString(),
            media_format: media_format,
            aspect_ratio: aspect_ratio,
        };
    
    const { data, error } = await supabase
        .from('media_plan_items')
        .update(payload)
        .eq('id', currentMediaPlanItemId!)
        .select(`
            *, 
            offerings(*), 
            user_channel_settings(channel_name)
        `)
        .single();

    if (error) {
        throw new Error(`Failed to save content to database. DB Error: ${error.message}`);
    }
    
    revalidatePath('/calendar');
    revalidatePath('/artisan');
    
    return data as unknown as ContentItem;
}


/**
 * Updates the status of a media plan item.
 * @param {string} mediaPlanItemId - The ID of the media plan item to update.
 * @param {string} newStatus - The new status from the media_plan_item_status enum.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function updateMediaPlanItemStatus(mediaPlanItemId: string, newStatus: 'ready_for_review' | 'queued_for_generation' | 'draft' | 'scheduled' | 'published' ): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('media_plan_items')
        .update({ status: newStatus })
        .eq('id', mediaPlanItemId);

    if (error) {
        console.error('Error updating media plan item status:', error);
        throw new Error(`Could not update item status. DB Error: ${error.message}`);
    }

    revalidatePath('/artisan');
    return { message: `Media plan item status updated to ${newStatus}.` };
}

/**
 * Invokes the Genkit flow to edit an image based on a text instruction.
 * @param {EditImageInput} input The image data URI and the instruction.
 * @returns {Promise<EditImageOutput>} The edited image data URI.
 */
export async function editImageWithInstruction(input: EditImageInput): Promise<EditImageOutput> {
    return editImageFlow(input);
}

/**
 * Invokes the Genkit flow to regenerate a single carousel slide image.
 * @param {RegenerateCarouselSlideInput} input The context for regenerating the slide.
 * @returns {Promise<RegenerateCarouselSlideOutput>} The regenerated slide's image URL and final prompt.
 */
export async function regenerateCarouselSlide(input: RegenerateCarouselSlideInput): Promise<RegenerateCarouselSlideOutput> {
    return regenerateSlideFlow(input);
}

    