
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createContentFromTestimonialFlow } from '@/ai/flows/create-content-from-testimonial-flow';
import { subDays } from 'date-fns';

export type HarvestItem = {
    id: string; // This will be the media_plan id
    created_at: string; // This will be the campaign_end_date
    status: 'to_deliver' | 'in_progress' | 'completed';
    // The offerings relation is now on the campaign, let's represent that
    campaign_title: string;
};

export type Testimonial = {
    id: string;
    offering_id: string;
    customer_name: string;
    testimonial_text: string;
    created_at: string;
    offerings: {
        title: {
            primary: string;
        }
    } | null;
};

/**
 * Fetches completed media plans to be used as "harvest items".
 * A harvest item represents a campaign that has finished and is ready for post-sale actions.
 */
export async function getHarvestItems(): Promise<HarvestItem[]> {
    console.log('[actions.ts:getHarvestItems] Fetching harvest items based on completed campaigns...');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    
    // Look for campaigns that ended in the last 30 days.
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const { data, error } = await supabase
        .from('media_plans')
        .select('id, title, campaign_end_date')
        .eq('user_id', user.id)
        .lt('campaign_end_date', new Date().toISOString()) // Ended in the past
        .gte('campaign_end_date', thirtyDaysAgo); // But not too long ago

    if (error) {
        console.error("Error fetching completed media plans:", error);
        throw new Error("Could not fetch harvest items.");
    }
    
    const harvestItems: HarvestItem[] = data.map(plan => ({
        id: plan.id,
        created_at: plan.campaign_end_date, // Use campaign end date
        status: 'to_deliver', // Default status for a completed campaign
        campaign_title: plan.title,
    }));
    
    console.log(`[actions.ts:getHarvestItems] Successfully fetched ${harvestItems.length} completed campaigns to harvest.`);
    return harvestItems;
}


export async function updateHarvestItemStatus(itemId: string, newStatus: 'to_deliver' | 'in_progress' | 'completed'): Promise<{ message: string }> {
    console.log(`[actions.ts:updateHarvestItemStatus] Updating item ${itemId} to status ${newStatus}.`);
    // This is a placeholder. In a real app, you might update the media_plan status or a related table.
    console.log(`[actions.ts:updateHarvestItemStatus] SIMULATION: Status for campaign ${itemId} updated to ${newStatus}.`);
    revalidatePath('/harvest-circle');
    return { message: 'Status updated successfully.' };
}

export async function requestTestimonial(itemId: string): Promise<{ message: string }> {
    console.log(`[actions.ts:requestTestimonial] Requesting testimonial for campaign ${itemId}.`);
    // This is a placeholder. In a real app, this would trigger an email or WhatsApp message
    // to the audience of the campaign. For now, we just log it.
    // The suggestion is to send it 1 day after campaign ends. This action is the manual trigger for that.
    console.log(`[actions.ts:requestTestimonial] SIMULATION: Testimonial request initiated for campaign ${itemId}.`);
    return { message: 'Testimonial request process started.' };
}

export async function getTestimonials(): Promise<Testimonial[]> {
    console.log('[actions.ts:getTestimonials] Fetching testimonials from DB.');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('testimonials')
        .select(`
            *,
            offerings (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[actions.ts:getTestimonials] Error fetching testimonials:', error);
        throw new Error("Could not fetch testimonials.");
    }
    console.log(`[actions.ts:getTestimonials] Successfully fetched ${data.length} testimonials.`);
    return data as Testimonial[];
}

export async function saveTestimonial(testimonialData: Partial<Testimonial>): Promise<Testimonial> {
    console.log('[actions.ts:saveTestimonial] Attempting to save new testimonial:', testimonialData);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { offering_id, customer_name, testimonial_text } = testimonialData;
    if (!offering_id || !customer_name || !testimonial_text) {
        throw new Error("Missing required fields for testimonial.");
    }

    const { data, error } = await supabase
        .from('testimonials')
        .insert({
            user_id: user.id,
            offering_id,
            customer_name,
            testimonial_text,
        })
        .select()
        .single();
        
    if (error) {
        console.error('[actions.ts:saveTestimonial] DB insert error:', error);
        throw new Error("Could not save testimonial to the database.");
    }
    
    console.log('[actions.ts:saveTestimonial] Successfully saved testimonial with ID:', data.id);
    revalidatePath('/harvest-circle');
    return data as Testimonial;
}

export async function createContentFromTestimonial(testimonialId: string, testimonialText: string): Promise<{ message: string }> {
    console.log(`[actions.ts:createContentFromTestimonial] Initiating flow for testimonial ID: ${testimonialId}`);
    try {
        await createContentFromTestimonialFlow({ testimonialId, testimonialText });
        console.log(`[actions.ts:createContentFromTestimonial] Flow successfully invoked.`);
        revalidatePath('/artisan'); // To see the new content in the Artisan's Workshop queue
        return { message: "New content draft created successfully in the Artisan's Workshop." };
    } catch (error: any) {
        console.error('[actions.ts:createContentFromTestimonial] Error invoking Genkit flow:', error);
        throw new Error(`Failed to create content from testimonial: ${error.message}`);
    }
}
