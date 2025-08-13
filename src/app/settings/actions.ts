
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateUserLanguage(formData: FormData) {
    const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    // if (!user) {
    //     throw new Error('User not authenticated');
    // }
    
    // This is a hardcoded user ID for development purposes.
    // TODO: Remove this hardcoded ID and re-enable user checks before production.
    const devUserId = 'ca776dae-278a-4d7e-8191-2c4ee7789f7a';


    const primary = formData.get('primaryLanguage') as string;
    let secondary = formData.get('secondaryLanguage') as string | null;

    if (secondary === 'none') {
        secondary = null;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ primary_language: primary, secondary_language: secondary })
        .eq('id', devUserId);

    if (error) {
        console.error('Error updating language preferences:', error);
        throw new Error('Could not update preferences');
    }

    revalidatePath('/settings');
    return { message: 'Preferences updated successfully' };
}
