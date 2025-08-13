
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Defines the shape of the Brand Heart data, including the nested structure
 * for bilingual fields, which aligns with the 'jsonb' columns in the database.
 */
type BrandHeartData = {
  id?: string; // Optional since it's not needed for creation
  user_id?: string; // Optional since it's not needed for creation
  created_at?: string; // Optional
  updated_at?: string; // optional
  brand_name: string;
  brand_brief: { primary: string | null; secondary: string | null };
  mission: { primary: string | null; secondary: string | null };
  vision: { primary: string | null; secondary: string | null };
  values: { primary: string | null; secondary: string | null };
  tone_of_voice: { primary: string | null; secondary: string | null };
};

/**
 * Fetches the brand heart data for the currently authenticated user.
 * Supabase client automatically handles parsing the JSONB columns.
 * @returns {Promise<BrandHeartData | null>} The user's brand heart data or null if not found or not authenticated.
 */
export async function getBrandHeart(): Promise<BrandHeartData | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('getBrandHeart: User not authenticated.');
        return null;
    }

    const { data, error } = await supabase
        .from('brand_hearts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // This error code means no row was found, which is not a true error in our case.
    // It can happen if the user hasn't created a brand heart yet.
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching brand heart:', error.message);
        // We don't throw here, allowing the UI to render an empty form.
        return null;
    }
    
    return data;
}

/**
 * Creates or updates a user's brand heart data.
 * It reads the flat structure from the form and builds the nested object required by the database.
 * @param {FormData} formData The data from the form submission.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or if the database operation fails.
 */
export async function updateBrandHeart(formData: FormData): Promise<{ message: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Construct the payload with the correct nested structure for JSONB columns.
  const payload = {
    user_id: user.id,
    brand_name: formData.get('brand_name') as string,
    brand_brief: {
      primary: formData.get('brand_brief_primary') as string,
      secondary: formData.get('brand_brief_secondary') as string | null,
    },
    mission: {
      primary: formData.get('mission_primary') as string,
      secondary: formData.get('mission_secondary') as string | null,
    },
    vision: {
      primary: formData.get('vision_primary') as string,
      secondary: formData.get('vision_secondary') as string | null,
    },
    values: {
      primary: formData.get('values_primary') as string,
      secondary: formData.get('values_secondary') as string | null,
    },
    tone_of_voice: {
      primary: formData.get('tone_of_voice_primary') as string,
      secondary: formData.get('tone_of_voice_secondary') as string | null,
    },
  };
  
  // Use 'upsert' to either insert a new row or update the existing one based on the 'user_id'.
  const { error } = await supabase
    .from('brand_hearts')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('Error updating brand heart:', error.message);
    throw new Error('Could not update brand heart. Please try again.');
  }

  // Revalidate the cache for the brand-heart page so the changes are reflected immediately.
  revalidatePath('/brand-heart');
  
  return { message: 'Brand Heart updated successfully!' };
}
