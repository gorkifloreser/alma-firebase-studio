
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ContentItem = {
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    offering_id: string;
    content_body: { primary: string | null; secondary: string | null; } | null;
    status: 'draft' | 'approved' | 'scheduled' | 'published';
    image_url: string | null;
    carousel_slides_text: string | null;
    video_script: string | null;
    source_plan: { channel: string; format: string; description: string; } | null;
    scheduled_at: string | null;
    scheduled_for_channel: string | null;
    offerings: { title: { primary: string | null } } | null;
};


export async function getContent(): Promise<ContentItem[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated.');
    }

    const { data, error } = await supabase
        .from('content')
        .select(`
            *,
            offerings (
                title
            )
        `)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error fetching content:", error);
        throw new Error('Could not fetch content.');
    }

    return data as ContentItem[];
}


export async function scheduleContent(contentId: string, scheduledAt: Date): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { error } = await supabase
        .from('content')
        .update({ 
            status: 'scheduled', 
            scheduled_at: scheduledAt.toISOString() 
        })
        .eq('id', contentId)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error scheduling content:", error);
        throw new Error("Could not schedule content.");
    }
    
    revalidatePath('/calendar');
    return { message: "Content scheduled successfully." };
}


export async function unscheduleContent(contentId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { error } = await supabase
        .from('content')
        .update({
            status: 'approved',
            scheduled_at: null
        })
        .eq('id', contentId)
        .eq('user_id', user.id);
    
    if (error) {
        console.error("Error unscheduling content:", error);
        throw new Error("Could not unschedule content.");
    }

    revalidatePath('/calendar');
    return { message: "Content unscheduled and returned to drafts." };
}
