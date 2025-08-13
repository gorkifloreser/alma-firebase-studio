
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type BrandHeartData = {
  brand_name: string;
  brand_brief: { primary: string | null; secondary: string | null };
  mission: { primary: string | null; secondary: string | null };
  vision: { primary: string | null; secondary: string | null };
  values: { primary: string | null; secondary: string | null };
  tone_of_voice: { primary: string | null; secondary: string | null };
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
        console.error('Error fetching brand heart:', error.message);
        // Don't throw, just return null so the page can render an empty form.
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
    brand_name: formData.get('brand_name') as string,
    brand_brief: {
 primary: formData.get('brand_brief_primary') as string | null,
 secondary: formData.get('brand_brief_secondary') as string | null,
    },
    mission: {
 primary: formData.get('mission_primary') as string | null,
 secondary: formData.get('mission_secondary') as string | null,
    },
    vision: {
 primary: formData.get('vision_primary') as string | null,
 secondary: formData.get('vision_secondary') as string | null,
    },
    values: {
 primary: formData.get('values_primary') as string | null,
 secondary: formData.get('values_secondary') as string | null,
    },
    tone_of_voice: {
 primary: formData.get('tone_of_voice_primary') as string | null,
 secondary: formData.get('tone_of_voice_secondary') as string | null,
    },
  };

  const payload = {
    user_id: user.id,
    brand_name: data.brand_name,
    brand_brief: data.brand_brief,
    mission: data.mission,
    vision: data.vision,
    values: data.values,
    tone_of_voice: data.tone_of_voice,
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
