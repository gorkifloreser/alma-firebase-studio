
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Fetches the list of enabled channel names for the current user.
 * @returns {Promise<string[]>} A promise that resolves to an array of channel names.
 */
export async function getUserChannels(): Promise<string[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('user_channels')
        .select('channel_name')
        .eq('user_id', user.id);

    if (error) {
        console.error("Error fetching user channels:", error);
        throw new Error("Could not fetch user channels.");
    }
    
    return data.map(row => row.channel_name);
}


/**
 * Updates the list of enabled channels for the current user.
 * This function performs a "delete all and insert new" operation for simplicity.
 * @param {string[]} selectedChannels - An array of channel names to be enabled.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function updateUserChannels(selectedChannels: string[]): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    
    // Begin a transaction
    const { error: deleteError } = await supabase
        .from('user_channels')
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
        }));

        const { error: insertError } = await supabase
            .from('user_channels')
            .insert(channelsToInsert);

        if (insertError) {
            console.error("Error inserting new channels:", insertError);
            throw new Error("Could not update channels (insert step failed).");
        }
    }

    revalidatePath('/accounts');
    return { message: "Channels updated successfully." };
}
