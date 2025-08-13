
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateUserLanguage(formData: FormData) {
    const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    // if (!user) {
    //     return redirect('/login');
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
        // Optionally, redirect with an error message
        return redirect('/settings?error=Could not update preferences');
    }

    revalidatePath('/settings');
    redirect('/settings?message=Preferences updated successfully');
}
