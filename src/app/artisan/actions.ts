
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateContentForOffering as genContentFlow, GenerateContentInput, GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import { generateCreativeForOffering as genCreativeFlow, GenerateCreativeInput, GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
import type { PlanItem } from '@/ai/flows/generate-media-plan-flow';

export type QueueItem = {
    id: string;
    created_at: string;
    status: 'pending' | 'completed' | 'failed';
    offering_id: string;
    media_plan_items: PlanItem & { media_plan_id: string };
}

/**
 * Fetches pending items from the content generation queue for the current user.
 * @returns {Promise<QueueItem[]>} A promise that resolves to an array of queue items.
 */
export async function getQueueItems(mediaPlanId?: string): Promise<QueueItem[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    let query = supabase
        .from('content_generation_queue')
        .select(`
            id,
            created_at,
            status,
            offering_id,
            media_plan_items!inner (
                *,
                media_plan_id
            )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending');

    if (mediaPlanId) {
        query = query.eq('media_plan_items.media_plan_id', mediaPlanId);
    }
        
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching queue items:", error);
        throw new Error("Could not fetch the content generation queue.");
    }

    return data as unknown as QueueItem[];
}

/**
 * Invokes the Genkit content generation flow.
 * @param {GenerateContentInput} input The offering ID.
 * @returns {Promise<GenerateContentOutput>} The generated content.
 */
export async function generateContentForOffering(input: GenerateContentInput): Promise<GenerateContentOutput> {
    return genContentFlow(input);
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
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function saveContent(input: SaveContentInput): Promise<{ message: string }> {
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

    const { error } = await supabase.from('content').insert(payload);

    if (error) {
        console.error('Error saving content:', error.message);
        throw new Error('Could not save the content. Please try again.');
    }
    
    revalidatePath('/calendar');
    revalidatePath('/artisan');
    return { message: 'Content approved and saved successfully.' };
}

/**
 * Updates the status of a queue item.
 * @param {string} queueItemId - The ID of the queue item to update.
 * @param {'completed' | 'failed'} newStatus - The new status.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function updateQueueItemStatus(queueItemId: string, newStatus: 'completed' | 'failed'): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('content_generation_queue')
        .update({ status: newStatus })
        .eq('id', queueItemId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating queue item status:', error);
        throw new Error('Could not update queue item status.');
    }

    revalidatePath('/artisan');
    return { message: `Queue item marked as ${newStatus}.` };
}

    
