
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
    console.log('updateProfile action started.');
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

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME;
    if (!bucketName) {
        console.error("Storage bucket name is not configured.");
        throw new Error("Storage bucket name is not configured.");
    }

    if (avatarFile && avatarFile.size > 0) {
        console.log('Avatar file found, starting upload...');
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, avatarFile);

            if (uploadError) {
                console.error('Error uploading avatar:', uploadError.message);
                throw new Error('Could not upload avatar. Please try again.');
            }
            console.log('Upload successful. Getting public URL...');

            const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
            avatar_url = publicUrl;
            
            // Delete old avatar if a new one was successfully uploaded
            if (currentProfile?.avatar_url && currentProfile.avatar_url !== avatar_url) {
                const oldAvatarPath = currentProfile.avatar_url.split(`/${bucketName}/`).pop();
                if (oldAvatarPath) {
                    console.log(`Deleting old avatar: ${oldAvatarPath}`);
                    await supabase.storage.from(bucketName).remove([oldAvatarPath]);
                }
            }
        } catch(error: any) {
            console.error("File upload block failed:", error.message);
            throw error; // Rethrow the specific error
        }
    }

    
    if (secondary === 'none') {
        secondary = null;
    }

    const profileData: Partial<Profile> & { updated_at: string, id: string } = {
        id: user.id,
        updated_at: new Date().toISOString()
    };
    
    if (primary !== null) profileData.primary_language = primary;
    if (secondary !== undefined) profileData.secondary_language = secondary;
    if (fullName !== null) profileData.full_name = fullName;
    if (website !== null) profileData.website = website;
    if (avatar_url !== null) profileData.avatar_url = avatar_url;

    console.log('Updating profile in database...');
    const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select('primary_language, secondary_language, full_name, website, avatar_url')
        .single();

    if (error) {
        console.error('Error updating profile in database:', error);
        throw new Error('Could not update profile data in the database.');
    }
    
    console.log('Profile updated successfully in database.');

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
