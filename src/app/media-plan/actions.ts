
'use server';

import { generateMediaPlanForStrategy as generateMediaPlanFlow } from '@/ai/flows/generate-media-plan-flow';
import type { GenerateMediaPlanInput, GenerateMediaPlanOutput } from '@/ai/flows/generate-media-plan-flow';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
 * Saves or updates content for an offering, initiated from the media plan.
 * @param {SaveContentInput} input - The content data to save.
 * @returns {Promise<{ message: string }>} A success message.
 */
type SaveContentInput = {
    offeringId: string;
    contentBody: { primary: string | null; secondary: string | null; } | null;
    status: 'draft' | 'approved' | 'scheduled' | 'published';
    // Add other fields from the content generation dialog as needed
    imageUrl?: string | null;
    carouselSlidesText?: string | null;
    videoScript?: string | null;
    sourcePlan?: {
        channel: string;
        format: string;
        description: string;
    } | null;
};

export async function saveContent(input: SaveContentInput): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { offeringId, contentBody, status, imageUrl, carouselSlidesText, videoScript, sourcePlan } = input;

    const payload = {
        user_id: user.id,
        offering_id: offeringId,
        content_body: contentBody,
        status: status,
        image_url: imageUrl,
        carousel_slides_text: carouselSlidesText,
        video_script: videoScript,
        source_plan: sourcePlan,
    };

    const { error } = await supabase.from('content').insert(payload);

    if (error) {
        console.error('Error saving content:', error.message);
        throw new Error('Could not save the content. Please try again.');
    }
    
    revalidatePath('/calendar');
    return { message: 'Content approved and saved successfully.' };
}
