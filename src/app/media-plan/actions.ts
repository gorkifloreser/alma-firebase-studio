
'use server';

import { 
    generateMediaPlanForStrategy as generateMediaPlanFlow,
    regeneratePlanItem as regeneratePlanItemFlow
} from '@/ai/flows/generate-media-plan-flow';
import type { 
    GenerateMediaPlanInput, 
    GenerateMediaPlanOutput,
    RegeneratePlanItemInput,
    PlanItem as PlanItemType
} from '@/ai/flows/generate-media-plan-flow';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type PlanItem = PlanItemType;

export type MediaPlan = {
    id: string;
    user_id: string;
    funnel_id: string;
    plan_items: PlanItem[];
    created_at: string;
    updated_at: string;
};

/**
 * Server action to invoke the Genkit media plan generation flow for a specific strategy.
 * @param {GenerateMediaPlanInput} input - Contains the funnelId of the strategy.
 * @returns {Promise<GenerateMediaPlanOutput>} The AI-generated media plan.
 */
export async function generateMediaPlan(input: GenerateMediaPlanInput): Promise<GenerateMediaPlanOutput> {
    try {
        const result = await generateMediaPlanFlow(input);
        return result;
    } catch (error: any) {
        console.error("Media Plan generation action failed:", error);
        throw new Error(`Failed to generate media plan: ${error.message}`);
    }
}

/**
 * Server action to invoke the Genkit plan item regeneration flow.
 * @param {RegeneratePlanItemInput} input - Contains context for regeneration.
 * @returns {Promise<PlanItem>} The newly generated plan item.
 */
export async function regeneratePlanItem(input: RegeneratePlanItemInput): Promise<PlanItem> {
    try {
        const result = await regeneratePlanItemFlow(input);
        return result;
    } catch (error: any) {
        console.error("Plan item regeneration action failed:", error);
        throw new Error(`Failed to regenerate plan item: ${error.message}`);
    }
}


/**
 * Saves a new media plan to the database.
 * @param {string} funnelId The ID of the strategy this plan belongs to.
 * @param {MediaPlan['plan_items']} planItems The array of content ideas.
 * @returns {Promise<MediaPlan>} The newly created media plan.
 */
export async function saveMediaPlan(funnelId: string, planItems: PlanItem[]): Promise<MediaPlan> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('media_plans')
        .insert({
            user_id: user.id,
            funnel_id: funnelId,
            plan_items: planItems,
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error saving media plan:', error);
        throw new Error('Could not save the media plan.');
    }

    revalidatePath('/media-plan');
    return data;
}

/**
 * Updates an existing media plan in the database.
 * @param {string} planId The ID of the media plan to update.
 * @param {MediaPlan['plan_items']} planItems The updated array of content ideas.
 * @returns {Promise<MediaPlan>} The updated media plan.
 */
export async function updateMediaPlan(planId: string, planItems: PlanItem[]): Promise<MediaPlan> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('media_plans')
        .update({
            plan_items: planItems,
            updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .eq('user_id', user.id)
        .select()
        .single();
        
    if (error) {
        console.error('Error updating media plan:', error);
        throw new Error('Could not update the media plan.');
    }

    revalidatePath('/media-plan');
    return data;
}

/**
 * Fetches all media plans for the current user.
 * @returns {Promise<MediaPlan[]>} A list of media plans.
 */
export async function getMediaPlans(): Promise<MediaPlan[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('media_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching media plans:', error);
        throw new Error('Could not fetch media plans.');
    }

    return data;
}


/**
 * Deletes a media plan from the database.
 * @param {string} planId The ID of the media plan to delete.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function deleteMediaPlan(planId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('media_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting media plan:', error);
        throw new Error('Could not delete the media plan.');
    }

    revalidatePath('/media-plan');
    return { message: 'Media plan deleted successfully.' };
}


/**
 * Saves or updates content for an offering, initiated from the media plan.
 * @param {SaveContentInput} input - The content data to save.
 * @returns {Promise<{ message: string }>} A success message.
 */
type SaveContentInput = {
    offeringId: string;
    contentBody: { primary: string | null; secondary: string | null; } | null;
    status: 'draft' | 'approved' | 'scheduled' | 'published';
    imageUrl?: string | null;
    carouselSlidesText?: string | null;
    videoScript?: string | null;
    sourcePlan?: {
        channel: string;
        format: string;
        copy: string;
        hashtags: string;
        creativePrompt: string;
    } | null;
    mediaPlanItemId?: string; // To link back to the plan item
};

export async function saveContent(input: SaveContentInput): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { offeringId, contentBody, status, imageUrl, carouselSlidesText, videoScript, sourcePlan, mediaPlanItemId } = input;

    const payload = {
        user_id: user.id,
        offering_id: offeringId,
        content_body: contentBody,
        status: status,
        image_url: imageUrl,
        carousel_slides_text: carouselSlidesText,
        video_script: videoScript,
        source_plan: sourcePlan,
        media_plan_item_id: mediaPlanItemId,
    };

    const { error } = await supabase.from('content').insert(payload);

    if (error) {
        console.error('Error saving content:', error.message);
        throw new Error('Could not save the content. Please try again.');
    }
    
    revalidatePath('/calendar');
    return { message: 'Content approved and saved successfully.' };
}
