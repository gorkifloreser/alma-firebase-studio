
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
  instagram_account_id: string | null;
}

/**
 * Publishes a post to Instagram using a two-step container process.
 * @param post - The media plan item to publish.
 * @param connection - The user's social connection details.
 */
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
    console.log(`[IG Publish - ${post.id}] Step 1: Request URL: ${containerUrl}`);
    console.log(`[IG Publish - ${post.id}] Step 1: Request Caption: "${post.copy?.substring(0, 50)}..."`);


    const containerResponse = await fetch(`${containerUrl}?${containerParams.toString()}`, { method: 'POST' });
    const containerData = await containerResponse.json();
    console.log(`[IG Publish - ${post.id}] Step 1 Response:`, JSON.stringify(containerData, null, 2));

    if (!containerResponse.ok || containerData.error) {
         console.error(`[IG Publish - ${post.id}] Step 1 FAILED.`);
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

    if (!isContainerReady) {
        console.error(`[IG Publish - ${post.id}] Step 2 FAILED: Container did not finish processing in time.`);
        throw new Error('IG container processing timed out after 50 seconds.');
    }

    // Step 3: Publish the container
    console.log(`[IG Publish - ${post.id}] Step 3: Publishing container...`);
    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
    const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: pageAccessToken,
    });
    
    const publishResponse = await fetch(`${publishUrl}?${publishParams.toString()}`, { method: 'POST' });
    const publishData = await publishResponse.json();
    console.log(`[IG Publish - ${post.id}] Step 3 Response:`, JSON.stringify(publishData, null, 2));

    if (!publishResponse.ok || publishData.error) {
        console.error(`[IG Publish - ${post.id}] Step 3 FAILED.`);
        throw new Error(`IG media publish failed: ${JSON.stringify(publishData.error)}`);
    }
    console.log(`[IG Publish - ${post.id}] Step 3 Success: Media published with ID ${publishData.id}`);

    return publishData;
}


// GEMINI_SAFE_START
/**
 * Publishes a post to a Facebook Page.
 * @param post - The media plan item to publish.
 * @param connection - The user's social connection details.
 */
async function publishToFacebook(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
  const { access_token: pageAccessToken, account_id: pageId } = connection;
  console.log(`[FB Publish - ${post.id}] START`);

  if (!pageId) {
      console.error(`[FB Publish - ${post.id}] ERROR: Active Facebook connection is missing the Page ID.`);
      throw new Error("Active Facebook connection is missing the Page ID.");
  }
  if (!post.image_url) {
      console.error(`[FB Publish - ${post.id}] ERROR: Facebook posts with images require an image URL.`);
      throw new Error("Facebook posts with images require an image URL.");
  }
  
  const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
  const params = new URLSearchParams({
      url: post.image_url,
      message: post.copy || '',
      access_token: pageAccessToken,
  });
  
  console.log(`[FB Publish - ${post.id}] Publishing to page ${pageId}...`);
  console.log(`[FB Publish - ${post.id}] Request URL: ${url}`);
  console.log(`[FB Publish - ${post.id}] Request Message: "${post.copy?.substring(0, 50)}..."`);


  const response = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
  const data = await response.json();
  console.log(`[FB Publish - ${post.id}] API Response:`, JSON.stringify(data, null, 2));


  if (!response.ok || data.error) {
    console.error(`[FB Publish - ${post.id}] FAILED.`);
    throw new Error(`Facebook post failed: ${JSON.stringify(data.error)}`);
  }
  console.log(`[FB Publish - ${post.id}] Success: Media published.`);
  return data;
}
// GEMINI_SAFE_END


/**
 * Publishes a message to WhatsApp. (Placeholder)
 * @param post - The media plan item to publish.
 * @param connection - The user's social connection details.
 */
async function publishToWhatsapp(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token } = connection;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const recipientPhoneNumber = "PHONE_NUMBER_TO_SEND_TO"; // This needs to be dynamic

    console.log(`[WhatsApp Publish - ${post.id}] START`);
    
    if (!phoneNumberId) {
        console.error(`[WhatsApp Publish - ${post.id}] ERROR: META_PHONE_NUMBER_ID environment variable is not set.`);
        throw new Error("WhatsApp publishing is not configured on the server.");
    }
    
    // In a real scenario, you would use a pre-approved message template.
    // For this example, we will log what would be sent.
    const messagePayload = {
        messaging_product: "whatsapp",
        to: recipientPhoneNumber,
        type: "text",
        text: {
            preview_url: false,
            body: post.copy || "Default message",
        },
    };

    console.log(`[WhatsApp Publish - ${post.id}] Step 1: Preparing to send message.`);
    console.log(`[WhatsApp Publish - ${post.id}] From Phone ID: ${phoneNumberId}`);
    console.log(`[WhatsApp Publish - ${post.id}] To: ${recipientPhoneNumber}`);
    console.log(`[WhatsApp Publish - ${post.id}] Payload:`, JSON.stringify(messagePayload, null, 2));

    // Here you would make the API call to `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`
    // For now, we simulate success.
    console.log(`[WhatsApp Publish - ${post.id}] SIMULATION: Message sent successfully.`);
    return { success: true, message: "Simulated WhatsApp message sent." };
}

/**
 * Orchestrates the publishing of a single post based on its channel.
 * @param postId - The ID of the media plan item to publish.
 * @param supabase - An authenticated Supabase client instance.
 */
export async function publishPost(postId: string, supabase: SupabaseClient): Promise<void> {
    console.log(`[publishPost] Initiating publish for post ID: ${postId}`);
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
    console.log(`[publishPost] Found post:`, post);


    const { data: connection, error: connectionError } = await supabase
        .from('social_connections')
        .select('access_token, account_id, instagram_account_id')
        .eq('user_id', post.user_id)
        .eq('is_active', true)
        .single();

    if (connectionError || !connection) {
        throw new Error(`No active Meta connection found for user ${post.user_id}.`);
    }
    console.log(`[publishPost] Found active connection for user.`);


    const channel = post.user_channel_settings?.channel_name?.toLowerCase();
    if (!channel) {
        throw new Error(`Post ${postId} is missing channel information.`);
    }
    console.log(`[publishPost] Determined channel is: ${channel}`);


    switch(channel) {
        case 'instagram':
            await publishToInstagram(post as MediaPlanItem, connection as SocialConnection);
            break;
        case 'facebook':
            await publishToFacebook(post as MediaPlanItem, connection as SocialConnection);
            break;
        case 'whatsapp':
            await publishToWhatsapp(post as MediaPlanItem, connection as SocialConnection);
            break;
        default:
            console.log(`Publishing for channel '${channel}' is not yet supported.`);
            break;
    }
}
