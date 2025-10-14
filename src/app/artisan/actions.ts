

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateCreativeForOffering as genCreativeFlow, type GenerateCreativeInput, type GenerateCreativeOutput, type CarouselSlide, type VideoScene } from '@/ai/flows/generate-creative-flow';
import { generateCreativePrompt as genCreativePromptFlow, type GenerateCreativePromptInput, type GenerateCreativePromptOutput } from '@/ai/flows/generate-creative-prompt-flow';
import { editImageWithInstruction as editImageFlow, type EditImageInput, type EditImageOutput } from '@/ai/flows/edit-image-flow';
import { regenerateCarouselSlide as regenerateSlideFlow, type RegenerateCarouselSlideInput, type RegenerateCarouselSlideOutput } from '@/ai/flows/regenerate-carousel-slide-flow';


import type { MediaPlanItem } from '@/app/funnels/actions';
import type { CalendarItem as ContentItem } from '../calendar/actions';

// Utility to convert camelCase keys to snake_case
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      (acc as any)[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

export type ArtisanItem = MediaPlanItem & {
    offerings: {
        title: { primary: string | null };
    } | null;
};

/**
 * Fetches items for the Artisan view for the current user.
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
 */
export async function getContentItem(mediaPlanItemId: string): Promise<ContentItem | null> {
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

    if (error) {
        console.error(`[ACTION: getContentItem] -- ERROR -- Error fetching content item ${mediaPlanItemId}:`, error);
        return null;
    }

    return data as ContentItem;
}


/**
 * Invokes the Genkit creative generation flow.
 */
export async function generateCreativeForOffering(input: GenerateCreativeInput): Promise<GenerateCreativeOutput> {
    try {
        return await genCreativeFlow(input);
    } catch (error: any) {
        console.error("Creative generation action failed:", error);
        throw new Error(`Failed to generate creative. Please try again. ${error.message}`);
    }
}

/**
 * Invokes the Genkit flow to regenerate a creative prompt.
 */
export async function generateCreativePrompt(input: GenerateCreativePromptInput): Promise<GenerateCreativePromptOutput>
{
    return genCreativePromptFlow(input);
}


type SaveContentInput = {
    offeringId: string;
    mediaPlanItemId?: string | null;
    copy: string | null;
    hashtags: string | null;
    creative_prompt: string | null;
    concept: string | null;
    objective: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
    carouselSlides: CarouselSlide[] | null;
    videoScript: VideoScene[] | null;
    landingPageHtml: string | null;
    status: 'draft' | 'ready_for_review' | 'scheduled' | 'published';
    scheduledAt?: string | null;
    media_format?: string;
    aspect_ratio?: string;
};


async function uploadBase64Media(supabase: any, base64: string, userId: string, offeringId: string, mediaType: 'image'
    | 'video'): Promise<string> {
    console.log(`[uploadBase64Media] -- START -- Uploading ${mediaType} for user ${userId}, offering ${offeringId}`);
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME || 'Alma';
    const extension = mediaType === 'image' ? 'png' : 'mp4';
    const contentType = mediaType === 'image' ? 'image/png' : 'video/mp4';
    const filePath = `${userId}/offerings_media_generated/${offeringId}/${crypto.randomUUID()}.${extension}`;

    const base64Data = base64.split(';base64,').pop();
    if (!base64Data) {
        throw new Error('Invalid Base64 media data. Cannot extract content.');
    }

    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
            contentType,
            upsert: false
        });

    if (uploadError) {
        console.error(`[uploadBase64Media] -- ERROR -- Upload to Supabase Storage failed for ${mediaType}:`,
    uploadError);
        throw new Error(`${mediaType} upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    console.log(`[uploadBase64Media] -- SUCCESS -- File uploaded. Public URL: ${publicUrl}`);
    return publicUrl;
}


/**
 * Creates a new content item (draft).
 */
export async function saveContent(input: SaveContentInput): Promise<ContentItem> {
    console.log('[ACTION: saveContent] -- START --');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    console.log('[ACTION: saveContent] User authenticated:', user.id);

    const { mediaPlanItemId, ...restOfInput } = input;
    console.log('[ACTION: saveContent] Input received:', restOfInput);

    if (restOfInput.imageUrl && restOfInput.imageUrl.startsWith('data:image')) {
        console.log('[ACTION: saveContent] Found base64 image, starting upload...');
        restOfInput.imageUrl = await uploadBase64Media(supabase, restOfInput.imageUrl, user.id, restOfInput.offeringId,
    'image');
        console.log('[ACTION: saveContent] Image upload complete, URL:', restOfInput.imageUrl);
    }
    if (restOfInput.videoUrl && restOfInput.videoUrl.startsWith('data:video')) {
        restOfInput.videoUrl = await uploadBase64Media(supabase, restOfInput.videoUrl, user.id, restOfInput.offeringId,
    'video');
    }
    if (restOfInput.carouselSlides) {
        console.log('[ACTION: saveContent] Found carousel slides, processing...');
        restOfInput.carouselSlides = await Promise.all(
            restOfInput.carouselSlides.map(async (slide) => {
                if (slide.imageUrl && slide.imageUrl.startsWith('data:image')) {
                    slide.imageUrl = await uploadBase64Media(supabase, slide.imageUrl, user.id, restOfInput.offeringId,
    'image');
                }
                return slide;
            })
        );
        console.log('[ACTION: saveContent] Carousel processing complete.');
    }

    const dbPayload = toSnakeCase(restOfInput);
    dbPayload.user_id = user.id;
    if (mediaPlanItemId) {
        const { data } = await supabase.from('media_plan_items').select('media_plan_id').eq('id', mediaPlanItemId).
    single();
        dbPayload.media_plan_id = data?.media_plan_id || null;
    }

    if (dbPayload.video_script) dbPayload.video_script = JSON.stringify(dbPayload.video_script);

    console.log('[ACTION: saveContent] Final DB payload for insert:', dbPayload);
    const { data: newMediaItem, error: createError } = await supabase
        .from('media_plan_items')
        .insert(dbPayload)
        .select(`*, offerings(*), user_channel_settings(channel_name)`)
        .single();

    if (createError) {
        console.error("Error creating content:", createError);
        throw new Error(`Could not create new draft item. DB Error: ${createError.message}`);
    }

    console.log('[ACTION: saveContent] -- SUCCESS -- New item created:', newMediaItem);
    revalidatePath('/artisan');
    revalidatePath('/calendar');
    return newMediaItem as unknown as ContentItem;
}

/**
 * Updates an existing content item using a strict 'whitelist' approach.
 */
export async function updateContent(mediaPlanItemId: string, updates: Partial<SaveContentInput>): Promise<ContentItem>
{
    console.log(`[ACTION: updateContent V3] -- START -- Updating item ID: ${mediaPlanItemId}`);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: existingItem, error: fetchError } = await supabase
        .from('media_plan_items')
        .select('offering_id')
        .eq('id', mediaPlanItemId)
        .single();

    if (fetchError || !existingItem) {
        console.error(`[ACTION: updateContent V3] -- ERROR -- Could not fetch existing item:`, fetchError);
        throw new Error('Failed to find the content item to update.');
    }
    const offeringId = updates.offeringId || existingItem.offering_id;
    if (!offeringId) {
        throw new Error('FATAL: offering_id is missing and could not be retrieved.');
    }
    console.log(`[ACTION: updateContent V3] -- INFO -- Using offering_id: ${offeringId}`);

    const payloadForDb: { [key: string]: any } = {};

    const allowedFields: (keyof SaveContentInput)[] = [
        'copy', 'hashtags', 'creative_prompt', 'concept', 'objective',
        'status', 'scheduledAt', 'media_format', 'aspect_ratio', 'landingPageHtml',
        'videoScript'
    ];

    allowedFields.forEach(key => {
        if (updates[key] !== undefined) {
            payloadForDb[key] = updates[key];
        }
    });

    if (updates.imageUrl && updates.imageUrl.startsWith('data:image')) {
        payloadForDb.imageUrl = await uploadBase64Media(supabase, updates.imageUrl, user.id, offeringId, 'image');
    } else if (updates.imageUrl !== undefined) {
        payloadForDb.imageUrl = updates.imageUrl;
    }

    if (updates.videoUrl && updates.videoUrl.startsWith('data:video')) {
        payloadForDb.videoUrl = await uploadBase64Media(supabase, updates.videoUrl, user.id, offeringId, 'video');
    } else if (updates.videoUrl !== undefined) {
        payloadForDb.videoUrl = updates.videoUrl;
    }

    if (updates.carouselSlides) {
        payloadForDb.carouselSlides = await Promise.all(
            updates.carouselSlides.map(async (slide) => {
                if (slide.imageUrl && slide.imageUrl.startsWith('data:image')) {
                    const newImageUrl = await uploadBase64Media(supabase, slide.imageUrl, user.id, offeringId, 'image'
    );
                    return { ...slide, imageUrl: newImageUrl };
                }
                return slide;
            })
        );
    }

    const dbPayload = toSnakeCase(payloadForDb);
    dbPayload.updated_at = new Date().toISOString();

    if (dbPayload.video_script) dbPayload.video_script = JSON.stringify(dbPayload.video_script);

    console.log('[ACTION: updateContent V3] -- PAYLOAD -- Final payload for DB update:', JSON.stringify(dbPayload, null
    , 2));

    const { data, error } = await supabase
        .from('media_plan_items')
        .update(dbPayload)
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id)
        .select(`*, offerings(*), user_channel_settings(channel_name)`)
        .single();

    if (error) {
        console.error("[ACTION: updateContent V3] -- ERROR -- Error during Supabase update:", error);
        throw new Error(`Failed to update content. DB Error: ${error.message}`);
    }

    console.log(`[ACTION: updateContent V3] -- SUCCESS -- Item ${mediaPlanItemId} updated successfully.`);
    revalidatePath('/artisan');
    revalidatePath('/calendar');
    return data as unknown as ContentItem;
}


/**
 * Deletes a content item. The associated media cleanup is handled by a database trigger.
 */
export async function deleteContent(mediaPlanItemId: string): Promise<{ message: string }> {
    console.log(`[ACTION: deleteContent] -- START -- Deleting item ID: ${mediaPlanItemId}`);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('media_plan_items')
        .delete()
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id);

    if (error) {
        console.error("[ACTION: deleteContent] -- ERROR -- Error during Supabase delete:", error);
        throw new Error(`Failed to delete content. DB Error: ${error.message}`);
    }

    console.log(`[ACTION: deleteContent] -- SUCCESS -- Item ${mediaPlanItemId} deleted.`);
    revalidatePath('/artisan');
    revalidatePath('/calendar');
    return { message: 'Content item deleted successfully. Associated media will be cleaned up automatically.' };
}



/**
 * Updates the status of a media plan item.
 */
export async function updateMediaPlanItemStatus(mediaPlanItemId: string, newStatus: 'ready_for_review' |
    'queued_for_generation' | 'draft' | 'scheduled' | 'published' ): Promise<{ message: string }> {
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
 */
export async function editImageWithInstruction(input: EditImageInput): Promise<EditImageOutput> {
    return editImageFlow(input);
}

/**
 * Invokes the Genkit flow to regenerate a single carousel slide image.
 */
export async function regenerateCarouselSlide(input: RegenerateCarouselSlideInput): Promise<
    RegenerateCarouselSlideOutput> {
    return regenerateSlideFlow(input);
}

