
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type Profile = {
    full_name: string | null;
    website: string | null;
    primary_language: string;
    secondary_language: string | null;
    avatar_url: string | null;
};

export async function updateProfile(formData: FormData): Promise<{ message: string, profile: Profile }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const currentProfile = await getProfile();

    const primary = formData.get('primaryLanguage') as string | null;
    let secondary = formData.get('secondaryLanguage') as string | null;
    const fullName = formData.get('fullName') as string | null;
    const website = formData.get('website') as string | null;
    const avatarFile = formData.get('avatar') as File | null;

    let avatar_url = currentProfile?.avatar_url;

    if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('alma').upload(filePath, avatarFile);
        if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            throw new Error('Could not upload avatar. Please try again.');
        }

        const { data: { publicUrl } } = supabase.storage.from('alma').getPublicUrl(filePath);
        avatar_url = publicUrl;
        
        // If there was an old avatar, delete it
        if (currentProfile?.avatar_url) {
            const oldAvatarPath = currentProfile.avatar_url.split('/alma/').pop();
            if (oldAvatarPath) {
                await supabase.storage.from('alma').remove([oldAvatarPath]);
            }
        }
    }


    if (secondary === 'none') {
        secondary = null;
    }

    const profileData: Partial<Profile> & { updated_at: string, id: string } = {
        id: user.id,
        updated_at: new Date().toISOString()
    };
    
    // Only add fields to the update object if they were actually passed in the form data
    if (primary !== null) profileData.primary_language = primary;
    if (secondary !== undefined) profileData.secondary_language = secondary;
    if (fullName !== null) profileData.full_name = fullName;
    if (website !== null) profileData.website = website;
    if (avatar_url !== currentProfile?.avatar_url) profileData.avatar_url = avatar_url;


    const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select('primary_language, secondary_language, full_name, website, avatar_url')
        .single();

    if (error) {
        console.error('Error updating profile:', error);
        throw new Error('Could not update profile');
    }

    revalidatePath('/settings');
    revalidatePath('/brand-heart');
    
    return { 
        message: 'Profile updated successfully',
        profile: data,
    };
}


export async function getProfile(): Promise<Profile | null> {
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
    .select('primary_language, secondary_language, full_name, website, avatar_url')
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
