
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateUserLanguage(formData: FormData) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const primary = formData.get('primaryLanguage') as string;
    let secondary = formData.get('secondaryLanguage') as string | null;

    if (secondary === 'none') {
        secondary = null;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ primary_language: primary, secondary_language: secondary })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating language preferences:', error);
        throw new Error('Could not update preferences');
    }

    revalidatePath('/settings');
    return { message: 'Preferences updated successfully' };
}


export async function getProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated. Could not fetch profile.');
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('primary_language, secondary_language')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        throw new Error('Could not fetch profile data.');
    }

    return data;
}
