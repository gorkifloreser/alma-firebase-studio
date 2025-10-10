
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Matches the structure inside the JSONB array
export type SocialConnection = {
    provider: string;
    is_active: boolean;
    account_id: string;
    access_token: string;
    account_name: string;
    account_picture_url: string | null;
    instagram_account_id?: string; // For Meta's structure
};

// Represents a row in the user_channel_settings table
export type UserChannelSetting = {
    id: number;
    user_id: string;
    channel_name: string;
    best_practices: string;
    created_at: string;
    updated_at: string;
    connections: SocialConnection[] | null;
};


const defaultBestPractices: Record<string, string> = {
    instagram: "Call to Action: Use 'Link in bio!' for external links. Visually-driven content is key. Use relevant hashtags. Carousels are effective for storytelling.",
    facebook: "Call to Action: Directly include URLs in the post. Avoid using 'Link in bio'. Longer text descriptions are acceptable. Pose questions to encourage engagement.",
    whatsapp: "Tone: Personal and conversational. Use emojis. Keep messages short and to the point. Do NOT use hashtags. Instead, naturally weave important keywords into the message body. Ideal for direct customer interaction and quick updates.",
    telegram: "Tone: Slightly more formal than WhatsApp but still direct. Good for announcements and community building. Can handle longer messages and rich media.",
    webmail: "Format: Structure as a newsletter or promotional email. Use clear subject lines. Have a distinct introduction, body, and conclusion with a clear call to action.",
    website: "Format: Structure as a blog post. Optimize for SEO with relevant keywords. Should be informative and provide value. Longer form content is expected.",
    tiktok: "Format: Short, engaging video concepts. Focus on trends, sounds, and quick cuts. Scripts should be brief and punchy.",
    linkedin: "Tone: Professional and authoritative. Content should be industry-relevant, insightful, and add value to a professional network. Avoid overly casual language."
};


/**
 * Fetches the list of all channel settings for the current user.
 * @returns {Promise<UserChannelSetting[]>} A promise that resolves to an array of channel setting objects.
 */
export async function getUserChannels(): Promise<UserChannelSetting[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('user_channel_settings')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error("Error fetching user channels:", error);
        throw new Error("Could not fetch user channels.");
    }
    
    return data;
}


/**
 * Updates the list of enabled channels for the current user.
 * This is now an upsert operation.
 * @param {string[]} selectedChannels - An array of channel names to be enabled/kept.
 * @returns {Promise<UserChannelSetting[]>} The updated list of user channels.
 */
export async function updateUserChannels(selectedChannels: string[]): Promise<UserChannelSetting[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    
    // Delete channels that are NOT in the selected list
    const { error: deleteError } = await supabase
        .from('user_channel_settings')
        .delete()
        .eq('user_id', user.id)
        .not('channel_name', 'in', `(${selectedChannels.map(c => `'${c}'`).join(',')})`);
    
    if (deleteError) {
        console.warn("Could not delete deselected channels, continuing with upsert:", deleteError.message);
    }

    if (selectedChannels.length > 0) {
        const channelsToUpsert = selectedChannels.map(channelName => ({
            user_id: user.id,
            channel_name: channelName,
            best_practices: defaultBestPractices[channelName] || `Default best practices for ${channelName}.`,
        }));

        const { error: upsertError } = await supabase
            .from('user_channel_settings')
            .upsert(channelsToUpsert, { onConflict: 'user_id, channel_name' });

        if (upsertError) {
            console.error("Error upserting channels:", upsertError);
            throw new Error("Could not update channels (upsert step failed).");
        }
    }

    revalidatePath('/brand');
    return getUserChannels();
}


/**
 * Updates the best_practices for a specific channel for the current user.
 */
export async function updateChannelBestPractices(channelId: number, bestPractices: string): Promise<UserChannelSetting> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('user_channel_settings')
        .update({ best_practices: bestPractices, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('id', channelId)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating best practices:", error);
        throw new Error("Could not update best practices.");
    }
    
    revalidatePath('/brand');
    return data;
}


export async function getMetaOAuthUrl(): Promise<{ url: string }> {
    const appId = process.env.META_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/meta`;
    
    if (!appId || !redirectUri) {
        throw new Error("Meta application credentials are not configured in the environment.");
    }

    const scope = 'instagram_basic,pages_show_list,instagram_content_publish,pages_read_engagement,pages_manage_posts,business_management';
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;

    return { url };
}

export async function disconnectMetaAccount(provider: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // This action now clears the `connections` JSONB for the relevant channel
    const { error } = await supabase
        .from('user_channel_settings')
        .update({ connections: [] })
        .eq('user_id', user.id)
        .eq('channel_name', provider);
    
    if (error) {
        console.error(`Error disconnecting ${provider} account:`, error);
        throw new Error(`Failed to disconnect ${provider} account.`);
    }

    revalidatePath('/brand');
}

export async function setActiveConnection(channelId: number, accountIdToActivate: string): Promise<UserChannelSetting> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Get the current connections for the channel
    const { data: channelSetting, error: fetchError } = await supabase
        .from('user_channel_settings')
        .select('connections')
        .eq('id', channelId)
        .eq('user_id', user.id)
        .single();
    
    if (fetchError || !channelSetting) {
        throw new Error("Channel setting not found or you don't have permission to access it.");
    }
    
    const updatedConnections = (channelSetting.connections || []).map(conn => ({
        ...conn,
        is_active: conn.account_id === accountIdToActivate
    }));

    // Update the entire connections array
    const { data: updatedChannel, error: updateError } = await supabase
        .from('user_channel_settings')
        .update({ connections: updatedConnections })
        .eq('id', channelId)
        .select()
        .single();
        
    if (updateError) {
        throw new Error(`Failed to activate selected connection: ${updateError.message}`);
    }

    revalidatePath('/brand');
    return updatedChannel;
}
    
