
import type { SupabaseClient } from '@supabase/supabase-js';

// Define interfaces to avoid circular dependencies
interface MediaPlanItem {
  id: string;
  copy: string | null;
  image_url: string | null;
  user_id: string;
  user_channel_settings: {
    channel_name: string;
  } | null;
}

interface SocialConnection {
  access_token: string;
  account_id: string | null;
}

/**
 * Publishes a post to Instagram using a two-step container process.
 * @param post - The media plan item to publish.
 * @param connection - The user's social connection details.
 */
async function publishToInstagram(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: igUserId } = connection;
    if (!igUserId) throw new Error("Active Instagram connection is missing the Instagram User ID.");
    if (!post.image_url) throw new Error("Instagram posts require an image.");
    
    // Step 1: Create Media Container
    console.log(`[IG Publish - ${post.id}] Step 1: Creating media container...`);
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
    const containerParams = new URLSearchParams({
        image_url: post.image_url,
        caption: post.copy || '',
        access_token: pageAccessToken,
    });

    const containerResponse = await fetch(`${containerUrl}?${containerParams.toString()}`, { method: 'POST' });
    const containerData = await containerResponse.json();

    if (!containerResponse.ok || containerData.error) {
        throw new Error(`IG container creation failed: ${JSON.stringify(containerData.error)}`);
    }
    const containerId = containerData.id;
    console.log(`[IG Publish - ${post.id}] Step 1 Success: Container ID ${containerId}`);

    // Step 2: Check Container Status (with retries)
    console.log(`[IG Publish - ${post.id}] Step 2: Checking container status...`);
    let isContainerReady = false;
    for (let i = 0; i < 10; i++) { // Retry up to 10 times (50 seconds total)
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();

        if (statusData.status_code === 'FINISHED') {
            isContainerReady = true;
            console.log(`[IG Publish - ${post.id}] Step 2 Success: Container is FINISHED.`);
            break;
        }
        console.log(`[IG Publish - ${post.id}] Attempt ${i+1}: Container status is ${statusData.status_code}. Retrying...`);
    }

    if (!isContainerReady) throw new Error('IG container processing timed out after 50 seconds.');

    // Step 3: Publish the container
    console.log(`[IG Publish - ${post.id}] Step 3: Publishing container...`);
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
    const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: pageAccessToken,
    });
    
    const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
    const publishData = await publishResponse.json();

    if (!publishResponse.ok || publishData.error) {
        throw new Error(`IG media publish failed: ${JSON.stringify(publishData.error)}`);
    }
    console.log(`[IG Publish - ${post.id}] Step 3 Success: Media published with ID ${publishData.id}`);

    return publishData;
}


/**
 * Publishes a post to a Facebook Page.
 * @param post - The media plan item to publish.
 * @param connection - The user's social connection details.
 */
async function publishToFacebook(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
  const { access_token: pageAccessToken, account_id: pageId } = connection;
  if (!pageId) throw new Error("Active Facebook connection is missing the Page ID.");
  if (!post.image_url) throw new Error("Facebook posts with images require an image URL.");
  
  const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
  const params = new URLSearchParams({
      url: post.image_url,
      message: post.copy || '',
      access_token: pageAccessToken,
  });
  
  console.log(`[FB Publish - ${post.id}] Publishing to page ${pageId}...`);

  const response = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Facebook post failed: ${JSON.stringify(data.error)}`);
  }
  console.log(`[FB Publish - ${post.id}] Success: Media published.`);
  return data;
}

/**
 * Orchestrates the publishing of a single post based on its channel.
 * @param postId - The ID of the media plan item to publish.
 * @param supabase - An authenticated Supabase client instance.
 */
export async function publishPost(postId: string, supabase: SupabaseClient): Promise<void> {
    const { data: post, error: postError } = await supabase
        .from('media_plan_items')
        .select(`
            id,
            copy,
            image_url,
            user_id,
            user_channel_settings ( channel_name )
        `)
        .eq('id', postId)
        .single();
    
    if (postError || !post) {
        throw new Error(`Post with ID ${postId} not found. Error: ${postError?.message}`);
    }

    const { data: connection, error: connectionError } = await supabase
        .from('social_connections')
        .select('access_token, account_id')
        .eq('user_id', post.user_id)
        .eq('provider', 'meta')
        .eq('is_active', true)
        .single();

    if (connectionError || !connection) {
        throw new Error(`No active Meta connection found for user ${post.user_id}.`);
    }

    const channel = post.user_channel_settings?.channel_name?.toLowerCase();
    if (!channel) {
        throw new Error(`Post ${postId} is missing channel information.`);
    }

    switch(channel) {
        case 'instagram':
            await publishToInstagram(post as MediaPlanItem, connection as SocialConnection);
            break;
        case 'facebook':
            await publishToFacebook(post as MediaPlanItem, connection as SocialConnection);
            break;
        default:
            console.log(`Publishing for channel '${channel}' is not yet supported.`);
            // In a real scenario, you might want to handle this case differently,
            // e.g., by marking the post as 'unsupported' or logging it.
            break;
    }
}
