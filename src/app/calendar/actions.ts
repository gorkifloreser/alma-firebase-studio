

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MediaPlanItem } from '@/app/funnels/actions';

export type CalendarItem = MediaPlanItem & {
    // Fields from the new, consolidated media_plan_items table
    content_body: { primary: string | null; secondary: string | null; } | null;
    image_url: string | null;
    video_url: string | null;
    carousel_slides: any[] | null; // Consider defining a stricter type for carousel slides
    landing_page_html: string | null;
    published_at: string | null;
    
    // Relational data
    offerings: { 
        title: { primary: string | null } 
    } | null;
};


export async function getContent(): Promise<CalendarItem[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated.');
    }

    const { data, error } = await supabase
        .from('media_plan_items')
        .select(`
            *,
            offerings (title),
            user_channel_settings (channel_name)
        `)
        .eq('user_id', user.id)
        .in('status', ['approved', 'scheduled', 'published']); // Fetch content relevant for the calendar

    if (error) {
        console.error("Error fetching calendar content:", error);
        throw new Error('Could not fetch calendar content.');
    }

    return data as CalendarItem[];
}


export async function scheduleContent(mediaPlanItemId: string, scheduledAt: Date): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { error } = await supabase
        .from('media_plan_items')
        .update({ 
            status: 'scheduled', 
            scheduled_at: scheduledAt.toISOString() 
        })
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error scheduling content:", error);
        throw new Error("Could not schedule content.");
    }
    
    revalidatePath('/calendar');
    return { message: "Content scheduled successfully." };
}


export async function unscheduleContent(mediaPlanItemId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { error } = await supabase
        .from('media_plan_items')
        .update({
            status: 'approved',
            scheduled_at: null
        })
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id);
    
    if (error) {
        console.error("Error unscheduling content:", error);
        throw new Error("Could not unschedule content.");
    }

    revalidatePath('/calendar');
    return { message: "Content unscheduled and returned to the 'approved' list." };
}


export async function updateContent(mediaPlanItemId: string, updates: Partial<Pick<CalendarItem, 'content_body' | 'carousel_slides'>>): Promise<CalendarItem> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const payload: { [key: string]: any } = {
        // updated_at is not a standard column, so we don't update it here
    };
    
    if (updates.content_body) {
        payload.content_body = updates.content_body;
    }
    if (updates.carousel_slides) {
        payload.carousel_slides = updates.carousel_slides;
    }


    const { data, error } = await supabase
        .from('media_plan_items')
        .update(payload)
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id)
        .select(`
            *,
            offerings (title),
            user_channel_settings (channel_name)
        `)
        .single();
    
    if (error) {
        console.error("Error updating content:", error);
        throw new Error("Could not update content.");
    }

    revalidatePath('/calendar');
    revalidatePath('/artisan');
    return data as CalendarItem;
}

