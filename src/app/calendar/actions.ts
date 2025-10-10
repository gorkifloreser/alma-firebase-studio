

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MediaPlanItem } from '@/app/funnels/types';
import { publishPost } from '@/app/services/publisher';
import { analyzePostFlow, type AnalyzePostInput } from '@/ai/flows/analyze-post-flow';
export type { PostSuggestion } from '@/ai/flows/analyze-post-flow';


export type CalendarItem = MediaPlanItem & {
    // Fields from the new, consolidated media_plan_items table
    content_body: { primary: string | null; secondary: string | null; } | null;
    image_url: string | null;
    video_script: any[] | null;
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

export type SocialConnection = {
    id: number;
    user_id: string;
    provider: string;
    account_id: string | null;
    account_name: string | null;
    account_picture_url: string | null;
    is_active: boolean;
    instagram_account_id?: string | null; // Added for Meta connections
};


export async function getActiveSocialConnection(): Promise<SocialConnection | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('social_connections')
        .select('id, user_id, provider, account_id, account_name, account_picture_url, is_active, instagram_account_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('provider', 'meta') // Assuming we are focusing on Meta for now
        .maybeSingle();

    if (error) {
        console.error('Error fetching active social connection:', error.message);
        return null;
    }

    return data;
}


export async function getContent(): Promise<CalendarItem[]> {
    console.log('[actions.ts:getContent] START: Fetching calendar content...');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('[actions.ts:getContent] ERROR: User not authenticated.');
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
        .in('status', ['approved', 'scheduled', 'published', 'failed']);

    if (error) {
        console.error("[actions.ts:getContent] ERROR fetching calendar content:", error);
        throw new Error('Could not fetch calendar content.');
    }
    
    console.log(`[actions.ts:getContent] SUCCESS: Fetched ${data.length} items from the database.`);
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


export async function updateContent(mediaPlanItemId: string, updates: Partial<Pick<CalendarItem, 'copy' | 'content_body' | 'carousel_slides' | 'image_url' | 'video_script' | 'landing_page_html' | 'status' | 'scheduled_at' | 'user_channel_id'>>): Promise<CalendarItem> {
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
    if (!user) {
        console.error('[publishNow action] Authentication failed.');
        throw new Error('User not authenticated');
    }
    
    try {
        await publishPost(mediaPlanItemId, supabase);
        
        await supabase
            .from('media_plan_items')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', mediaPlanItemId);

        revalidatePath('/calendar');
        revalidatePath('/artisan');

        return { message: 'Post has been published successfully.' };
        
    } catch (error: any) {
        console.error(`[publishNow Action] Failed to publish post ${mediaPlanItemId}:`, error.message);
        await supabase
            .from('media_plan_items')
            .update({ status: 'failed' })
            .eq('id', mediaPlanItemId);
        
        revalidatePath('/calendar');
        revalidatePath('/artisan');

        throw new Error(`Publishing failed: ${error.message}`);
    }
}

// Mock function to simulate fetching social media metrics
export async function getSocialMetrics() {
    // In a real application, this would fetch data from Meta APIs
    // For now, we return mock data.
    return {
        kpis: {
            totalEngagement: 12530,
            engagementChange: 15.2,
            totalReach: 89400,
            reachChange: 8.1,
            totalImpressions: 152000,
            impressionsChange: 12.5,
        },
        engagementOverTime: [
            { date: '2023-10-01', engagement: 280 },
            { date: '2023-10-02', engagement: 350 },
            { date: '2023-10-03', engagement: 410 },
            { date: '2023-10-04', engagement: 390 },
            { date: '2023-10-05', engagement: 450 },
            { date: '2023-10-06', engagement: 510 },
            { date: '2023-10-07', engagement: 550 },
        ],
        recentPostPerformance: [
            { name: 'Post 1', engagement: 120, reach: 2200 },
            { name: 'Post 2', engagement: 98, reach: 1800 },
            { name: 'Post 3', engagement: 210, reach: 3500 },
            { name: 'Post 4', engagement: 150, reach: 2800 },
            { name: 'Post 5', engagement: 180, reach: 3100 },
        ],
    };
}


/**
 * Invokes the Genkit flow to analyze post content.
 */
export async function analyzePost(input: AnalyzePostInput) {
    return analyzePostFlow(input);
}
