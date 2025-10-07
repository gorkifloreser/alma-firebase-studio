// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import { corsHeaders } from '../_shared/cors.ts';

interface MediaPlanItem {
  id: string;
  copy: string | null;
  image_url: string | null;
  user_id: string;
  user_channel_settings: {
    channel_name: string;
  };
}

interface SocialConnection {
  access_token: string;
  account_id: string;
}

export async function publishToInstagram(post: MediaPlanItem, connection: SocialConnection) {
    const { access_token: pageAccessToken, account_id: igUserId } = connection;
    if (!post.image_url) throw new Error("Instagram posts require an image.");
    
    // Step 1: Upload image to a container
    console.log(`[IG Publish - ${post.id}] Step 1: Creating media container...`);
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${post.image_url}&caption=${encodeURIComponent(post.copy || '')}&access_token=${pageAccessToken}`;
    const containerResponse = await fetch(containerUrl, { method: 'POST' });
    const containerData = await containerResponse.json();

    if (!containerResponse.ok) throw new Error(`IG container creation failed: ${JSON.stringify(containerData)}`);
    const containerId = containerData.id;
    console.log(`[IG Publish - ${post.id}] Step 1 Success: Container ID ${containerId}`);

    // Step 2: Check container status (with retries)
    console.log(`[IG Publish - ${post.id}] Step 2: Checking container status...`);
    let isContainerReady = false;
    for (let i = 0; i < 10; i++) { // Retry up to 10 times
        const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();

        if (statusData.status_code === 'FINISHED') {
            isContainerReady = true;
            console.log(`[IG Publish - ${post.id}] Step 2 Success: Container is FINISHED.`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    if (!isContainerReady) throw new Error('IG container processing timed out.');

    // Step 3: Publish the container
    console.log(`[IG Publish - ${post.id}] Step 3: Publishing container...`);
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${containerId}&access_token=${pageAccessToken}`;
    const publishResponse = await fetch(publishUrl, { method: 'POST' });
    const publishData = await publishResponse.json();

    if (!publishResponse.ok) throw new Error(`IG media publish failed: ${JSON.stringify(publishData)}`);
    console.log(`[IG Publish - ${post.id}] Step 3 Success: Media published with ID ${publishData.id}`);

    return publishData;
}


export async function publishToFacebook(post: MediaPlanItem, connection: SocialConnection) {
  const { access_token: pageAccessToken, account_id: pageId } = connection;
  if (!post.image_url) throw new Error("Facebook posts with images require an image URL.");
  
  const url = `https://graph.facebook.com/v19.0/${pageId}/photos?url=${post.image_url}&message=${encodeURIComponent(post.copy || '')}&access_token=${pageAccessToken}`;
  console.log(`[FB Publish - ${post.id}] Publishing to page ${pageId}...`);

  const response = await fetch(url, { method: 'POST' });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Facebook post failed: ${JSON.stringify(data)}`);
  }
  console.log(`[FB Publish - ${post.id}] Success: Media published.`);
  return data;
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    let postsToPublish: MediaPlanItem[] = [];
    const reqBody = await req.json().catch(() => null);
    
    if (reqBody?.postId) {
        console.log(`[Direct Invocation] Publishing single post: ${reqBody.postId}`);
        const { data: singlePost, error: singlePostError } = await supabaseAdmin
            .from('media_plan_items')
            .select(`
                id, 
                copy, 
                image_url, 
                user_id, 
                user_channel_settings (
                    channel_name
                )
            `)
            .eq('id', reqBody.postId)
            .single();

        if (singlePostError || !singlePost) {
            console.error(`Error fetching single post ${reqBody.postId}:`, singlePostError);
            throw new Error(`Post not found: ${reqBody.postId}. Error: ${singlePostError?.message}`);
        }
        postsToPublish.push(singlePost as MediaPlanItem);

    } else {
        console.log('[Cron Job] Looking for scheduled posts...');
        const { data: scheduledPosts, error: postsError } = await supabaseAdmin
            .from('media_plan_items')
            .select(`
                id, 
                copy, 
                image_url, 
                user_id, 
                user_channel_settings (
                    channel_name
                )
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_at', new Date().toISOString());

        if (postsError) throw postsError;
        if (!scheduledPosts || scheduledPosts.length === 0) {
          return new Response(JSON.stringify({ message: 'No posts to publish at this time.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        postsToPublish = scheduledPosts as MediaPlanItem[];
    }


    console.log(`Found ${postsToPublish.length} post(s) to publish.`);
    
    const postsByUser = postsToPublish.reduce((acc, post) => {
      if (!acc[post.user_id]) acc[post.user_id] = [];
      acc[post.user_id].push(post);
      return acc;
    }, {} as Record<string, MediaPlanItem[]>);

    const publishPromises = Object.entries(postsByUser).map(async ([userId, posts]) => {
      
      const { data: socialConnection, error: connectionError } = await supabaseAdmin
        .from('social_connections')
        .select('access_token, account_id')
        .eq('user_id', userId)
        .eq('provider', 'meta')
        .eq('is_active', true)
        .single();
      
      if (connectionError || !socialConnection) {
        console.error(`No active Meta connection for user ${userId}. Skipping ${posts.length} posts.`);
        // Mark these posts as failed so they don't get re-tried endlessly
         for (const post of posts) {
            await supabaseAdmin.from('media_plan_items').update({ status: 'failed' }).eq('id', post.id);
        }
        return; 
      }

      for (const post of posts) {
        try {
          if (!post.user_channel_settings) {
              throw new Error(`Post ${post.id} is missing channel information.`);
          }
          const channel = post.user_channel_settings.channel_name.toLowerCase();
          if (channel === 'instagram') {
            await publishToInstagram(post, socialConnection);
          } else if (channel === 'facebook') {
            await publishToFacebook(post, socialConnection);
          } else {
            console.log(`Publishing for channel '${channel}' is not yet supported.`);
            continue;
          }

          await supabaseAdmin
            .from('media_plan_items')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', post.id);

          console.log(`Successfully published post ${post.id} to ${channel}.`);

        } catch (publishError) {
          console.error(`Failed to publish post ${post.id}:`, publishError.message);
          await supabaseAdmin
            .from('media_plan_items')
            .update({ status: 'failed' }) 
            .eq('id', post.id);
        }
      }
    });

    await Promise.all(publishPromises);

    return new Response(JSON.stringify({ message: `Processed ${postsToPublish.length} posts.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
