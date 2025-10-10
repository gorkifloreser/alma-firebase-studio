
// GEMINI_SAFE_START
// @functional: This component and its related features are considered functionally complete.
// Avoid unnecessary modifications unless a new feature or bug fix is explicitly requested for this area.
// Last verified: 2025-10-10

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MediaPlanItem as MediaPlanItemType } from '@/app/funnels/types';
import { publishPost } from '@/app/services/publisher';
import { analyzePostFlow, type AnalyzePostInput, type PostAnalysis } from '@/ai/flows/analyze-post-flow';
import { rewritePostFlow, type RewritePostInput, type RewritePostOutput } from '@/ai/flows/rewrite-post-flow';

export type { PostAnalysis };


export type CalendarItem = MediaPlanItemType & {
    // Fields from the new, consolidated media_plan_items table
    content_body: { primary: string | null; secondary: string | null; } | null;
    image_url: string | null;
    video_script: any[] | null;
    video_url: string | null;
    carousel_slides: any[] | null; // Consider defining a stricter type for carousel slides
    landing_page_html: string | null;
    published_at: string | null;
    scheduled_at: string | null;
    hashtags: string | null;
    
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


export async function getActiveSocialConnections(): Promise<SocialConnection[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('user_channel_settings')
        .select('id, channel_name, connections')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching active social connections:', error.message);
        return [];
    }

    const activeConnections: SocialConnection[] = [];
    data.forEach(channelSetting => {
        if (channelSetting.connections && Array.isArray(channelSetting.connections)) {
            const activeConnectionInChannel = channelSetting.connections.find(conn => conn.is_active);
            if (activeConnectionInChannel) {
                activeConnections.push({
                    id: channelSetting.id, // This is the user_channel_setting id
                    user_id: user.id,
                    provider: channelSetting.channel_name,
                    ...activeConnectionInChannel
                });
            }
        }
    });

    return activeConnections;
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
    
    const processedData = data.map(item => {
        let slides = item.carousel_slides;
        if (typeof slides === 'string') {
            try {
                slides = JSON.parse(slides);
            } catch (e) {
                console.error('Failed to parse carousel_slides:', e);
                slides = null;
            }
        }
        return { ...item, carousel_slides: slides };
    });

    return processedData as CalendarItem[];
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

async function uploadBase64Image(supabase: any, base64: string, userId: string): Promise<string> {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME || 'Alma';
    // A more generic path since we don't have offeringId here
    const filePath = `${userId}/calendar_uploads/${crypto.randomUUID()}.png`;
    
    const base64Data = base64.split(';base64,').pop();
    if (!base64Data) {
        throw new Error('Invalid Base64 image data.');
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: false
        });

    if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrl;
}


export async function updateContent(mediaPlanItemId: string, updates: Partial<Pick<CalendarItem, 'content_body' | 'hashtags' | 'carousel_slides' | 'image_url' | 'video_script' | 'video_url' | 'landing_page_html' | 'status' | 'scheduled_at' | 'user_channel_id' | 'media_format' | 'aspect_ratio'>>): Promise<CalendarItem> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const payload: { [key: string]: any } = {
        updated_at: new Date().toISOString(),
    };

    if (updates.image_url && updates.image_url.startsWith('data:image')) {
        payload.image_url = await uploadBase64Image(supabase, updates.image_url, user.id);
    } else if (updates.image_url !== undefined) {
        payload.image_url = updates.image_url;
    }
    
    if (updates.carousel_slides && Array.isArray(updates.carousel_slides)) {
        payload.carousel_slides = await Promise.all(
            updates.carousel_slides.map(async (slide) => {
                if (slide.imageUrl && slide.imageUrl.startsWith('data:image')) {
                    const newUrl = await uploadBase64Image(supabase, slide.imageUrl, user.id);
                    return { ...slide, imageUrl: newUrl };
                }
                return slide;
            })
        );
    } else if (updates.carousel_slides !== undefined) {
         payload.carousel_slides = updates.carousel_slides;
    }
    
    // Add other fields to payload, excluding image fields handled above
    const otherFields: (keyof typeof updates)[] = ['content_body', 'hashtags', 'video_script', 'video_url', 'landing_page_html', 'status', 'scheduled_at', 'user_channel_id', 'media_format', 'aspect_ratio'];
    otherFields.forEach(field => {
        if (updates[field] !== undefined) {
            payload[field] = updates[field];
        }
    });
     
    // Also update the 'copy' field for searchability, derived from the primary content.
    if (payload.content_body?.primary) {
        payload.copy = payload.content_body.primary;
    }

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
export async function analyzePost(input: AnalyzePostInput): Promise<PostAnalysis> {
    return analyzePostFlow(input);
}


/**
 * Invokes the Genkit flow to rewrite a post based on suggestions.
 */
export async function rewritePost(input: RewritePostInput): Promise<RewritePostOutput> {
    return rewritePostFlow(input);
}
// GEMINI_SAFE_END
