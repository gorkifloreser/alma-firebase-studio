
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Account } from './_components/AccountsClientPage';

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
 * Fetches the list of enabled channels for the current user, including their best practices.
 * @returns {Promise<Account[]>} A promise that resolves to an array of channel objects.
 */
export async function getUserChannels(): Promise<Account[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('user_channel_settings')
        .select('channel_name, best_practices')
        .eq('user_id', user.id);

    if (error) {
        console.error("Error fetching user channels:", error);
        throw new Error("Could not fetch user channels.");
    }
    
    // The component expects the `id` field, so we map `channel_name` to `id`.
    return data.map(row => ({
        id: row.channel_name,
        name: row.channel_name,
        description: '',
        icon: '',
        category: 'meta', // These fields are just for the UI and not stored in DB
        status: 'available',
        best_practices: row.best_practices,
    }));
}


/**
 * Updates the list of enabled channels for the current user.
 * This function performs a "delete all and insert new" operation.
 * When a new channel is inserted, it's populated with default best practices.
 * @param {string[]} selectedChannels - An array of channel names to be enabled.
 * @returns {Promise<Account[]>} The updated list of user channels.
 */
export async function updateUserChannels(selectedChannels: string[]): Promise<Account[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    
    const { error: deleteError } = await supabase
        .from('user_channel_settings')
        .delete()
        .eq('user_id', user.id);

    if (deleteError) {
        console.error("Error deleting old channels:", deleteError);
        throw new Error("Could not update channels (delete step failed).");
    }

    if (selectedChannels.length > 0) {
        const channelsToInsert = selectedChannels.map(channelName => ({
            user_id: user.id,
            channel_name: channelName,
            best_practices: defaultBestPractices[channelName] || `Default best practices for ${channelName}.`,
        }));

        const { error: insertError } = await supabase
            .from('user_channel_settings')
            .insert(channelsToInsert);

        if (insertError) {
            console.error("Error inserting new channels:", insertError);
            throw new Error("Could not update channels (insert step failed).");
        }
    }

    revalidatePath('/accounts');
    return getUserChannels(); // Return the newly updated list
}


/**
 * Updates the best_practices for a specific channel for the current user.
 * @param {string} channelName - The name of the channel to update.
 * @param {string} bestPractices - The new best practices text.
 * @returns {Promise<Account>} The single updated channel object.
 */
export async function updateChannelBestPractices(channelName: string, bestPractices: string): Promise<Account> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('user_channel_settings')
        .update({ best_practices: bestPractices, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('channel_name', channelName)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating best practices:", error);
        throw new Error("Could not update best practices.");
    }
    
    revalidatePath('/accounts');

    return {
        id: data.channel_name,
        name: data.channel_name,
        description: '',
        icon: '',
        category: 'meta',
        status: 'available',
        best_practices: data.best_practices,
    };
}
