
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createContentFromTestimonialFlow } from '@/ai/flows/create-content-from-testimonial-flow';

export type HarvestItem = {
    id: string;
    created_at: string;
    status: 'to_deliver' | 'in_progress' | 'completed';
    offerings: {
        title: {
            primary: string;
        }
    }
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

// For now, harvest items are simulated. In a real app, this would come from a 'sales' or 'orders' table.
export async function getHarvestItems(): Promise<HarvestItem[]> {
    console.log('[actions.ts:getHarvestItems] Fetching harvest items...');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    
    // Simulate fetching items based on offerings.
    const { data, error } = await supabase
        .from('offerings')
        .select(`
            id,
            created_at,
            title
        `)
        .eq('user_id', user.id)
        .limit(5);

    if (error) {
        console.error("Error fetching simulated harvest items:", error);
        throw new Error("Could not fetch harvest items.");
    }
    
    const harvestItems: HarvestItem[] = data.map(offering => ({
        id: offering.id,
        created_at: offering.created_at,
        status: 'to_deliver', // Default status
        offerings: {
            title: {
                primary: (offering.title as any)?.primary || 'Untitled Offering'
            }
        }
    }));
    
    console.log(`[actions.ts:getHarvestItems] Successfully fetched and simulated ${harvestItems.length} items.`);
    return harvestItems;
}


export async function updateHarvestItemStatus(itemId: string, newStatus: 'to_deliver' | 'in_progress' | 'completed'): Promise<{ message: string }> {
    console.log(`[actions.ts:updateHarvestItemStatus] Updating item ${itemId} to status ${newStatus}.`);
    // This is a placeholder. In a real app, you'd update a 'sales' table.
    console.log(`[actions.ts:updateHarvestItemStatus] SIMULATION: Status for item ${itemId} updated to ${newStatus}.`);
    revalidatePath('/harvest-circle');
    return { message: 'Status updated successfully.' };
}

export async function requestTestimonial(itemId: string): Promise<{ message: string }> {
    console.log(`[actions.ts:requestTestimonial] Requesting testimonial for item ${itemId}.`);
    // This is a placeholder. In a real app, this would trigger an email or WhatsApp message.
    console.log(`[actions.ts:requestTestimonial] SIMULATION: Testimonial request sent for item ${itemId}.`);
    return { message: 'Testimonial request sent successfully.' };
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
