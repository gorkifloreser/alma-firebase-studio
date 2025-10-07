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
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${post.image_url}&caption=${encodeURIComponent(post.copy || '')}&access_token=${pageAccessToken}`;
    const containerResponse = await fetch(containerUrl, { method: 'POST' });
    const containerData = await containerResponse.json();

    if (!containerResponse.ok) throw new Error(`IG container creation failed: ${JSON.stringify(containerData)}`);
    const containerId = containerData.id;

    // Step 2: Check container status (with retries)
    let isContainerReady = false;
    for (let i = 0; i < 10; i++) { // Retry up to 10 times
        const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();

        if (statusData.status_code === 'FINISHED') {
            isContainerReady = true;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    if (!isContainerReady) throw new Error('IG container processing timed out.');

    // Step 3: Publish the container
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${containerId}&access_token=${pageAccessToken}`;
    const publishResponse = await fetch(publishUrl, { method: 'POST' });
    const publishData = await publishResponse.json();

    if (!publishResponse.ok) throw new Error(`IG media publish failed: ${JSON.stringify(publishData)}`);

    return publishData;
}


export async function publishToFacebook(post: MediaPlanItem, connection: SocialConnection) {
  const { access_token: pageAccessToken, account_id: pageId } = connection;
  if (!post.image_url) throw new Error("Facebook posts with images require an image URL.");
  
  const url = `https://graph.facebook.com/v19.0/${pageId}/photos?url=${post.image_url}&message=${encodeURIComponent(post.copy || '')}&access_token=${pageAccessToken}`;

  const response = await fetch(url, { method: 'POST' });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Facebook post failed: ${JSON.stringify(data)}`);
  }
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

    // 1. Get posts that are due to be published
    const { data: postsToPublish, error: postsError } = await supabaseAdmin
      .from('media_plan_items')
      .select(`
        id,
        copy,
        image_url,
        user_id,
        user_channel_settings (channel_name)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (postsError) throw postsError;
    if (!postsToPublish || postsToPublish.length === 0) {
      return new Response(JSON.stringify({ message: 'No posts to publish at this time.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${postsToPublish.length} posts to publish.`);

    // Group posts by user to fetch social connections efficiently
    const postsByUser = postsToPublish.reduce((acc, post) => {
      if (!acc[post.user_id]) {
        acc[post.user_id] = [];
      }
      acc[post.user_id].push(post);
      return acc;
    }, {} as Record<string, MediaPlanItem[]>);

    const publishPromises = Object.entries(postsByUser).map(async ([userId, posts]) => {
      // 2. Get the user's active social connection for Meta
      const { data: socialConnection, error: connectionError } = await supabaseAdmin
        .from('social_connections')
        .select('access_token, account_id')
        .eq('user_id', userId)
        .eq('provider', 'meta')
        .eq('is_active', true)
        .single();
      
      if (connectionError || !socialConnection) {
        console.error(`No active Meta connection for user ${userId}. Skipping ${posts.length} posts.`);
        return; // Skip this user's posts
      }

      for (const post of posts) {
        try {
          const channel = post.user_channel_settings.channel_name.toLowerCase();
          if (channel === 'instagram') {
            await publishToInstagram(post, socialConnection);
          } else if (channel === 'facebook') {
            await publishToFacebook(post, socialConnection);
          } else {
            console.log(`Publishing for channel '${channel}' is not yet supported.`);
            continue; // Skip to next post
          }

          // 4. Update the post status to 'published'
          await supabaseAdmin
            .from('media_plan_items')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', post.id);

          console.log(`Successfully published post ${post.id} to ${channel}.`);

        } catch (publishError) {
          console.error(`Failed to publish post ${post.id}:`, publishError.message);
          // Optional: Update status to 'failed' to prevent retries
          await supabaseAdmin
            .from('media_plan_items')
            .update({ status: 'failed' }) // You'll need to add 'failed' to your enum type
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
    console.error('Cron job error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
