
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserChannelSetting, SocialConnection } from '@/app/accounts/actions';

// Define interfaces to avoid circular dependencies
interface MediaPlanItem {
  id: string;
  copy: string | null;
  image_url: string | null;
  user_id: string;
  user_channel_id: number | null;
}

async function publishToInstagram(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, instagram_account_id: igUserId } = connection;
    
    console.log(`[IG Publish - ${post.id}] START`);
    
    if (!igUserId) {
        console.error(`[IG Publish - ${post.id}] ERROR: Active Instagram connection is missing the Instagram User ID.`);
        throw new Error("Active Instagram connection is missing the Instagram User ID.");
    }
    if (!post.image_url) {
        console.error(`[IG Publish - ${post.id}] ERROR: Instagram posts require an image.`);
        throw new Error("Instagram posts require an image.");
    }
    
    // Step 1: Create Media Container
    console.log(`[IG Publish - ${post.id}] Step 1: Creating media container for IG User ${igUserId}...`);
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
    const containerParams = new URLSearchParams({
        image_url: post.image_url,
        caption: post.copy || '',
        access_token: pageAccessToken,
    });

    const containerResponse = await fetch(containerUrl, { method: 'POST', body: containerParams });
    const containerData = await containerResponse.json();
    if (!containerResponse.ok || containerData.error) {
        throw new Error(`IG container creation failed: ${JSON.stringify(containerData.error)}`);
    }
    const containerId = containerData.id;
    console.log(`[IG Publish - ${post.id}] Step 1 Success: Container ID ${containerId}`);

    // Step 2: Check Container Status (with retries)
    let isContainerReady = false;
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();
        if (statusData.status_code === 'FINISHED') {
            isContainerReady = true;
            break;
        }
    }

    if (!isContainerReady) {
        throw new Error('IG container processing timed out.');
    }

    // Step 3: Publish the container
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
    const publishParams = new URLSearchParams({ creation_id: containerId, access_token: pageAccessToken });
    const publishResponse = await fetch(publishUrl, { method: 'POST', body: publishParams });
    const publishData = await publishResponse.json();

    if (!publishResponse.ok || publishData.error) {
        throw new Error(`IG media publish failed: ${JSON.stringify(publishData.error)}`);
    }
    return publishData;
}


async function publishToFacebook(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
  const { access_token: pageAccessToken, account_id: pageId } = connection;
  console.log(`[FB Publish - ${post.id}] START`);

  if (!pageId) throw new Error("Active Facebook connection is missing the Page ID.");
  if (!post.image_url) throw new Error("Facebook posts with images require an image URL.");
  
  const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
  const params = new URLSearchParams({ url: post.image_url, message: post.copy || '', access_token: pageAccessToken });

  const response = await fetch(url, { method: 'POST', body: params });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Facebook post failed: ${JSON.stringify(data.error)}`);
  }
  return data;
}

async function publishToWhatsapp(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    // ... Implementation unchanged
    return { success: true, message: "Simulated WhatsApp message sent." };
}

export async function publishPost(postId: string, supabase: SupabaseClient): Promise<void> {
    console.log(`[publishPost] Initiating publish for post ID: ${postId}`);
    
    const { data: post, error: postError } = await supabase
        .from('media_plan_items')
        .select(`*, user_channel_settings!inner(*)`)
        .eq('id', postId)
        .single();
    
    if (postError || !post) {
        throw new Error(`Post with ID ${postId} not found or channel settings missing. Error: ${postError?.message}`);
    }
    
    const channelSettings = post.user_channel_settings as UserChannelSetting;
    if (!channelSettings.connections || channelSettings.connections.length === 0) {
        throw new Error(`Publishing failed: No social accounts are connected for the '${channelSettings.channel_name}' channel.`);
    }

    const activeConnection = channelSettings.connections.find(c => c.is_active);
    if (!activeConnection) {
        throw new Error(`Publishing failed: No active account selected for the '${channelSettings.channel_name}' channel. Please select one in Accounts.`);
    }

    console.log(`[publishPost] Found active connection for channel '${channelSettings.channel_name}'. Provider: ${activeConnection.provider}`);

    switch(channelSettings.channel_name) {
        case 'instagram':
            await publishToInstagram(post as MediaPlanItem, activeConnection);
            break;
        case 'facebook':
            await publishToFacebook(post as MediaPlanItem, activeConnection);
            break;
        case 'whatsapp':
            await publishToWhatsapp(post as MediaPlanItem, activeConnection);
            break;
        default:
            console.log(`Publishing for channel type '${channelSettings.channel_name}' is not yet supported.`);
            throw new Error(`Publishing to '${channelSettings.channel_name}' is not supported yet.`);
    }
}
