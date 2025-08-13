
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateUserLanguage(formData: FormData) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const primary = formData.get('primaryLanguage') as string;
    const secondary = formData.get('secondaryLanguage') as string;

    const { error } = await supabase
        .from('profiles')
        .update({ primary_language: primary, secondary_language: secondary })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating language preferences:', error);
        // Optionally, redirect with an error message
        return redirect('/settings?error=Could not update preferences');
    }

    revalidatePath('/settings');
    redirect('/settings?message=Preferences updated successfully');
}
