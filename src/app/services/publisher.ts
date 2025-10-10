
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserChannelSetting, SocialConnection } from '@/app/accounts/actions';

// Define a more complete interface for our post data, including video and format
interface MediaPlanItem {
  id: string;
  copy: string | null;
  image_url: string | null;
  video_url: string | null;
  format: 'Post' | 'Story' | 'Reel' | null;
  carousel_slides: { imageUrl: string; [key: string]: any }[] | null;
  user_id: string;
  user_channel_id: number | null;
}

// --- UTILITY FUNCTIONS ---

async function pollContainerStatus(containerId: string, pageAccessToken: string): Promise<void> {
    for (let i = 0; i < 20; i++) { // Poll for up to ~100 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();
        if (statusData.status_code === 'FINISHED') {
            return;
        }
        if (statusData.status_code === 'ERROR') {
            throw new Error(`Media container processing failed: ${JSON.stringify(statusData)}`);
        }
    }
    throw new Error('IG media container processing timed out.');
}


// --- INSTAGRAM PUBLISHING ---

async function publishToInstagram(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: igUserId } = connection;
    if (!igUserId) throw new Error("Active Instagram connection is missing the Instagram User ID.");
    if (!post.image_url) throw new Error("Instagram posts require an image.");
    
    const containerUrl = `https://graph.facebook.com/v19.0/${igUserId}/media`;
    const containerParams = new URLSearchParams({ image_url: post.image_url, caption: post.copy || '', access_token: pageAccessToken });
    const containerResponse = await fetch(containerUrl, { method: 'POST', body: containerParams });
    const containerData = await containerResponse.json();
    if (!containerResponse.ok || containerData.error) throw new Error(`IG container creation failed: ${JSON.stringify(containerData.error)}`);
    
    await pollContainerStatus(containerData.id, pageAccessToken);

    const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish`;
    const publishParams = new URLSearchParams({ creation_id: containerData.id, access_token: pageAccessToken });
    const publishResponse = await fetch(publishUrl, { method: 'POST', body: publishParams });
    const publishData = await publishResponse.json();
    if (!publishResponse.ok || publishData.error) throw new Error(`IG media publish failed: ${JSON.stringify(publishData.error)}`);
    return publishData;
}

async function publishInstagramCarousel(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: igUserId } = connection;
    if (!igUserId) throw new Error("...missing Instagram User ID.");
    if (!post.carousel_slides?.length) throw new Error("...carousel post requires slides.");

    const itemContainerIds = [];
    for (const slide of post.carousel_slides) {
        if (!slide.imageUrl) continue;
        const itemParams = new URLSearchParams({ image_url: slide.imageUrl, is_carousel_item: 'true', access_token: pageAccessToken });
        const response = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, { method: 'POST', body: itemParams });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(`...carousel item container failed: ${JSON.stringify(data.error)}`);
        itemContainerIds.push(data.id);
    }

    const carouselParams = new URLSearchParams({ media_type: 'CAROUSEL', children: itemContainerIds.join(','), caption: post.copy || '', access_token: pageAccessToken });
    const carouselResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, { method: 'POST', body: carouselParams });
    const carouselData = await carouselResponse.json();
    if (!carouselResponse.ok || carouselData.error) throw new Error(`...carousel container failed: ${JSON.stringify(carouselData.error)}`);
    
    await pollContainerStatus(carouselData.id, pageAccessToken);

    const publishParams = new URLSearchParams({ creation_id: carouselData.id, access_token: pageAccessToken });
    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, { method: 'POST', body: publishParams });
    const publishData = await publishResponse.json();
    if (!publishResponse.ok || publishData.error) throw new Error(`...carousel publish failed: ${JSON.stringify(publishData.error)}`);
    return publishData;
}

async function publishInstagramReel(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: igUserId } = connection;
    if (!igUserId) throw new Error("...missing Instagram User ID.");
    if (!post.video_url) throw new Error("Instagram Reels require a video URL.");

    const containerParams = new URLSearchParams({
        media_type: 'REELS',
        video_url: post.video_url,
        caption: post.copy || '',
        share_to_feed: 'true',
        access_token: pageAccessToken,
    });
    const containerResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, { method: 'POST', body: containerParams });
    const containerData = await containerResponse.json();
    if (!containerResponse.ok || containerData.error) throw new Error(`IG Reel container failed: ${JSON.stringify(containerData.error)}`);

    await pollContainerStatus(containerData.id, pageAccessToken);

    const publishParams = new URLSearchParams({ creation_id: containerData.id, access_token: pageAccessToken });
    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, { method: 'POST', body: publishParams });
    const publishData = await publishResponse.json();
    if (!publishResponse.ok || publishData.error) throw new Error(`IG Reel publish failed: ${JSON.stringify(publishData.error)}`);
    return publishData;
}

async function publishInstagramStory(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: igUserId } = connection;
    if (!igUserId) throw new Error("...missing Instagram User ID.");
    if (!post.image_url && !post.video_url) throw new Error("...Story requires an image or video URL.");

    const mediaUrl = post.image_url || post.video_url;
    const mediaType = post.image_url ? 'IMAGE' : 'VIDEO';

    const containerParams = new URLSearchParams({
        media_type: 'STORIES',
        [mediaType === 'IMAGE' ? 'image_url' : 'video_url']: mediaUrl!,
        access_token: pageAccessToken,
    });
    const containerResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, { method: 'POST', body: containerParams });
    const containerData = await containerResponse.json();
    if (!containerResponse.ok || containerData.error) throw new Error(`IG Story container failed: ${JSON.stringify(containerData.error)}`);

    await pollContainerStatus(containerData.id, pageAccessToken);

    const publishParams = new URLSearchParams({ creation_id: containerData.id, access_token: pageAccessToken });
    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, { method: 'POST', body: publishParams });
    const publishData = await publishResponse.json();
    if (!publishResponse.ok || publishData.error) throw new Error(`IG Story publish failed: ${JSON.stringify(publishData.error)}`);
    return publishData;
}


// --- FACEBOOK PUBLISHING ---

async function publishToFacebook(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: pageId } = connection;
    if (!pageId) throw new Error("...missing Page ID.");

    let url, params;
    if (post.image_url) {
        url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        params = new URLSearchParams({ url: post.image_url, message: post.copy || '', access_token: pageAccessToken });
    } else {
        url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        params = new URLSearchParams({ message: post.copy || '', access_token: pageAccessToken });
    }
    const response = await fetch(url, { method: 'POST', body: params });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(`FB post failed: ${JSON.stringify(data.error)}`);
    return data;
}

async function publishFacebookCarousel(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: pageId } = connection;
    if (!pageId) throw new Error("...missing Page ID.");
    if (!post.carousel_slides?.length) throw new Error("...carousel post requires slides.");

    const attachedMedia = [];
    for (const slide of post.carousel_slides) {
        if (!slide.imageUrl) continue;
        const uploadParams = new URLSearchParams({ url: slide.imageUrl, published: 'false', access_token: pageAccessToken });
        const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, { method: 'POST', body: uploadParams });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(`...upload photo for carousel failed: ${JSON.stringify(data.error)}`);
        attachedMedia.push({ media_fbid: data.id });
    }

    const feedParams = new URLSearchParams({ message: post.copy || '', attached_media: JSON.stringify(attachedMedia), access_token: pageAccessToken });
    const feedResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, { method: 'POST', body: feedParams });
    const feedData = await feedResponse.json();
    if (!feedResponse.ok || feedData.error) throw new Error(`FB carousel post failed: ${JSON.stringify(feedData.error)}`);
    return feedData;
}

async function publishFacebookReel(post: MediaPlanItem, connection: SocialConnection): Promise<any> {
    const { access_token: pageAccessToken, account_id: pageId } = connection;
    if (!pageId) throw new Error("...missing Page ID.");
    if (!post.video_url) throw new Error("Facebook Reels require a video URL.");

    const initParams = new URLSearchParams({ upload_phase: 'start', access_token: pageAccessToken });
    const initResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/video_reels`, { method: 'POST', body: initParams });
    const initData = await initResponse.json();
    if (!initResponse.ok || initData.error) throw new Error(`FB Reel initialization failed: ${JSON.stringify(initData.error)}`);
    
    // Note: This is a simplified upload. A robust implementation would handle chunked uploads for large files.
    const uploadResponse = await fetch(initData.upload_url, {
        method: 'POST',
        headers: { Authorization: `OAuth ${pageAccessToken}` },
        body: await fetch(post.video_url).then(res => res.blob())
    });
    if (!uploadResponse.ok) throw new Error('FB Reel video upload failed.');

    const publishParams = new URLSearchParams({
        access_token: pageAccessToken,
        video_id: initData.video_id,
        upload_phase: 'finish',
        description: post.copy || '',
    });
    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/video_reels`, { method: 'POST', body: publishParams });
    const publishData = await publishResponse.json();
    
    // It can take time to process, so we just check for initial success
    if (!publishResponse.ok || publishData.error) throw new Error(`FB Reel publish failed: ${JSON.stringify(publishData.error)}`);
    return publishData;
}

// --- MAIN PUBLISHER ---

export async function publishPost(postId: string, supabase: SupabaseClient): Promise<void> {
    const { data: post, error: postError } = await supabase
        .from('media_plan_items')
        .select(`*, user_channel_settings!inner(*)`)
        .eq('id', postId)
        .single();
    
    if (postError || !post) throw new Error(`Post ${postId} not found. Error: ${postError?.message}`);
    
    const channelSettings = post.user_channel_settings as UserChannelSetting;
    const activeConnection = channelSettings.connections?.find(c => c.is_active);
    if (!activeConnection) throw new Error(`...No active account for '${channelSettings.channel_name}'.`);

    const isCarousel = post.carousel_slides && Array.isArray(post.carousel_slides) && post.carousel_slides.length > 0;
    const format = post.format || 'Post'; // Default to 'Post' if format is not set

    switch(channelSettings.channel_name) {
        case 'instagram':
            if (format === 'Reel') {
                await publishInstagramReel(post as MediaPlanItem, activeConnection);
            } else if (format === 'Story') {
                await publishInstagramStory(post as MediaPlanItem, activeConnection);
            } else if (isCarousel) {
                await publishInstagramCarousel(post as MediaPlanItem, activeConnection);
            } else {
                await publishToInstagram(post as MediaPlanItem, activeConnection);
            }
            break;
        case 'facebook':
            if (format === 'Reel') {
                await publishFacebookReel(post as MediaPlanItem, activeConnection);
            } else if (isCarousel) {
                await publishFacebookCarousel(post as MediaPlanItem, activeConnection);
            } else {
                // Note: Facebook Stories API is more complex, often requiring uploads first.
                // For now, treating FB Stories as regular posts. A dedicated UI flow would be better.
                await publishToFacebook(post as MediaPlanItem, activeConnection);
            }
            break;
        default:
            throw new Error(`Publishing to '${channelSettings.channel_name}' is not supported yet.`);
    }
}
