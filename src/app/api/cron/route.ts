
import { createClient } from '@/lib/supabase/server';
import { publishPost } from '@/app/services/publisher';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', {
            status: 401,
        });
    }

    console.log('[CRON] Starting scheduled post processing...');
    const supabase = createClient();

    const { data: scheduledPosts, error: postsError } = await supabase
        .from('media_plan_items')
        .select('id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());

    if (postsError) {
        console.error('[CRON] Error fetching scheduled posts:', postsError.message);
        return NextResponse.json({ error: `Database error: ${postsError.message}` }, { status: 500 });
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
        console.log('[CRON] No posts to publish at this time.');
        return NextResponse.json({ message: 'No posts to publish.' });
    }

    console.log(`[CRON] Found ${scheduledPosts.length} post(s) to publish.`);
    
    let successCount = 0;
    let failureCount = 0;

    for (const post of scheduledPosts) {
        try {
            // Re-create a client for each operation if needed, or pass the admin client
            const operationSupabaseClient = createClient();
            await publishPost(post.id, operationSupabaseClient);
            
            // If publishPost succeeds, update status
            await operationSupabaseClient
                .from('media_plan_items')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', post.id);
            
            successCount++;
            console.log(`[CRON] Successfully published post ${post.id}.`);
        } catch (error: any) {
            failureCount++;
            console.error(`[CRON] Failed to publish post ${post.id}:`, error.message);
            // Optionally update status to 'failed'
            const operationSupabaseClient = createClient();
            await operationSupabaseClient
                .from('media_plan_items')
                .update({ status: 'failed' })
                .eq('id', post.id);
        }
    }

    console.log(`[CRON] Finished processing. Success: ${successCount}, Failures: ${failureCount}.`);
    return NextResponse.json({
        message: 'Cron job completed.',
        successCount,
        failureCount,
    });
}
