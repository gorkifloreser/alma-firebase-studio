
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

    const { data, error } = await supabase
        .from('profiles')
        .update({ primary_language: primary, secondary_language: secondary, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('primary_language, secondary_language')
        .single();

    if (error) {
        console.error('Error updating language preferences:', error);
        throw new Error('Could not update preferences');
    }

    revalidatePath('/settings');
    revalidatePath('/brand-heart');
    
    return { 
        message: 'Preferences updated successfully',
        profile: data,
    };
}


export async function getProfile(): Promise<{
    primary_language: string;
    secondary_language: string | null;
} | null> {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('Error getting auth user:', userError);
    return null;
  }
  if (!user) {
    console.log('No authenticated user.');
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('primary_language, secondary_language')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn('No profile row found for user:', user.id);
      return null;
    }
    console.error('Unexpected error fetching profile:', error);
    return null;
  }

  return data;
}
