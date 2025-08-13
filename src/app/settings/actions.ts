
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

    try {
        const currentProfile = await getProfile();
        const avatarFile = formData.get('avatar') as File | null;
        let newAvatarUrl: string | null = currentProfile?.avatar_url || null;

        const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME;
        if (!bucketName) {
            console.error('Supabase storage bucket name is not configured.');
            throw new Error('Storage service is not configured. Please set NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME in your environment variables.');
        }

        if (avatarFile && avatarFile.size > 0) {
            console.log('Avatar file found, starting upload...');
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, avatarFile);

            if (uploadError) {
                console.error('Error uploading avatar:', uploadError.message);
                throw new Error(`Avatar Upload Failed: ${uploadError.message}`);
            }
            console.log('Avatar uploaded successfully.');

            const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
            newAvatarUrl = publicUrl;

            // Delete old avatar if it exists and is different
            if (currentProfile?.avatar_url && currentProfile.avatar_url !== newAvatarUrl) {
                const oldAvatarPath = currentProfile.avatar_url.split(`/${bucketName}/`).pop();
                if (oldAvatarPath) {
                    console.log(`Deleting old avatar: ${oldAvatarPath}`);
                    const { error: removeError } = await supabase.storage.from(bucketName).remove([oldAvatarPath]);
                    if (removeError) {
                        // Log the error but don't block the profile update
                        console.error('Failed to remove old avatar:', removeError.message);
                    }
                }
            }
        }

        // Extract other form data
        const primary = formData.get('primaryLanguage') as string;
        let secondary = formData.get('secondaryLanguage') as string | null;
        if (secondary === 'none') {
            secondary = null;
        }
        const fullName = formData.get('fullName') as string | null;
        const website = formData.get('website') as string | null;
        
        const profileData = {
            id: user.id,
            updated_at: new Date().toISOString(),
            primary_language: primary,
            secondary_language: secondary,
            full_name: fullName,
            website: website,
            avatar_url: newAvatarUrl,
        };

        console.log('Updating profile in database with data:', profileData);
        const { data, error: dbError } = await supabase
            .from('profiles')
            .upsert(profileData)
            .select('primary_language, secondary_language, full_name, website, avatar_url')
            .single();

        if (dbError) {
            console.error('Error updating profile in database:', dbError.message);
            throw new Error(`Database Update Failed: ${dbError.message}`);
        }
        
        console.log('Profile updated successfully in database.');

        revalidatePath('/settings');
        revalidatePath('/brand-heart');
        
        return { 
            message: 'Profile updated successfully',
            profile: data,
        };
    } catch (error: any) {
        console.error('Caught an exception in updateProfile:', error.message);
        throw error; // Re-throw the caught error
    }
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
