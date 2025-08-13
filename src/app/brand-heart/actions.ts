'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type BrandHeartData = {
  mission_primary: string;
  mission_secondary: string;
  vision_primary: string;
  vision_secondary: string;
  values_primary: string;
  values_secondary: string;
  tone_of_voice_primary: string;
  tone_of_voice_secondary: string;
};

export async function getBrandHeart() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from('brand_hearts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'range not found' error
        console.error('Error fetching brand heart:', error);
        return null;
    }
    
    return data;
}

export async function updateBrandHeart(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const data: BrandHeartData = {
    mission_primary: formData.get('mission_primary') as string,
    mission_secondary: formData.get('mission_secondary') as string,
    vision_primary: formData.get('vision_primary') as string,
    vision_secondary: formData.get('vision_secondary') as string,
    values_primary: formData.get('values_primary') as string,
    values_secondary: formData.get('values_secondary') as string,
    tone_of_voice_primary: formData.get('tone_of_voice_primary') as string,
    tone_of_voice_secondary: formData.get('tone_of_voice_secondary') as string,
  };

  const payload = {
    user_id: user.id,
    mission: {
        primary: data.mission_primary,
        secondary: data.mission_secondary,
    },
    vision: {
        primary: data.vision_primary,
        secondary: data.vision_secondary,
    },
    values: {
        primary: data.values_primary,
        secondary: data.values_secondary,
    },
    tone_of_voice: {
        primary: data.tone_of_voice_primary,
        secondary: data.tone_of_voice_secondary,
    }
  };

  const { error } = await supabase
    .from('brand_hearts')
    .upsert(payload, { onConflict: 'user_id' });

    if (error) {
        console.error('Error updating brand heart:', error);
        throw new Error('Could not update brand heart');
    }

  revalidatePath('/brand-heart');
  return { message: 'Brand Heart updated successfully' };
}