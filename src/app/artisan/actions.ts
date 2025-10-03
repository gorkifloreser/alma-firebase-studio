

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateCreativeForOffering as genCreativeFlow, type GenerateCreativeInput, type GenerateCreativeOutput, type CarouselSlide } from '@/ai/flows/generate-creative-flow';
import { generateCreativePrompt as genCreativePromptFlow, type GenerateCreativePromptInput, type GenerateCreativePromptOutput } from '@/ai/flows/generate-creative-prompt-flow';
import { editImageWithInstruction as editImageFlow, type EditImageInput, type EditImageOutput } from '@/ai/flows/edit-image-flow';
import { regenerateCarouselSlide as regenerateSlideFlow, type RegenerateCarouselSlideInput, type RegenerateCarouselSlideOutput } from '@/ai/flows/regenerate-carousel-slide-flow';


import type { MediaPlanItem } from '@/app/funnels/actions';
import type { ContentItem } from '../calendar/actions';

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
        .in('status', ['queued_for_generation', 'generation_in_progress', 'ready_for_review']);

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
    videoUrl: string | null;
    landingPageHtml: string | null;
    status: 'draft' | 'approved' | 'scheduled' | 'published';
    mediaPlanItemId?: string | null;
    scheduledAt?: string | null;
};

/**
 * Saves or updates content for an offering.
 * @param {SaveContentInput} input - The content data to save.
 * @returns {Promise<ContentItem>} The saved content item.
 */
export async function saveContent(input: SaveContentInput): Promise<ContentItem> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { offeringId, contentBody, imageUrl, carouselSlides, videoUrl, landingPageHtml, status, mediaPlanItemId, scheduledAt } = input;

    const payload: any = {
        user_id: user.id,
        offering_id: offeringId,
        content_body: contentBody,
        image_url: imageUrl,
        carousel_slides: carouselSlides,
        video_url: videoUrl,
        landing_page_html: landingPageHtml,
        status: status,
        media_plan_item_id: mediaPlanItemId || null,
        scheduled_at: scheduledAt || null,
    };

    const { data, error } = await supabase.from('content').insert(payload).select(`*, offerings(*), media_plan_items(*, user_channel_settings(channel_name))`).single();

    if (error) {
        console.error('Error saving content:', error.message);
        throw new Error('Could not save the content. Please try again.');
    }
    
    revalidatePath('/calendar');
    revalidatePath('/artisan');
    return data as ContentItem;
}

/**
 * Updates the status of a media plan item.
 * @param {string} mediaPlanItemId - The ID of the media plan item to update.
 * @param {string} newStatus - The new status from the media_plan_item_status enum.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function updateMediaPlanItemStatus(mediaPlanItemId: string, newStatus: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('media_plan_items')
        .update({ status: newStatus })
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating media plan item status:', error);
        throw new Error('Could not update media plan item status.');
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
    

