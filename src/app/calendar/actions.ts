

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MediaPlanItem } from '@/app/funnels/types';


export type CalendarItem = MediaPlanItem & {
    // Fields from the new, consolidated media_plan_items table
    content_body: { primary: string | null; secondary: string | null; } | null;
    image_url: string | null;
    video_url: string | null;
    carousel_slides: any[] | null; // Consider defining a stricter type for carousel slides
    landing_page_html: string | null;
    published_at: string | null;
    scheduled_at: string | null;
    
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
            offerings:offering_id (title),
            user_channel_settings:user_channel_id (channel_name)
        `)
        .eq('user_id', user.id)
        .in('status', ['approved', 'scheduled', 'published']); // Fetch content relevant for the calendar

    if (error) {
        console.error("Error fetching calendar content:", error);
        throw new Error('Could not fetch calendar content.');
    }

    return data as CalendarItem[];
}

export async function getContentItem(mediaPlanItemId: string): Promise<CalendarItem | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('media_plan_items')
        .select(`
            *,
            offerings:offering_id (title),
            user_channel_settings:user_channel_id (channel_name)
        `)
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error(`Error fetching content item ${mediaPlanItemId}:`, error);
        // Return null instead of throwing, as the page can handle it
        return null;
    }

    return data as CalendarItem;
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
    return { message: "Content unscheduled and returned to the 'Approved' list." };
}


export async function updateContent(mediaPlanItemId: string, updates: Partial<Pick<CalendarItem, 'copy' | 'content_body' | 'carousel_slides' | 'image_url' | 'video_url' | 'landing_page_html' | 'status' | 'scheduled_at'>>): Promise<CalendarItem> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const payload: { [key: string]: any } = {
        updated_at: new Date().toISOString(),
        ...updates
    };

    const { data, error } = await supabase
        .from('media_plan_items')
        .update(payload)
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id)
        .select(`
            *,
            offerings:offering_id (title),
            user_channel_settings:user_channel_id (channel_name)
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

export async function deleteContentItem(mediaPlanItemId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { error } = await supabase
        .from('media_plan_items')
        .delete()
        .eq('id', mediaPlanItemId)
        .eq('user_id', user.id);
    
    if (error) {
        console.error('Error deleting content item:', error);
        throw new Error('Could not delete the post.');
    }

    revalidatePath('/calendar');
    revalidatePath('/artisan');
    return { message: 'Post deleted successfully.' };
}

export async function publishNow(mediaPlanItemId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // This is a placeholder. The actual publishing logic should be triggered
    // here, perhaps by invoking the Edge Function directly.
    // For now, we'll just update the status.
    
    // In a real scenario, you'd invoke the edge function:
    // const { data: functionData, error: functionError } = await supabase.functions.invoke('post-scheduler', {
    //   body: { postId: mediaPlanItemId }
    // });
    // if (functionError) throw new Error(`Publishing failed: ${functionError.message}`);

    const { error } = await supabase
        .from('media_plan_items')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', mediaPlanItemId);

    if (error) {
        console.error(`Failed to publish post ${mediaPlanItemId}:`, error);
        throw new Error(`Publishing failed: ${error.message}`);
    }

    revalidatePath('/calendar');
    revalidatePath('/artisan');

    return { message: 'Post published successfully.' };
}
